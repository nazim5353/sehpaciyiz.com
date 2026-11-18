import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import Script from "next/script";
import "./globals.css";
import { brand, brandPalette } from "@/lib/brand";
const manrope = localFont({
  src: [
    {
      path: "../../public/fonts/manrope-regular.ttf",
      weight: "400",
      style: "normal",
    },
    {
      path: "../../public/fonts/manrope-semibold.ttf",
      weight: "600",
      style: "normal",
    },
    {
      path: "../../public/fonts/manrope-bold.ttf",
      weight: "700",
      style: "normal",
    },
  ],
  display: "swap",
  variable: "--font-manrope",
});
export const metadata: Metadata = {
  title: {
    default: brand.title,
    template: "%s | Sehpacıyız",
  },
  description: brand.description,
  icons: {
    icon: { url: "/brand/favicon.svg", type: "image/svg+xml" },
    apple: "/brand/apple-touch-icon.png",
  },
  robots: { index: false, follow: false },
  other: { "page-type": "product", "site-kind": "other" },
  metadataBase: new URL("http://127.0.0.1:3100"),
  openGraph: {
    title: brand.title,
    description:
      "Özgün modeller, özenli detaylar. Sehpacıyız sehpa ve yaşam alanı koleksiyonu.",
    locale: "tr_TR",
    type: "website",
    images: [
      {
        url: "/brand/sehpaciyiz-paylasim.png",
        width: 1200,
        height: 630,
        alt: "Sehpacıyız — Her açıdan özgün.",
      },
    ],
  },
  twitter: { card: "summary_large_image" },
};
export const viewport: Viewport = { themeColor: brandPalette.ink };
export const dynamic = "force-dynamic";
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="tr"
      data-type="product"
      data-radius="sharp"
      data-motion=""
      data-scroll-behavior="smooth"
      className={manrope.variable}
      suppressHydrationWarning
    >
      <body>
        <Script id="storefront-entrance" strategy="beforeInteractive">
          {
            "document.documentElement.classList.add('m-enter');setTimeout(()=>document.documentElement.classList.add('m-enter-done'),700);"
          }
        </Script>
        {children}
      </body>
    </html>
  );
}
