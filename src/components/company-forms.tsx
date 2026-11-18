"use client";
import { useRef, useState, type FormEvent, type ReactNode } from "react";
import { Plus, Trash } from "@phosphor-icons/react";
import { CompanyModal, companyMutation } from "./company-modal";
import {
  financeMoney,
  moneyInput,
  parseMoneyInput,
  todayInIstanbul,
  expenseCategories,
  recordKinds,
  salesChannels,
  type OpsData,
  type BusinessRecord,
  type RecordKind,
  type RecordLine,
  type RecordInput,
} from "@/lib/operations/types";
export function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: ReactNode;
  hint?: string;
}) {
  return (
    <label className="company-field">
      <span>{label}</span>
      {children}
      {hint && <small>{hint}</small>}
    </label>
  );
}
export function SubmitForm({
  children,
  submit,
  done,
  label = "Kaydet",
}: {
  children: ReactNode;
  submit: (data: FormData) => Promise<unknown>;
  done: () => void;
  label?: string;
}) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const data = new FormData(event.currentTarget);
    setBusy(true);
    setError("");
    try {
      await submit(data);
      done();
    } catch (e) {
      setError(e instanceof Error ? e.message : "İşlem tamamlanamadı.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <form className="company-form" onSubmit={save}>
      {children}
      {error && (
        <p className="company-error" role="alert">
          {error}
        </p>
      )}
      <footer>
        <span>Değişiklikler işlem geçmişine kaydedilir.</span>
        <button className="company-button primary" disabled={busy}>
          {busy ? "Kaydediliyor…" : label}
        </button>
      </footer>
    </form>
  );
}
const text = (data: FormData, key: string) => String(data.get(key) ?? "");
const amount = (data: FormData, key: string) =>
  parseMoneyInput(text(data, key));
