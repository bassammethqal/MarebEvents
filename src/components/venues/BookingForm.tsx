"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Calendar,
  CheckCircle2,
  AlertCircle,
  Sparkles,
} from "lucide-react";
import { createCustomerBookingAction, BookingActionResult } from "@/lib/booking/actions";

interface UnitOption {
  id: string;
  name: string;
  unitType: string;
  capacityMax: number;
}

interface PriceOption {
  shift: string;
  price: number;
  currency: string;
}

interface BookingFormProps {
  venueId: string;
  venueName: string;
  units: UnitOption[];
  pricing: PriceOption[];
  defaultCurrency: string;
  isAuthenticated: boolean;
}

export function BookingForm({
  venueId,
  venueName,
  units,
  pricing,
  defaultCurrency,
  isAuthenticated,
}: BookingFormProps) {
  const router = useRouter();
  const [eventDate, setEventDate] = useState("");
  const [shift, setShift] = useState<"morning" | "evening" | "full_day">("evening");
  const [eventType, setEventType] = useState("wedding");
  const [unitId, setUnitId] = useState("full");
  const [guestCount, setGuestCount] = useState("");
  const [customerNotes, setCustomerNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<BookingActionResult | null>(null);

  // Today in YYYY-MM-DD
  const today = new Date().toISOString().split("T")[0];

  const currentPriceObj = pricing.find((p) => p.shift === shift);
  const displayPrice = currentPriceObj
    ? `${currentPriceObj.price.toLocaleString("ar-YE")} ${currentPriceObj.currency || defaultCurrency}`
    : "حسب الاتفاق";

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!isAuthenticated) {
      router.push(`/login?next=/venues/${encodeURIComponent(venueId)}`);
      return;
    }

    if (!eventDate) {
      setResult({ success: false, error: "يرجى تحديد تاريخ المناسبة" });
      return;
    }

    setLoading(true);
    setResult(null);

    const formData = new FormData();
    formData.append("venueId", venueId);
    formData.append("eventDate", eventDate);
    formData.append("shift", shift);
    formData.append("eventType", eventType);
    formData.append("unitId", unitId);
    if (guestCount) formData.append("guestCount", guestCount);
    if (customerNotes) formData.append("customerNotes", customerNotes);

    try {
      const res = await createCustomerBookingAction(null, formData);
      setResult(res);

      if (res.success) {
        setTimeout(() => {
          router.push("/my-bookings");
        }, 1500);
      }
    } catch (err: unknown) {
      setResult({
        success: false,
        error: err instanceof Error ? err.message : "تعذر إتمام طلب الحجز، حاول ثانية.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-100 dark:border-slate-800 shadow-sm">
      <div className="flex items-center gap-2 mb-4">
        <Sparkles className="w-5 h-5 text-amber-500" />
        <h3 className="font-black text-base text-slate-900 dark:text-white">
          طلب حجز في {venueName}
        </h3>
      </div>

      {result?.success ? (
        <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-2xl text-center">
          <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
          <h4 className="font-bold text-sm text-emerald-900 dark:text-emerald-200">
            تم إرسال طلب الحجز بنجاح!
          </h4>
          <p className="text-xs text-emerald-700 dark:text-emerald-400 mt-1">
            رقم الحجز: <span className="font-mono font-bold">{result.bookingNumber}</span>
          </p>
          <p className="text-[11px] text-slate-500 mt-2">
            جاري تحويلك إلى صفحة حجوزاتي لمتابعة حالة الطلب...
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {result?.error && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl text-xs text-rose-700 dark:text-rose-300 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{result.error}</span>
            </div>
          )}

          {/* Date Picker */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              تاريخ المناسبة *
            </label>
            <div className="relative">
              <input
                type="date"
                min={today}
                required
                value={eventDate}
                onChange={(e) => setEventDate(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
              <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          {/* Shift Picker */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              الفترة المطلوبة *
            </label>
            <div className="grid grid-cols-3 gap-1.5">
              {[
                { id: "morning", label: "صباحية", time: "9ص - 2م" },
                { id: "evening", label: "مسائية", time: "4م - 11:30م" },
                { id: "full_day", label: "يوم كامل", time: "24 ساعة" },
              ].map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setShift(s.id as "morning" | "evening" | "full_day")}
                  className={`p-2.5 rounded-xl text-center border transition active:scale-95 ${
                    shift === s.id
                      ? "bg-amber-500/10 border-amber-500 text-amber-700 dark:text-amber-400 font-bold"
                      : "bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400"
                  }`}
                >
                  <div className="text-xs">{s.label}</div>
                  <div className="text-[10px] opacity-75">{s.time}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Unit selection if multiple units */}
          {units.length > 0 && (
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                القسم أو الجناح
              </label>
              <select
                value={unitId}
                onChange={(e) => setUnitId(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                <option value="full">كامل المنشأة (جميع الأقسام)</option>
                {units.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} (حتى {u.capacityMax} ضيف)
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Event type & Guests */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                نوع المناسبة
              </label>
              <select
                value={eventType}
                onChange={(e) => setEventType(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                <option value="wedding">حفل زفاف</option>
                <option value="engagement">خطوبة / عقد قران</option>
                <option value="gathering">عزومة / لقاء عائلي</option>
                <option value="meeting">اجتماع / مؤتمر</option>
                <option value="other">أخرى</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                عدد الضيوف المتوقع
              </label>
              <input
                type="number"
                min="1"
                placeholder="مثال: 200"
                value={guestCount}
                onChange={(e) => setGuestCount(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              ملاحظات أو طلبات خاصة (اختياري)
            </label>
            <textarea
              rows={2}
              value={customerNotes}
              onChange={(e) => setCustomerNotes(e.target.value)}
              placeholder="أي تفاصيل ترغب بإخبار إدارة القاعة بها..."
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          {/* Estimated Price summary */}
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-3 flex items-center justify-between text-xs">
            <span className="font-bold text-slate-700 dark:text-slate-300">
              السعر التقديري للفترة:
            </span>
            <span className="font-black text-amber-700 dark:text-amber-400 text-sm">
              {displayPrice}
            </span>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-sm py-3 px-4 rounded-xl shadow-md shadow-amber-500/20 transition active:scale-95 disabled:opacity-60"
          >
            {loading ? "جاري حجز الموعد ذرياً..." : isAuthenticated ? "تأكيد طلب الحجز الآن" : "تسجيل الدخول لتأكيد الحجز"}
          </button>
        </form>
      )}
    </div>
  );
}
