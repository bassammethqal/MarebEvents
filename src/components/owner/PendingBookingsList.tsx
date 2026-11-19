"use client";

import { useState, useOptimistic, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Calendar,
  Clock,
  Users,
  CheckCircle2,
  XCircle,
  MessageCircle,
  Phone,
  AlertCircle,
  Loader2,
} from "lucide-react";
import {
  approveOwnerBookingAction,
  rejectOwnerBookingAction,
} from "@/lib/owner/actions";

export interface PendingBookingItem {
  id: string;
  bookingReference: string;
  venueName: string;
  customerName: string;
  customerPhone: string;
  eventDate: string;
  shift: string;
  guestCount: number;
  totalAmount: number;
  customerNotes?: string | null;
  createdAt: string;
}

interface PendingBookingsListProps {
  bookings: PendingBookingItem[];
}

export function PendingBookingsList({ bookings: initialBookings }: PendingBookingsListProps) {
  const router = useRouter();
  const [bookings, setBookings] = useState<PendingBookingItem[]>(initialBookings);
  const [, startTransition] = useTransition();
  const [activeBookingId, setActiveBookingId] = useState<string | null>(null);
  const [actionType, setActionType] = useState<"approving" | "rejecting" | null>(null);
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [targetBooking, setTargetBooking] = useState<PendingBookingItem | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [actionFeedback, setActionFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const [optimisticBookings, setOptimisticBookings] = useOptimistic(
    bookings,
    (state, bookingIdToRemove: string) => state.filter((b) => b.id !== bookingIdToRemove)
  );

  const getShiftBadge = (shift: string) => {
    switch (shift) {
      case "morning":
        return { label: "فترة صباحية", class: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20" };
      case "evening":
        return { label: "فترة مسائية", class: "bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border-indigo-500/20" };
      case "full_day":
        return { label: "يوم كامل", class: "bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/20" };
      default:
        return { label: shift, class: "bg-slate-500/10 text-slate-700 dark:text-slate-400 border-slate-500/20" };
    }
  };

  const handleApprove = (booking: PendingBookingItem) => {
    if (activeBookingId) return;
    setActiveBookingId(booking.id);
    setActionType("approving");
    setActionFeedback(null);

    startTransition(async () => {
      // إزالة الطلب لحظياً (0ms) من الواجهة
      setOptimisticBookings(booking.id);

      const res = await approveOwnerBookingAction(booking.id);

      if (res.success) {
        setBookings((prev) => prev.filter((b) => b.id !== booking.id));
        setActionFeedback({
          type: "success",
          message: `تم تأكيد حجز (${booking.bookingReference}) بنجاح وإرسال إشعار للعميل!`,
        });
        router.refresh();
      } else {
        setBookings((prev) => [...prev]);
        setActionFeedback({
          type: "error",
          message: res.error || "فشل تأكيد الحجز، يرجى المحاولة لاحقاً.",
        });
      }

      setActiveBookingId(null);
      setActionType(null);
    });
  };

  const openRejectModal = (booking: PendingBookingItem) => {
    setTargetBooking(booking);
    setRejectReason("");
    setRejectModalOpen(true);
  };

  const confirmReject = () => {
    if (!targetBooking) return;
    const booking = targetBooking;
    setActiveBookingId(booking.id);
    setActionType("rejecting");
    setRejectModalOpen(false);
    setActionFeedback(null);

    startTransition(async () => {
      // إزالة الطلب لحظياً (0ms) من الواجهة
      setOptimisticBookings(booking.id);

      const res = await rejectOwnerBookingAction(booking.id, rejectReason);

      if (res.success) {
        setBookings((prev) => prev.filter((b) => b.id !== booking.id));
        setActionFeedback({
          type: "success",
          message: `تم رفض الحجز (${booking.bookingReference}) وتحرير الموعد في التقويم.`,
        });
        router.refresh();
      } else {
        setBookings((prev) => [...prev]);
        setActionFeedback({
          type: "error",
          message: res.error || "فشل رفض الحجز.",
        });
      }

      setActiveBookingId(null);
      setActionType(null);
      setTargetBooking(null);
    });
  };

  const cleanPhone = (phone: string) => {
    let cleaned = phone.replace(/[^0-9]/g, "");
    if (cleaned.startsWith("00967")) cleaned = cleaned.substring(5);
    else if (cleaned.startsWith("967")) cleaned = cleaned.substring(3);
    else if (cleaned.startsWith("0")) cleaned = cleaned.substring(1);
    return `967${cleaned}`;
  };

  return (
    <div className="space-y-3">
      {actionFeedback && (
        <div
          className={`p-3.5 rounded-2xl text-xs font-semibold flex items-center gap-2.5 animate-in fade-in duration-200 ${
            actionFeedback.type === "success"
              ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20"
              : "bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-500/20"
          }`}
        >
          {actionFeedback.type === "success" ? (
            <CheckCircle2 className="w-4 h-4 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0" />
          )}
          <span>{actionFeedback.message}</span>
        </div>
      )}

      {optimisticBookings.length === 0 ? (
        <div className="bg-white/80 dark:bg-slate-900/60 backdrop-blur border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 text-center shadow-sm">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto mb-3">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100 mb-1">
            لا توجد طلبات معلقة
          </h4>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-[240px] mx-auto leading-relaxed">
            جميع الحجوزات معتمدة ومؤكدة. منشأتك جاهزة لاستقبال الطلبات الجديدة فوراً.
          </p>
        </div>
      ) : (
        optimisticBookings.map((booking) => {
          const shiftBadge = getShiftBadge(booking.shift);
          const isBusy = activeBookingId === booking.id;
          const phoneWhatsapp = cleanPhone(booking.customerPhone);
          const waMessage = encodeURIComponent(
            `مرحباً بك أستاذ ${booking.customerName}، معك إدارة ${booking.venueName} بخصوص طلب حجزك رقم (${booking.bookingReference}) ليوم ${booking.eventDate}.`
          );

          return (
            <div
              key={booking.id}
              className="bg-white dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-4 shadow-sm hover:shadow-md transition-all duration-200 space-y-3"
            >
              {/* Header row */}
              <div className="flex items-start justify-between gap-2 border-b border-slate-100 dark:border-slate-800/80 pb-2.5">
                <div>
                  <span className="text-[11px] font-mono font-bold text-amber-800 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-lg border border-amber-500/20">
                    {booking.bookingReference}
                  </span>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 mt-1">
                    {booking.customerName}
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    {booking.venueName}
                  </p>
                </div>
                <div className="text-left">
                  <span
                    className={`inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full border ${shiftBadge.class}`}
                  >
                    {shiftBadge.label}
                  </span>
                  <div className="text-xs font-bold text-emerald-800 dark:text-emerald-400 mt-1">
                    {booking.totalAmount.toLocaleString()} ر.ي
                  </div>
                </div>
              </div>

              {/* Booking Info Grid */}
              <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/40 p-2.5 rounded-2xl">
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-amber-700 dark:text-amber-400 shrink-0" />
                  <span className="truncate">{booking.eventDate}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-blue-700 dark:text-blue-400 shrink-0" />
                  <span>{booking.guestCount} ضيف</span>
                </div>
                <div className="col-span-2 flex items-center justify-between pt-1 border-t border-slate-200/60 dark:border-slate-700/40">
                  <span className="text-[10px] text-slate-600 dark:text-slate-400">هاتف العميل:</span>
                  <span className="font-mono text-[11px] font-semibold text-slate-700 dark:text-slate-200" dir="ltr">
                    {booking.customerPhone}
                  </span>
                </div>
              </div>

              {booking.customerNotes && (
                <p className="text-[11px] text-slate-500 dark:text-slate-400 bg-slate-100/50 dark:bg-slate-800/30 p-2 rounded-xl italic line-clamp-2">
                  &ldquo;{booking.customerNotes}&rdquo;
                </p>
              )}

              {/* Actions & WhatsApp buttons */}
              <div className="space-y-2 pt-1">
                {/* Contact buttons */}
                <div className="grid grid-cols-2 gap-2">
                  <a
                    href={`https://wa.me/${phoneWhatsapp}?text=${waMessage}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-800 dark:text-emerald-400 border border-emerald-500/20 text-xs font-semibold transition active:scale-95"
                  >
                    <MessageCircle className="w-3.5 h-3.5" />
                    <span>تواصل واتساب</span>
                  </a>
                  <a
                    href={`tel:${booking.customerPhone}`}
                    className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 text-blue-800 dark:text-blue-400 border border-blue-500/20 text-xs font-semibold transition active:scale-95"
                  >
                    <Phone className="w-3.5 h-3.5" />
                    <span>اتصال بالعميل</span>
                  </a>
                </div>

                {/* Approve & Reject buttons */}
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => handleApprove(booking)}
                    disabled={isBusy}
                    className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold shadow-md shadow-emerald-600/20 transition active:scale-95 disabled:opacity-50 cursor-pointer"
                  >
                    {isBusy && actionType === "approving" ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <CheckCircle2 className="w-4 h-4" />
                    )}
                    <span>قبول وتأكيد</span>
                  </button>

                  <button
                    onClick={() => openRejectModal(booking)}
                    disabled={isBusy}
                    className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-slate-100 hover:bg-rose-50 dark:bg-slate-800 dark:hover:bg-rose-950/30 text-rose-800 dark:text-rose-400 border border-slate-200 dark:border-slate-700 hover:border-rose-300 dark:hover:border-rose-900 text-xs font-bold transition active:scale-95 disabled:opacity-50 cursor-pointer"
                  >
                    {isBusy && actionType === "rejecting" ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <XCircle className="w-4 h-4" />
                    )}
                    <span>اعتذار / رفض</span>
                  </button>
                </div>
              </div>
            </div>
          );
        })
      )}

      {/* Reject Modal */}
      {rejectModalOpen && targetBooking && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150 text-right">
            <div className="flex items-center gap-2 text-rose-800 dark:text-rose-400 font-bold text-sm">
              <XCircle className="w-5 h-5 shrink-0" />
              <span>رفض طلب الحجز ({targetBooking.bookingReference})</span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              سيتم إشعار العميل بالاعتذار، وإلغاء حجز الموعد ليكون متاحاً للآخرين في التقويم.
            </p>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                سبب الرفض (اختياري، يظهر للعميل):
              </label>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="مثال: الموعد مخصص لصيانة أو محجوز مسبقاً..."
                className="w-full h-20 p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={confirmReject}
                className="flex-1 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition active:scale-95 cursor-pointer"
              >
                تأكيد الرفض
              </button>
              <button
                onClick={() => setRejectModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold hover:bg-slate-200 dark:hover:bg-slate-700 transition cursor-pointer"
              >
                تراجع
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
