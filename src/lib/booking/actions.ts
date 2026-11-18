"use server";

import { getCurrentSession } from "@/lib/auth/session";
import { client } from "@/db";
import { BookingShift, EventType } from "@/lib/booking/types";
import { revalidatePath } from "next/cache";
import crypto from "crypto";

export interface BookingActionResult {
  success: boolean;
  bookingId?: string;
  bookingNumber?: string;
  error?: string;
  code?: string;
}

export async function createCustomerBookingAction(
  prevState: BookingActionResult | null,
  formData: FormData
): Promise<BookingActionResult> {
  try {
    const session = await getCurrentSession();
    if (!session?.user) {
      return {
        success: false,
        error: "يرجى تسجيل الدخول أولاً لإتمام الحجز",
        code: "UNAUTHORIZED",
      };
    }

    const venueId = formData.get("venueId") as string;
    const eventDate = formData.get("eventDate") as string;
    const shift = (formData.get("shift") as BookingShift) || "evening";
    const eventType = (formData.get("eventType") as EventType) || "wedding";
    const unitId = formData.get("unitId") as string | null;
    const guestCountStr = formData.get("guestCount") as string | null;
    const customerNotes = formData.get("customerNotes") as string | null;

    if (!venueId || !eventDate || !shift) {
      return {
        success: false,
        error: "يرجى اختيار تاريخ المناسبة والفترة المطلوبة",
      };
    }

    // Determine slot start and end based on shift
    let timeSlotStart: string;
    let timeSlotEnd: string;

    if (shift === "morning") {
      timeSlotStart = `${eventDate}T09:00:00.000Z`;
      timeSlotEnd = `${eventDate}T14:00:00.000Z`;
    } else if (shift === "evening") {
      timeSlotStart = `${eventDate}T16:00:00.000Z`;
      timeSlotEnd = `${eventDate}T23:30:00.000Z`;
    } else {
      timeSlotStart = `${eventDate}T09:00:00.000Z`;
      const nextDay = new Date(new Date(eventDate).getTime() + 24 * 60 * 60 * 1000)
        .toISOString()
        .slice(0, 10);
      timeSlotEnd = `${nextDay}T08:00:00.000Z`;
    }

    const isFullVenue = !unitId || unitId === "full";
    const requestedUnitIds = unitId && unitId !== "full" ? [unitId] : undefined;
    const guestCount = guestCountStr && parseInt(guestCountStr, 10) > 0 ? parseInt(guestCountStr, 10) : 100;
    const idempotencyKey = crypto.randomUUID();

    // 1. Verify venue is active
    const [venue] = await client<{ id: string; status: string; default_currency: string }[]>`
      SELECT id, status, default_currency FROM venues WHERE id = ${venueId} AND status = 'active'
    `;

    if (!venue) {
      return {
        success: false,
        error: "المنشأة غير متاحة حالياً للحجز.",
      };
    }

    // 2. Resolve target units
    let targetUnits: { id: string; name: string }[] = [];
    if (isFullVenue) {
      targetUnits = await client<{ id: string; name: string }[]>`
        SELECT id, name FROM venue_units WHERE venue_id = ${venueId} AND is_active = true
      `;
    } else if (requestedUnitIds && requestedUnitIds.length > 0) {
      targetUnits = await client<{ id: string; name: string }[]>`
        SELECT id, name FROM venue_units WHERE id = ANY(${requestedUnitIds}) AND is_active = true
      `;
    }

    const targetUnitIds = targetUnits.map((u) => u.id);
    if (targetUnitIds.length === 0) {
      return {
        success: false,
        error: "لا توجد أقسام متاحة للحجز في هذه المنشأة.",
      };
    }

    // 3. Check for conflict in booking_slots
    const conflicts = await client`
      SELECT id FROM booking_slots 
      WHERE unit_id = ANY(${targetUnitIds})
        AND event_date = ${eventDate}
        AND status IN ('confirmed', 'pending_payment', 'pending_owner_approval', 'owner_review_timed_out')
        AND (
          shift = ${shift} 
          OR shift = 'full_day' 
          OR ${shift} = 'full_day' 
          OR (time_slot_start < ${timeSlotEnd} AND time_slot_end > ${timeSlotStart})
        )
      LIMIT 1
    `;

    if (conflicts.length > 0) {
      return {
        success: false,
        error: "عذراً، هذا الموعد أو الفترة محجوزة مسبقاً! يرجى اختيار موعد أو فترة أخرى.",
      };
    }

    // 4. Resolve price from pricing_tiers
    const tiers = await client<{ price: number; currency: string }[]>`
      SELECT price, currency FROM pricing_tiers 
      WHERE venue_id = ${venueId} AND shift = ${shift}
      ORDER BY is_default DESC LIMIT 1
    `;
    const price = tiers[0]?.price || 150000;
    const currency = tiers[0]?.currency || venue.default_currency || "YER";
    const depositAmount = Math.round(price * 0.25);

    // 5. Generate Reference & IDs
    const bookingId = crypto.randomUUID();
    const dateCompact = eventDate.replace(/-/g, "").slice(2);
    const randomHex = crypto.randomBytes(3).toString("hex").toUpperCase();
    const bookingRef = `MRB-${dateCompact}-${randomHex}`;
    const nowIso = new Date().toISOString();
    const reviewExpiresAt = new Date(Date.now() + 24 * 3600 * 1000).toISOString();

    // 6. Execute atomic insert inside transaction
    await client.begin(async (sql) => {
      await sql`
        INSERT INTO bookings (
          id, booking_reference, idempotency_key, venue_id, customer_id,
          booking_source, is_full_venue, event_type, guest_count, event_date,
          shift, time_slot_start, time_slot_end, status, total_amount,
          deposit_amount, currency, customer_notes, owner_review_expires_at,
          created_at, updated_at
        ) VALUES (
          ${bookingId}, ${bookingRef}, ${idempotencyKey}, ${venueId}, ${session.user.id},
          'online', ${isFullVenue}, ${eventType}, ${guestCount}, ${eventDate},
          ${shift}, ${timeSlotStart}, ${timeSlotEnd}, 'pending_owner_approval', ${price},
          ${depositAmount}, ${currency}, ${customerNotes || null}, ${reviewExpiresAt},
          ${nowIso}, ${nowIso}
        )
      `;

      for (const unitId of targetUnitIds) {
        await sql`
          INSERT INTO booking_requested_units (id, booking_id, venue_id, unit_id, created_at)
          VALUES (${crypto.randomUUID()}, ${bookingId}, ${venueId}, ${unitId}, ${nowIso})
        `;
        await sql`
          INSERT INTO booking_slots (
            id, booking_id, venue_id, unit_id, event_date, shift,
            time_slot_start, time_slot_end, status, created_at
          ) VALUES (
            ${crypto.randomUUID()}, ${bookingId}, ${venueId}, ${unitId}, ${eventDate}, ${shift},
            ${timeSlotStart}, ${timeSlotEnd}, 'pending_owner_approval', ${nowIso}
          )
        `;
      }

      await sql`
        INSERT INTO booking_price_items (
          id, booking_id, item_type, description_ar, unit_price, quantity, total_price, currency, created_at
        ) VALUES (
          ${crypto.randomUUID()}, ${bookingId}, 'full_venue_rate', 'إيجار المنشأة للفترة المحددة', ${price}, 1, ${price}, ${currency}, ${nowIso}
        )
      `;

      await sql`
        INSERT INTO booking_audit_logs (
          id, booking_id, actor_id, from_status, to_status, action_description, payload, created_at
        ) VALUES (
          ${crypto.randomUUID()}, ${bookingId}, ${session.user.id}, NULL, 'pending_owner_approval', 'CREATE_BOOKING_ONLINE', ${JSON.stringify({ isFullVenue, targetUnitsCount: targetUnitIds.length })}, ${nowIso}
        )
      `;
    });

    revalidatePath("/my-bookings");
    revalidatePath("/");

    return {
      success: true,
      bookingId,
      bookingNumber: bookingRef,
    };
  } catch (error: unknown) {
    console.error("Booking creation failed:", error);
    const errMessage = error instanceof Error ? error.message : "";
    let msg = "تعذر إتمام طلب الحجز، يرجى المحاولة مرة أخرى";
    if (errMessage.includes("BOOKING_SLOT_CONFLICT")) {
      msg = "عذراً، هذا الموعد أو الفترة محجوزة مسبقاً! يرجى اختيار موعد أو فترة أخرى.";
    } else if (errMessage.includes("BOOKING_DATE_BLOCKED")) {
      msg = "هذا التاريخ غير متاح للحجز بناءً على جدول المنشأة.";
    } else if (errMessage.includes("VENUE_NOT_AVAILABLE")) {
      msg = "المنشأة غير متاحة حالياً للحجز.";
    }
    return {
      success: false,
      error: msg,
    };
  }
}
