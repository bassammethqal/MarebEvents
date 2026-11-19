import { requireOwnerOrAdmin } from "@/lib/auth/guards";
import { client } from "@/db";
import { OwnerBookingsList, OwnerBookingRowItem } from "@/components/owner/OwnerBookingsList";
import { CalendarCheck, ChevronRight } from "lucide-react";
import Link from "next/link";

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
  cancellation_reason: string | null;
  created_at: string;
  venue_name: string;
  customer_name: string | null;
  customer_phone: string | null;
}

export default async function OwnerBookingsPage() {
  const { user } = await requireOwnerOrAdmin();

  // جلب معرفات المنشآت
  let venueIds: string[] = [];
  if (user.role === "admin") {
    const allVenues = await client<[{ id: string }]>`SELECT id FROM venues WHERE deleted_at IS NULL LIMIT 20`;
    venueIds = allVenues.map((v) => v.id);
  } else {
    const ownerVenues = await client<[{ venue_id: string }]>`
      SELECT venue_id FROM venue_members WHERE user_id = ${user.id}
    `;
    venueIds = ownerVenues.map((v) => v.venue_id);
  }

  let bookings: RawBookingRow[] = [];
  if (venueIds.length > 0) {
    bookings = await client<RawBookingRow[]>`
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
        b.cancellation_reason,
        b.created_at,
        v.name as venue_name,
        u.full_name as customer_name,
        COALESCE(u.phone, '') as customer_phone
      FROM bookings b
      JOIN venues v ON v.id = b.venue_id
      LEFT JOIN users u ON u.id = b.customer_id
      WHERE b.venue_id = ANY(${venueIds})
      ORDER BY b.event_date DESC, b.created_at DESC
    `;
  }

  const formattedBookings: OwnerBookingRowItem[] = bookings.map((b) => ({
    id: b.id,
    bookingReference: b.booking_reference,
    venueName: b.venue_name,
    customerName: b.customer_name || "عميل غير مسجل",
    customerPhone: b.customer_phone || "لا يوجد",
    eventDate: b.event_date,
    shift: b.shift,
    guestCount: b.guest_count || 100,
    status: b.status,
    totalAmount: b.total_amount || 0,
    depositAmount: b.deposit_amount || 0,
    customerNotes: b.customer_notes,
    cancellationReason: b.cancellation_reason,
    createdAt: b.created_at,
  }));

  return (
    <div className="flex-1 flex flex-col p-4 sm:p-5 space-y-4 animate-in fade-in duration-300">
      {/* Top Bar */}
      <div className="flex items-center justify-between pt-1">
        <div className="flex items-center gap-2">
          <Link
            href="/owner"
            className="p-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition"
          >
            <ChevronRight className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-base font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
              <CalendarCheck className="w-4 h-4 text-amber-700 dark:text-amber-400" />
              سجل الحجوزات
            </h1>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              متابعة وإدارة وتصفية كافة طلبات الحجز
            </p>
          </div>
        </div>
      </div>

      <OwnerBookingsList bookings={formattedBookings} />
    </div>
  );
}
