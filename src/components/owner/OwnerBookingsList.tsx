"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Calendar,
  Clock,
  Users,
  CheckCircle2,
  XCircle,
  MessageCircle,
  Phone,
  Search,
  Filter,
  AlertCircle,
  Loader2,
  FileText,
} from "lucide-react";
import {
  approveOwnerBookingAction,
  rejectOwnerBookingAction,
} from "@/lib/owner/actions";

export interface OwnerBookingRowItem {
  id: string;
  bookingReference: string;
  venueName: string;
  customerName: string;
  customerPhone: string;
  eventDate: string;
  shift: string;
  guestCount: number;
  status: string;
  totalAmount: number;
  depositAmount: number;
  customerNotes?: string | null;
  cancellationReason?: string | null;
  createdAt: string;
}

interface OwnerBookingsListProps {
  bookings: OwnerBookingRowItem[];
}

type FilterType = "all" | "pending" | "confirmed" | "cancelled";

export function OwnerBookingsList({ bookings: initialBookings }: OwnerBookingsListProps) {
  const router = useRouter();
  const [bookings, setBookings] = useState<OwnerBookingRowItem[]>(initialBookings);
  const [filter, setFilter] = useState<FilterType>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeBookingId, setActiveBookingId] = useState<string | null>(null);
  const [actionType, setActionType] = useState<"approving" | "rejecting" | null>(null);
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [targetBooking, setTargetBooking] = useState<OwnerBookingRowItem | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const getShiftBadge = (shift: string) => {
    switch (shift) {
      case "morning":
        return { label: "صباحية", class: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20" };
      case "evening":
        return { label: "مسائية", class: "bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border-indigo-500/20" };
      case "full_day":
        return { label: "يوم كامل", class: "bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/20" };
      default:
        return { label: shift, class: "bg-slate-500/10 text-slate-700 dark:text-slate-400 border-slate-500/20" };
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "confirmed":
        return { label: "مؤكد", class: "bg-emerald-500/10 text-emerald-800 dark:text-emerald-400 border-emerald-500/20" };
      case "pending_owner_approval":
      case "pending_payment":
        return { label: "بانتظار الموافقة", class: "bg-amber-500/10 text-amber-800 dark:text-amber-400 border-amber-500/20" };
      case "cancelled_by_owner":
        return { label: "مرفوض من المالك", class: "bg-rose-500/10 text-rose-800 dark:text-rose-400 border-rose-500/20" };
      case "cancelled_by_customer":
        return { label: "ملغي من العميل", class: "bg-slate-500/10 text-slate-800 dark:text-slate-400 border-slate-500/20" };
      default:
        return { label: "ملغي / منتهي", class: "bg-slate-500/10 text-slate-800 dark:text-slate-400 border-slate-500/20" };
    }
  };

  const handleApprove = async (booking: OwnerBookingRowItem) => {
    if (activeBookingId) return;
    setActiveBookingId(booking.id);
    setActionType("approving");
    setFeedback(null);

    // تحديث تفاؤلي فوري (0ms Latency)
    const previousBookings = bookings;
    setBookings((prev) =>
      prev.map((b) => (b.id === booking.id ? { ...b, status: "confirmed" } : b))
    );

    const res = await approveOwnerBookingAction(booking.id);

    if (res.success) {
      setFeedback({ type: "success", message: `تم تأكيد حجز (${booking.bookingReference}) بنجاح!` });
      router.refresh();
    } else {
      setBookings(previousBookings);
      setFeedback({ type: "error", message: res.error || "فشل تأكيد الحجز." });
    }

    setActiveBookingId(null);
    setActionType(null);
  };

  const openRejectModal = (booking: OwnerBookingRowItem) => {
    setTargetBooking(booking);
    setRejectReason("");
    setRejectModalOpen(true);
  };

  const confirmReject = async () => {
    if (!targetBooking) return;
    const target = targetBooking;
    setActiveBookingId(target.id);
    setActionType("rejecting");
    setRejectModalOpen(false);
    setFeedback(null);

    // تحديث تفاؤلي فوري (0ms Latency)
    const previousBookings = bookings;
    setBookings((prev) =>
      prev.map((b) =>
        b.id === target.id
          ? { ...b, status: "cancelled_by_owner", cancellationReason: rejectReason }
          : b
      )
    );

    const res = await rejectOwnerBookingAction(target.id, rejectReason);

    if (res.success) {
      setFeedback({
        type: "success",
        message: `تم رفض حجز (${target.bookingReference}) وتحرير الفترة.`,
      });
      router.refresh();
    } else {
      setBookings(previousBookings);
      setFeedback({ type: "error", message: res.error || "فشل رفض الحجز." });
    }

    setActiveBookingId(null);
    setActionType(null);
    setTargetBooking(null);
  };

  const cleanPhone = (phone: string) => {
    let cleaned = phone.replace(/[^0-9]/g, "");
    if (cleaned.startsWith("00967")) cleaned = cleaned.substring(5);
    else if (cleaned.startsWith("967")) cleaned = cleaned.substring(3);
    else if (cleaned.startsWith("0")) cleaned = cleaned.substring(1);
    return `967${cleaned}`;
  };

  // تصفية وبحث الحجوزات
  const filteredBookings = bookings.filter((b) => {
    // فلتر الحالة
    if (filter === "pending") {
      if (!["pending_owner_approval", "pending_payment"].includes(b.status)) return false;
    } else if (filter === "confirmed") {
      if (b.status !== "confirmed") return false;
    } else if (filter === "cancelled") {
      if (["confirmed", "pending_owner_approval", "pending_payment"].includes(b.status)) return false;
    }

    // فلتر البحث
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchRef = b.bookingReference.toLowerCase().includes(q);
      const matchName = b.customerName.toLowerCase().includes(q);
      const matchPhone = b.customerPhone.includes(q);
      const matchVenue = b.venueName.toLowerCase().includes(q);
      return matchRef || matchName || matchPhone || matchVenue;
    }

    return true;
  });

  const pendingCount = bookings.filter((b) =>
    ["pending_owner_approval", "pending_payment"].includes(b.status)
  ).length;
  const confirmedCount = bookings.filter((b) => b.status === "confirmed").length;
  const cancelledCount = bookings.filter(
    (b) => !["confirmed", "pending_owner_approval", "pending_payment"].includes(b.status)
  ).length;

  return (
    <div className="space-y-4">
      {/* Search Input */}
      <div className="relative">
        <Search className="w-4 h-4 text-slate-400 absolute right-3 top-3" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="بحث برقم الحجز، اسم العميل، الهاتف..."
          className="w-full pl-3 pr-9 py-2.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
        />
      </div>

      {/* Filter Pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
        <button
          onClick={() => setFilter("all")}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition ${
            filter === "all"
              ? "bg-slate-900 text-white dark:bg-white dark:text-slate-950 shadow-sm"
              : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:bg-slate-100"
          }`}
        >
          الكل ({bookings.length})
        </button>

        <button
          onClick={() => setFilter("pending")}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition flex items-center gap-1 ${
            filter === "pending"
              ? "bg-amber-500 text-white shadow-sm"
              : "bg-white dark:bg-slate-900 text-amber-800 dark:text-amber-400 border border-slate-200 dark:border-slate-800 hover:bg-amber-50 dark:hover:bg-amber-950/20"
          }`}
        >
          <span>بانتظار الموافقة</span>
          {pendingCount > 0 && (
            <span className="w-4 h-4 rounded-full bg-amber-600 text-white text-[9px] flex items-center justify-center">
              {pendingCount}
            </span>
          )}
        </button>

        <button
          onClick={() => setFilter("confirmed")}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition ${
            filter === "confirmed"
              ? "bg-emerald-600 text-white shadow-sm"
              : "bg-white dark:bg-slate-900 text-emerald-800 dark:text-emerald-400 border border-slate-200 dark:border-slate-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/20"
          }`}
        >
          مؤكدة ({confirmedCount})
        </button>

        <button
          onClick={() => setFilter("cancelled")}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition ${
            filter === "cancelled"
              ? "bg-rose-600 text-white shadow-sm"
              : "bg-white dark:bg-slate-900 text-rose-800 dark:text-rose-400 border border-slate-200 dark:border-slate-800 hover:bg-rose-50 dark:hover:bg-rose-950/20"
          }`}
        >
          ملغية / مرفوضة ({cancelledCount})
        </button>
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

      {/* Bookings Cards List */}
      <div className="space-y-3">
        {filteredBookings.length === 0 ? (
          <div className="bg-white/80 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 text-center text-slate-400">
            <FileText className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-xs">لا توجد حجوزات مطابقة للتصفية المحددة.</p>
          </div>
        ) : (
          filteredBookings.map((b) => {
            const shiftBadge = getShiftBadge(b.shift);
            const statusBadge = getStatusBadge(b.status);
            const isPending = ["pending_owner_approval", "pending_payment"].includes(b.status);
            const isBusy = activeBookingId === b.id;
            const phoneWhatsapp = cleanPhone(b.customerPhone);
            const waMessage = encodeURIComponent(
              `مرحباً بك أستاذ ${b.customerName}، معك إدارة ${b.venueName} بخصوص حجزك رقم (${b.bookingReference}) ليوم ${b.eventDate}.`
            );

            return (
              <div
                key={b.id}
                className="bg-white dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-4 shadow-sm hover:shadow transition-all space-y-3"
              >
                {/* Header row */}
                <div className="flex items-start justify-between gap-2 border-b border-slate-100 dark:border-slate-800/80 pb-2.5">
                  <div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[11px] font-mono font-bold text-amber-800 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-lg border border-amber-500/20">
                        {b.bookingReference}
                      </span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${statusBadge.class}`}>
                        {statusBadge.label}
                      </span>
                    </div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 mt-1">
                      {b.customerName}
                    </h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      {b.venueName}
                    </p>
                  </div>
                  <div className="text-left shrink-0">
                    <span className={`inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full border ${shiftBadge.class}`}>
                      {shiftBadge.label}
                    </span>
                    <div className="text-xs font-bold text-emerald-800 dark:text-emerald-400 mt-1">
                      {b.totalAmount.toLocaleString()} ر.ي
                    </div>
                  </div>
                </div>

                {/* Details Grid */}
                <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/40 p-2.5 rounded-2xl">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-amber-700 dark:text-amber-400 shrink-0" />
                    <span>{b.eventDate}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-blue-700 dark:text-blue-400 shrink-0" />
                    <span>{b.guestCount} ضيف</span>
                  </div>
                  <div className="col-span-2 flex items-center justify-between pt-1 border-t border-slate-200/60 dark:border-slate-700/40">
                    <span className="text-[10px] text-slate-600 dark:text-slate-400">هاتف العميل:</span>
                    <span className="font-mono text-[11px] font-semibold" dir="ltr">
                      {b.customerPhone}
                    </span>
                  </div>
                </div>

                {/* Notes or Cancellation Reason */}
                {b.customerNotes && (
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 bg-slate-100/50 dark:bg-slate-800/30 p-2 rounded-xl italic">
                    ملاحظة: {b.customerNotes}
                  </p>
                )}
                {b.cancellationReason && (
                  <p className="text-[11px] text-rose-800 dark:text-rose-400 bg-rose-500/10 p-2 rounded-xl border border-rose-500/20">
                    سبب الإلغاء: {b.cancellationReason}
                  </p>
                )}

                {/* Contact buttons */}
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <a
                    href={`https://wa.me/${phoneWhatsapp}?text=${waMessage}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-800 dark:text-emerald-400 border border-emerald-500/20 text-xs font-semibold transition active:scale-95"
                  >
                    <MessageCircle className="w-3.5 h-3.5" />
                    <span>واتساب</span>
                  </a>
                  <a
                    href={`tel:${b.customerPhone}`}
                    className="flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 text-blue-800 dark:text-blue-400 border border-blue-500/20 text-xs font-semibold transition active:scale-95"
                  >
                    <Phone className="w-3.5 h-3.5" />
                    <span>اتصال</span>
                  </a>
                </div>

                {/* If Pending, Show Approve / Reject buttons */}
                {isPending && (
                  <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-100 dark:border-slate-800">
                    <button
                      onClick={() => handleApprove(b)}
                      disabled={isBusy}
                      className="flex items-center justify-center gap-1 py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition active:scale-95 disabled:opacity-50"
                    >
                      {isBusy && actionType === "approving" ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      )}
                      <span>قبول الحجز</span>
                    </button>
                    <button
                      onClick={() => openRejectModal(b)}
                      disabled={isBusy}
                      className="flex items-center justify-center gap-1 py-2 px-3 rounded-xl bg-rose-50 dark:bg-rose-950/30 text-rose-800 dark:text-rose-400 border border-rose-200 dark:border-rose-900 text-xs font-bold transition active:scale-95 disabled:opacity-50"
                    >
                      {isBusy && actionType === "rejecting" ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <XCircle className="w-3.5 h-3.5" />
                      )}
                      <span>اعتذار</span>
                    </button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Reject Modal */}
      {rejectModalOpen && targetBooking && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-2 text-rose-800 dark:text-rose-400 font-bold text-sm">
              <XCircle className="w-5 h-5 shrink-0" />
              <span>رفض طلب الحجز ({targetBooking.bookingReference})</span>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                سبب الرفض:
              </label>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="مثال: القاعة غير متاحة في هذا التوقيت..."
                className="w-full h-20 p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={confirmReject}
                className="flex-1 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition active:scale-95"
              >
                تأكيد الرفض
              </button>
              <button
                onClick={() => setRejectModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold transition"
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
