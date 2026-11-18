import { Suspense } from "react";
import Link from "next/link";
import { getCurrentSession } from "@/lib/auth/session";
import { sqlite } from "@/db";
import { CalendarCheck, Clock, MapPin, AlertCircle, ArrowLeft, Building2 } from "lucide-react";

export const instant = false;

interface BookingRecord {
  id: string;
  booking_number: string;
  venue_name: string;
  venue_city: string;
  venue_district: string;
  start_date: string;
  end_date: string;
  shift: string;
  status: string;
  payment_status: string;
  total_price: number;
  currency: string;
}

function getCustomerBookings(userId: string): BookingRecord[] {
  try {
    const query = `
      SELECT 
        b.id,
        b.booking_number,
        v.name as venue_name,
        v.city as venue_city,
        v.district as venue_district,
        b.start_date,
        b.end_date,
        b.shift,
        b.status,
        b.payment_status,
        b.total_price,
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
      return { label: "مؤكد", bg: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" };
    case "pending_owner_approval":
      return { label: "بانتظار موافقة المالك", bg: "bg-amber-500/15 text-amber-300 border-amber-500/30" };
    case "pending_payment":
      return { label: "بانتظار الدفع", bg: "bg-blue-500/15 text-blue-300 border-blue-500/30" };
    case "cancelled":
      return { label: "ملغي", bg: "bg-red-500/15 text-red-400 border-red-500/30" };
    case "completed":
      return { label: "مكتمل", bg: "bg-slate-700/40 text-slate-300 border-slate-600/40" };
    default:
      return { label: status, bg: "bg-slate-800 text-slate-300 border-slate-700" };
  }
}

function getShiftLabel(shift: string) {
  switch (shift) {
    case "morning":
      return "الفترة الصباحية (9:00 ص - 2:00 م)";
    case "evening":
      return "الفترة المسائية (4:00 م - 11:30 م)";
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
      <div className="max-w-md mx-auto text-center py-16 px-4">
        <div className="h-16 w-16 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center mx-auto mb-4 text-amber-400">
          <CalendarCheck className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-white mb-2">متابعة وإدارة حجوزاتك</h2>
        <p className="text-sm text-slate-400 mb-6 leading-relaxed">
          سجل دخولك لتتمكن من تتبع حالة طلباتك، مواعيد المناسبات، وتفاصيل الدفع وموافقة إدارة القاعات.
        </p>
        <Link
          href="/login?next=/my-bookings"
          className="inline-flex items-center justify-center gap-2 w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-sm py-3.5 px-6 rounded-xl shadow-lg shadow-amber-500/20 transition active:scale-95"
        >
          تسجيل الدخول إلى حسابك
        </Link>
      </div>
    );
  }

  const bookings = getCustomerBookings(user.id);

  if (bookings.length === 0) {
    return (
      <div className="max-w-md mx-auto text-center py-16 px-4">
        <div className="h-16 w-16 rounded-2xl bg-slate-800/60 border border-slate-700/50 flex items-center justify-center mx-auto mb-4 text-slate-400">
          <Building2 className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-white mb-2">لا توجد حجوزات حتى الآن</h2>
        <p className="text-sm text-slate-400 mb-6 leading-relaxed">
          استكشف أرقى قاعات المناسبات والشاليهات والاستراحات في مدينة مأرب واحجز موعدك بسهولة.
        </p>
        <Link
          href="/"
          className="inline-flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-white font-bold text-sm py-3 px-6 rounded-xl border border-slate-700 transition"
        >
          تصفح القاعات المتاحة
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4 max-w-xl mx-auto pb-12">
      {bookings.map((b) => {
        const badge = getStatusBadge(b.status);
        return (
          <div
            key={b.id}
            className="bg-slate-900/90 border border-slate-800/90 rounded-2xl p-4 shadow-sm hover:border-slate-700 transition"
          >
            <div className="flex items-start justify-between gap-3 mb-3">
              <div>
                <span className="text-[10px] font-mono text-slate-400 block mb-0.5">
                  رقم الحجز: #{b.booking_number}
                </span>
                <h3 className="text-base font-bold text-white">{b.venue_name}</h3>
                <div className="flex items-center gap-1.5 text-xs text-slate-400 mt-1">
                  <MapPin className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span>
                    {b.venue_city} - {b.venue_district}
                  </span>
                </div>
              </div>
              <span
                className={`text-[11px] font-bold px-2.5 py-1 rounded-lg border ${badge.bg}`}
              >
                {badge.label}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs bg-slate-950/60 p-3 rounded-xl border border-slate-800/60 mb-3">
              <div>
                <span className="text-slate-400 block text-[10px]">تاريخ الحجز:</span>
                <span className="font-semibold text-slate-200">{b.start_date}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">الفترة:</span>
                <span className="font-semibold text-slate-200">{getShiftLabel(b.shift)}</span>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-800/60">
              <div>
                <span className="text-[10px] text-slate-400 block">إجمالي المبلغ:</span>
                <span className="text-sm font-bold text-amber-400">
                  {b.total_price.toLocaleString("ar-YE")} {b.currency}
                </span>
              </div>
              <span className="text-[11px] text-slate-400 bg-slate-800/80 px-2.5 py-1 rounded-md">
                حالة الدفع: {b.payment_status === "paid" ? "مدفوع ✓" : "غير مدفوع"}
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
    <div className="min-h-screen bg-slate-950 text-slate-100 px-4 py-6 md:py-10">
      <div className="max-w-xl mx-auto mb-6 flex items-center justify-between border-b border-slate-800/80 pb-4">
        <div>
          <h1 className="text-xl font-bold text-white">حجوزاتي</h1>
          <p className="text-xs text-slate-400">متابعة كافة طلباتك ومواعيد مناسباتك</p>
        </div>
        <Link
          href="/"
          className="text-xs text-amber-400 hover:text-amber-300 flex items-center gap-1 font-semibold"
        >
          <span>الرئيسية</span>
          <ArrowLeft className="w-3.5 h-3.5" />
        </Link>
      </div>

      <Suspense
        fallback={
          <div className="max-w-md mx-auto py-16 text-center text-slate-400 text-sm">
            جاري تحميل الحجوزات...
          </div>
        }
      >
        <BookingsContent />
      </Suspense>
    </div>
  );
}
