"use client";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, ShieldCheck, ChartLineUp } from "@phosphor-icons/react";

export function CompanyLogin({ setup }: { setup: boolean }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setPending(true);
    const data = new FormData(event.currentTarget);
    const password = String(data.get("password") ?? "");
    if (setup && password !== data.get("confirm")) {
      setError("Şifreler aynı olmalı.");
      setPending(false);
      return;
    }
    try {
      const response = await fetch("/api/operations/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: setup ? "setup" : "login",
          user: {
            ...(setup ? { name: data.get("name") } : {}),
            email: data.get("email"),
            password,
          },
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Giriş yapılamadı.");
      router.replace("/yonetim");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Bağlantı kurulamadı.");
    } finally {
      setPending(false);
    }
  }
  return (
    <main className="company-login">
      <div className="company-login-aside">
        <Link href="/" className="company-wordmark">
          sehpacıyız<span>.</span>
        </Link>
        <div>
          <span className="company-kicker">ŞİRKET ÇALIŞMA ALANI</span>
          <h1>
            İşinin bütün
            <br />
            rakamları,
            <br />
            <em>tek bir yerde.</em>
          </h1>
          <p>
            Satıştan tahsilata, ürün maliyetinden günlük giderlere.
            Sehpacıyız’ın işlerini birlikte takip edin.
          </p>
        </div>
        <span className="company-login-foot">
          <ChartLineUp size={19} /> Beş satış kanalı · Tek şirket görünümü
        </span>
      </div>
      <section className="company-login-main">
        <div className="company-login-box">
          <span className="company-kicker">
            {setup ? "İLK KURULUM" : "SEHPACIYIZ YÖNETİM"}
          </span>
          <h2>
            {setup
              ? "Şirket sahibi hesabını oluştur."
              : "Çalışma alanına hoş geldin."}
          </h2>
          <p>
            {setup
              ? "Bu ilk hesap, mali raporları ve personel yetkilerini yönetecek. Kurulumu bilgisayardaki 127.0.0.1 adresinden tamamla."
              : "Kendi hesabınla giriş yap. Görüntüleyebileceğin kayıtlar yetkine göre açılır."}
          </p>
          <form onSubmit={submit}>
            {setup && (
              <label>
                Ad soyad
                <input
                  name="name"
                  required
                  minLength={2}
                  maxLength={100}
                  autoComplete="name"
                />
              </label>
            )}
            <label>
              E-posta
              <input
                name="email"
                type="email"
                required
                autoComplete="username"
              />
            </label>
            <label>
              Şifre
              <input
                name="password"
                type="password"
                required
                minLength={setup ? 12 : 1}
                maxLength={128}
                autoComplete={setup ? "new-password" : "current-password"}
              />
              {setup && <small>En az 12 karakter kullan.</small>}
            </label>
            {setup && (
              <label>
                Şifreyi tekrar gir
                <input
                  name="confirm"
                  type="password"
                  required
                  minLength={12}
                  autoComplete="new-password"
                />
              </label>
            )}
            {error && (
              <p className="company-error" role="alert">
                {error}
              </p>
            )}
            <button className="company-button primary" disabled={pending}>
              {pending
                ? "Bağlanıyor…"
                : setup
                  ? "Hesabımı oluştur"
                  : "Oturum aç"}
              <ArrowRight size={18} />
            </button>
          </form>
          <div className="company-login-note">
            <ShieldCheck size={20} />
            <span>
              Kayıtlar kişisel hesaplarla tutulur. Personel hesaplarını şirket
              sahibi açar.
            </span>
          </div>
          <Link className="company-text-link" href="/">
            Mağazaya dön <ArrowRight size={15} />
          </Link>
        </div>
      </section>
    </main>
  );
}
