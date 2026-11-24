import { NextResponse } from "next/server";

export async function GET() {
  const manifest = {
    id: "/admin",
    name: "إدارة منصة مأرب إيفنتس",
    short_name: "إدارة مأرب",
    description:
      "لوحة التحكم العليا لإدارة منصة فعاليات مأرب ومراقبة المنشآت والحجوزات",
    start_url: "/admin",
    scope: "/admin",
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

  return NextResponse.json(manifest, {
    headers: {
      "Content-Type": "application/manifest+json; charset=utf-8",
      "Cache-Control": "public, max-age=0, must-revalidate",
    },
  });
}
