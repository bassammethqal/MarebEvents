import { Suspense } from "react";
import Link from "next/link";
import { getCurrentSession } from "@/lib/auth/session";
import { sqlite } from "@/db";
import { CalendarCheck, MapPin, ArrowLeft, Building2 } from "lucide-react";

export const instant = false;

interface BookingRecord {
  id: string;
  booking_reference: string;
  venue_name: string;
  venue_city: string;
  venue_district: string;
  event_date: string;
  shift: string;
  status: string;
  total_amount: number;
  deposit_amount: number;
  currency: string;
}

function getCustomerBookings(userId: string): BookingRecord[] {
  try {
    const query = `
      SELECT 
        b.id,
        b.booking_reference,
        v.name as venue_name,
        v.city as venue_city,
        v.district as venue_district,
        b.event_date,
        b.shift,
        b.status,
        b.total_amount,
        b.deposit_amount,
        b.currency
      FROM bookings b
      JOIN venues v ON v.id = b.venue_id
      WHERE b.customer_id = ?
      ORDER BY b.created_at DESC
    `;
    return sqlite.prepare(query).all(userId) as BookingRecord[];
  } catch (error) {
    console.error("Failed to load customer bookings:", error);
    return [];
  }
}

function getStatusBadge(status: string) {
  switch (status) {
    case "confirmed":
      return { label: "مؤكد", bg: "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800" };
    case "pending_owner_approval":
      return { label: "بانتظار موافقة الإدارة", bg: "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800" };
    case "pending_payment":
      return { label: "بانتظار الدفع", bg: "bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800" };
    case "cancelled_by_customer":
    case "cancelled_by_owner":
      return { label: "ملغي", bg: "bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-800" };
    case "completed":
      return { label: "مكتمل", bg: "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700" };
    default:
      return { label: status, bg: "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700" };
  }
}

function getShiftLabel(shift: string) {
  switch (shift) {
    case "morning":
      return "صباحية (9:00 ص - 2:00 م)";
    case "evening":
      return "مسائية (4:00 م - 11:30 م)";
    case "full_day":
      return "يوم كامل (24 ساعة)";
    default:
      return shift;
  }
}

async function BookingsContent() {
  const current = await getCurrentSession();
  const user = current?.user;

  if (!user) {
    return (
      <div className="max-w-md mx-auto text-center py-16 px-4 bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-xs">
        <div className="h-16 w-16 rounded-2xl bg-amber-50 dark:bg-amber-950/50 flex items-center justify-center mx-auto mb-4 text-amber-600 dark:text-amber-400">
          <CalendarCheck className="w-8 h-8" />
        </div>
        <h2 className="text-base font-bold text-slate-900 dark:text-white mb-2">
          متابعة وإدارة حجوزاتك
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-6 leading-relaxed max-w-xs mx-auto">
          سجل دخولك لتتمكن من تتبع حالة طلباتك، مواعيد المناسبات، وتفاصيل الدفع وموافقة إدارة القاعات.
        </p>
        <Link
          href="/login?next=/my-bookings"
          className="inline-flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs py-3 px-6 rounded-xl transition shadow-xs active:scale-95"
        >
          تسجيل الدخول إلى حسابك
        </Link>
      </div>
    );
  }

  const bookings = getCustomerBookings(user.id);

  if (bookings.length === 0) {
    return (
      <div className="max-w-md mx-auto text-center py-16 px-4 bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-xs">
        <div className="h-16 w-16 rounded-2xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center mx-auto mb-4 text-slate-400">
          <Building2 className="w-8 h-8" />
        </div>
        <h2 className="text-base font-bold text-slate-900 dark:text-white mb-2">
          لا توجد حجوزات حتى الآن
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-6 leading-relaxed max-w-xs mx-auto">
          استكشف أرقى قاعات المناسبات والشاليهات والاستراحات في مدينة مأرب واحجز موعدك بسهولة وبضمان ذري.
        </p>
        <Link
          href="/"
          className="inline-flex items-center justify-center gap-2 bg-slate-900 dark:bg-amber-500 text-white dark:text-slate-950 font-bold text-xs py-2.5 px-6 rounded-xl transition shadow-xs"
        >
          تصفح القاعات المتاحة
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-12">
      {bookings.map((b) => {
        const badge = getStatusBadge(b.status);
        return (
          <div
            key={b.id}
            className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-4 shadow-xs hover:shadow-md transition"
          >
            <div className="flex items-start justify-between gap-3 mb-3">
              <div>
                <span className="text-[10px] font-mono text-slate-400 block mb-0.5">
                  رقم المرجع: {b.booking_reference}
                </span>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  {b.venue_name}
                </h3>
                <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 mt-1">
                  <MapPin className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                  <span>
                    {b.venue_city} - {b.venue_district}
                  </span>
                </div>
              </div>
              <span
                className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${badge.bg}`}
              >
                {badge.label}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 dark:bg-slate-800/50 p-3 rounded-2xl mb-3">
              <div>
                <span className="text-slate-400 block text-[10px]">تاريخ الحجز:</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">{b.event_date}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">الفترة:</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  {getShiftLabel(b.shift)}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
              <div>
                <span className="text-[10px] text-slate-400 block">إجمالي المبلغ:</span>
                <span className="text-sm font-black text-amber-600 dark:text-amber-400">
                  {b.total_amount.toLocaleString("ar-YE")} {b.currency}
                </span>
              </div>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-full">
                العربون: {b.deposit_amount.toLocaleString("ar-YE")} {b.currency}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function MyBookingsPage() {
  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-slate-950 text-slate-900 dark:text-slate-100 px-4 py-6">
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4 mb-6">
        <div>
          <h1 className="text-lg font-black">حجوزاتي</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            متابعة كافة طلباتك ومواعيد مناسباتك
          </p>
        </div>
        <Link
          href="/"
          className="text-xs text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-1 font-bold"
        >
          <span>الرئيسية</span>
          <ArrowLeft className="w-3.5 h-3.5" />
        </Link>
      </div>

      <Suspense
        fallback={
          <div className="max-w-md mx-auto py-16 text-center text-slate-400 text-xs">
            جاري تحميل الحجوزات...
          </div>
        }
      >
        <BookingsContent />
      </Suspense>
    </div>
  );
}
