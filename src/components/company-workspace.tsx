"use client";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Plus,
  DownloadSimple,
  Wallet,
  ShoppingBag,
  Receipt,
  ArrowRight,
  CalendarBlank,
  CheckSquare,
  MagnifyingGlass,
  PencilSimple,
  Eye,
  ArrowsLeftRight,
} from "@phosphor-icons/react";
import { CompanyModal, companyMutation } from "./company-modal";
import {
  Field,
  PaymentForm,
  RecordForm,
  SubmitForm,
  UtilityForm,
} from "./company-forms";
import {
  financeMoney as money,
  moneyInput,
  parseMoneyInput,
  currentMonthRange,
  todayInIstanbul,
  salesChannels,
  recordKinds,
  type OpsData,
  type BusinessRecord,
  type RecordKind,
  type Amendment,
} from "@/lib/operations/types";
export const companyViews = {
  ozet: [
    "Yönetim özeti",
    "Şirketinize bir bakış. Satıştan ödemeye, tüm hareketler tek yerde.",
  ],
  satislar: [
    "Satışlar & tahsilatlar",
    "Beş satış kanalı, tek kayıt düzeni. Satışlarınızı ve kalan tahsilatları izleyin.",
  ],
  alimlar: [
    "Ürün & malzeme alımları",
    "Satın alınan ürünleri, malzemeleri ve tedarikçi ödemelerini kaydedin.",
  ],
  giderler: [
    "Diğer giderler",
    "Kira, personel, kargo, reklam ve şirketin diğer harcamaları.",
  ],
  vergiler: [
    "Vergiler & resmi ödemeler",
    "Vergi ve resmi ödeme tutarlarını, dönem açıklamalarını ve vadelerini kaydedin.",
  ],
  kasa: [
    "Kasa & banka",
    "Hesap bakiyeleri, gerçekleşen para hareketleri ve hesaplar arası transferler.",
  ],
  takvim: [
    "Ödeme takvimi",
    "Seçtiğiniz tarihlerde vadesi gelen tahsilat ve ödeme kayıtları.",
  ],
  raporlar: [
    "Mali raporlar",
    "Satış, gider ve gerçek nakit akışını günlük, haftalık veya aylık inceleyin.",
  ],
  maliyetler: [
    "Ürün maliyetleri",
    "Katalog ürünlerinin birim maliyetlerini belirleyin ve satış farkını izleyin.",
  ],
  ekip: [
    "Personel & işlem geçmişi",
    "Kişisel hesaplar, erişim kontrolü ve kayıtların işlem izi.",
  ],
  onaylar: [
    "Düzeltmeler & onaylar",
    "Personel taleplerini inceleyin; değişiklikler onayınızla uygulansın.",
  ],
} as const;
export type CompanyView = keyof typeof companyViews;
const day = (value: string) =>
  new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(value.slice(0, 10) + "T00:00:00Z"));
const kindName = (kind: string) =>
  recordKinds.find((k) => k.id === kind)?.name ?? kind;
const channelName = (channel: unknown) =>
  salesChannels.find((c) => c.id === channel)?.name ?? "—";
type Modal =
  | { type: "record"; kind: RecordKind; record?: BusinessRecord }
  | { type: "detail"; record: BusinessRecord }
  | { type: "payment"; record: BusinessRecord; refund?: boolean }
  | { type: "cancel"; record: BusinessRecord }
  | { type: "approval"; amendment: Amendment }
  | { type: "account" | "transfer" | "staff" | "reset"; targetId?: string }
  | { type: "cost"; id: string };
