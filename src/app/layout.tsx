import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { AppShell } from "@/components/shell/AppShell";

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
  themeColor: "#FFFFFF",
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
    statusBarStyle: "default",
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
    <html lang="ar" dir="rtl" className={thmanyah.variable} suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem("theme");if(t==="dark"||(!t&&window.matchMedia("(prefers-color-scheme: dark)").matches)){document.documentElement.classList.add("dark");}else{document.documentElement.classList.remove("dark");}}catch(e){}})();if('serviceWorker'in navigator){navigator.serviceWorker.register('/sw.js').catch(function(){});}window.addEventListener('beforeinstallprompt',function(e){e.preventDefault();window.__pwaPrompt=e;if(typeof window.__pwaHandler==='function'){window.__pwaHandler(e);}});`,
          }}
        />
      </head>
      <body className="min-h-screen bg-[#EEF2F6] dark:bg-slate-950 font-sans text-slate-900 dark:text-slate-100 antialiased selection:bg-amber-500/20 selection:text-amber-800">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
