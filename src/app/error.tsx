"use client";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main className="empty-state not-found">
      <h1>Sayfa şu anda yüklenemedi.</h1>
      <p>
        Biraz sonra tekrar deneyin. Sorun sürerse mağaza yöneticisine ulaşın.
      </p>
      <button className="button primary" onClick={reset}>
        Tekrar dene
      </button>
    </main>
  );
}