export function CompanyWorkspace({
  data,
  view,
}: {
  data: OpsData;
  view: CompanyView;
}) {
  const router = useRouter(),
    [modal, setModal] = useState<Modal | null>(null),
    [notice, setNotice] = useState("");
  const owner = data.user.role === "OWNER";
  const done = () => {
    setModal(null);
    setNotice("İşlem kaydedildi.");
    router.refresh();
  };
  const action = (kind: RecordKind) => setModal({ type: "record", kind });
  const query = (cursor?: string) => {
    const p = new URLSearchParams(
      Object.entries(data.filters).filter(
        ([k, v]) => k !== "cursor" && !!v,
      ) as [string, string][],
    );
    if (cursor) p.set("cursor", cursor);
    if (view === "takvim") p.set("view", "takvim");
    return p.toString();
  };
  const records = data.records;
  const title = companyViews[view];
  const dashboard = data.dashboard;
  const renderRecords = (list: BusinessRecord[] = records) =>
    list.length ? (
      <div
        className="company-table-wrap"
        tabIndex={0}
        aria-label="Kayıt tablosu"
      >
        <table className="company-table">
          <thead>
            <tr>
              <th>Kayıt / müşteri</th>
              <th>{view === "takvim" ? "Vade" : "Tarih"}</th>
              <th>Tür / kanal</th>
              <th className="number">Tutar</th>
              <th className="number">Güncel kalan</th>
              <th>Durum</th>
              <th>
                <span className="sr-only">İşlemler</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {list.map((r) => (
              <tr key={r.id}>
                <td>
                  <button
                    className="company-text-button"
                    onClick={() => setModal({ type: "detail", record: r })}
                  >
                    {r.party || r.number}
                  </button>
                  <small>
                    {r.number} · {r.createdByName}
                  </small>
                </td>
                <td>{day(view === "takvim" ? r.dueDate! : r.date)}</td>
                <td>
                  {kindName(r.kind)}
                  <small>
                    {r.channel ? channelName(r.channel) : r.category || "—"}
                  </small>
                </td>
                <td className="number">
                  <strong>{money(r.amountMinor)}</strong>
                </td>
                <td className="number">{money(r.remainingMinor)}</td>
                <td>
                  <span
                    className={`company-status ${r.status === "CANCELED" ? "canceled" : r.remainingMinor ? "pending" : "paid"}`}
                  >
                    {r.status === "CANCELED"
                      ? "İptal"
                      : r.remainingMinor
                        ? "Açık"
                        : "Tamamlandı"}
                  </span>
                </td>
                <td>
                  <button
                    className="company-icon"
                    aria-label={`${r.number} kaydını görüntüle`}
                    onClick={() => setModal({ type: "detail", record: r })}
                  >
                    <Eye size={19} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    ) : (
      <Empty
        title="Bu dönemde kayıt yok"
        text="Yeni bir kayıt ekleyebilir veya tarih aralığını değiştirebilirsiniz."
      />
    );
  return (
    <div className="company-workspace">
      <div className="company-page-heading">
        <div>
          <span className="company-kicker">
            {owner ? "ŞİRKET YÖNETİMİ" : "KİŞİSEL ÇALIŞMA ALANI"}
          </span>
          <h1>{title[0]}</h1>
          <p>{title[1]}</p>
        </div>
        <div className="company-actions">
          {view === "kasa" ? (
            <>
              <button
                className="company-button"
                onClick={() => setModal({ type: "transfer" })}
              >
                <ArrowsLeftRight size={18} />
                Transfer
              </button>
              <button
                className="company-button primary"
                onClick={() => setModal({ type: "account" })}
              >
                <Plus size={18} />
                Hesap ekle
              </button>
            </>
          ) : view === "ekip" ? (
            <button
              className="company-button primary"
              onClick={() => setModal({ type: "staff" })}
            >
              <Plus size={18} />
              Personel ekle
            </button>
          ) : (
            !["maliyetler", "onaylar"].includes(view) && (
              <>
                {view !== "giderler" && (
                  <button
                    className="company-button"
                    onClick={() => action("EXPENSE")}
                  >
                    <Plus size={17} />
                    Gider ekle
                  </button>
                )}
                <button
                  className="company-button primary"
                  onClick={() =>
                    action(
                      view === "vergiler"
                        ? "TAX"
                        : view === "alimlar"
                          ? ((data.filters.kind ||
                              "PRODUCT_PURCHASE") as RecordKind)
                          : view === "giderler"
                            ? "EXPENSE"
                            : "SALE",
                    )
                  }
                >
                  <Plus size={18} />
                  {view === "vergiler"
                    ? "Vergi kaydı"
                    : view === "alimlar"
                      ? "Alım ekle"
                      : view === "giderler"
                        ? "Gider ekle"
                        : view === "takvim"
                          ? "Kayıt ekle"
                          : "Satış ekle"}
                </button>
              </>
            )
          )}
        </div>
      </div>
      {notice && (
        <div className="company-notice" role="status">
          {notice}
          <button className="company-text-button" onClick={() => setNotice("")}>
            Kapat
          </button>
        </div>
      )}
      {!owner && (
        <p className="company-permission-note">
          Kendi kayıtlarınızı görüntülüyorsunuz. Düzeltme ve iptal talepleri
          şirket sahibinin onayına gönderilir.
        </p>
      )}
      {!["maliyetler", "ekip", "onaylar"].includes(view) && (
        <Filters data={data} view={view} />
      )}
      {(view === "ozet" || view === "raporlar") && (
        <>
          {dashboard ? (
            <>
              <div className="company-stats">
                <Metric
                  icon={<ShoppingBag size={20} />}
                  label="Dönem satış tutarı"
                  value={money(dashboard.salesMinor)}
                  note="Kayıt tarihine göre"
                />
                <Metric
                  icon={<ArrowDownLeft size={20} />}
                  label="Gerçekleşen nakit girişi"
                  value={money(dashboard.cashInMinor)}
                  note="Kesintiler sonrası hesaba giren"
                />
                <Metric
                  icon={<ArrowUpRight size={20} />}
                  label="Gerçekleşen nakit çıkışı"
                  value={money(dashboard.cashOutMinor)}
                  note="Ödenen gider, alım, vergi ve iadeler"
                />
                <Metric
                  icon={<Wallet size={20} />}
                  label="Net nakit hareketi"
                  value={money(dashboard.cashNetMinor)}
                  note="Gerçek giriş − gerçek çıkış"
                  accent
                />
              </div>
              <div className="company-grid-main">
                <section className="company-card">
                  <div className="company-section-heading">
                    <div>
                      <h2>Dönemin hareketi</h2>
                      <p>Satış tutarı ve gerçekleşen nakit</p>
                    </div>
                    <span className="company-period-pill">
                      {data.filters.group === "month"
                        ? "Aylık"
                        : data.filters.group === "week"
                          ? "Haftalık"
                          : "Günlük"}
                    </span>
                  </div>
                  <PeriodChart data={data} />
                </section>
                <section className="company-card">
                  <div className="company-section-heading">
                    <h2>Satış kanalları</h2>
                    <span>5 kanal</span>
                  </div>
                  <div className="company-channel-list">
                    {dashboard.channels.map((c, i) => (
                      <div key={c.id}>
                        <span className="company-channel-mark">
                          {String(i + 1).padStart(2, "0")}
                        </span>
                        <div>
                          <strong>{c.name}</strong>
                          <small>{c.count} satış</small>
                        </div>
                        <b>{money(c.totalMinor)}</b>
                      </div>
                    ))}
                  </div>
                </section>
              </div>
              <div className="company-summary-strip">
                <div>
                  <span>Dönem kayıtlarının güncel alacağı</span>
                  <strong>{money(dashboard.receivableMinor)}</strong>
                </div>
                <div>
                  <span>Dönem kayıtlarının güncel borcu</span>
                  <strong>{money(dashboard.payableMinor)}</strong>
                </div>
                <div>
                  <span>Kesilen komisyon & kargo</span>
                  <strong>{money(dashboard.deductionsMinor)}</strong>
                </div>
                <Link href="/yonetim/onaylar">
                  <CheckSquare size={21} />
                  <div>
                    <span>Bekleyen düzeltme</span>
                    <strong>{dashboard.pendingApprovals}</strong>
                  </div>
                  <ArrowRight size={18} />
                </Link>
              </div>
            </>
          ) : (
            <section className="company-card company-staff-welcome">
              <span className="company-card-symbol">
                <ShoppingBag size={28} />
              </span>
              <div>
                <h2>Merhaba, {data.user.name}.</h2>
                <p>
                  Satış, alım ve gider kayıtlarınızı buradan oluşturabilirsiniz.
                  Ödemeler ve düzeltme talepleri kayıt detayında yer alır.
                </p>
                <button
                  className="company-button primary"
                  onClick={() => action("SALE")}
                >
                  <Plus size={17} />
                  Satış kaydı oluştur
                </button>
              </div>
            </section>
          )}
          {view === "raporlar" && dashboard && (
            <>
              <section className="company-card">
                <div className="company-section-heading">
                  <div>
                    <h2>Ürün maliyeti ve kayıt toplamları</h2>
                    <p>
                      Bu tutarlar girilen kayıtların özetidir; net kâr veya
                      otomatik vergi hesabı değildir.
                    </p>
                  </div>
                  <a
                    className="company-button"
                    href={`/api/operations/export?${query()}`}
                  >
                    <DownloadSimple size={17} />
                    CSV indir
                  </a>
                </div>
                <div className="company-summary-strip">
                  <div>
                    <span>Alım / gider / vergi + kesintiler</span>
                    <strong>{money(dashboard.expenseMinor)}</strong>
                  </div>
                  <div>
                    <span>Maliyeti bilinen ürün farkı</span>
                    <strong>{money(dashboard.knownProductMarginMinor)}</strong>
                  </div>
                  <div>
                    <span>Eksik maliyetli satış</span>
                    <strong>{dashboard.missingCostSales}</strong>
                  </div>
                </div>
                <p className="company-hint">
                  Ürün farkı: satış satırı − indirim − kayıt anındaki ürün
                  maliyeti. Diğer giderler ve vergiler bu farktan düşülmez.
                  Açılış bakiyeleri ve transferler nakit akışına dahil edilmez.
                </p>
              </section>
              <section className="company-card">
                <div className="company-section-heading">
                  <h2>Dönem dökümü</h2>
                </div>
                <div className="company-table-wrap">
                  <table className="company-table">
                    <thead>
                      <tr>
                        <th>Dönem başlangıcı</th>
                        <th className="number">Satış</th>
                        <th className="number">Nakit giriş</th>
                        <th className="number">Nakit çıkış</th>
                        <th className="number">Net hareket</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dashboard.periods.map((p) => (
                        <tr key={p.date}>
                          <td>{day(p.date)}</td>
                          <td className="number">{money(p.salesMinor)}</td>
                          <td className="number">{money(p.incomeMinor)}</td>
                          <td className="number">{money(p.expenseMinor)}</td>
                          <td className="number">
                            {money(p.incomeMinor - p.expenseMinor)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {!dashboard.periods.length && (
                    <Empty
                      title="Dönem hareketi bulunmuyor"
                      text="Kayıtlarınız rapora otomatik yansır."
                    />
                  )}
                </div>
              </section>
            </>
          )}
        </>
      )}
      {[
        "ozet",
        "satislar",
        "alimlar",
        "giderler",
        "vergiler",
        "takvim",
        "raporlar",
      ].includes(view) && (
        <section className="company-card company-records">
          <div className="company-section-heading">
            <div>
              <h2>
                {view === "ozet"
                  ? "Son kayıtlar"
                  : view === "takvim"
                    ? "Vadeli kayıtlar"
                    : "Kayıtlar"}
              </h2>
              <p>
                {view === "takvim"
                  ? "Vade tarihine göre listelenir. Kalan tutarlar güncel tahsil / ödeme durumudur."
                  : "Dönem içindeki kayıtlar · Her sayfada en fazla 100 kayıt"}
              </p>
            </div>
            {owner && (
              <a
                href={`/api/operations/export?${query()}`}
                className="company-text-button"
              >
                <DownloadSimple size={17} />
                Dışa aktar
              </a>
            )}
          </div>
          {renderRecords(records)}
          {data.nextCursor && (
            <div className="company-pagination">
              <Link
                className="company-button"
                href={`?${query(data.nextCursor)}`}
              >
                Sonraki kayıtlar <ArrowRight size={17} />
              </Link>
            </div>
          )}
        </section>
      )}
      {view === "kasa" && (
        <>
          <div className="company-account-grid">
            {data.accounts.map((a) => (
              <section className="company-card company-account" key={a.id}>
                <div>
                  <span className="company-card-symbol">
                    <Wallet size={23} />
                  </span>
                  <span className="company-status paid">
                    {a.type === "BANK" ? "Banka" : "Nakit kasa"}
                  </span>
                </div>
                <h2>{a.name}</h2>
                <strong>{money(a.balanceMinor)}</strong>
                <p>{day(data.filters.to)} sonu bakiyesi</p>
                <small>
                  Açılış {money(a.openingMinor)} · {day(a.openingDate)}
                </small>
              </section>
            ))}
          </div>
          <PaymentTable data={data} />
          <section className="company-card">
            <div className="company-section-heading">
              <div>
                <h2>Hesaplar arası transferler</h2>
                <p>
                  Seçilen tarihlerdeki son 300 transfer · Gelir ve gider
                  toplamlarına eklenmez.
                </p>
              </div>
            </div>
            {data.transfers.length ? (
              <div className="company-table-wrap">
                <table className="company-table">
                  <thead>
                    <tr>
                      <th>Tarih</th>
                      <th>Kaynak</th>
                      <th>Hedef</th>
                      <th>Açıklama / personel</th>
                      <th className="number">Tutar</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.transfers.map((t) => (
                      <tr key={t.id}>
                        <td>{day(t.date)}</td>
                        <td>{t.sourceName}</td>
                        <td>{t.targetName}</td>
                        <td>
                          {t.description || "—"}
                          <small>{t.createdByName}</small>
                        </td>
                        <td className="number">{money(t.amountMinor)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <Empty
                title="Transfer kaydı yok"
                text="Kasa ve banka arasındaki para aktarımlarını Transfer düğmesinden kaydedin."
              />
            )}
          </section>
          <p className="company-hint">
            Hesap bakiyeleri seçilen bitiş tarihine kadar tüm hareketleri
            içerir. Dönem filtresi aşağıdaki hareket listesini sınırlar.
          </p>
        </>
      )}
      {view === "maliyetler" && (
        <section className="company-card">
          <div className="company-section-heading">
            <div>
              <h2>{data.catalog.length} ürün · QN kodlarıyla eşleşmiş</h2>
              <p>
                Maliyet değişikliği sonraki satışlara uygulanır; önceki
                satışların maliyetini değiştirmez.
              </p>
            </div>
          </div>
          <CostTable
            data={data}
            edit={(id) => setModal({ type: "cost", id })}
          />
        </section>
      )}
      {view === "onaylar" && (
        <section className="company-card">
          <div className="company-section-heading">
            <div>
              <h2>{owner ? "Düzeltme talepleri" : "Taleplerim"}</h2>
              <p>En son 100 talep · Bekleyenler önce gösterilir</p>
            </div>
          </div>
          {data.amendments.length ? (
            <div className="company-table-wrap">
              <table className="company-table">
                <thead>
                  <tr>
                    <th>Kayıt</th>
                    <th>Talep eden</th>
                    <th>İşlem</th>
                    <th>Gerekçe</th>
                    <th>Durum</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {data.amendments.map((a) => (
                    <tr key={a.id}>
                      <td>
                        <strong>{a.recordNumber}</strong>
                        <small>{a.party}</small>
                      </td>
                      <td>
                        {a.requestedByName}
                        <small>{day(a.createdAt)}</small>
                      </td>
                      <td>{a.action === "EDIT" ? "Düzeltme" : "İptal"}</td>
                      <td className="company-text-cell">{a.reason}</td>
                      <td>
                        <span
                          className={`company-status ${a.status === "PENDING" ? "pending" : a.status === "APPROVED" ? "paid" : "canceled"}`}
                        >
                          {a.status === "PENDING"
                            ? "Bekliyor"
                            : a.status === "APPROVED"
                              ? "Onaylandı"
                              : "Reddedildi"}
                        </span>
                      </td>
                      <td>
                        <button
                          className="company-button"
                          onClick={() =>
                            setModal({ type: "approval", amendment: a })
                          }
                        >
                          İncele
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <Empty
              title="Bekleyen iş yok"
              text="Personelin düzeltme ve iptal talepleri burada görünecek."
            />
          )}
        </section>
      )}
      {view === "ekip" && (
        <>
          <section className="company-card">
            <div className="company-section-heading">
              <div>
                <h2>Kullanıcılar</h2>
                <p>
                  Personel: kendi kayıtları ve talepleri. Şirket sahibi: tüm
                  kayıtlar, raporlar ve onaylar.
                </p>
              </div>
            </div>
            <div className="company-table-wrap">
              <table className="company-table">
                <thead>
                  <tr>
                    <th>Ad soyad</th>
                    <th>E-posta</th>
                    <th>Rol</th>
                    <th>Durum</th>
                    <th>İşlemler</th>
                  </tr>
                </thead>
                <tbody>
                  {data.users.map((u) => (
                    <tr key={u.id}>
                      <td>
                        <strong>{u.name}</strong>
                      </td>
                      <td>{u.email}</td>
                      <td>
                        {u.role === "OWNER" ? "Şirket sahibi" : "Personel"}
                      </td>
                      <td>
                        <span
                          className={`company-status ${u.active ? "paid" : "canceled"}`}
                        >
                          {u.active ? "Etkin" : "Devre dışı"}
                        </span>
                      </td>
                      <td>
                        {u.role === "STAFF" && (
                          <div className="company-actions">
                            <button
                              className="company-button"
                              onClick={() =>
                                setModal({ type: "reset", targetId: u.id })
                              }
                            >
                              Şifre yenile
                            </button>
                            <AsyncButton
                              run={() =>
                                companyMutation({
                                  action: "staff_active",
                                  id: u.id,
                                  active: !u.active,
                                })
                              }
                              done={done}
                            >
                              {u.active ? "Devre dışı bırak" : "Etkinleştir"}
                            </AsyncButton>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
          <section className="company-card">
            <div className="company-section-heading">
              <h2>İşlem geçmişi</h2>
              <span>Son 100 işlem</span>
            </div>
            {data.audit.map((a) => (
              <div className="company-audit" key={a.id}>
                <span className="company-audit-dot" />
                <div>
                  <strong>{a.detail || a.action}</strong>
                  <small>
                    {a.actorName}
                    {a.recordNumber ? ` · ${a.recordNumber}` : ""}
                  </small>
                </div>
                <time>
                  {new Intl.DateTimeFormat("tr-TR", {
                    dateStyle: "short",
                    timeStyle: "short",
                    timeZone: "Europe/Istanbul",
                  }).format(new Date(a.at))}
                </time>
              </div>
            ))}
          </section>
        </>
      )}
      {modal?.type === "record" && (
        <RecordForm
          data={data}
          kind={modal.kind}
          record={modal.record}
          close={() => setModal(null)}
          done={done}
        />
      )}
      {modal?.type === "payment" && (
        <PaymentForm
          data={data}
          record={modal.record}
          refund={modal.refund}
          close={() => setModal(null)}
          done={done}
        />
      )}
      {modal?.type === "detail" && (
        <CompanyModal
          title={`${modal.record.number} · Kayıt detayı`}
          description={`${kindName(modal.record.kind)} · ${day(modal.record.date)} · ${modal.record.createdByName}`}
          close={() => setModal(null)}
        >
          <RecordDetail record={modal.record} owner={owner} />
          <div className="company-detail-actions">
            {modal.record.status === "ACTIVE" && (
              <>
                <button
                  className="company-button"
                  onClick={() =>
                    setModal({
                      type: "record",
                      kind: modal.record.kind,
                      record: modal.record,
                    })
                  }
                >
                  <PencilSimple size={17} />
                  {owner ? "Düzenle" : "Düzeltme iste"}
                </button>
                <button
                  className="company-button danger"
                  onClick={() =>
                    setModal({ type: "cancel", record: modal.record })
                  }
                >
                  {owner ? "İptal et" : "İptal talebi"}
                </button>
                {owner && modal.record.settledMinor > 0 && (
                  <button
                    className="company-button"
                    onClick={() =>
                      setModal({
                        type: "payment",
                        record: modal.record,
                        refund: true,
                      })
                    }
                  >
                    İade gir
                  </button>
                )}
                {modal.record.remainingMinor > 0 && (
                  <button
                    className="company-button primary"
                    onClick={() =>
                      setModal({ type: "payment", record: modal.record })
                    }
                  >
                    {modal.record.kind === "SALE"
                      ? "Tahsilat ekle"
                      : "Ödeme ekle"}
                  </button>
                )}
              </>
            )}
          </div>
          <div className="company-detail-payments">
            <h3>Bu dönemdeki para hareketleri</h3>
            {data.payments
              .filter((p) => p.recordId === modal.record.id)
              .map((p) => (
                <p key={p.id}>
                  {day(p.date)} · {p.accountName} ·{" "}
                  {p.refund ? "İade" : "Ödeme"}
                  <strong>{money(p.grossMinor)}</strong>
                </p>
              ))}
            <small>
              Hareket listesi seçilen dönemin en son 300 hareketini içerir.
            </small>
          </div>
        </CompanyModal>
      )}
      {modal?.type === "cancel" && (
        <CompanyModal
          title={`${modal.record.number} · ${owner ? "İptal" : "İptal talebi"}`}
          description="Kaydın geçmişi korunur. Ödeme alınmış kayıtlarda önce iade hareketi girilmelidir."
          close={() => setModal(null)}
        >
          <SubmitForm
            submit={(f) =>
              companyMutation({
                action: "cancel_record",
                id: modal.record.id,
                version: modal.record.version,
                reason: String(f.get("reason")),
              })
            }
            done={done}
            label={owner ? "Kaydı iptal et" : "Onaya gönder"}
          >
            <Field label="İptal gerekçesi">
              <textarea
                name="reason"
                required
                minLength={5}
                maxLength={500}
                rows={3}
              />
            </Field>
          </SubmitForm>
        </CompanyModal>
      )}
      {modal?.type === "approval" && (
        <CompanyModal
          title={`${modal.amendment.recordNumber} · Talep detayı`}
          description={`${modal.amendment.requestedByName} · ${modal.amendment.reason}`}
          close={() => setModal(null)}
        >
          <details className="company-approval-current" open>
            <summary>
              Mevcut kayıt · Sürüm {modal.amendment.current.version}
            </summary>
            <RecordDetail record={modal.amendment.current} owner={owner} />
          </details>
          {modal.amendment.proposed ? (
            <div className="company-approval-preview">
              <h3>Önerilen değişiklik</h3>
              <RecordPreview record={modal.amendment.proposed} owner={owner} />
            </div>
          ) : (
            <p className="company-hint">Talep: kaydın iptal edilmesi.</p>
          )}
          {modal.amendment.decisionNote && (
            <p className="company-hint">
              Karar notu: {modal.amendment.decisionNote}
            </p>
          )}
          {owner && modal.amendment.status === "PENDING" && (
            <SubmitForm
              submit={(f) =>
                companyMutation({
                  action: "amendment",
                  id: modal.amendment.id,
                  approve: f.get("decision") === "approve",
                  note: String(f.get("note")),
                })
              }
              done={done}
              label="Kararı kaydet"
            >
              <Field label="Karar">
                <select name="decision">
                  <option value="approve">Onayla ve uygula</option>
                  <option value="reject">Reddet</option>
                </select>
              </Field>
              <Field label="Karar notu">
                <textarea name="note" maxLength={500} rows={2} />
              </Field>
            </SubmitForm>
          )}
        </CompanyModal>
      )}
      {modal &&
        ["account", "transfer", "staff", "reset"].includes(modal.type) && (
          <UtilityForm
            mode={modal.type as "account" | "transfer" | "staff" | "reset"}
            data={data}
            targetId={"targetId" in modal ? modal.targetId : undefined}
            close={() => setModal(null)}
            done={done}
          />
        )}
      {modal?.type === "cost" &&
        (() => {
          const p = data.catalog.find((p) => p.id === modal.id)!;
          return (
            <CompanyModal
              title="Birim ürün maliyeti"
              description={`${p.sku} · ${p.name}`}
              close={() => setModal(null)}
            >
              <SubmitForm
                submit={(f) =>
                  companyMutation({
                    action: "product_cost",
                    productId: p.id,
                    unitCostMinor: parseMoneyInput(String(f.get("cost"))),
                  })
                }
                done={done}
              >
                <Field
                  label="Birim maliyet (TL)"
                  hint="Ürünü edinme maliyetini girin. Sıfır, bilinen sıfır maliyet anlamına gelir."
                >
                  <input
                    name="cost"
                    inputMode="decimal"
                    required
                    defaultValue={moneyInput(p.unitCostMinor)}
                    placeholder="0,00"
                  />
                </Field>
              </SubmitForm>
            </CompanyModal>
          );
        })()}
    </div>
  );
}
function Empty({ title, text }: { title: string; text: string }) {
  return (
    <div className="company-empty">
      <span>
        <Receipt size={28} weight="light" />
      </span>
      <h3>{title}</h3>
      <p>{text}</p>
    </div>
  );
}
function Metric({
  icon,
  label,
  value,
  note,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  note: string;
  accent?: boolean;
}) {
  return (
    <section className={`company-metric ${accent ? "accent" : ""}`}>
      <div>
        <span>{label}</span>
        {icon}
      </div>
      <strong>{value}</strong>
      <small>{note}</small>
    </section>
  );
}
function Filters({ data, view }: { data: OpsData; view: CompanyView }) {
  const router = useRouter();
  const shortcut = (mode: string) => {
    const now = todayInIstanbul();
    let from = now,
      to = now;
    if (mode === "month") ({ from, to } = currentMonthRange());
    if (mode === "week") {
      const d = new Date(now + "T00:00:00Z");
      d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
      from = d.toISOString().slice(0, 10);
      d.setUTCDate(d.getUTCDate() + 6);
      to = d.toISOString().slice(0, 10);
    }
    const p = new URLSearchParams({ from, to });
    if (data.filters.kind) p.set("kind", data.filters.kind);
    router.push(`?${p}`);
  };
  return (
    <section className="company-filters">
      <div className="company-filter-shortcuts">
        <CalendarBlank size={18} />
        {[
          ["today", "Bugün"],
          ["week", "Bu hafta"],
          ["month", "Bu ay"],
        ].map(([id, label]) => (
          <button key={id} onClick={() => shortcut(id)}>
            {label}
          </button>
        ))}
      </div>
      <form
        action={view === "ozet" ? "/yonetim" : `/yonetim/${view}`}
        className="company-filter-form"
      >
        <Field label={view === "takvim" ? "Vade başlangıcı" : "Başlangıç"}>
          <input
            type="date"
            name="from"
            required
            defaultValue={data.filters.from}
            key={`from-${data.filters.from}`}
          />
        </Field>
        <Field label="Bitiş">
          <input
            type="date"
            name="to"
            required
            defaultValue={data.filters.to}
            key={`to-${data.filters.to}`}
          />
        </Field>
        <Field label="Satış kanalı">
          <select name="channel" defaultValue={data.filters.channel ?? ""}>
            <option value="">Tüm kanallar</option>
            {salesChannels.map((c) => (
              <option value={c.id} key={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Kayıt türü">
          <select name="kind" defaultValue={data.filters.kind ?? ""}>
            {!["satislar", "alimlar", "giderler", "vergiler"].includes(
              view,
            ) && <option value="">Tüm kayıtlar</option>}
            {recordKinds
              .filter((k) =>
                view === "satislar"
                  ? k.id === "SALE"
                  : view === "alimlar"
                    ? ["PRODUCT_PURCHASE", "MATERIAL_PURCHASE"].includes(k.id)
                    : view === "giderler"
                      ? k.id === "EXPENSE"
                      : view === "vergiler"
                        ? k.id === "TAX"
                        : true,
              )
              .map((k) => (
                <option key={k.id} value={k.id}>
                  {k.name}
                </option>
              ))}
          </select>
        </Field>
        {["ozet", "raporlar"].includes(view) && (
          <Field label="Görünüm">
            <select name="group" defaultValue={data.filters.group}>
              <option value="day">Günlük</option>
              <option value="week">Haftalık</option>
              <option value="month">Aylık</option>
            </select>
          </Field>
        )}
        <Field label="Kayıt ara">
          <input
            name="search"
            defaultValue={data.filters.search}
            placeholder="Müşteri, QN kodu, belge…"
            maxLength={120}
          />
        </Field>
        <button className="company-button" type="submit">
          <MagnifyingGlass size={17} />
          Uygula
        </button>
      </form>
    </section>
  );
}
function PeriodChart({ data }: { data: OpsData }) {
  const periods = data.dashboard?.periods ?? [],
    visible = periods.slice(-24);
  const max = Math.max(
    1,
    ...visible.flatMap((p) => [p.incomeMinor, p.expenseMinor, p.salesMinor]),
  );
  if (!periods.length)
    return (
      <Empty
        title="Hareketler burada görünür"
        text="İlk kayıt ve ödemelerin ardından dönem grafiğiniz oluşur."
      />
    );
  return (
    <>
      <div
        className="company-chart"
        role="img"
        aria-label="Dönem satış ve nakit hareketleri. Kesin tutarlar mali raporların dönem dökümünde yer alır."
      >
        {visible.map((p) => (
          <div
            className="company-chart-column"
            key={p.date}
            title={`${day(p.date)} · Satış ${money(p.salesMinor)} · Giriş ${money(p.incomeMinor)} · Çıkış ${money(p.expenseMinor)}`}
          >
            <div>
              <span
                className="sales"
                style={{ height: `${(p.salesMinor / max) * 100}%` }}
              />
              <span
                className="income"
                style={{ height: `${(p.incomeMinor / max) * 100}%` }}
              />
              <span
                className="expense"
                style={{ height: `${(p.expenseMinor / max) * 100}%` }}
              />
            </div>
            <small>
              {p.date.slice(8, 10)}.{p.date.slice(5, 7)}
            </small>
          </div>
        ))}
      </div>
      <div className="company-chart-legend">
        <span>
          <i className="sales" />
          Satış
        </span>
        <span>
          <i className="income" />
          Nakit giriş
        </span>
        <span>
          <i className="expense" />
          Nakit çıkış
        </span>
        {periods.length > 24 && <small>Son 24 dönem gösteriliyor</small>}
      </div>
    </>
  );
}
function PaymentTable({ data }: { data: OpsData }) {
  return (
    <section className="company-card">
      <div className="company-section-heading">
        <div>
          <h2>Gerçekleşen para hareketleri</h2>
          <p>
            Seçili dönemin son 300 hareketi · Kesinti sonrası gerçek tutarlar
          </p>
        </div>
      </div>
      {data.payments.length ? (
        <div className="company-table-wrap">
          <table className="company-table">
            <thead>
              <tr>
                <th>Tarih / kayıt</th>
                <th>Müşteri / firma</th>
                <th>Hesap</th>
                <th>İşlem</th>
                <th className="number">Mahsup</th>
                <th className="number">Kesinti</th>
                <th className="number">Gerçek hareket</th>
              </tr>
            </thead>
            <tbody>
              {data.payments.map((p) => (
                <tr key={p.id}>
                  <td>
                    {day(p.date)}
                    <small>{p.recordNumber}</small>
                  </td>
                  <td>{p.party || "—"}</td>
                  <td>
                    {p.accountName}
                    <small>
                      {p.method === "BANK"
                        ? "Havale / EFT"
                        : p.method === "CARD"
                          ? "Kart"
                          : "Nakit"}
                    </small>
                  </td>
                  <td>
                    <span
                      className={`company-status ${p.flow === "IN" ? "paid" : "pending"}`}
                    >
                      {p.refund ? "İade · " : ""}
                      {p.flow === "IN" ? "Giriş" : "Çıkış"}
                    </span>
                  </td>
                  <td className="number">{money(p.grossMinor)}</td>
                  <td className="number">
                    {money(p.commissionMinor + p.shippingMinor)}
                  </td>
                  <td className="number">
                    <strong>
                      {p.flow === "IN" ? "+" : "−"}
                      {money(p.netMinor)}
                    </strong>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <Empty
          title="Henüz para hareketi yok"
          text="Satış ve gider kayıtlarının detayından tahsilat veya ödeme ekleyin."
        />
      )}
    </section>
  );
}
function CostTable({
  data,
  edit,
}: {
  data: OpsData;
  edit: (id: string) => void;
}) {
  const [search, setSearch] = useState("");
  const products = data.catalog.filter((p) =>
    (p.sku + " " + p.name)
      .toLocaleLowerCase("tr")
      .includes(search.toLocaleLowerCase("tr")),
  );
  return (
    <>
      <div className="company-cost-search">
        <Field label="Ürün ara">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="QN kodu veya ürün adı"
          />
        </Field>
      </div>
      <div className="company-table-wrap">
        <table className="company-table">
          <thead>
            <tr>
              <th>Ürün</th>
              <th className="number">Vitrin fiyatı</th>
              <th className="number">Birim maliyet</th>
              <th className="number">Fiyat − maliyet</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {products.map((p) => (
              <tr key={p.id}>
                <td>
                  <div className="company-product-cell">
                    <Image src={p.image} alt="" width={48} height={48} />
                    <div>
                      <strong>{p.name}</strong>
                      <small>{p.sku}</small>
                    </div>
                  </div>
                </td>
                <td className="number">{money(p.priceMinor)}</td>
                <td className="number">
                  {p.unitCostMinor == null ? (
                    <span className="company-status pending">Girilmedi</span>
                  ) : (
                    money(p.unitCostMinor)
                  )}
                </td>
                <td className="number">
                  {p.unitCostMinor == null
                    ? "—"
                    : money(p.priceMinor - p.unitCostMinor)}
                </td>
                <td>
                  <button className="company-button" onClick={() => edit(p.id)}>
                    <PencilSimple size={17} />
                    Düzenle
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
function RecordPreview({
  record,
  owner,
}: {
  record: BusinessRecord | NonNullable<Amendment["proposed"]>;
  owner: boolean;
}) {
  return (
    <>
      <dl className="company-detail-grid">
        <div>
          <dt>Müşteri / firma</dt>
          <dd>{record.party || "—"}</dd>
        </div>
        <div>
          <dt>İşlem tarihi</dt>
          <dd>{day(record.date)}</dd>
        </div>
        <div>
          <dt>Tür / kanal</dt>
          <dd>
            {kindName(record.kind)} ·{" "}
            {record.channel
              ? channelName(record.channel)
              : record.category || "—"}
          </dd>
        </div>
        <div>
          <dt>Vade</dt>
          <dd>{record.dueDate ? day(record.dueDate) : "Belirlenmedi"}</dd>
        </div>
        <div>
          <dt>Belge no</dt>
          <dd>{record.documentNo || "—"}</dd>
        </div>
        <div>
          <dt>Açıklama</dt>
          <dd>{record.description || "—"}</dd>
        </div>
      </dl>
      {record.lines.length > 0 && (
        <div className="company-table-wrap">
          <table className="company-table">
            <thead>
              <tr>
                <th>Ürün / malzeme</th>
                <th>Adet</th>
                <th className="number">Birim fiyat</th>
                <th className="number">İndirim</th>
                {owner && record.kind === "SALE" && (
                  <th className="number">Birim maliyet</th>
                )}
              </tr>
            </thead>
            <tbody>
              {record.lines.map((l, i) => (
                <tr key={i}>
                  <td>
                    {l.name}
                    <small>{l.sku}</small>
                  </td>
                  <td>{l.quantity}</td>
                  <td className="number">{money(l.unitPriceMinor)}</td>
                  <td className="number">{money(l.discountMinor)}</td>
                  {owner && record.kind === "SALE" && (
                    <td className="number">
                      {l.unitCostMinor == null
                        ? "Bilinmiyor"
                        : money(l.unitCostMinor)}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
function RecordDetail({
  record,
  owner,
}: {
  record: BusinessRecord;
  owner: boolean;
}) {
  return (
    <>
      <RecordPreview record={record} owner={owner} />
      <div className="company-detail-totals">
        <div>
          <span>Kayıt tutarı</span>
          <strong>{money(record.amountMinor)}</strong>
        </div>
        <div>
          <span>Mahsup edilen</span>
          <strong>{money(record.settledMinor)}</strong>
        </div>
        <div>
          <span>Güncel kalan</span>
          <strong>{money(record.remainingMinor)}</strong>
        </div>
      </div>
    </>
  );
}
function AsyncButton({
  run,
  done,
  children,
}: {
  run: () => Promise<unknown>;
  done: () => void;
  children: React.ReactNode;
}) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  return (
    <div>
      <button
        className="company-button"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          setError("");
          try {
            await run();
            done();
          } catch (e) {
            setError(e instanceof Error ? e.message : "İşlem yapılamadı.");
          } finally {
            setBusy(false);
          }
        }}
      >
        {busy ? "Kaydediliyor…" : children}
      </button>
      {error && (
        <p role="alert" className="company-error">
          {error}
        </p>
      )}
    </div>
  );
}
