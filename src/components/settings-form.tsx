"use client";
import { useState, type FormEvent } from "react";
import { FloppyDisk, CheckCircle, LockKey, Info } from "@phosphor-icons/react";
import { type Field, type Settings } from "@/lib/settings";
export function SettingsForm({
  section,
  fields,
  initial,
}: {
  section: string;
  fields: Field[];
  initial: Settings[string];
}) {
  const [values, setValues] = useState(initial);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState(false);
  const [dirty, setDirty] = useState(false);
  function change(key: string, value: string | boolean | number) {
    setValues((current) => ({ ...current, [key]: value }));
    setDirty(true);
    setMessage("");
  }
  async function save(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    setMessage("");
    try {
      const response = await fetch(`/api/admin/settings/${section}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setMessage("Ayarlar kaydedildi.");
      setError(false);
      setDirty(false);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Kayıt başarısız.");
      setError(true);
    } finally {
      setPending(false);
    }
  }
  return (
    <form onSubmit={save} className="settings-form">
      <div className="settings-panel">
        <div className="settings-panel-heading">
          <h2>Yapılandırma</h2>
          <span>{fields.length} ayar</span>
        </div>
        <div className="settings-fields">
          {fields.map((field) => (
            <div
              key={field.key}
              className={`field ${field.type === "textarea" ? "field-wide" : ""} ${field.type === "checkbox" ? "switch-field" : ""}`}
            >
              <label htmlFor={field.key}>
                {field.type === "password" && <LockKey size={14} />}
                {field.label}
              </label>
              {field.type === "checkbox" ? (
                <input
                  type="checkbox"
                  className="switch"
                  id={field.key}
                  checked={Boolean(values[field.key])}
                  onChange={(event) => change(field.key, event.target.checked)}
                />
              ) : field.type === "textarea" ? (
                <textarea
                  id={field.key}
                  rows={field.key === "heroDescription" ? 3 : 5}
                  value={String(values[field.key])}
                  onChange={(event) => change(field.key, event.target.value)}
                />
              ) : field.type === "select" ? (
                <select
                  id={field.key}
                  value={String(values[field.key])}
                  onChange={(event) => change(field.key, event.target.value)}
                >
                  {field.options?.map((option) => (
                    <option key={option}>{option}</option>
                  ))}
                </select>
              ) : (
                <input
                  id={field.key}
                  type={field.type ?? "text"}
                  autoComplete={
                    field.type === "password" ? "new-password" : "off"
                  }
                  value={String(values[field.key])}
                  min={field.min}
                  max={field.max}
                  maxLength={1000}
                  onChange={(event) =>
                    change(
                      field.key,
                      field.type === "number"
                        ? event.target.value === ""
                          ? ""
                          : Number(event.target.value)
                        : event.target.value,
                    )
                  }
                />
              )}
              {field.help && <p className="field-help">{field.help}</p>}
              {field.type === "password" && (
                <p className="field-help">
                  Şifrelenerek saklanır. Boş bırakırsanız mevcut değer korunur.
                </p>
              )}
            </div>
          ))}
        </div>
      </div>
      <aside className="settings-aside">
        <div className="admin-note">
          <Info size={22} />
          <h3>
            {["genel", "icerik", "kargo"].includes(section)
              ? "Mağazaya yansıyan ayarlar"
              : "Bağlantı hazırlığı"}
          </h3>
          <p>
            {section === "kargo"
              ? "Kargo ücreti ve ücretsiz kargo limiti sepet hesabına yansır. Taşıyıcı otomasyonu ayrı geliştirme adımıdır."
              : section === "genel"
                ? "Mağaza adı ve iletişim bilgileri vitrinde güncellenir. Vergi ve alışveriş tercihleri ödeme akışı tamamlandığında uygulanacak."
                : section === "icerik"
                  ? "Başlık ve açıklamalar kayıttan sonra ana sayfaya yansır."
                  : "Ayarları kaydetmek servisi etkinleştirmez. Bağlantı kodu ve uçtan uca test tamamlanınca devreye alınacak."}
          </p>
        </div>
        <div className="admin-note muted">
          <LockKey size={22} />
          <h3>Gizli bilgiler korunur</h3>
          <p>
            API anahtarları ve şifreler sunucuda şifrelenir. Tarayıcıya yalnızca
            maskelenmiş değer döner.
          </p>
        </div>
      </aside>
      <div className="settings-savebar">
        <div aria-live="polite">
          {message ? (
            <span className={error ? "form-error" : "save-success"}>
              {!error && <CheckCircle size={18} />}
              {message}
            </span>
          ) : dirty ? (
            "Kaydedilmemiş değişiklikler var."
          ) : (
            "Ayarlarınız güncel."
          )}
        </div>
        <button className="button primary" disabled={pending || !dirty}>
          <FloppyDisk size={18} />
          {pending ? "Kaydediliyor..." : "Değişiklikleri kaydet"}
        </button>
      </div>
    </form>
  );
}
