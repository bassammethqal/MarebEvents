import { Suspense } from "react";
import Link from "next/link";
import { getCurrentSession } from "@/lib/auth/session";
import { logoutAction } from "@/lib/auth/actions";
import { sqlite } from "@/db";
import {
  MapPin,
  Moon,
  Bell,
  Heart,
  Sparkles,
  Crown,
  Building2,
  Users,
  MessageCircle,
} from "lucide-react";

interface VenueCardData {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  city: string;
  district: string;
  contact_phone: string;
  contact_whatsapp: string | null;
  default_currency: string;
  category_name: string | null;
  cover_image: string | null;
  starting_price: number | null;
  max_capacity: number | null;
}

function getFeaturedVenues(): VenueCardData[] {
  try {
    const query = `
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
        (SELECT image_url FROM venue_images WHERE venue_id = v.id AND is_cover = 1 LIMIT 1) as cover_image,
        (SELECT MIN(price) FROM pricing_tiers WHERE venue_id = v.id AND shift = 'evening') as starting_price,
        (SELECT MAX(capacity_max) FROM venue_units WHERE venue_id = v.id) as max_capacity
      FROM venues v
      LEFT JOIN venue_categories c ON c.id = v.category_id
      WHERE v.status = 'active'
      ORDER BY v.featured DESC, v.created_at DESC
    `;
    return sqlite.prepare(query).all() as VenueCardData[];
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
          href="/my-bookings"
          className="flex items-center gap-1.5 text-xs font-bold text-slate-800 bg-slate-100 hover:bg-slate-200 px-2.5 py-1 rounded-full transition"
        >
          <span className="h-2 w-2 rounded-full bg-emerald-500 shrink-0" />
          <span className="max-w-[70px] truncate">{firstName}</span>
        </Link>
        <form action={logoutAction}>
          <button
            type="submit"
            aria-label="تسجيل الخروج"
            className="text-[10px] text-rose-600 bg-rose-50 hover:bg-rose-100 px-2 py-1 rounded-full transition font-semibold"
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
      className="text-xs font-bold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-3 py-1 rounded-full transition"
    >
      دخول
    </Link>
  );
}

