import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

const thmanyah = localFont({
  src: [
    {
      path: "../fonts/thmanyahsans-Regular.woff2",
      weight: "400",
      style: "normal",
    },
    {
      path: "../fonts/thmanyahsans-Medium.woff2",
      weight: "500",
      style: "normal",
    },
    {
      path: "../fonts/thmanyahsans-Bold.woff2",
      weight: "700",
      style: "normal",
    },
    {
      path: "../fonts/thmanyahsans-Black.woff2",
      weight: "900",
      style: "normal",
    },
  ],
  variable: "--font-thmanyah",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Mareb Events | منصة مأرب إيفنتس لحجز القاعات والاستراحات",
  description:
    "المنصة الأولى والوجهة الرائدة في مدينة مأرب لحجز قاعات الأفراح والمناسبات والاستراحات والشاليهات بكل سهولة وموثوقية.",
  keywords: [
    "مأرب",
    "قاعات مأرب",
    "أفراح مأرب",
    "استراحات مأرب",
    "شاليهات مأرب",
    "حجز قاعات",
    "Mareb Events",
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl" className={thmanyah.variable}>
      <body className="min-h-screen bg-slate-950 font-sans text-slate-100 antialiased selection:bg-amber-500/20 selection:text-amber-300">
        {children}
      </body>
    </html>
  );
}
