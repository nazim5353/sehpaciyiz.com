import Link from "next/link";
export default function NotFound() {
  return (
    <main className="empty-state not-found">
      <span className="logo">
        sehpacıyız<span>.</span>
      </span>
      <h1>Bu köşeyi bulamadık.</h1>
      <p>Aradığınız ürün kaldırılmış veya adres değişmiş olabilir.</p>
      <Link className="button primary" href="/">
        Ana sayfaya dön
      </Link>
    </main>
  );
}