export default function HomePage() {
  const venues = getFeaturedVenues();

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 flex flex-col selection:bg-amber-500/20 selection:text-amber-900">
      {/* 1. Top Clean Header (h-16, bg-white/95) */}
      <header className="h-16 bg-white/95 backdrop-blur-md sticky top-0 z-30 px-4 flex items-center justify-between border-b border-slate-100 shadow-xs">
        {/* Right: Brand Icon & Name */}
        <Link href="/" className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-amber-500 text-slate-950 font-black flex items-center justify-center text-xl shadow-xs shrink-0">
            م
          </div>
          <span className="text-lg font-black text-slate-900 tracking-tight">مأرب إيفنتس</span>
        </Link>

        {/* Center: Location Capsule */}
        <div className="bg-slate-100/80 px-3 py-1.5 rounded-full flex items-center gap-1.5 text-center shadow-2xs">
          <MapPin className="w-3.5 h-3.5 text-amber-600 shrink-0" />
          <div className="text-right">
            <div className="text-[10px] text-slate-400 font-medium leading-none">موقعك الحالي</div>
            <div className="text-xs font-bold text-slate-800 leading-tight">مأرب، اليمن</div>
          </div>
        </div>

        {/* Left: Action Buttons (Moon, Bell) + User */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            aria-label="تبديل المظهر"
            className="w-9 h-9 rounded-full border border-slate-200 bg-white flex items-center justify-center text-slate-700 hover:bg-slate-50 transition shadow-2xs"
          >
            <Moon className="w-4 h-4" />
          </button>
          <button
            type="button"
            aria-label="التنبيهات"
            className="w-9 h-9 rounded-full border border-slate-200 bg-white flex items-center justify-center text-slate-700 hover:bg-slate-50 transition shadow-2xs relative"
          >
            <Bell className="w-4 h-4" />
            <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-white" />
          </button>
        </div>
      </header>

      {/* Sub-header User strip */}
      <div className="px-4 pt-2.5 pb-1 flex items-center justify-between text-xs text-slate-500">
        <span className="font-medium text-slate-500">مرحباً بك في مأرب</span>
        <Suspense fallback={<div className="h-6 w-16 bg-slate-200 rounded-full animate-pulse" />}>
          <UserStatusHeader />
        </Suspense>
      </div>

      {/* 2. Hero Card (Dark Gradient Banner) */}
      <div className="px-4 pt-2">
        <div className="rounded-3xl bg-gradient-to-br from-slate-900 via-slate-800 to-amber-950 p-6 text-white relative overflow-hidden shadow-lg">
          {/* Subtle Geometric / Arch Watermark in bottom left */}
          <div className="pointer-events-none absolute -bottom-6 -left-6 w-36 h-36 opacity-10 flex items-center justify-center">
            <svg viewBox="0 0 100 100" fill="none" className="w-full h-full text-white stroke-current" strokeWidth="4">
              <path d="M 20 80 V 45 C 20 30 35 18 50 18 C 65 18 80 30 80 45 V 80" />
              <circle cx="50" cy="40" r="12" fill="white" fillOpacity="0.3" />
            </svg>
          </div>

          <div className="relative z-10">
            <div className="text-xs text-amber-300 font-medium mb-1">مناسبتك القادمة تبدأ من هنا</div>
            <h1 className="text-2xl font-black leading-snug mb-2">
              قاعتك أو استراحتك
              <br />
              على بُعد حجز
            </h1>
            <p className="text-xs text-slate-300 leading-relaxed mb-5 max-w-[260px] font-normal">
              اكتشف أرقى قاعات الأفراح والشاليهات في مأرب واحجز موعدك بسهولة.
            </p>
            <a
              href="#venues"
              className="inline-flex items-center gap-2 bg-white text-slate-900 font-bold text-xs px-5 py-2.5 rounded-full shadow-sm hover:bg-amber-50 transition active:scale-95"
            >
              <span>استكشف القاعات</span>
              <span>←</span>
            </a>
          </div>
        </div>
      </div>

      {/* 3. Direct Venues Section (First Screen Fold) */}
      <section id="venues" className="px-4 pt-6 pb-2">
        <div className="flex items-end justify-between pb-3">
          <div>
            <div className="text-[11px] text-slate-400 font-medium">مختارة لك</div>
            <h2 className="text-lg font-black text-slate-900 tracking-tight">قاعات واستراحات قريبة منك</h2>
          </div>
          <span className="text-xs text-slate-400 font-semibold">مأرب</span>
        </div>

        {venues.length === 0 ? (
          <div className="text-center py-14 bg-white rounded-3xl border border-slate-100 shadow-xs">
            <Building2 className="h-10 w-10 text-slate-300 mx-auto mb-2" />
            <h3 className="text-sm font-bold text-slate-800">لا توجد منشآت نشطة حالياً</h3>
            <p className="text-xs text-slate-400 mt-1">سيتم إضافة منشآت جديدة قريباً.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {venues.map((venue) => {
              const displayPrice = venue.starting_price
                ? `${venue.starting_price.toLocaleString("ar-YE")} ${venue.default_currency}`
                : "حسب الفترة";

              return (
                <div
                  key={venue.id}
                  className="bg-white rounded-3xl overflow-hidden border border-slate-100 shadow-sm hover:shadow-md transition duration-200"
                >
                  {/* Image Container with Badge & Heart */}
                  <div className="relative h-44 w-full bg-slate-100 overflow-hidden">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={
                        venue.cover_image ||
                        "https://images.unsplash.com/photo-1519167758481-83f550bb49b3?auto=format&fit=crop&w=800&q=80"
                      }
                      alt={venue.name}
                      className="w-full h-full object-cover"
                    />

                    {/* Top Right: Status / Category Badge */}
                    <div className="absolute top-3 right-3 bg-white/95 backdrop-blur-sm text-slate-800 text-[11px] font-bold px-3 py-1 rounded-full shadow-sm flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-amber-500" />
                      <span>{venue.category_name || "تأكيد فوري"}</span>
                    </div>

                    {/* Top Left: Heart Button */}
                    <button
                      type="button"
                      aria-label="إضافة للمفضلة"
                      className="absolute top-3 left-3 w-8 h-8 rounded-full bg-white/95 backdrop-blur-sm flex items-center justify-center text-rose-500 shadow-sm hover:scale-110 active:scale-95 transition"
                    >
                      <Heart className="w-4 h-4 fill-rose-50 text-rose-500" />
                    </button>
                  </div>

                  {/* Card Content */}
                  <div className="p-4 text-right">
                    <h3 className="font-bold text-base text-slate-900 leading-snug">{venue.name}</h3>

                    <div className="flex items-center gap-1 text-xs text-slate-500 mt-1 mb-3">
                      <MapPin className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                      <span>
                        {venue.city} - {venue.district}
                      </span>
                      {venue.max_capacity && (
                        <>
                          <span className="text-slate-300">•</span>
                          <Users className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>حتى {venue.max_capacity} ضيف</span>
                        </>
                      )}
                    </div>

                    {/* Price & Booking Button */}
                    <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                      <div>
                        <div className="text-[11px] text-slate-400 font-medium">ابتداءً من:</div>
                        <div className="text-sm font-black text-amber-700">{displayPrice}</div>
                      </div>

                      <a
                        href={`tel:${venue.contact_phone}`}
                        className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold px-4 py-2 rounded-xl transition shadow-xs active:scale-95"
                      >
                        احجز الآن
                      </a>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* 4. Quick Guarantees & Support Strip */}
      <section className="px-4 py-6">
        <div className="bg-amber-50/70 border border-amber-200/60 rounded-3xl p-5 text-right">
          <div className="flex items-center gap-2 mb-2">
            <Crown className="w-4 h-4 text-amber-600" />
            <h3 className="text-xs font-bold text-slate-900">ضمان حجز مأرب الذري 100%</h3>
          </div>
          <p className="text-[11px] text-slate-600 leading-relaxed mb-3">
            جميع المواعيد مفحوصة بدقة برمجية تمنع أي تعارض في الفترات الصباحية أو المسائية، مع أسعار مباشرة ومعتمدة.
          </p>
          <div className="flex items-center justify-between pt-2 border-t border-amber-200/50 text-[11px]">
            <a
              href="https://wa.me/967777123456"
              target="_blank"
              rel="noopener noreferrer"
              className="text-emerald-700 font-bold flex items-center gap-1 hover:underline"
            >
              <MessageCircle className="w-3.5 h-3.5" />
              <span>واتساب الدعم: 777123456</span>
            </a>
            <span className="text-slate-400">مأرب، اليمن</span>
          </div>
        </div>
      </section>

      {/* 5. Clean Mobile Footer */}
      <footer className="mt-auto bg-slate-50 border-t border-slate-200/70 py-6 px-4 text-center text-xs text-slate-500">
        <div className="font-bold text-slate-700 mb-1">منصة فعاليات مأرب © 2026</div>
        <div className="text-[10px] text-slate-400">الوجهة الذكية الأولى لحجز القاعات والاستراحات بخط ثمانية</div>
      </footer>
    </div>
  );
}
