import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "فعاليات مأرب | حجز القاعات والاستراحات",
    short_name: "فعاليات مأرب",
    description: "المنصة الأولى في مأرب لحجز قاعات الأفراح والمناسبات والشاليهات والاستراحات بكل سهولة وموثوقية",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#020617",
    theme_color: "#f59e0b",
    orientation: "portrait",
    dir: "rtl",
    lang: "ar",
    categories: ["events", "lifestyle", "travel"],
    icons: [
      {
        src: "/icons/icon-192x192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512x512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-maskable-512x512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
