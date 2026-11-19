import { requireOwnerOrAdmin } from "@/lib/auth/guards";
import { client } from "@/db";
import { PendingBookingsList, PendingBookingItem } from "@/components/owner/PendingBookingsList";
import { OwnerOnboardingCard } from "@/components/owner/OwnerOnboardingCard";
import Link from "next/link";
import {
  Building2,
  CalendarCheck2,
  Clock,
  Coins,
  ShieldCheck,
  LogOut,
  ChevronLeft,
  ExternalLink,
  PlusCircle,
  CalendarDays,
  Sparkles,
} from "lucide-react";

export const instant = false;

interface RawBookingRow {
  id: string;
  booking_reference: string;
  venue_id: string;
  customer_id: string;
  event_date: string;
  shift: string;
  guest_count: number;
  status: string;
  total_amount: number;
  deposit_amount: number;
  customer_notes: string | null;
  created_at: string;
  venue_name: string;
  customer_name: string | null;
  customer_phone: string | null;
}

interface RawVenueRow {
  id: string;
  name: string;
  slug: string;
  status: string;
  city: string;
  district: string;
  cover_image_url?: string | null;
}

export default async function OwnerDashboardPage() {
  const { user } = await requireOwnerOrAdmin();

  // 1. جلب التصنيفات وقائمة المنشآت بالتوازي
  const [rawCategories, venues] = await Promise.all([
    client<[{ id: string; name_ar: string }]>`
      SELECT id, name_ar FROM venue_categories ORDER BY display_order ASC
    `,
    user.role === "admin"
      ? client<RawVenueRow[]>`
          SELECT id, name, slug, status, city, district
          FROM venues
          WHERE deleted_at IS NULL
          ORDER BY created_at DESC
          LIMIT 10
        `
      : client<RawVenueRow[]>`
          SELECT v.id, v.name, v.slug, v.status, v.city, v.district
          FROM venues v
          JOIN venue_members vm ON vm.venue_id = v.id
          WHERE vm.user_id = ${user.id} AND v.deleted_at IS NULL
          ORDER BY v.created_at DESC
        `,
  ]);

  const categories = rawCategories.map((c) => ({ id: c.id, nameAr: c.name_ar }));
  const venueIds = venues.map((v) => v.id);

  // 2. جلب الحجوزات المعلقة وإحصائيات الحجوزات المؤكدة بالتوازي
  let pendingBookings: RawBookingRow[] = [];
  let confirmedCount = 0;
  let totalRevenue = 0;

  if (venueIds.length > 0) {
    const [pendingRows, confirmedStatsRows] = await Promise.all([
      client<RawBookingRow[]>`
        SELECT 
          b.id,
          b.booking_reference,
          b.venue_id,
          b.customer_id,
          b.event_date,
          b.shift,
          b.guest_count,
          b.status,
          b.total_amount,
          b.deposit_amount,
          b.customer_notes,
          b.created_at,
          v.name as venue_name,
          u.full_name as customer_name,
          COALESCE(u.phone, '') as customer_phone
        FROM bookings b
        JOIN venues v ON v.id = b.venue_id
        LEFT JOIN users u ON u.id = b.customer_id
        WHERE b.venue_id = ANY(${venueIds})
          AND b.status IN ('pending_owner_approval', 'pending_payment')
        ORDER BY b.created_at DESC
      `,
      client<[{ count: string; total: string }?]>`
        SELECT 
          COUNT(*)::text as count,
          COALESCE(SUM(total_amount), 0)::text as total
        FROM bookings
        WHERE venue_id = ANY(${venueIds})
          AND status = 'confirmed'
      `,
    ]);

    pendingBookings = pendingRows;
    const confirmedStats = confirmedStatsRows[0];
    if (confirmedStats) {
      confirmedCount = parseInt(confirmedStats.count || "0", 10);
      totalRevenue = parseFloat(confirmedStats.total || "0");
    }
  }

  const pendingFormatted: PendingBookingItem[] = pendingBookings.map((b) => ({
    id: b.id,
    bookingReference: b.booking_reference,
    venueName: b.venue_name,
    customerName: b.customer_name || "عميل غير مسجل",
    customerPhone: b.customer_phone || "لا يوجد",
    eventDate: b.event_date,
    shift: b.shift,
    guestCount: b.guest_count || 100,
    totalAmount: b.total_amount || 0,
    customerNotes: b.customer_notes,
    createdAt: b.created_at,
  }));

  return (
    <div className="flex-1 flex flex-col p-4 sm:p-5 space-y-5 animate-in fade-in duration-300">
      {/* 1. Owner Profile Summary Card */}
      <div className="bg-white dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-3.5 flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-600 text-slate-950 font-black text-lg flex items-center justify-center shadow-md shadow-amber-500/20 shrink-0">
            {user.fullName.substring(0, 1)}
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h2 className="text-sm font-extrabold text-slate-900 dark:text-slate-100">
                {user.fullName}
              </h2>
              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
                <ShieldCheck className="w-3 h-3 text-emerald-700 dark:text-emerald-400" />
                مالك معتمد
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              {user.phone || user.email || "حساب منشآت معتمد"}
            </p>
          </div>
        </div>
      </div>

      {/* 2. Stats Grid (4 Cards) */}
      <div className="grid grid-cols-2 gap-2.5">
        {/* المنشآت */}
        <div className="bg-white dark:bg-slate-900/70 border border-slate-200/80 dark:border-slate-800/80 rounded-3xl p-3.5 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">منشآتي</span>
            <div className="w-7 h-7 rounded-xl bg-blue-500/10 text-blue-700 dark:text-blue-400 flex items-center justify-center">
              <Building2 className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-xl font-black text-slate-900 dark:text-slate-100">
            {venues.length}
          </div>
          <div className="text-[10px] text-slate-400">منشأة مسجلة باسمك</div>
        </div>

        {/* طلبات معلقة */}
        <div className="bg-white dark:bg-slate-900/70 border border-slate-200/80 dark:border-slate-800/80 rounded-3xl p-3.5 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">طلبات معلقة</span>
            <div className="w-7 h-7 rounded-xl bg-amber-500/10 text-amber-700 dark:text-amber-400 flex items-center justify-center relative">
              <Clock className="w-3.5 h-3.5" />
              {pendingBookings.length > 0 && (
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-amber-500 rounded-full animate-ping" />
              )}
            </div>
          </div>
          <div className="text-xl font-black text-amber-800 dark:text-amber-400">
            {pendingBookings.length}
          </div>
          <div className="text-[10px] text-slate-400">تحتاج موافقة المالك</div>
        </div>

        {/* حجوزات مؤكدة */}
        <div className="bg-white dark:bg-slate-900/70 border border-slate-200/80 dark:border-slate-800/80 rounded-3xl p-3.5 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">حجوزات مؤكدة</span>
            <div className="w-7 h-7 rounded-xl bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 flex items-center justify-center">
              <CalendarCheck2 className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-xl font-black text-emerald-800 dark:text-emerald-400">
            {confirmedCount}
          </div>
          <div className="text-[10px] text-slate-400">حجز معتمد ومكتمل</div>
        </div>

        {/* إجمالي الإيرادات */}
        <div className="bg-white dark:bg-slate-900/70 border border-slate-200/80 dark:border-slate-800/80 rounded-3xl p-3.5 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">الإيرادات</span>
            <div className="w-7 h-7 rounded-xl bg-purple-500/10 text-purple-700 dark:text-purple-400 flex items-center justify-center">
              <Coins className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-sm font-black text-purple-800 dark:text-purple-400 truncate">
            {totalRevenue.toLocaleString()} <span className="text-[10px] font-normal">ر.ي</span>
          </div>
          <div className="text-[10px] text-slate-400">إجمالي الحجوزات المؤكدة</div>
        </div>
      </div>

      {/* 3. Quick Shortcuts Banner */}
      <div className="grid grid-cols-2 gap-2">
        <Link
          href="/owner/calendar"
          prefetch={true}
          className="flex items-center gap-2 p-3 rounded-2xl bg-gradient-to-r from-amber-500/10 to-amber-600/10 border border-amber-500/20 hover:border-amber-500/40 text-amber-800 dark:text-amber-400 transition active:scale-95"
        >
          <CalendarDays className="w-4 h-4 shrink-0 text-amber-700 dark:text-amber-400" />
          <div className="text-right truncate">
            <div className="text-xs font-bold leading-tight">التقويم والجدولة</div>
            <div className="text-[10px] text-amber-700/80 dark:text-amber-400/80">إضافة حجز يدوي مباشر</div>
          </div>
        </Link>

        <Link
          href="/owner/venues"
          prefetch={true}
          className="flex items-center gap-2 p-3 rounded-2xl bg-gradient-to-r from-indigo-500/10 to-indigo-600/10 border border-indigo-500/20 hover:border-indigo-500/40 text-indigo-800 dark:text-indigo-400 transition active:scale-95"
        >
          <Sparkles className="w-4 h-4 shrink-0 text-indigo-700 dark:text-indigo-400" />
          <div className="text-right truncate">
            <div className="text-xs font-bold leading-tight">إعدادات المنشأة</div>
            <div className="text-[10px] text-indigo-700/80 dark:text-indigo-400/80">تحديث الأسعار والحالة</div>
          </div>
        </Link>
      </div>

      {/* 4. Owned Venues Quick Card */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
            <Building2 className="w-3.5 h-3.5 text-amber-700 dark:text-amber-400" />
            منشآتي المربوطة
          </h3>
          <Link
            href="/owner/venues"
            prefetch={true}
            className="text-[11px] font-semibold text-amber-800 dark:text-amber-400 flex items-center gap-0.5 hover:underline"
          >
            <span>إدارة وتعديل</span>
            <ChevronLeft className="w-3.5 h-3.5" />
          </Link>
        </div>

        {venues.length === 0 ? (
          <OwnerOnboardingCard categories={categories} />
        ) : (
          <div className="space-y-2">
            {venues.map((v) => (
              <div
                key={v.id}
                className="bg-white dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-3 flex items-center justify-between shadow-sm"
              >
                <div className="truncate">
                  <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                    {v.name}
                  </h4>
                  <p className="text-[10px] text-slate-400">
                    مأرب - {v.district}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span
                    className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                      v.status === "active"
                        ? "bg-emerald-500/10 text-emerald-800 dark:text-emerald-400 border border-emerald-500/20"
                        : "bg-slate-500/10 text-slate-800 dark:text-slate-400 border border-slate-500/20"
                    }`}
                  >
                    {v.status === "active" ? "نشط ومتاح" : "معلّق"}
                  </span>
                  <Link
                    href={`/venues/${v.slug}`}
                    target="_blank"
                    className="p-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition"
                    title="معاينة الصفحة العامة"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 5. Pending Booking Requests Section */}
      <div className="space-y-2 pt-1">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-amber-700 dark:text-amber-400" />
            طلبات الحجز الواردة ({pendingFormatted.length})
          </h3>
          <Link
            href="/owner/bookings"
            prefetch={true}
            className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-0.5 hover:text-slate-800 dark:hover:text-slate-200"
          >
            <span>كل الحجوزات</span>
            <ChevronLeft className="w-3.5 h-3.5" />
          </Link>
        </div>

        <PendingBookingsList bookings={pendingFormatted} />
      </div>
    </div>
  );
}