type DraftLine = {
  productId: string;
  name: string;
  quantity: string;
  price: string;
  discount: string;
  cost: string;
};
const emptyLine = (): DraftLine => ({
  productId: "",
  name: "",
  quantity: "1",
  price: "",
  discount: "",
  cost: "",
});
export function RecordForm({
  data,
  kind,
  record,
  close,
  done,
}: {
  data: OpsData;
  kind: RecordKind;
  record?: BusinessRecord;
  close: () => void;
  done: () => void;
}) {
  const [selected, setSelected] = useState(kind);
  const [lines, setLines] = useState<DraftLine[]>(
    record?.lines.map((l) => ({
      productId: l.productId ?? "",
      name: l.name,
      quantity: String(l.quantity),
      price: moneyInput(l.unitPriceMinor),
      discount: moneyInput(l.discountMinor),
      cost: moneyInput(l.unitCostMinor),
    })) ?? [emptyLine()],
  );
  const requestId = useRef<string | undefined>(undefined);
  const owner = data.user.role === "OWNER",
    simple = selected === "EXPENSE" || selected === "TAX";
  const patch = (i: number, values: Partial<DraftLine>) =>
    setLines((current) =>
      current.map((l, index) => (index === i ? { ...l, ...values } : l)),
    );
  const total = lines.reduce((sum, l) => {
    try {
      return (
        sum +
        Number(l.quantity) * parseMoneyInput(l.price) -
        parseMoneyInput(l.discount)
      );
    } catch {
      return sum;
    }
  }, 0);
  async function save(form: FormData) {
    const parsedLines: RecordLine[] = simple
      ? []
      : lines.map((l) => ({
          ...(l.productId ? { productId: l.productId } : {}),
          name: l.name,
          quantity: Number(l.quantity),
          unitPriceMinor: parseMoneyInput(l.price),
          discountMinor: parseMoneyInput(l.discount),
          ...(owner && selected === "SALE" && l.cost
            ? { unitCostMinor: parseMoneyInput(l.cost) }
            : {}),
        }));
    const input: RecordInput = {
      kind: selected,
      date: text(form, "date"),
      channel:
        selected === "SALE"
          ? (text(form, "channel") as RecordInput["channel"])
          : null,
      party: text(form, "party"),
      category: text(form, "category"),
      description: text(form, "description"),
      documentNo: text(form, "documentNo"),
      dueDate: text(form, "dueDate") || null,
      lines: parsedLines,
      ...(simple ? { amountMinor: amount(form, "amount") } : {}),
    };
    requestId.current ??= crypto.randomUUID();
    return companyMutation(
      record
        ? {
            action: "edit_record",
            id: record.id,
            version: record.version,
            record: input,
            reason: text(form, "reason"),
          }
        : {
            action: "create_record",
            requestId: requestId.current,
            record: input,
          },
    );
  }
  return (
    <CompanyModal
      title={
        record
          ? `${record.number} · ${owner ? "Düzenle" : "Düzeltme talebi"}`
          : `Yeni ${recordKinds.find((k) => k.id === selected)!.name.toLocaleLowerCase("tr")}`
      }
      description={
        record && !owner
          ? "Düzeltmeniz şirket sahibinin onayından sonra uygulanır."
          : "Kayıt ve para hareketi ayrı işlenir. Tahsilat veya ödemeyi kayıttan sonra ekleyin."
      }
      close={close}
    >
      <SubmitForm
        submit={save}
        done={done}
        label={
          record
            ? owner
              ? "Değişiklikleri kaydet"
              : "Onaya gönder"
            : "Kaydı oluştur"
        }
      >
        <div className="company-form-grid">
          <Field label="İşlem türü">
            <select
              value={selected}
              disabled={!!record}
              onChange={(e) => setSelected(e.target.value as RecordKind)}
            >
              {recordKinds.map((k) => (
                <option key={k.id} value={k.id}>
                  {k.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="İşlem tarihi">
            <input
              type="date"
              name="date"
              required
              defaultValue={record?.date ?? todayInIstanbul()}
            />
          </Field>
          {selected === "SALE" && (
            <Field label="Satış kanalı">
              <select name="channel" defaultValue={record?.channel ?? "WEB"}>
                {salesChannels.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </Field>
          )}
          <Field label={selected === "SALE" ? "Müşteri adı" : "Firma / alıcı"}>
            <input name="party" maxLength={160} defaultValue={record?.party} />
          </Field>
          <Field
            label="Planlanan tahsil / ödeme tarihi"
            hint="Takvimde gösterilecek vade; isteğe bağlı."
          >
            <input
              type="date"
              name="dueDate"
              defaultValue={record?.dueDate ?? ""}
            />
          </Field>
          <Field label="Belge / sipariş numarası">
            <input
              name="documentNo"
              maxLength={100}
              defaultValue={record?.documentNo}
            />
          </Field>
          {simple && (
            <>
              <Field label="Kategori">
                <input
                  name="category"
                  required
                  maxLength={100}
                  list="expense-categories"
                  defaultValue={
                    record?.category ?? (selected === "TAX" ? "Vergi" : "")
                  }
                />
                <datalist id="expense-categories">
                  {expenseCategories.map((c) => (
                    <option key={c} value={c} />
                  ))}
                </datalist>
              </Field>
              <Field label="Toplam tutar (TL)">
                <input
                  name="amount"
                  inputMode="decimal"
                  required
                  placeholder="0,00"
                  defaultValue={record ? moneyInput(record.amountMinor) : ""}
                />
              </Field>
            </>
          )}
        </div>
        {!simple && (
          <section className="company-line-editor">
            <div className="company-section-heading">
              <h3>
                {selected === "MATERIAL_PURCHASE" ? "Malzemeler" : "Ürünler"}
              </h3>
              <span>Fiyatlar TL</span>
            </div>
            {lines.map((line, i) => (
              <div className="company-line" key={i}>
                <div className="company-line-title">
                  <strong>{String(i + 1).padStart(2, "0")}</strong>
                  <Field label="Katalog ürünü">
                    <select
                      value={line.productId}
                      onChange={(e) => {
                        const p = data.catalog.find(
                          (p) => p.id === e.target.value,
                        );
                        patch(
                          i,
                          p
                            ? {
                                productId: p.id,
                                name: p.name,
                                price: moneyInput(
                                  selected === "SALE" ? p.priceMinor : 0,
                                ),
                                cost: moneyInput(p.unitCostMinor),
                              }
                            : { productId: "", name: "", price: "", cost: "" },
                        );
                      }}
                    >
                      <option value="">Serbest ürün / malzeme</option>
                      {data.catalog.map((p) => (
                        <option value={p.id} key={p.id}>
                          {p.sku} · {p.name}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <button
                    type="button"
                    className="company-icon"
                    disabled={lines.length === 1}
                    aria-label={`${i + 1}. satırı kaldır`}
                    onClick={() =>
                      setLines((ls) => ls.filter((_, index) => index !== i))
                    }
                  >
                    <Trash size={19} />
                  </button>
                </div>
                {!line.productId && (
                  <Field label="Ürün / malzeme adı">
                    <input
                      required
                      maxLength={180}
                      value={line.name}
                      onChange={(e) => patch(i, { name: e.target.value })}
                    />
                  </Field>
                )}
                <div className="company-line-values">
                  <Field label="Adet">
                    <input
                      type="number"
                      min={1}
                      max={10000}
                      required
                      value={line.quantity}
                      onChange={(e) => patch(i, { quantity: e.target.value })}
                    />
                  </Field>
                  <Field label="Birim fiyat">
                    <input
                      inputMode="decimal"
                      required
                      value={line.price}
                      onChange={(e) => patch(i, { price: e.target.value })}
                      placeholder="0,00"
                    />
                  </Field>
                  <Field label="Satır indirimi">
                    <input
                      inputMode="decimal"
                      value={line.discount}
                      onChange={(e) => patch(i, { discount: e.target.value })}
                      placeholder="0,00"
                    />
                  </Field>
                  {owner && selected === "SALE" && (
                    <Field
                      label="Birim maliyet"
                      hint="Boşsa kayıtlı maliyet kullanılır."
                    >
                      <input
                        inputMode="decimal"
                        value={line.cost}
                        onChange={(e) => patch(i, { cost: e.target.value })}
                        placeholder="Bilinmiyor"
                      />
                    </Field>
                  )}
                </div>
              </div>
            ))}
            <div className="company-line-total">
              <button
                type="button"
                className="company-button"
                disabled={lines.length >= 50}
                onClick={() => setLines((l) => [...l, emptyLine()])}
              >
                <Plus size={17} />
                Satır ekle
              </button>
              <span>
                Toplam <strong>{financeMoney(total)}</strong>
              </span>
            </div>
          </section>
        )}
        <Field label="Açıklama">
          <textarea
            rows={3}
            name="description"
            maxLength={2000}
            defaultValue={record?.description}
          />
        </Field>
        {record && (
          <Field label="Düzeltme gerekçesi">
            <textarea
              name="reason"
              minLength={5}
              maxLength={500}
              required
              rows={2}
            />
          </Field>
        )}
      </SubmitForm>
    </CompanyModal>
  );
}
export function PaymentForm({
  data,
  record,
  refund = false,
  close,
  done,
}: {
  data: OpsData;
  record: BusinessRecord;
  refund?: boolean;
  close: () => void;
  done: () => void;
}) {
  const [gross, setGross] = useState(
    moneyInput(refund ? record.settledMinor : record.remainingMinor),
  );
  const [commission, setCommission] = useState(""),
    [shipping, setShipping] = useState("");
  const requestId = useRef<string | undefined>(undefined);
  const sale = record.kind === "SALE";
  let net = 0;
  try {
    net =
      parseMoneyInput(gross) -
      parseMoneyInput(commission) -
      parseMoneyInput(shipping);
  } catch {}
  async function save(form: FormData) {
    requestId.current ??= crypto.randomUUID();
    return companyMutation({
      action: "payment",
      requestId: requestId.current,
      payment: {
        recordId: record.id,
        date: text(form, "date"),
        accountId: text(form, "accountId"),
        method: text(form, "method"),
        grossMinor: parseMoneyInput(gross),
        commissionMinor: parseMoneyInput(commission),
        shippingMinor: parseMoneyInput(shipping),
        refund,
        description: text(form, "description"),
      },
    });
  }
  return (
    <CompanyModal
      title={`${refund ? "İade" : sale ? "Tahsilat" : "Ödeme"} ekle`}
      description={`${record.number} · ${record.party || "İsimsiz kayıt"} · Kalan ${financeMoney(record.remainingMinor)}`}
      close={close}
    >
      <SubmitForm submit={save} done={done}>
        <div className="company-form-grid">
          <Field label="Gerçekleşme tarihi">
            <input
              type="date"
              name="date"
              max={todayInIstanbul()}
              defaultValue={todayInIstanbul()}
              required
            />
          </Field>
          <Field label="Hesap">
            <select name="accountId" required>
              {data.accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Ödeme yöntemi">
            <select name="method">
              <option value="BANK">Havale / EFT</option>
              <option value="CARD">Kart</option>
              <option value="CASH">Nakit</option>
            </select>
          </Field>
          <Field
            label={refund ? "İade tutarı (TL)" : "Mahsup edilecek tutar (TL)"}
          >
            <input
              inputMode="decimal"
              value={gross}
              onChange={(e) => setGross(e.target.value)}
              required
            />
          </Field>
          {sale && !refund && (
            <>
              <Field label="Kesilen komisyon (TL)">
                <input
                  inputMode="decimal"
                  value={commission}
                  onChange={(e) => setCommission(e.target.value)}
                  placeholder="0,00"
                />
              </Field>
              <Field label="Kesilen kargo (TL)">
                <input
                  inputMode="decimal"
                  value={shipping}
                  onChange={(e) => setShipping(e.target.value)}
                  placeholder="0,00"
                />
              </Field>
            </>
          )}
        </div>
        <div className="company-form-summary">
          <span>
            {sale !== refund ? "Hesaba giren" : "Hesaptan çıkan"} gerçek tutar
          </span>
          <strong>{financeMoney(net)}</strong>
        </div>
        {sale && !refund && (
          <p className="company-hint">
            Komisyon ve kargo yalnızca tahsilattan kesildiyse girilir. Bu
            kesintileri ayrıca gider olarak tekrar kaydetmeyin.
          </p>
        )}
        <Field label="Açıklama">
          <input name="description" maxLength={500} />
        </Field>
      </SubmitForm>
    </CompanyModal>
  );
}
type UtilityMode = "account" | "transfer" | "staff" | "password" | "reset";
export function UtilityForm({
  mode,
  data,
  targetId,
  close,
  done,
}: {
  mode: UtilityMode;
  data?: OpsData;
  targetId?: string;
  close: () => void;
  done: () => void;
}) {
  const requestId = useRef<string | undefined>(undefined);
  const titles = {
    account: "Kasa / banka hesabı ekle",
    transfer: "Hesaplar arası transfer",
    staff: "Personel hesabı oluştur",
    password: "Şifremi değiştir",
    reset: "Personel şifresini yenile",
  };
  async function save(form: FormData) {
    if (mode === "staff")
      return companyMutation({
        action: "staff",
        user: {
          name: text(form, "name"),
          email: text(form, "email"),
          password: text(form, "password"),
        },
      });
    if (mode === "password" || mode === "reset") {
      if (text(form, "password") !== text(form, "confirm"))
        throw new Error("Yeni şifreler eşleşmiyor.");
      return companyMutation({
        action: "password",
        password: {
          ...(targetId ? { targetId } : {}),
          ...(mode === "password"
            ? { currentPassword: text(form, "currentPassword") }
            : {}),
          newPassword: text(form, "password"),
        },
      });
    }
    if (mode === "account") {
      const val = text(form, "opening");
      const openingMinor = val.trim().startsWith("-")
        ? -parseMoneyInput(val.trim().slice(1))
        : parseMoneyInput(val);
      return companyMutation({
        action: "account",
        account: {
          name: text(form, "name"),
          type: text(form, "type"),
          openingMinor,
          openingDate: text(form, "date"),
        },
      });
    }
    requestId.current ??= crypto.randomUUID();
    return companyMutation({
      action: "transfer",
      requestId: requestId.current,
      transfer: {
        sourceId: text(form, "sourceId"),
        targetId: text(form, "targetId"),
        amountMinor: amount(form, "amount"),
        date: text(form, "date"),
        description: text(form, "description"),
      },
    });
  }
  return (
    <CompanyModal
      title={titles[mode]}
      description={
        mode === "staff"
          ? "Personel kendi kayıtlarını girer. Mali raporlar ve düzeltme onayı şirket sahibinde kalır."
          : mode === "password" || mode === "reset"
            ? "Şifre değişince ilgili hesabın açık oturumları kapatılır."
            : "Açılış ve transfer tutarları satış veya gider olarak sayılmaz."
      }
      close={close}
    >
      <SubmitForm submit={save} done={done}>
        {(mode === "staff" || mode === "account") && (
          <Field label={mode === "staff" ? "Ad soyad" : "Hesap adı"}>
            <input name="name" required minLength={2} maxLength={100} />
          </Field>
        )}
        {mode === "staff" && (
          <Field label="E-posta">
            <input
              type="email"
              name="email"
              required
              maxLength={200}
              autoComplete="off"
            />
          </Field>
        )}
        {mode === "account" && (
          <>
            <Field label="Hesap türü">
              <select name="type">
                <option value="BANK">Banka</option>
                <option value="CASH">Nakit kasa</option>
              </select>
            </Field>
            <Field
              label="Açılış bakiyesi (TL)"
              hint="Borç bakiyesi için eksi işareti kullanabilirsiniz."
            >
              <input
                name="opening"
                inputMode="decimal"
                defaultValue="0,00"
                required
              />
            </Field>
          </>
        )}
        {mode === "transfer" && (
          <>
            <div className="company-form-grid">
              {["sourceId", "targetId"].map((name, i) => (
                <Field label={i ? "Hedef hesap" : "Kaynak hesap"} key={name}>
                  <select
                    name={name}
                    required
                    defaultValue={data?.accounts[i]?.id}
                  >
                    {data?.accounts.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name}
                      </option>
                    ))}
                  </select>
                </Field>
              ))}
            </div>
            <Field label="Transfer tutarı (TL)">
              <input name="amount" inputMode="decimal" required />
            </Field>
            <Field label="Açıklama">
              <input name="description" maxLength={500} />
            </Field>
          </>
        )}
        {(mode === "account" || mode === "transfer") && (
          <Field
            label={mode === "account" ? "Açılış tarihi" : "Transfer tarihi"}
          >
            <input
              type="date"
              name="date"
              max={todayInIstanbul()}
              defaultValue={todayInIstanbul()}
              required
            />
          </Field>
        )}
        {mode === "password" && (
          <Field label="Mevcut şifre">
            <input
              name="currentPassword"
              type="password"
              autoComplete="current-password"
              required
            />
          </Field>
        )}
        {["staff", "password", "reset"].includes(mode) && (
          <Field label="Yeni şifre" hint="En az 12 karakter kullanın.">
            <input
              name="password"
              type="password"
              autoComplete="new-password"
              minLength={12}
              maxLength={128}
              required
            />
          </Field>
        )}
        {(mode === "password" || mode === "reset") && (
          <Field label="Yeni şifre tekrar">
            <input
              name="confirm"
              type="password"
              autoComplete="new-password"
              minLength={12}
              maxLength={128}
              required
            />
          </Field>
        )}
      </SubmitForm>
    </CompanyModal>
  );
}
