import { requireOwnerOrAdmin } from "@/lib/auth/guards";
import { client } from "@/db";
import { OwnerCalendarClient, SlotItem, VenueOption } from "@/components/owner/OwnerCalendarClient";
import { CalendarDays, ChevronRight } from "lucide-react";
import Link from "next/link";

export const instant = false;

interface RawSlotRow {
  id: string;
  venue_id: string;
  event_date: string;
  shift: string;
  status: string;
  booking_reference: string | null;
  customer_name: string | null;
  customer_phone: string | null;
  total_amount: number | null;
  notes: string | null;
}

export default async function OwnerCalendarPage() {
  const { user } = await requireOwnerOrAdmin();

  // جلب المنشآت الخاصة بالمالك
  let venues: VenueOption[] = [];
  if (user.role === "admin") {
    const rawVenues = await client<[{ id: string; name: string }]>`
      SELECT id, name FROM venues WHERE deleted_at IS NULL ORDER BY created_at DESC LIMIT 20
    `;
    venues = rawVenues.map((v) => ({ id: v.id, name: v.name }));
  } else {
    const rawVenues = await client<[{ id: string; name: string }]>`
      SELECT v.id, v.name
      FROM venues v
      JOIN venue_members vm ON vm.venue_id = v.id
      WHERE vm.user_id = ${user.id} AND v.deleted_at IS NULL
      ORDER BY v.created_at DESC
    `;
    venues = rawVenues.map((v) => ({ id: v.id, name: v.name }));
  }

  const venueIds = venues.map((v) => v.id);

  let slots: SlotItem[] = [];
  if (venueIds.length > 0) {
    const rawSlots = await client<RawSlotRow[]>`
      SELECT 
        bs.id,
        bs.venue_id,
        bs.event_date,
        bs.shift,
        bs.status,
        b.booking_reference,
        u.full_name as customer_name,
        u.phone as customer_phone,
        b.total_amount,
        b.customer_notes as notes
      FROM booking_slots bs
      LEFT JOIN bookings b ON b.id = bs.booking_id
      LEFT JOIN users u ON u.id = b.customer_id
      WHERE bs.venue_id = ANY(${venueIds})
        AND bs.status IN ('confirmed', 'pending_payment', 'pending_owner_approval')
      ORDER BY bs.event_date ASC
    `;

    slots = rawSlots.map((s) => ({
      id: s.id,
      venueId: s.venue_id,
      eventDate: s.event_date,
      shift: s.shift,
      status: s.status,
      bookingReference: s.booking_reference || undefined,
      customerName: s.customer_name || undefined,
      customerPhone: s.customer_phone || undefined,
      totalAmount: s.total_amount || 0,
      notes: s.notes || undefined,
    }));
  }

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
              <CalendarDays className="w-4 h-4 text-amber-700 dark:text-amber-400" />
              التقويم وإدارة الفترات
            </h1>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              استعراض المواعيد، تسجيل الحجوزات اليدوية، وإغلاق الصيانة
            </p>
          </div>
        </div>
      </div>

      {venues.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 text-center text-slate-400">
          لا توجد منشآت مرتبطة بحسابك حالياً.
        </div>
      ) : (
        <OwnerCalendarClient venues={venues} slots={slots} />
      )}
    </div>
  );
}
