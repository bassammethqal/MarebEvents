import { Suspense } from "react";
import Link from "next/link";
import { getCurrentSession } from "@/lib/auth/session";
import { logoutAction } from "@/lib/auth/actions";
import { sqlite } from "@/db";
import {
  MapPin,
  Users,
  Search,
  ShieldCheck,
  Clock,
  Sparkles,
  Phone,
  MessageCircle,
  Building2,
  CheckCircle2,
  ArrowLeft,
  ChevronLeft,
  Crown,
  Waves,
  Coffee,
  Zap,
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

async function AuthHeader() {
  const current = await getCurrentSession();
  const user = current?.user;

  if (user) {
    return (
      <div className="flex items-center gap-3 bg-slate-900/90 border border-slate-700/80 px-3.5 py-1.5 rounded-xl shadow-sm">
        <div className="text-right">
          <div className="text-xs font-bold text-white flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            {user.fullName}
          </div>
          <div className="text-[10px] text-amber-400 font-medium">
            {user.role === "admin"
              ? "مدير المنصة"
              : user.role === "owner"
              ? "مالك منشأة"
              : "عميل معتمد"}
          </div>
        </div>
        {user.role === "admin" && (
          <Link
            href="/admin"
            className="text-[11px] bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2.5 py-1 rounded-lg transition font-medium"
          >
            لوحة الإدارة
          </Link>
        )}
        {user.role === "owner" && (
          <Link
            href="/owner"
            className="text-[11px] bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2.5 py-1 rounded-lg transition font-medium"
          >
            إدارة منشآتي
          </Link>
        )}
        <form action={logoutAction}>
          <button
            type="submit"
            className="text-xs bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 px-2.5 py-1 rounded-lg transition font-medium"
          >
            خروج
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Link
        href="/login"
        className="text-xs font-semibold text-slate-200 hover:text-white px-3.5 py-2 rounded-xl border border-slate-800 bg-slate-900/80 hover:bg-slate-800 transition shadow-sm"
      >
        تسجيل الدخول
      </Link>
      <Link
        href="/register"
        className="text-xs font-bold text-slate-950 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 px-4 py-2 rounded-xl transition shadow-md shadow-amber-500/20"
      >
        حساب جديد
      </Link>
    </div>
  );
}

export default function HomePage() {
  const venues = getFeaturedVenues();

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-amber-500/30 selection:text-amber-200">
      {/* Decorative Background Elements */}
      <div className="pointer-events-none fixed -top-40 -right-40 h-[500px] w-[500px] rounded-full bg-amber-500/10 blur-[120px]" />
      <div className="pointer-events-none fixed top-1/2 -left-40 h-[600px] w-[600px] rounded-full bg-emerald-500/5 blur-[150px]" />
      <div className="pointer-events-none fixed -bottom-40 right-1/3 h-[500px] w-[500px] rounded-full bg-amber-600/5 blur-[140px]" />

      {/* Top Banner Notice */}
      <div className="relative z-20 bg-gradient-to-r from-amber-950/80 via-amber-900/60 to-slate-950 border-b border-amber-500/20 py-2 text-center text-xs text-amber-200 px-4 flex items-center justify-center gap-2">
        <Sparkles className="h-3.5 w-3.5 text-amber-400 shrink-0 animate-pulse" />
        <span className="font-bold">منصة مأرب إيفنتس الرسمية:</span>
        <span className="hidden sm:inline">أول منصة محلية لحجز قاعات واستراحات مأرب مع ضمان منع التعارض الزمني ذرياً بنسبة 100%.</span>
      </div>

      {/* Main Header / Navigation */}
      <header className="sticky top-0 z-40 border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-xl transition">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between gap-4">
          {/* Brand Logo */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className="h-11 w-11 rounded-2xl bg-gradient-to-tr from-amber-500 via-amber-400 to-amber-300 flex items-center justify-center font-black text-slate-950 text-2xl shadow-lg shadow-amber-500/25 group-hover:scale-105 transition">
              م
            </div>
            <div>
              <div className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center gap-1.5">
                <span>مأرب إيفنتس</span>
                <span className="text-[10px] text-amber-400 border border-amber-500/30 bg-amber-500/10 px-1.5 py-0.5 rounded font-bold uppercase">
                  Mareb
                </span>
              </div>
              <span className="text-[11px] text-slate-400 block font-normal -mt-0.5">
                بوابتك الموثوقة لحجز القاعات والاستراحات
              </span>
            </div>
          </Link>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-6 text-sm font-bold text-slate-300">
            <Link href="/" className="text-amber-400 transition">
              الرئيسية
            </Link>
            <a href="#featured-venues" className="hover:text-amber-300 transition">
              قاعات الأفراح
            </a>
            <a href="#featured-venues" className="hover:text-amber-300 transition">
              الشاليهات والمنتجعات
            </a>
            <a href="#how-it-works" className="hover:text-amber-300 transition">
              كيف يعمل الحجز؟
            </a>
            <a href="#why-us" className="hover:text-amber-300 transition">
              ضمانات المنصة
            </a>
          </nav>

          {/* User Auth Section */}
          <div className="flex items-center gap-3">
            <Suspense
              fallback={
                <div className="h-9 w-28 rounded-xl bg-slate-900 border border-slate-800 animate-pulse" />
              }
            >
              <AuthHeader />
            </Suspense>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative z-10 pt-12 pb-20 px-4 sm:px-6 text-center max-w-6xl mx-auto flex flex-col items-center">
        {/* Location Badge */}
        <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-4 py-1.5 text-xs font-bold text-amber-300 mb-6 shadow-inner">
          <MapPin className="h-3.5 w-3.5 text-amber-400" />
          <span>محافظة مأرب، الجمهورية اليمنية</span>
          <span className="h-1 w-1 rounded-full bg-amber-400" />
          <span className="text-slate-300 font-normal">حجوزات مباشرة ومؤكدة</span>
        </div>

        {/* Main Heading (Black 900) */}
        <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black tracking-tight text-white leading-[1.15] max-w-4xl mb-6">
          احجز أرقى <span className="bg-gradient-to-r from-amber-400 via-amber-300 to-amber-500 bg-clip-text text-transparent">قاعات واستراحات مأرب</span> بكل ثقة وضمان
        </h1>

        {/* Subheading (Bold 700) */}
        <p className="text-base sm:text-lg md:text-xl font-bold text-slate-300 max-w-3xl leading-relaxed mb-10">
          المنصة الذكية الأولى في محافظة مأرب لتصفح قاعات المناسبات الكبرى والشاليهات والاستراحات العائلية، مع تأكيد فوري ومنع قاطع لأي تعارض في المواعيد.
        </p>

        {/* Search & Filter Component */}
        <div className="w-full max-w-4xl bg-slate-900/90 border border-slate-800/90 rounded-2xl p-4 sm:p-5 shadow-2xl shadow-black/60 backdrop-blur-xl text-right">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
            {/* Category Select */}
            <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3">
              <label className="text-[11px] font-bold text-slate-400 block mb-1">نوع المنشأة</label>
              <select className="w-full bg-transparent text-sm font-bold text-white focus:outline-none cursor-pointer">
                <option value="" className="bg-slate-900 text-white">جميع التصنيفات</option>
                <option value="weddings" className="bg-slate-900 text-white">قاعات أفراح ومناسبات</option>
                <option value="chalets" className="bg-slate-900 text-white">شاليهات ومنتجعات خاصة</option>
                <option value="resthouses" className="bg-slate-900 text-white">استراحات عائلية</option>
                <option value="conferences" className="bg-slate-900 text-white">قاعات مؤتمرات وندوات</option>
              </select>
            </div>

            {/* Area / District Select */}
            <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3">
              <label className="text-[11px] font-bold text-slate-400 block mb-1">المنطقة في مأرب</label>
              <select className="w-full bg-transparent text-sm font-bold text-white focus:outline-none cursor-pointer">
                <option value="" className="bg-slate-900 text-white">كافة أحياء مأرب</option>
                <option value="al-majma" className="bg-slate-900 text-white">المجمع (شارع الأربعين / المحافظة)</option>
                <option value="rawdah" className="bg-slate-900 text-white">الروضة</option>
                <option value="jow-naseem" className="bg-slate-900 text-white">جو النسيم</option>
                <option value="faw" className="bg-slate-900 text-white">الفاو</option>
                <option value="kara" className="bg-slate-900 text-white">كرى والوادي</option>
              </select>
            </div>

            {/* Shift Select */}
            <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3">
              <label className="text-[11px] font-bold text-slate-400 block mb-1">الفترة الزمنية</label>
              <select className="w-full bg-transparent text-sm font-bold text-white focus:outline-none cursor-pointer">
                <option value="evening" className="bg-slate-900 text-white">الفترة المسائية (عصراً حتى منتصف الليل)</option>
                <option value="morning" className="bg-slate-900 text-white">الفترة الصباحية (صباحاً حتى ظهراً)</option>
                <option value="full_day" className="bg-slate-900 text-white">يوم كامل (صباحاً ومساءً)</option>
              </select>
            </div>

            {/* Capacity Select */}
            <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3">
              <label className="text-[11px] font-bold text-slate-400 block mb-1">سعة الضيوف المتوقعة</label>
              <select className="w-full bg-transparent text-sm font-bold text-white focus:outline-none cursor-pointer">
                <option value="" className="bg-slate-900 text-white">أي سعة</option>
                <option value="small" className="bg-slate-900 text-white">حتى 100 ضيف (عائلي)</option>
                <option value="medium" className="bg-slate-900 text-white">100 إلى 300 ضيف</option>
                <option value="large" className="bg-slate-900 text-white">300 إلى 500 ضيف</option>
                <option value="vip" className="bg-slate-900 text-white">500 إلى 700+ ضيف (كبرى)</option>
              </select>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1 border-t border-slate-800/80">
            <div className="text-xs text-slate-400 flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
              <span>فحص فوري ومباشر للتوافر ومنع التعارض الزمني عبر محرك SQLite الذري</span>
            </div>
            <a
              href="#featured-venues"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-black px-6 py-3 rounded-xl transition shadow-lg shadow-amber-500/20 text-sm"
            >
              <Search className="h-4 w-4" />
              <span>استعرض القاعات المتاحة</span>
            </a>
          </div>
        </div>

        {/* Trust Badges */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full max-w-4xl mt-12 text-right">
          <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shrink-0">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <div className="text-base font-black text-white">100% منع التعارض</div>
              <div className="text-xs text-slate-400 font-normal">حماية ذرية للمواعيد</div>
            </div>
          </div>

          <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <div className="text-base font-black text-white">منشآت معتمدة</div>
              <div className="text-xs text-slate-400 font-normal">مفحوصة ميدانياً في مأرب</div>
            </div>
          </div>

          <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 shrink-0">
              <Clock className="h-5 w-5" />
            </div>
            <div>
              <div className="text-base font-black text-white">تأكيد فوري</div>
              <div className="text-xs text-slate-400 font-normal">ودفع آمن بالعربون</div>
            </div>
          </div>

          <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 shrink-0">
              <Phone className="h-5 w-5" />
            </div>
            <div>
              <div className="text-base font-black text-white">دعم محلي 24/7</div>
              <div className="text-xs text-slate-400 font-normal">فريق مباشر في مأرب</div>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Venues Section */}
      <section id="featured-venues" className="relative z-10 py-16 px-4 sm:px-6 max-w-7xl mx-auto w-full">
        <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4 mb-10 border-b border-slate-800 pb-5">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-400 mb-2">
              <Crown className="h-4 w-4" />
              <span>الخيارات الأكثر طلباً في مأرب</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
              أبرز قاعات واستراحات مأرب المعتمدة
            </h2>
          </div>
          <p className="text-sm font-normal text-slate-400 max-w-md">
            استعرض المنشآت المفحوصة والمحدثة أسعارها مباشرة، واختر الفترة المناسبة لمناسبتك بكل طمأنينة.
          </p>
        </div>

        {venues.length === 0 ? (
          <div className="text-center py-16 bg-slate-900/40 rounded-3xl border border-slate-800">
            <Building2 className="h-12 w-12 text-slate-600 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-white mb-1">لا توجد منشآت نشطة حالياً</h3>
            <p className="text-sm text-slate-400">سيتم إضافة منشآت جديدة قريباً.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {venues.map((venue) => (
              <div
                key={venue.id}
                className="group relative bg-slate-900/70 border border-slate-800/90 hover:border-amber-500/40 rounded-3xl overflow-hidden transition-all duration-300 hover:shadow-2xl hover:shadow-amber-500/10 flex flex-col justify-between"
              >
                {/* Image & Badges */}
                <div className="relative aspect-[16/10] overflow-hidden bg-slate-800">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={venue.cover_image || "https://images.unsplash.com/photo-1519167758481-83f550bb49b3?auto=format&fit=crop&w=800&q=80"}
                    alt={venue.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent" />

                  {/* Top Badges */}
                  <div className="absolute top-3.5 right-3.5 flex items-center gap-2">
                    <span className="bg-slate-950/80 backdrop-blur-md border border-slate-700/80 text-amber-300 text-xs font-bold px-3 py-1 rounded-xl shadow-md">
                      {venue.category_name || "قاعة مناسبات"}
                    </span>
                  </div>

                  <div className="absolute top-3.5 left-3.5">
                    <span className="inline-flex items-center gap-1 bg-emerald-500/90 text-slate-950 text-[11px] font-black px-2.5 py-0.5 rounded-lg shadow-md">
                      <CheckCircle2 className="h-3 w-3" />
                      معتمد
                    </span>
                  </div>

                  {/* Bottom Image Info */}
                  <div className="absolute bottom-3.5 right-3.5 left-3.5 flex items-center justify-between text-xs text-slate-300">
                    <div className="flex items-center gap-1 text-slate-200 font-bold bg-slate-950/70 px-2.5 py-1 rounded-lg backdrop-blur-sm">
                      <MapPin className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                      <span>{venue.district}</span>
                    </div>

                    {venue.max_capacity && (
                      <div className="flex items-center gap-1 text-slate-200 font-bold bg-slate-950/70 px-2.5 py-1 rounded-lg backdrop-blur-sm">
                        <Users className="h-3.5 w-3.5 text-blue-400 shrink-0" />
                        <span>سعة تصل لـ {venue.max_capacity}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Card Body */}
                <div className="p-5 flex flex-col flex-1 justify-between">
                  <div>
                    <h3 className="text-xl font-bold text-white mb-2 group-hover:text-amber-300 transition line-clamp-1">
                      {venue.name}
                    </h3>
                    <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed mb-4">
                      {venue.description || "قاعة راقية متكاملة الخدمات للمناسبات والأفراح في مدينة مأرب."}
                    </p>

                    {/* Features Chips */}
                    <div className="flex flex-wrap gap-1.5 mb-5">
                      <span className="text-[11px] font-normal bg-slate-800/80 text-slate-300 px-2.5 py-1 rounded-lg border border-slate-700/60 flex items-center gap-1">
                        <Zap className="h-3 w-3 text-amber-400" />
                        مولد كهربائي 24/7
                      </span>
                      <span className="text-[11px] font-normal bg-slate-800/80 text-slate-300 px-2.5 py-1 rounded-lg border border-slate-700/60 flex items-center gap-1">
                        <Coffee className="h-3 w-3 text-amber-400" />
                        أقسام رجال ونساء
                      </span>
                      <span className="text-[11px] font-normal bg-slate-800/80 text-slate-300 px-2.5 py-1 rounded-lg border border-slate-700/60 flex items-center gap-1">
                        <Waves className="h-3 w-3 text-blue-400" />
                        تكييف مركزي
                      </span>
                    </div>
                  </div>

                  {/* Card Footer (Price & CTA) */}
                  <div className="pt-4 border-t border-slate-800 flex items-center justify-between gap-3">
                    <div>
                      <div className="text-[10px] text-slate-400 font-bold">يبدأ سعر الفترة من</div>
                      <div className="text-lg font-black text-amber-400">
                        {venue.starting_price
                          ? `${venue.starting_price.toLocaleString("en-US")} ${venue.default_currency}`
                          : "حسب الطلب"}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {venue.contact_whatsapp && (
                        <a
                          href={`https://wa.me/${venue.contact_whatsapp}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="h-9 w-9 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 transition"
                          title="تواصل عبر واتساب"
                        >
                          <MessageCircle className="h-4 w-4" />
                        </a>
                      )}
                      <Link
                        href={`/register`}
                        className="inline-flex items-center gap-1.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs px-3.5 py-2 rounded-xl transition shadow-md shadow-amber-500/15"
                      >
                        <span>احجز الآن</span>
                        <ChevronLeft className="h-3.5 w-3.5" />
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="relative z-10 py-16 bg-slate-900/40 border-y border-slate-800/80 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <span className="text-xs font-bold text-amber-400 uppercase tracking-wider mb-2 block">
              بساطة وسرعة وموثوقية
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-white mb-3">
              كيف يتم الحجز عبر مأرب إيفنتس في 3 خطوات؟
            </h2>
            <p className="text-sm font-normal text-slate-400">
              صممنا تجربة الحجز لتكون سهلة تماماً وتضمن حقك المالي وتوفر عليك عناء البحث الميداني.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-right">
            {/* Step 1 */}
            <div className="relative bg-slate-950/80 border border-slate-800 rounded-3xl p-6">
              <div className="h-12 w-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center font-black text-xl text-amber-400 mb-5">
                01
              </div>
              <h3 className="text-xl font-bold text-white mb-2">اختر القاعة أو الاستراحة</h3>
              <p className="text-xs text-slate-400 leading-relaxed font-normal">
                استعرض الصور الحقيقية والتفاصيل الدقيقة وسعات الأقسام والخدمات الإضافية المتاحة في مختلف أحياء مأرب.
              </p>
            </div>

            {/* Step 2 */}
            <div className="relative bg-slate-950/80 border border-slate-800 rounded-3xl p-6">
              <div className="h-12 w-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center font-black text-xl text-amber-400 mb-5">
                02
              </div>
              <h3 className="text-xl font-bold text-white mb-2">حدد التاريخ والفترة الزمنية</h3>
              <p className="text-xs text-slate-400 leading-relaxed font-normal">
                اختر الفترة الصباحية أو المسائية أو يوماً كاملاً؛ يقوم المحرك الذري بفحص التوافر اللحظي وحجز الفتحة مؤقتاً لك.
              </p>
            </div>

            {/* Step 3 */}
            <div className="relative bg-slate-950/80 border border-slate-800 rounded-3xl p-6">
              <div className="h-12 w-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center font-black text-xl text-amber-400 mb-5">
                03
              </div>
              <h3 className="text-xl font-bold text-white mb-2">ادفع العربون وأكّد حجزك</h3>
              <p className="text-xs text-slate-400 leading-relaxed font-normal">
                سدد عربون الحجز المعتمد عبر بوابات الدفع المحلية أو الحوالات البنكية المباشرة، واستلم إشعار التأكيد وسند الحجز فوراً.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Why Choose Us Section */}
      <section id="why-us" className="relative z-10 py-16 px-4 sm:px-6 max-w-6xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
          <div>
            <span className="text-xs font-bold text-amber-400 uppercase tracking-wider mb-2 block">
              معايير هندسية وأمان فائق
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-white mb-4 leading-tight">
              لماذا تعتبر منصة مأرب إيفنتس خيارك الآمن الأول؟
            </h2>
            <p className="text-sm font-normal text-slate-300 leading-relaxed mb-6">
              نحن لا نكتفي بعرض القاعات، بل ندير جدول المواعيد بتقنية حصرية تمنع الحجز المزدوج نهائياً، مع دعم مباشر لطرق السداد الشائعة في اليمن.
            </p>

            <div className="space-y-4 text-right">
              <div className="flex items-start gap-3">
                <div className="h-6 w-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                  <CheckCircle2 className="h-4 w-4" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">منع التضارب الزمني ذرياً (No Double Booking)</h4>
                  <p className="text-xs text-slate-400 font-normal">استحالة حجز نفس القسم أو المنشأة في نفس الفترة لشخصين عبر معاملات SQLite الحصرية.</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="h-6 w-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                  <CheckCircle2 className="h-4 w-4" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">أسعار شفافة ومباشرة من المالك</h4>
                  <p className="text-xs text-slate-400 font-normal">لا توجد رسوم خفية أو وسطاء؛ الأسعار مطابقة لما يُقدمه المالك تماماً بالريال اليمني أو السعودي.</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="h-6 w-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                  <CheckCircle2 className="h-4 w-4" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">مرونة حجز الأقسام الفردية أو المنشأة كاملة</h4>
                  <p className="text-xs text-slate-400 font-normal">إمكانية حجز قسم النساء فقط، أو قسم الرجال، أو حجز القصر كاملاً وفق رغبتك وميزانيتك.</p>
                </div>
              </div>
            </div>
          </div>

          <div className="relative bg-gradient-to-br from-amber-500/15 via-slate-900 to-slate-950 border border-amber-500/30 rounded-3xl p-8 shadow-2xl">
            <div className="text-xs font-bold text-amber-400 mb-2">الدعم الفني المحلي المباشر</div>
            <h3 className="text-2xl font-black text-white mb-3">فريقنا في مأرب بخدمتك دائماً</h3>
            <p className="text-xs text-slate-300 leading-relaxed mb-6 font-normal">
              هل تواجه أي استفسار أو تحتاج إلى مساعدة في التنسيق لمناسبتك الخاصة أو حجز قاعات المؤتمرات؟ تواصل معنا مباشرة عبر واتساب أو الهاتف.
            </p>

            <div className="flex flex-col sm:flex-row gap-3">
              <a
                href="https://wa.me/967777123456"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-5 py-3 rounded-xl transition text-xs shadow-lg shadow-emerald-500/20"
              >
                <MessageCircle className="h-4 w-4" />
                <span>تواصل عبر واتساب مأرب</span>
              </a>
              <a
                href="tel:777123456"
                className="inline-flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-white font-bold px-5 py-3 rounded-xl border border-slate-700 transition text-xs"
              >
                <Phone className="h-4 w-4" />
                <span>اتصال مباشر: 777123456</span>
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Owner CTA Section */}
      <section className="relative z-10 py-14 px-4 sm:px-6 max-w-5xl mx-auto w-full">
        <div className="bg-gradient-to-r from-amber-950/70 via-slate-900 to-amber-900/40 border border-amber-500/30 rounded-3xl p-8 sm:p-10 text-center flex flex-col items-center">
          <div className="h-12 w-12 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center mb-4">
            <Building2 className="h-6 w-6" />
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-white mb-2">
            هل تمتلك قاعة أفراح أو شاليهاً في محافظة مأرب؟
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 max-w-xl mb-6 font-normal">
            انضم إلى منصة مأرب إيفنتس، وأدر حجوزاتك إلكترونياً ومكتبياً بكل سهولة، واستقبل طلبات حجوزات مؤكدة من آلاف العملاء.
          </p>
          <Link
            href="/register"
            className="inline-flex items-center gap-2 bg-amber-400 hover:bg-amber-300 text-slate-950 font-black px-6 py-3 rounded-xl transition text-sm shadow-lg shadow-amber-500/25"
          >
            <span>سجّل منشأتك كمالك الآن</span>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </div>
      </section>

      {/* Modern Comprehensive Footer */}
      <footer className="relative z-10 border-t border-slate-800/80 bg-slate-950 pt-12 pb-8 px-4 sm:px-6 mt-auto">
        <div className="max-w-7xl mx-auto grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8 mb-10 text-right">
          {/* Brand Info */}
          <div>
            <div className="flex items-center gap-2.5 mb-3">
              <div className="h-8 w-8 rounded-xl bg-amber-400 flex items-center justify-center font-black text-slate-950 text-base">
                م
              </div>
              <span className="text-lg font-black text-white">مأرب إيفنتس</span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed font-normal mb-4">
              الوجهة الرقمية الأولى في محافظة مأرب لحجز قاعات الأفراح والمؤتمرات والاستراحات والشاليهات بكل موثوقية.
            </p>
            <div className="text-[11px] text-amber-400/90 font-medium">
              📍 مأرب - الجمهورية اليمنية
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-3">أقسام المنصة</h4>
            <ul className="space-y-2 text-xs text-slate-400 font-normal">
              <li><a href="#featured-venues" className="hover:text-amber-300 transition">قاعات الأفراح الكبرى</a></li>
              <li><a href="#featured-venues" className="hover:text-amber-300 transition">شاليهات ومنتجعات خاصة</a></li>
              <li><a href="#featured-venues" className="hover:text-amber-300 transition">استراحات عائلية وشبابية</a></li>
              <li><a href="#featured-venues" className="hover:text-amber-300 transition">قاعات المؤتمرات والندوات</a></li>
            </ul>
          </div>

          {/* Accepted Local Payments */}
          <div>
            <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-3">طرق السداد المعتمدة</h4>
            <ul className="space-y-2 text-xs text-slate-400 font-normal">
              <li>بنك الكريمي للتمويل الأصغر الإسلامي</li>
              <li>خدمة ون كاش (OneCash)</li>
              <li>محفظة فلوسك (Floosak)</li>
              <li>التحويلات والحوالات المصرفية المباشرة</li>
              <li>سداد نقدي عبر مكتب المنشأة</li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-3">تواصل معنا</h4>
            <ul className="space-y-2.5 text-xs text-slate-400 font-normal">
              <li className="flex items-center gap-2">
                <Phone className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                <span>هاتف: 777123456</span>
              </li>
              <li className="flex items-center gap-2">
                <MessageCircle className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                <span>واتساب: 967777123456+</span>
              </li>
              <li>ساعات الدعم: يومياً 8:00 ص - 11:00 م</li>
            </ul>
          </div>
        </div>

        <div className="max-w-7xl mx-auto pt-6 border-t border-slate-900 text-center text-xs text-slate-400 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div>جميع الحقوق محفوظة لمنصة مأرب إيفنتس (Mareb Events) © 2026</div>
          <div className="flex items-center gap-4 text-[11px] text-slate-400">
            <span>خط ثمانية (Thmanyah Sans) المعتمد</span>
            <span>•</span>
            <span>نظام محلي آمن 100% مع SQLite</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
