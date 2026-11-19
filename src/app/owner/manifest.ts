import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "إدارة منشآت مأرب إيفنتس",
    short_name: "إدارة المنشآت",
    description: "تطبيق وبوابة أصحاب القاعات والشاليهات في مأرب لمتابعة الحجوزات والتقويم وتحديث الأسعار",
    start_url: "/owner",
    scope: "/owner",
    display: "standalone",
    background_color: "#020617",
    theme_color: "#f59e0b",
    orientation: "portrait",
    dir: "rtl",
    lang: "ar",
    categories: ["business", "productivity"],
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
