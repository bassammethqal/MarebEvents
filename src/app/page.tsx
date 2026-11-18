import { Suspense } from "react";
import Link from "next/link";
import { getCurrentSession } from "@/lib/auth/session";
import { logoutAction } from "@/lib/auth/actions";
import { client } from "@/db";
import { getUserFavoriteIds } from "@/lib/favorites/actions";
import { MessageCircle } from "lucide-react";
import { Pin3D, Wedding3D } from "@/components/ui/Icons3D";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { NotificationPopover } from "@/components/ui/NotificationPopover";
import {
  VenueFeedWithFilter,
  VenueItem,
} from "@/components/home/VenueFeedWithFilter";

export const instant = false;

async function getFeaturedVenues(): Promise<VenueItem[]> {
  try {
    const rows = await client<VenueItem[]>`
      SELECT 
        v.id,
        v.name,
        v.slug,
        v.description,
        v.city,
        v.district,
        v.contact_phone,
        v.contact_whatsapp,
        v.default_currency,
        c.name_ar as category_name,
        (SELECT image_url FROM venue_images WHERE venue_id = v.id AND is_cover = true LIMIT 1) as cover_image,
        (SELECT MIN(price) FROM pricing_tiers WHERE venue_id = v.id AND shift = 'evening') as starting_price,
        (SELECT MAX(capacity_max) FROM venue_units WHERE venue_id = v.id) as max_capacity
      FROM venues v
      LEFT JOIN venue_categories c ON c.id = v.category_id
      WHERE v.status = 'active'
      ORDER BY v.featured DESC, v.created_at DESC
    `;
    return rows;
  } catch (error) {
    console.error("Failed to load featured venues:", error);
    return [];
  }
}

async function UserStatusHeader() {
  const current = await getCurrentSession();
  const user = current?.user;

  if (user) {
    const firstName = user.fullName.trim().split(" ")[0] || user.fullName;
    return (
      <div className="flex items-center gap-2">
        <Link
          href="/account"
          className="flex items-center gap-1.5 text-xs font-bold text-slate-800 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 px-2.5 py-1 rounded-full transition"
        >
          <span className="h-2 w-2 rounded-full bg-emerald-500 shrink-0" />
          <span className="max-w-[70px] truncate">{firstName}</span>
        </Link>
        <form action={logoutAction}>
          <button
            type="submit"
            aria-label="تسجيل الخروج"
            className="text-[10px] text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-950/70 px-2 py-1 rounded-full transition font-semibold"
          >
            خروج
          </button>
        </form>
      </div>
    );
  }

  return (
    <Link
      href="/login"
      className="text-xs font-bold text-slate-700 dark:text-slate-300 hover:text-slate-900 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 px-3 py-1 rounded-full transition"
    >
      دخول
    </Link>
  );
}

