import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { PwaRegister } from "@/components/pwa/PwaRegister";
import { BottomNav } from "@/components/pwa/BottomNav";

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

export const viewport: Viewport = {
  themeColor: "#020617",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  title: "فعاليات مأرب | تطبيق حجز القاعات والشاليهات",
  description:
    "المنصة الأولى والوجهة الرائدة في مدينة مأرب لحجز قاعات الأفراح والمناسبات والاستراحات والشاليهات بكل سهولة وموثوقية.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "فعاليات مأرب",
  },
  icons: {
    icon: [
      { url: "/icons/icon-192x192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512x512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
  keywords: [
    "مأرب",
    "قاعات مأرب",
    "أفراح مأرب",
    "استراحات مأرب",
    "شاليهات مأرب",
    "حجز قاعات",
    "تطبيق مأرب",
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
        <PwaRegister />
        <div className="pb-16 md:pb-0 min-h-screen flex flex-col">{children}</div>
        <BottomNav />
      </body>
    </html>
  );
}
