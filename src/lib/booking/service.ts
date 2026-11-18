import crypto from "crypto";
import { client } from "@/db";
import type { Booking, BookingSlot } from "@/db/schema";
import { BOOKING_CONFIG } from "./config";
import { calculateBookingPrice } from "./pricing";
import {
  ALLOWED_TRANSITIONS,
  assertCanTransitionBooking,
  getActiveVenueUnits,
} from "./guards";
import type {
  BookingStatus,
  CreateBookingInput,
  CreateBookingResult,
  BookingTransitionResult,
  TransitionActor,
} from "./types";

/**
 * توليد مرجع حجز فريد عالي الأمان وغير قابل للتخمين
 */
function generateBookingReference(eventDate: string): string {
  const dateCompact = eventDate.replace(/-/g, "").slice(2); // YYMMDD
  const randomHex = crypto.randomBytes(3).toString("hex").toUpperCase(); // 6 chars
  return `MRB-${dateCompact}-${randomHex}`;
}

/**
 * محرك إنشاء الحجوزات الذري (Create Booking Engine)
 * ينفذ بالكامل داخل معاملة PostgreSQL عبر client.begin
 */
export async function createBooking(
  input: CreateBookingInput,
  caller: { userId?: string; role: "customer" | "owner" | "admin" }
): Promise<CreateBookingResult> {
  const {
    venueId,
    bookingSource,
    isFullVenue,
    requestedUnitIds = [],
    eventType,
    guestCount,
    eventDate,
    shift,
    timeSlotStart,
    timeSlotEnd,
    idempotencyKey,
    customerNotes,
    guestDetails,
    extraAmenityIds = [],
    requiresOwnerApproval = false,
  } = input;

  // التحقق المسبق من صحة التاريخ والتوقيت
  if (!eventDate || !shift || !timeSlotStart || !timeSlotEnd) {
    throw new Error("VALIDATION_ERROR: Missing date or slot time parameters");
  }

  const startMs = new Date(timeSlotStart).getTime();
  const endMs = new Date(timeSlotEnd).getTime();
  if (isNaN(startMs) || isNaN(endMs) || startMs >= endMs) {
    throw new Error("VALIDATION_ERROR: timeSlotStart must be before timeSlotEnd");
  }

  // 1. التحقق من وجود المنشأة وأنها نشطة
  const [venue] = await client<{ id: string; status: string; default_currency: string }[]>`
    SELECT id, status, default_currency FROM venues WHERE id = ${venueId}
  `;

  if (!venue || venue.status !== "active") {
    throw new Error(`VENUE_NOT_AVAILABLE: Venue ${venueId} is not active or does not exist`);
  }

  // 2. التحقق من صلاحية المالك في حال الحجز المكتبي اليدوي
  if (bookingSource === "manual_owner") {
    if (caller.role !== "admin") {
      if (!caller.userId) {
        throw new Error("UNAUTHORIZED: User must be signed in to create manual booking");
      }
      const [member] = await client<{ role: string }[]>`
        SELECT role FROM venue_members WHERE venue_id = ${venueId} AND user_id = ${caller.userId}
      `;

      if (!member || !["primary_owner", "co_owner", "manager", "receptionist"].includes(member.role)) {
        throw new Error("FORBIDDEN: You do not have permission to register manual bookings for this venue");
      }
    }

    if (!guestDetails || !guestDetails.guestName || !guestDetails.guestPhone) {
      throw new Error("VALIDATION_ERROR: guestName and guestPhone are required for manual_owner bookings");
    }
  }

  // 3. جلب الأقسام والوحدات النشطة (يرمي خطأ إذا لم توجد أي وحدة نشطة)
  const activeUnits = await getActiveVenueUnits(venueId);

  // تحديد الوحدات المستهدفة بالحجز
  let targetUnitIds: string[] = [];
  if (isFullVenue) {
    targetUnitIds = activeUnits.map((u) => u.id);
  } else {
    if (!requestedUnitIds || requestedUnitIds.length === 0) {
      throw new Error("VALIDATION_ERROR: At least one unit must be specified for partial venue booking");
    }
    for (const reqId of requestedUnitIds) {
      const found = activeUnits.find((u) => u.id === reqId);
      if (!found) {
        throw new Error(`UNIT_NOT_AVAILABLE: Unit ${reqId} is not active or not in this venue`);
      }
    }
    targetUnitIds = Array.from(new Set(requestedUnitIds));
  }

  if (targetUnitIds.length === 0) {
    throw new Error("INTEGRITY_ERROR: Target units count cannot be zero");
  }

  // 4. التحقق من الإتاحة المخصصة والحظر المسبق (venue_availability)
  const blockedCheck = await client`
    SELECT block_reason FROM venue_availability
    WHERE venue_id = ${venueId} 
      AND override_date = ${eventDate} 
      AND (shift = ${shift} OR shift = 'full_day' OR ${shift} = 'full_day')
      AND is_blocked = true
      AND (unit_id IS NULL OR unit_id = ANY(${targetUnitIds}))
    LIMIT 1
  `;

  if (blockedCheck.length > 0) {
    throw new Error(`BOOKING_DATE_BLOCKED: The requested date/shift is blocked: ${blockedCheck[0]?.block_reason || "Maintenance"}`);
  }

  // 5. الفحص لمنع التضارب وحجز المواعيد المزدوجة في booking_slots
  const conflictRow = await client`
    SELECT id, unit_id, shift, time_slot_start, time_slot_end, status 
    FROM booking_slots
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

  if (conflictRow.length > 0) {
    throw new Error("BOOKING_SLOT_CONFLICT: The requested unit or time slot is already booked or reserved");
  }

  // 6. حساب التسعير الهرمي وبنود الفاتورة
  const pricing = await calculateBookingPrice({
    venueId,
    isFullVenue,
    unitIds: targetUnitIds,
    eventDate,
    shift,
    extraAmenityIds,
  });

  // 7. تحديد الحالة الابتدائية والمهل الزمنية
  const now = new Date();
  const nowIso = now.toISOString();

  let initialStatus: BookingStatus = "pending_payment";
  let expiresAt: string | null = null;
  let ownerReviewExpiresAt: string | null = null;

  if (bookingSource === "manual_owner") {
    initialStatus = "confirmed";
  } else if (requiresOwnerApproval) {
    initialStatus = "pending_owner_approval";
    ownerReviewExpiresAt = new Date(
      now.getTime() + BOOKING_CONFIG.OWNER_REVIEW_HOURS * 3600 * 1000
    ).toISOString();
  } else {
    initialStatus = "pending_payment";
    expiresAt = new Date(
      now.getTime() + BOOKING_CONFIG.PAYMENT_TIMEOUT_MINUTES * 60 * 1000
    ).toISOString();
  }

  // 8. إنشاء الحجز الرئيسي
  const bookingId = crypto.randomUUID();
  const bookingRef = generateBookingReference(eventDate);
  const customerId = bookingSource === "online" ? caller.userId || null : null;

  const insertedSlots: BookingSlot[] = [];

  // المعاملة الذرية على خادم PostgreSQL
  await client.begin(async (sql) => {
    await sql`
      INSERT INTO bookings (
        id, booking_reference, idempotency_key, venue_id, customer_id,
        booking_source, is_full_venue, event_type, guest_count, event_date,
        shift, time_slot_start, time_slot_end, status, total_amount,
        deposit_amount, currency, customer_notes, cancellation_policy_snapshot,
        expires_at, owner_review_expires_at, confirmed_at, created_at, updated_at
      ) VALUES (
        ${bookingId}, ${bookingRef}, ${idempotencyKey || null}, ${venueId}, ${customerId},
        ${bookingSource}, ${isFullVenue}, ${eventType}, ${guestCount}, ${eventDate},
        ${shift}, ${timeSlotStart}, ${timeSlotEnd}, ${initialStatus}, ${pricing.totalAmount},
        ${pricing.depositAmount}, ${pricing.currency}, ${customerNotes || null}, '{}',
        ${expiresAt}, ${ownerReviewExpiresAt}, ${initialStatus === "confirmed" ? nowIso : null},
        ${nowIso}, ${nowIso}
      )
    `;

    // 9. إدراج الوحدات المطلوبة (booking_requested_units)
    for (const unitId of targetUnitIds) {
      await sql`
        INSERT INTO booking_requested_units (id, booking_id, venue_id, unit_id, created_at)
        VALUES (${crypto.randomUUID()}, ${bookingId}, ${venueId}, ${unitId}, ${nowIso})
      `;
    }

    // 10. إدراج الفتحات المحجوزة في booking_slots
    for (const unitId of targetUnitIds) {
      const slotId = crypto.randomUUID();
      await sql`
        INSERT INTO booking_slots (
          id, booking_id, venue_id, unit_id, event_date, shift,
          time_slot_start, time_slot_end, status, created_at
        ) VALUES (
          ${slotId}, ${bookingId}, ${venueId}, ${unitId}, ${eventDate}, ${shift},
          ${timeSlotStart}, ${timeSlotEnd}, ${initialStatus}, ${nowIso}
        )
      `;
      insertedSlots.push({
        id: slotId,
        bookingId,
        venueId,
        unitId,
        eventDate,
        shift,
        timeSlotStart,
        timeSlotEnd,
        status: initialStatus,
        createdAt: nowIso,
      });
    }

    // 11. إدراج تفاصيل الأسعار (booking_price_items)
    for (const item of pricing.items) {
      await sql`
        INSERT INTO booking_price_items (
          id, booking_id, item_type, description_ar, unit_price, quantity, total_price, currency, created_at
        ) VALUES (
          ${crypto.randomUUID()}, ${bookingId}, ${item.itemType}, ${item.descriptionAr},
          ${item.unitPrice}, ${item.quantity}, ${item.totalPrice}, ${item.currency}, ${nowIso}
        )
      `;
    }

    // 12. إدراج بيانات الضيف المعزولة إذا كان الحجز مكتبياً
    if (bookingSource === "manual_owner" && guestDetails) {
      await sql`
        INSERT INTO booking_guest_details (booking_id, guest_name, guest_phone, notes, created_at)
        VALUES (${bookingId}, ${guestDetails.guestName}, ${guestDetails.guestPhone}, ${guestDetails.notes || null}, ${nowIso})
      `;
    }

    // 13. كتابة سجل التدقيق الأولي (booking_audit_logs)
    await sql`
      INSERT INTO booking_audit_logs (
        id, booking_id, actor_id, from_status, to_status, action_description, payload, created_at
      ) VALUES (
        ${crypto.randomUUID()}, ${bookingId}, ${caller.userId || null}, NULL, ${initialStatus},
        ${`CREATE_BOOKING_${bookingSource.toUpperCase()}`},
        ${JSON.stringify({ isFullVenue, targetUnitsCount: targetUnitIds.length })},
        ${nowIso}
      )
    `;
  });

  const [savedRow] = await client<Record<string, any>[]>`
    SELECT * FROM bookings WHERE id = ${bookingId}
  `;

  const savedBooking: Booking = {
    ...(savedRow as any),
    bookingReference: savedRow?.booking_reference || bookingRef,
    idempotencyKey: savedRow?.idempotency_key || idempotencyKey || null,
    venueId: savedRow?.venue_id || venueId,
    customerId: savedRow?.customer_id || customerId,
    bookingSource: savedRow?.booking_source || bookingSource,
    isFullVenue: savedRow?.is_full_venue ?? isFullVenue,
    eventType: savedRow?.event_type || eventType,
    guestCount: savedRow?.guest_count || guestCount,
    eventDate: savedRow?.event_date || eventDate,
    shift: savedRow?.shift || shift,
    timeSlotStart: savedRow?.time_slot_start || timeSlotStart,
    timeSlotEnd: savedRow?.time_slot_end || timeSlotEnd,
    status: savedRow?.status || initialStatus,
    totalAmount: savedRow?.total_amount || pricing.totalAmount,
    depositAmount: savedRow?.deposit_amount || pricing.depositAmount,
    currency: savedRow?.currency || pricing.currency,
    cancellationPolicySnapshot: savedRow?.cancellation_policy_snapshot || "{}",
    customerNotes: savedRow?.customer_notes || customerNotes || null,
    ownerPrivateNotes: savedRow?.owner_private_notes || null,
    expiresAt: savedRow?.expires_at || expiresAt,
    ownerReviewExpiresAt: savedRow?.owner_review_expires_at || ownerReviewExpiresAt,
    adminEscalationExpiresAt: savedRow?.admin_escalation_expires_at || null,
    confirmedAt: savedRow?.confirmed_at || null,
    completedAt: savedRow?.completed_at || null,
    cancelledAt: savedRow?.cancelled_at || null,
    cancellationReason: savedRow?.cancellation_reason || null,
    createdAt: savedRow?.created_at || nowIso,
    updatedAt: savedRow?.updated_at || nowIso,
  };

  return {
    booking: savedBooking,
    slots: insertedSlots,
    totalAmount: pricing.totalAmount,
    depositAmount: pricing.depositAmount,
    currency: pricing.currency,
  };
}

/**
 * دالة الانتقال المركزي لحالات الحجز (Centralized Status Transition)
 */
export async function transitionBookingStatus(
  bookingId: string,
  targetStatus: BookingStatus,
  actor: TransitionActor
): Promise<BookingTransitionResult> {
  const [booking] = await client<Booking[]>`
    SELECT * FROM bookings WHERE id = ${bookingId}
  `;

  if (!booking) {
    throw new Error(`BOOKING_NOT_FOUND: Booking ${bookingId} does not exist`);
  }

  // التحقق الإلزامي من الصلاحيات والملكية قبل فحص الـ Idempotency
  await assertCanTransitionBooking(booking, targetStatus, actor);

  const currentStatus = booking.status as BookingStatus;

  // التحقق من الـ Idempotency
  if (currentStatus === targetStatus) {
    return {
      success: true,
      idempotent: true,
      bookingId,
      fromStatus: currentStatus,
      toStatus: targetStatus,
      updatedAt: booking.updatedAt || new Date().toISOString(),
    };
  }

  // التحقق من أن مسار الانتقال مسموح به
  const allowedTargets = ALLOWED_TRANSITIONS[currentStatus] || [];
  if (!allowedTargets.includes(targetStatus)) {
    throw new Error(
      `INVALID_STATUS_TRANSITION: Cannot transition booking from ${currentStatus} to ${targetStatus}`
    );
  }

  const nowIso = new Date().toISOString();

  await client.begin(async (sql) => {
    await sql`
      UPDATE bookings 
      SET status = ${targetStatus},
          updated_at = ${nowIso},
          confirmed_at = CASE WHEN ${targetStatus} = 'confirmed' THEN ${nowIso} ELSE confirmed_at END,
          cancelled_at = CASE WHEN ${targetStatus} IN ('cancelled_by_customer', 'cancelled_by_owner') THEN ${nowIso} ELSE cancelled_at END,
          completed_at = CASE WHEN ${targetStatus} = 'completed' THEN ${nowIso} ELSE completed_at END,
          cancellation_reason = CASE WHEN ${targetStatus} IN ('cancelled_by_customer', 'cancelled_by_owner', 'rejected') THEN ${actor.reason || null} ELSE cancellation_reason END
      WHERE id = ${bookingId} AND status = ${currentStatus}
    `;

    await sql`
      UPDATE booking_slots 
      SET status = ${targetStatus} 
      WHERE booking_id = ${bookingId}
    `;

    await sql`
      INSERT INTO booking_audit_logs (
        id, booking_id, actor_id, from_status, to_status, action_description, payload, created_at
      ) VALUES (
        ${crypto.randomUUID()}, ${bookingId}, ${actor.userId || null}, ${currentStatus}, ${targetStatus},
        ${`STATUS_TRANSITION_${currentStatus.toUpperCase()}_TO_${targetStatus.toUpperCase()}`},
        ${JSON.stringify({
          actorRole: actor.role,
          reason: actor.reason || null,
          isAdminWaiver: actor.isAdminWaiver || false,
        })},
        ${nowIso}
      )
    `;
  });

  return {
    success: true,
    idempotent: false,
    bookingId,
    fromStatus: currentStatus,
    toStatus: targetStatus,
    updatedAt: nowIso,
  };
}
