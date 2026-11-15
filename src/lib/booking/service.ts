import crypto from "crypto";
import type Database from "better-sqlite3";
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
  EventType,
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
 * ينفذ بالكامل داخل معاملة SQLite حصرية وفورية BEGIN IMMEDIATE
 */
export function createBooking(
  sqlite: Database.Database,
  input: CreateBookingInput,
  caller: { userId?: string; role: "customer" | "owner" | "admin" }
): CreateBookingResult {
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

  const createTx = sqlite.transaction(() => {
    // 1. التحقق من وجود المنشأة وأنها نشطة
    const venue = sqlite
      .prepare(`SELECT id, status, default_currency FROM venues WHERE id = ?`)
      .get(venueId) as { id: string; status: string; default_currency: string } | undefined;

    if (!venue || venue.status !== "active") {
      throw new Error(`VENUE_NOT_AVAILABLE: Venue ${venueId} is not active or does not exist`);
    }

    // 2. التحقق من صلاحية المالك في حال الحجز المكتبي اليدوي
    if (bookingSource === "manual_owner") {
      if (caller.role !== "admin") {
        if (!caller.userId) {
          throw new Error("UNAUTHORIZED: User must be signed in to create manual booking");
        }
        const member = sqlite
          .prepare(`SELECT role FROM venue_members WHERE venue_id = ? AND user_id = ?`)
          .get(venueId, caller.userId) as { role: string } | undefined;

        if (!member || !["primary_owner", "co_owner", "manager", "receptionist"].includes(member.role)) {
          throw new Error("FORBIDDEN: You do not have permission to register manual bookings for this venue");
        }
      }

      if (!guestDetails || !guestDetails.guestName || !guestDetails.guestPhone) {
        throw new Error("VALIDATION_ERROR: guestName and guestPhone are required for manual_owner bookings");
      }
    }

    // 3. جلب الأقسام والوحدات النشطة (يرمي خطأ إذا لم توجد أي وحدة نشطة)
    const activeUnits = getActiveVenueUnits(sqlite, venueId);

    // تحديد الوحدات المستهدفة بالحجز
    let targetUnitIds: string[] = [];
    if (isFullVenue) {
      targetUnitIds = activeUnits.map((u) => u.id);
    } else {
      if (!requestedUnitIds || requestedUnitIds.length === 0) {
        throw new Error("VALIDATION_ERROR: At least one unit must be specified for partial venue booking");
      }
      // التحقق من أن جميع الوحدات المطلوبة تتبع المنشأة ونشطة
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
    const unitPlaceholders = targetUnitIds.map(() => "?").join(",");
    const blockedCheck = sqlite
      .prepare(`
        SELECT block_reason FROM venue_availability
        WHERE venue_id = ? 
          AND override_date = ? 
          AND (shift = ? OR shift = 'full_day' OR ? = 'full_day')
          AND is_blocked = 1
          AND (unit_id IS NULL OR unit_id IN (${unitPlaceholders}))
        LIMIT 1
      `)
      .get(venueId, eventDate, shift, shift, ...targetUnitIds) as { block_reason?: string } | undefined;

    if (blockedCheck) {
      throw new Error(`BOOKING_DATE_BLOCKED: The requested date/shift is blocked: ${blockedCheck.block_reason || "Maintenance"}`);
    }

    // 5. الفحص الذري لمنع التضارب وحجز المواعيد المزدوجة في booking_slots
    // يتعارض الحجز إذا كانت الفتحة في حالة حاجزة (confirmed, pending_payment, pending_owner_approval, owner_review_timed_out)
    // ومتقاطعة زمنياً لنفس الوحدة ونفس التاريخ
    const conflictQuery = `
      SELECT id, unit_id, shift, time_slot_start, time_slot_end, status 
      FROM booking_slots
      WHERE unit_id IN (${unitPlaceholders})
        AND event_date = ?
        AND status IN ('confirmed', 'pending_payment', 'pending_owner_approval', 'owner_review_timed_out')
        AND (
          shift = ? 
          OR shift = 'full_day' 
          OR ? = 'full_day'
          OR (time_slot_start < ? AND time_slot_end > ?)
        )
      LIMIT 1
    `;

    const conflictRow = sqlite
      .prepare(conflictQuery)
      .get(...targetUnitIds, eventDate, shift, shift, timeSlotEnd, timeSlotStart);

    if (conflictRow) {
      throw new Error("BOOKING_SLOT_CONFLICT: The requested unit or time slot is already booked or reserved");
    }

    // 6. حساب التسعير الهرمي وبنود الفاتورة
    const pricing = calculateBookingPrice(sqlite, {
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

    sqlite
      .prepare(`
        INSERT INTO bookings (
          id, booking_reference, idempotency_key, venue_id, customer_id,
          booking_source, is_full_venue, event_type, guest_count, event_date,
          shift, time_slot_start, time_slot_end, status, total_amount,
          deposit_amount, currency, customer_notes, expires_at, owner_review_expires_at,
          confirmed_at, created_at, updated_at
        ) VALUES (
          :id, :bookingReference, :idempotencyKey, :venueId, :customerId,
          :bookingSource, :isFullVenue, :eventType, :guestCount, :eventDate,
          :shift, :timeSlotStart, :timeSlotEnd, :status, :totalAmount,
          :depositAmount, :currency, :customerNotes, :expiresAt, :ownerReviewExpiresAt,
          :confirmedAt, :createdAt, :updatedAt
        )
      `)
      .run({
        id: bookingId,
        bookingReference: bookingRef,
        idempotencyKey: idempotencyKey || null,
        venueId,
        customerId,
        bookingSource,
        isFullVenue: isFullVenue ? 1 : 0,
        eventType,
        guestCount,
        eventDate,
        shift,
        timeSlotStart,
        timeSlotEnd,
        status: initialStatus,
        totalAmount: pricing.totalAmount,
        depositAmount: pricing.depositAmount,
        currency: pricing.currency,
        customerNotes: customerNotes || null,
        expiresAt,
        ownerReviewExpiresAt,
        confirmedAt: initialStatus === "confirmed" ? nowIso : null,
        createdAt: nowIso,
        updatedAt: nowIso,
      });

    // 9. إدراج الوحدات المطلوبة (booking_requested_units)
    const insertReqUnitStmt = sqlite.prepare(`
      INSERT INTO booking_requested_units (id, booking_id, venue_id, unit_id, created_at)
      VALUES (?, ?, ?, ?, ?)
    `);
    for (const unitId of targetUnitIds) {
      insertReqUnitStmt.run(crypto.randomUUID(), bookingId, venueId, unitId, nowIso);
    }

    // 10. إدراج الفتحات المحجوزة في booking_slots (فتحة لكل وحدة)
    const insertedSlots: BookingSlot[] = [];
    const insertSlotStmt = sqlite.prepare(`
      INSERT INTO booking_slots (
        id, booking_id, venue_id, unit_id, event_date, shift,
        time_slot_start, time_slot_end, status, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const unitId of targetUnitIds) {
      const slotId = crypto.randomUUID();
      insertSlotStmt.run(
        slotId,
        bookingId,
        venueId,
        unitId,
        eventDate,
        shift,
        timeSlotStart,
        timeSlotEnd,
        initialStatus,
        nowIso
      );
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

    if (insertedSlots.length !== targetUnitIds.length || insertedSlots.length === 0) {
      throw new Error("INTEGRITY_ERROR: Mismatch in inserted slots count");
    }

    // 11. إدراج تفاصيل الأسعار (booking_price_items)
    const insertPriceStmt = sqlite.prepare(`
      INSERT INTO booking_price_items (
        id, booking_id, item_type, description_ar, unit_price, quantity, total_price, currency, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    for (const item of pricing.items) {
      insertPriceStmt.run(
        crypto.randomUUID(),
        bookingId,
        item.itemType,
        item.descriptionAr,
        item.unitPrice,
        item.quantity,
        item.totalPrice,
        item.currency,
        nowIso
      );
    }

    // 12. إدراج بيانات الضيف المعزولة إذا كان الحجز مكتبياً
    if (bookingSource === "manual_owner" && guestDetails) {
      sqlite
        .prepare(`
          INSERT INTO booking_guest_details (booking_id, guest_name, guest_phone, notes, created_at)
          VALUES (?, ?, ?, ?, ?)
        `)
        .run(bookingId, guestDetails.guestName, guestDetails.guestPhone, guestDetails.notes || null, nowIso);
    }

    // 13. كتابة سجل التدقيق الأولي (booking_audit_logs)
    sqlite
      .prepare(`
        INSERT INTO booking_audit_logs (
          id, booking_id, actor_id, from_status, to_status, action_description, payload, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `)
      .run(
        crypto.randomUUID(),
        bookingId,
        caller.userId || null,
        null,
        initialStatus,
        `CREATE_BOOKING_${bookingSource.toUpperCase()}`,
        JSON.stringify({ isFullVenue, targetUnitsCount: targetUnitIds.length }),
        nowIso
      );

    const rawRow = sqlite
      .prepare(`SELECT * FROM bookings WHERE id = ?`)
      .get(bookingId) as Record<string, unknown>;

    const fullBookingRow: Booking = {
      ...(rawRow as unknown as Booking),
      bookingReference: rawRow.booking_reference as string,
      idempotencyKey: (rawRow.idempotency_key as string) || null,
      venueId: rawRow.venue_id as string,
      customerId: (rawRow.customer_id as string) || null,
      bookingSource: rawRow.booking_source as "online" | "manual_owner",
      isFullVenue: Boolean(rawRow.is_full_venue),
      eventType: rawRow.event_type as EventType,
      guestCount: rawRow.guest_count as number,
      eventDate: rawRow.event_date as string,
      shift: rawRow.shift as "morning" | "evening" | "full_day",
      timeSlotStart: rawRow.time_slot_start as string,
      timeSlotEnd: rawRow.time_slot_end as string,
      status: rawRow.status as "pending_payment" | "pending_owner_approval" | "confirmed" | "completed" | "cancelled_by_customer" | "cancelled_by_owner" | "expired" | "rejected" | "owner_review_timed_out",
      totalAmount: rawRow.total_amount as number,
      depositAmount: rawRow.deposit_amount as number,
      currency: rawRow.currency as "YER" | "SAR" | "USD",
      cancellationPolicySnapshot: rawRow.cancellation_policy_snapshot as string,
      customerNotes: (rawRow.customer_notes as string) || null,
      ownerPrivateNotes: (rawRow.owner_private_notes as string) || null,
      expiresAt: (rawRow.expires_at as string) || null,
      ownerReviewExpiresAt: (rawRow.owner_review_expires_at as string) || null,
      adminEscalationExpiresAt: (rawRow.admin_escalation_expires_at as string) || null,
      confirmedAt: (rawRow.confirmed_at as string) || null,
      completedAt: (rawRow.completed_at as string) || null,
      cancelledAt: (rawRow.cancelled_at as string) || null,
      cancellationReason: (rawRow.cancellation_reason as string) || null,
      createdAt: rawRow.created_at as string,
      updatedAt: rawRow.updated_at as string,
    };

    return {
      booking: fullBookingRow,
      slots: insertedSlots,
      totalAmount: pricing.totalAmount,
      depositAmount: pricing.depositAmount,
      currency: pricing.currency,
    };
  });

  // التنفيذ الحصري الفوري لقفل الكتابة
  return createTx.immediate();
}

/**
 * دالة الانتقال المركزي لحالات الحجز (Centralized Status Transition)
 * تضمن التحديث المشروط، مطابقة الفتحات، وعدم التكرار (Idempotency)
 */
export function transitionBookingStatus(
  sqlite: Database.Database,
  bookingId: string,
  targetStatus: BookingStatus,
  actor: TransitionActor
): BookingTransitionResult {
  const transitionTx = sqlite.transaction(() => {
    // 1. جلب الحجز وقفل الصف
    const booking = sqlite
      .prepare(`SELECT * FROM bookings WHERE id = ?`)
      .get(bookingId) as Booking | undefined;

    if (!booking) {
      throw new Error(`BOOKING_NOT_FOUND: Booking ${bookingId} does not exist`);
    }

    // 2. التحقق الإلزامي من الصلاحيات والملكية قبل فحص الـ Idempotency
    assertCanTransitionBooking(sqlite, booking, targetStatus, actor);

    const currentStatus = booking.status as BookingStatus;

    // 3. التحقق من الـ Idempotency: إذا كان الحجز في الحالة المستهدفة بالفعل
    if (currentStatus === targetStatus) {
      return {
        success: true,
        idempotent: true,
        bookingId,
        fromStatus: currentStatus,
        toStatus: targetStatus,
        updatedAt:
          booking.updatedAt ||
          ((booking as unknown as Record<string, unknown>).updated_at as string),
      };
    }

    // 4. التحقق من أن مسار الانتقال مسموح به في مصفوفة الحالات
    const allowedTargets = ALLOWED_TRANSITIONS[currentStatus] || [];
    if (!allowedTargets.includes(targetStatus)) {
      throw new Error(
        `INVALID_STATUS_TRANSITION: Cannot transition booking from ${currentStatus} to ${targetStatus}`
      );
    }

    // 5. فحص عدد الفتحات الحالية المسجلة للحجز
    const slotCountRow = sqlite
      .prepare(`SELECT COUNT(*) as count FROM booking_slots WHERE booking_id = ?`)
      .get(bookingId) as { count: number } | undefined;

    const expectedSlotCount = slotCountRow?.count || 0;
    if (expectedSlotCount === 0) {
      throw new Error(`INTEGRITY_VIOLATION: Booking ${bookingId} has 0 slots registered.`);
    }

    const nowIso = new Date().toISOString();

    // 6. التحديث المشروط للحجز الرئيسي مع التأكد الصارم من (changes === 1)
    const bookingUpdateRes = sqlite
      .prepare(`
        UPDATE bookings 
        SET status = :targetStatus,
            updated_at = :now,
            confirmed_at = CASE WHEN :targetStatus = 'confirmed' THEN :now ELSE confirmed_at END,
            cancelled_at = CASE WHEN :targetStatus IN ('cancelled_by_customer', 'cancelled_by_owner') THEN :now ELSE cancelled_at END,
            completed_at = CASE WHEN :targetStatus = 'completed' THEN :now ELSE completed_at END,
            cancellation_reason = CASE WHEN :targetStatus IN ('cancelled_by_customer', 'cancelled_by_owner', 'rejected') THEN :reason ELSE cancellation_reason END
        WHERE id = :bookingId AND status = :currentStatus
      `)
      .run({
        targetStatus,
        now: nowIso,
        reason: actor.reason || null,
        bookingId,
        currentStatus,
      });

    if (bookingUpdateRes.changes !== 1) {
      throw new Error(
        `CONCURRENCY_CONFLICT: Failed to update booking ${bookingId}. Expected 1 change, got ${bookingUpdateRes.changes}`
      );
    }

    // 7. تحديث فتحات booking_slots لنفس الحالة تماماً مع التحقق من مطابقة عدد الصفوف
    const slotUpdateRes = sqlite
      .prepare(`
        UPDATE booking_slots 
        SET status = ? 
        WHERE booking_id = ?
      `)
      .run(targetStatus, bookingId);

    if (slotUpdateRes.changes !== expectedSlotCount) {
      // رمي الخطأ يسبب فوراً ROLLBACK للمعاملة بالكامل وتراجع تحديث bookings
      throw new Error(
        `SLOT_SYNC_MISMATCH: Expected ${expectedSlotCount} slots updated, but updated ${slotUpdateRes.changes}. Rolling back.`
      );
    }

    // 8. كتابة سجل التدقيق في نفس المعاملة دون أي تكرار
    sqlite
      .prepare(`
        INSERT INTO booking_audit_logs (
          id, booking_id, actor_id, from_status, to_status, action_description, payload, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `)
      .run(
        crypto.randomUUID(),
        bookingId,
        actor.userId || null,
        currentStatus,
        targetStatus,
        `STATUS_TRANSITION_${currentStatus.toUpperCase()}_TO_${targetStatus.toUpperCase()}`,
        JSON.stringify({
          actorRole: actor.role,
          reason: actor.reason || null,
          isAdminWaiver: actor.isAdminWaiver || false,
        }),
        nowIso
      );

    return {
      success: true,
      idempotent: false,
      bookingId,
      fromStatus: currentStatus,
      toStatus: targetStatus,
      updatedAt: nowIso,
    };
  });

  return transitionTx.immediate();
}
