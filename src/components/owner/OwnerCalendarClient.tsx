"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Calendar as CalendarIcon,
  Clock,
  PlusCircle,
  Wrench,
  CheckCircle2,
  AlertCircle,
  XCircle,
  ChevronRight,
  ChevronLeft,
  User,
  Phone,
  Coins,
  Loader2,
  Lock,
  Sparkles,
} from "lucide-react";
import {
  createManualBookingAction,
  blockSlotForMaintenanceAction,
} from "@/lib/owner/actions";

export interface VenueOption {
  id: string;
  name: string;
}

export interface SlotItem {
  id: string;
  venueId: string;
  eventDate: string;
  shift: string;
  status: string;
  bookingReference?: string;
  customerName?: string;
  customerPhone?: string;
  totalAmount?: number;
  notes?: string;
}

interface OwnerCalendarClientProps {
  venues: VenueOption[];
  slots: SlotItem[];
}

export function OwnerCalendarClient({ venues, slots }: OwnerCalendarClientProps) {
  const router = useRouter();

  // المنشأة المحددة
  const [selectedVenueId, setSelectedVenueId] = useState<string>(
    venues[0]?.id || ""
  );

  // التاريخ المحدد (افتراضياً اليوم)
  const todayStr = new Date().toISOString().split("T")[0];
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);

  // Modals state
  const [manualModalOpen, setManualModalOpen] = useState(false);
  const [blockModalOpen, setBlockModalOpen] = useState(false);
  const [targetShift, setTargetShift] = useState<"morning" | "evening" | "full_day">("evening");

  // Loading & Feedback
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // توليد قائمة الـ 14 يوماً القادمة للتقويم السريع
  const daysList = Array.from({ length: 14 }).map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    const dateStr = d.toISOString().split("T")[0];
    const dayName = d.toLocaleDateString("ar-YE", { weekday: "short" });
    const dayNum = d.getDate();
    return { dateStr, dayName, dayNum };
  });

  // فحص الفترات في التاريخ المحدد للمنشأة المحددة
  const dateSlots = slots.filter(
    (s) => s.venueId === selectedVenueId && s.eventDate === selectedDate
  );

  const getShiftSlot = (shift: string) => {
    return dateSlots.find((s) => s.shift === shift);
  };

  const morningSlot = getShiftSlot("morning");
  const eveningSlot = getShiftSlot("evening");
  const fullDaySlot = getShiftSlot("full_day");

  // فتح نافذة الحجز اليدوي
  const openManualBooking = (shift: "morning" | "evening" | "full_day") => {
    setTargetShift(shift);
    setFeedback(null);
    setManualModalOpen(true);
  };

  // فتح نافذة إغلاق الصيانة
  const openBlockSlot = (shift: "morning" | "evening" | "full_day") => {
    setTargetShift(shift);
    setFeedback(null);
    setBlockModalOpen(true);
  };

  // إرسال الحجز اليدوي
  const handleManualSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    setFeedback(null);

    const form = e.currentTarget;
    const formData = new FormData(form);
    formData.set("venueId", selectedVenueId);
    formData.set("eventDate", selectedDate);
    formData.set("shift", targetShift);

    const res = await createManualBookingAction(formData);

    if (res.success) {
      setFeedback({
        type: "success",
        message: `تم إنشاء الحجز اليدوي بنجاح برقم (${res.data?.bookingReference})!`,
      });
      setManualModalOpen(false);
      router.refresh();
    } else {
      setFeedback({
        type: "error",
        message: res.error || "فشل تسجيل الحجز اليدوي.",
      });
    }

    setIsSubmitting(false);
  };

  // إرسال إغلاق الصيانة
  const handleBlockSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    setFeedback(null);

    const form = e.currentTarget;
    const formData = new FormData(form);
    formData.set("venueId", selectedVenueId);
    formData.set("eventDate", selectedDate);
    formData.set("shift", targetShift);

    const res = await blockSlotForMaintenanceAction(formData);

    if (res.success) {
      setFeedback({
        type: "success",
        message: "تم إغلاق الفترة بنجاح وتحديث التقويم.",
      });
      setBlockModalOpen(false);
      router.refresh();
    } else {
      setFeedback({
        type: "error",
        message: res.error || "فشل إغلاق الفترة للصيانة.",
      });
    }

    setIsSubmitting(false);
  };

  const formatShiftLabel = (shift: string) => {
    switch (shift) {
      case "morning":
        return { name: "الفترة الصباحية", time: "08:00 ص - 02:00 م" };
      case "evening":
        return { name: "الفترة المسائية", time: "04:00 م - 12:00 ص" };
      case "full_day":
        return { name: "اليوم الكامل", time: "08:00 ص - 12:00 ص" };
      default:
        return { name: shift, time: "" };
    }
  };

  return (
    <div className="space-y-4">
      {/* 1. Venue Switcher (if multiple) */}
      {venues.length > 1 && (
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
          {venues.map((v) => (
            <button
              key={v.id}
              onClick={() => setSelectedVenueId(v.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition ${
                selectedVenueId === v.id
                  ? "bg-amber-500 text-white shadow-sm"
                  : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800"
              }`}
            >
              {v.name}
            </button>
          ))}
        </div>
      )}

      {/* 2. Interactive Horizontal Date Picker Strip */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-3 shadow-sm space-y-2">
        <div className="flex items-center justify-between px-1">
          <span className="text-xs font-extrabold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
            <CalendarIcon className="w-3.5 h-3.5 text-amber-700 dark:text-amber-400" />
            اختر اليوم
          </span>
          <span className="text-[11px] font-mono text-slate-400">
            {selectedDate}
          </span>
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
          {daysList.map((d) => {
            const isSelected = selectedDate === d.dateStr;
            const hasSlotsOnDay = slots.some(
              (s) => s.venueId === selectedVenueId && s.eventDate === d.dateStr
            );

            return (
              <button
                key={d.dateStr}
                onClick={() => setSelectedDate(d.dateStr)}
                className={`flex flex-col items-center justify-center min-w-[52px] py-2.5 px-2 rounded-2xl border transition active:scale-95 ${
                  isSelected
                    ? "bg-gradient-to-b from-amber-500 to-amber-600 text-white border-amber-500 shadow-md shadow-amber-500/20"
                    : "bg-slate-50 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 border-slate-200/80 dark:border-slate-700/60 hover:bg-slate-100"
                }`}
              >
                <span className="text-[10px] font-semibold">{d.dayName}</span>
                <span className="text-sm font-black mt-0.5">{d.dayNum}</span>
                {hasSlotsOnDay && (
                  <span
                    className={`w-1.5 h-1.5 rounded-full mt-1 ${
                      isSelected ? "bg-white" : "bg-amber-500"
                    }`}
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {feedback && (
        <div
          className={`p-3 rounded-2xl text-xs font-semibold flex items-center gap-2 ${
            feedback.type === "success"
              ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20"
              : "bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-500/20"
          }`}
        >
          {feedback.type === "success" ? (
            <CheckCircle2 className="w-4 h-4 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0" />
          )}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* 3. Shifts Status on Selected Date */}
      <div className="space-y-3">
        <h3 className="text-xs font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5 text-amber-700 dark:text-amber-400" />
          فترات يوم ({selectedDate})
        </h3>

        {(["morning", "evening", "full_day"] as const).map((shiftKey) => {
          const shiftInfo = formatShiftLabel(shiftKey);
          const slot = getShiftSlot(shiftKey);
          const isFullDayLocked = !slot && fullDaySlot && shiftKey !== "full_day";

          const isBooked = !!slot;
          const isMaintenance =
            slot?.notes?.includes("صيانة") || slot?.notes?.includes("مغلق");

          return (
            <div
              key={shiftKey}
              className={`rounded-3xl border p-4 shadow-sm transition-all ${
                isBooked
                  ? isMaintenance
                    ? "bg-slate-100 dark:bg-slate-900/60 border-slate-300 dark:border-slate-800"
                    : "bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/40"
                  : isFullDayLocked
                  ? "bg-slate-50 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800 opacity-60"
                  : "bg-white dark:bg-slate-900/80 border-slate-200/80 dark:border-slate-800"
              }`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    {shiftInfo.name}
                    <span className="text-[10px] font-normal text-slate-400 font-mono">
                      {shiftInfo.time}
                    </span>
                  </h4>
                </div>

                <div>
                  {isBooked ? (
                    isMaintenance ? (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-500/10 text-slate-800 dark:text-slate-400 border border-slate-500/20">
                        مغلق للصيانة
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-800 dark:text-emerald-400 border border-emerald-500/20">
                        محجوزة ومؤكدة
                      </span>
                    )
                  ) : isFullDayLocked ? (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-500">
                      محجوز (يوم كامل)
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-800 dark:text-blue-400 border border-blue-500/20">
                      متاحة للحجز
                    </span>
                  )}
                </div>
              </div>

              {/* Booking Details if booked */}
              {isBooked && (
                <div className="mt-3 p-2.5 rounded-2xl bg-white/70 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800/60 text-xs space-y-1">
                  {slot.bookingReference && (
                    <div className="font-mono text-[11px] font-bold text-amber-800 dark:text-amber-400">
                      رقم الحجز: {slot.bookingReference}
                    </div>
                  )}
                  {slot.customerName && (
                    <div className="text-slate-800 dark:text-slate-200 font-semibold flex items-center gap-1">
                      <User className="w-3.5 h-3.5 text-slate-400" />
                      <span>{slot.customerName}</span>
                    </div>
                  )}
                  {slot.customerPhone && (
                    <div className="text-slate-500 dark:text-slate-400 font-mono text-[11px] flex items-center gap-1" dir="ltr">
                      <Phone className="w-3.5 h-3.5 text-slate-400" />
                      <span>{slot.customerPhone}</span>
                    </div>
                  )}
                  {slot.notes && (
                    <div className="text-[10px] text-slate-400 italic">
                      {slot.notes}
                    </div>
                  )}
                </div>
              )}

              {/* Actions if Available */}
              {!isBooked && !isFullDayLocked && (
                <div className="mt-3 grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <button
                    onClick={() => openManualBooking(shiftKey)}
                    className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold shadow-sm shadow-amber-500/20 transition active:scale-95"
                  >
                    <PlusCircle className="w-3.5 h-3.5" />
                    <span>حجز يدوي مباشر</span>
                  </button>

                  <button
                    onClick={() => openBlockSlot(shiftKey)}
                    className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold border border-slate-200 dark:border-slate-700 transition active:scale-95"
                  >
                    <Lock className="w-3.5 h-3.5" />
                    <span>إغلاق للصيانة</span>
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Manual Booking Modal */}
      {manualModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                <PlusCircle className="w-4 h-4 text-amber-700 dark:text-amber-400" />
                تسجيل حجز يدوي (تلفون / حضور)
              </h3>
              <button
                onClick={() => setManualModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleManualSubmit} className="space-y-3 text-xs">
              <div className="bg-amber-500/10 p-2.5 rounded-2xl border border-amber-500/20 text-amber-800 dark:text-amber-400 font-semibold">
                التاريخ: {selectedDate} | الفترة: {formatShiftLabel(targetShift).name}
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  اسم العميل *
                </label>
                <input
                  type="text"
                  name="customerName"
                  required
                  placeholder="الاسم الثلاثي أو اللقب"
                  className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  رقم هاتف العميل *
                </label>
                <input
                  type="tel"
                  name="customerPhone"
                  required
                  placeholder="77XXXXXXXX أو 71XXXXXXXX"
                  className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none"
                  dir="ltr"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  المبلغ المتفق عليه (ر.ي)
                </label>
                <input
                  type="number"
                  name="totalAmount"
                  defaultValue="0"
                  className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  ملاحظات الحجز
                </label>
                <input
                  type="text"
                  name="notes"
                  placeholder="حجز هاتفي - دفعة مقدمة..."
                  className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none"
                />
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold transition flex items-center justify-center gap-1.5 shadow-md shadow-amber-500/20 disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4" />
                  )}
                  <span>تأكيد الحجز المباشر</span>
                </button>
                <button
                  type="button"
                  onClick={() => setManualModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Maintenance Block Modal */}
      {blockModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                <Wrench className="w-4 h-4 text-slate-700 dark:text-slate-300" />
                إغلاق الفترة للصيانة / استخدام خاص
              </h3>
              <button
                onClick={() => setBlockModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleBlockSubmit} className="space-y-3 text-xs">
              <div className="bg-slate-100 dark:bg-slate-800 p-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-semibold">
                التاريخ: {selectedDate} | الفترة: {formatShiftLabel(targetShift).name}
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  سبب الإغلاق
                </label>
                <input
                  type="text"
                  name="reason"
                  defaultValue="أعمال صيانة وتجهيز دورية"
                  className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-slate-500/20 focus:border-slate-500 outline-none"
                />
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-2.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold transition flex items-center justify-center gap-1.5 shadow-md disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Lock className="w-4 h-4" />
                  )}
                  <span>إغلاق الفترة</span>
                </button>
                <button
                  type="button"
                  onClick={() => setBlockModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