export default async function HomePage() {
  const venues = await getFeaturedVenues();
  const session = await getCurrentSession();
  const favoriteVenueIds = session?.user
    ? await getUserFavoriteIds(session.user.id)
    : [];

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col selection:bg-amber-500/20 selection:text-amber-900 scroll-smooth">
      {/* 1. Top Clean Header (h-16, bg-white/95) */}
      <header className="h-16 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md sticky top-0 z-30 px-4 flex items-center justify-between border-b border-slate-100 dark:border-slate-800 shadow-xs">
        {/* Right: Brand Icon & Name */}
        <Link href="/" className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-amber-500 text-slate-950 font-black flex items-center justify-center text-xl shadow-xs shrink-0">
            م
          </div>
          <span className="text-lg font-black text-slate-900 dark:text-white tracking-tight">
            مأرب إيفنتس
          </span>
        </Link>

        {/* Center: Location Capsule */}
        <div className="bg-slate-100/80 dark:bg-slate-800/80 px-3 py-1.5 rounded-full flex items-center gap-1.5 text-center shadow-2xs">
          <Pin3D className="w-4 h-4 shrink-0" />
          <div className="text-right">
            <div className="text-[10px] text-slate-400 font-medium leading-none">
              موقعك الحالي
            </div>
            <div className="text-xs font-bold text-slate-800 dark:text-slate-200 leading-tight">
              مأرب، اليمن
            </div>
          </div>
        </div>

        {/* Left: Action Buttons (ThemeToggle, NotificationPopover) */}
        <div className="flex items-center gap-1.5">
          <ThemeToggle />
          <NotificationPopover />
        </div>
      </header>

      {/* Sub-header User strip */}
      <div className="px-4 pt-2.5 pb-1 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
        <span className="font-medium">مرحباً بك في مأرب</span>
        <Suspense
          fallback={
            <div className="h-6 w-16 bg-slate-200 dark:bg-slate-800 rounded-full animate-pulse" />
          }
        >
          <UserStatusHeader />
        </Suspense>
      </div>

      {/* 2. Hero Card (Dark Gradient Banner) */}
      <div className="px-4 pt-2">
        <div className="rounded-3xl bg-gradient-to-br from-slate-900 via-slate-800 to-amber-950 p-6 text-white relative overflow-hidden shadow-lg">
          {/* Subtle Geometric / Arch Watermark in bottom left */}
          <div className="pointer-events-none absolute -bottom-6 -left-6 w-36 h-36 opacity-10 flex items-center justify-center">
            <svg
              viewBox="0 0 100 100"
              fill="none"
              className="w-full h-full text-white stroke-current"
              strokeWidth="4"
            >
              <path d="M 20 80 V 45 C 20 30 35 18 50 18 C 65 18 80 30 80 45 V 80" />
              <circle cx="50" cy="40" r="12" fill="white" fillOpacity="0.3" />
            </svg>
          </div>

          <div className="relative z-10">
            <div className="text-xs text-amber-300 font-medium mb-1">
              مناسبتك القادمة تبدأ من هنا
            </div>
            <h1 className="text-2xl font-black leading-snug mb-2">
              قاعتك أو استراحتك
              <br />
              على بُعد حجز
            </h1>
            <p className="text-xs text-slate-300 leading-relaxed mb-5 max-w-[260px] font-normal">
              اكتشف أرقى قاعات الأفراح والشاليهات في مأرب واحجز موعدك بسهولة وبضمان ذري.
            </p>
            <Link
              href="/explore"
              className="inline-flex items-center gap-2 bg-white text-slate-900 font-bold text-xs px-5 py-2.5 rounded-full shadow-sm hover:bg-amber-50 transition active:scale-95 cursor-pointer"
            >
              <span>استكشف القاعات</span>
              <span>←</span>
            </Link>
          </div>
        </div>
      </div>

      {/* 3. Direct Venues Section with Category Filtering & Real-time Search */}
      <section id="venues" className="px-4 pt-6 pb-2">
        <div className="flex items-end justify-between pb-3">
          <div>
            <div className="text-[11px] text-slate-400 font-medium">مختارة لك</div>
            <h2 className="text-lg font-black text-slate-900 dark:text-white tracking-tight">
              قاعات واستراحات قريبة منك
            </h2>
          </div>
          <span className="text-xs text-slate-400 font-semibold">مأرب</span>
        </div>

        <VenueFeedWithFilter
          venues={venues}
          favoriteVenueIds={favoriteVenueIds}
        />
      </section>

      {/* 4. Quick Guarantees & Support Strip */}
      <section className="px-4 py-6">
        <div className="bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-900/40 rounded-3xl p-5 text-right">
          <div className="flex items-center gap-2 mb-2">
            <Wedding3D className="w-5 h-5 shrink-0" />
            <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100">
              ضمان حجز مأرب الذري 100%
            </h3>
          </div>
          <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed mb-3">
            جميع المواعيد مفحوصة بدقة برمجية تمنع أي تعارض في الفترات الصباحية أو المسائية، مع أسعار مباشرة ومعتمدة.
          </p>
          <div className="flex items-center justify-between pt-2 border-t border-amber-200/50 dark:border-amber-900/40 text-[11px]">
            <a
              href="https://wa.me/967777123456"
              target="_blank"
              rel="noopener noreferrer"
              className="text-emerald-700 dark:text-emerald-400 font-bold flex items-center gap-1 hover:underline"
            >
              <MessageCircle className="w-3.5 h-3.5" />
              <span>واتساب الدعم: 777123456</span>
            </a>
            <span className="text-slate-400">مأرب، اليمن</span>
          </div>
        </div>
      </section>

      {/* 5. Clean Mobile Footer */}
      <footer className="mt-auto bg-slate-50 dark:bg-slate-900 border-t border-slate-200/70 dark:border-slate-800 py-6 px-4 text-center text-xs text-slate-500 dark:text-slate-400">
        <div className="font-bold text-slate-700 dark:text-slate-300 mb-1">
          منصة فعاليات مأرب © 2026
        </div>
        <div className="text-[10px] text-slate-400">
          الوجهة الذكية الأولى لحجز القاعات والاستراحات بخط ثمانية
        </div>
      </footer>
    </div>
  );
}
