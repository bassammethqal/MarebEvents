"use server";

import { client } from "@/db";
import { requireOwnerOrAdmin } from "@/lib/auth/guards";
import { revalidatePath } from "next/cache";
import crypto from "crypto";

export interface ActionResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * دالة مساعدة للتحقق من ملكية المستخدم للمنشأة
 */
async function assertUserOwnsVenue(userId: string, userRole: string, venueId: string) {
  if (userRole === "admin") return true;

  const [member] = await client<[{ id: string }?]>`
    SELECT id FROM venue_members
    WHERE venue_id = ${venueId} AND user_id = ${userId}
    LIMIT 1
  `;

  if (!member) {
    throw new Error("غير مصرح لك بإدارة هذه المنشأة.");
  }
  return true;
}

/**
 * Server Action: قبول وتأكيد طلب الحجز من قبل مالك المنشأة
 */
export async function approveOwnerBookingAction(
  bookingId: string
): Promise<ActionResult<{ success: boolean }>> {
  try {
    const { user } = await requireOwnerOrAdmin();

    const [booking] = await client<
      [{
        id: string;
        venue_id: string;
        customer_id: string;
        booking_reference: string;
        status: string;
        event_date: string;
        shift: string;
      }?]
    >`
      SELECT id, venue_id, customer_id, booking_reference, status, event_date, shift
      FROM bookings
      WHERE id = ${bookingId}
      LIMIT 1
    `;

    if (!booking) {
      return { success: false, error: "الحجز غير موجود." };
    }

    await assertUserOwnsVenue(user.id, user.role, booking.venue_id);

    const now = new Date().toISOString();
    const notifId = crypto.randomUUID();

    await client.begin(async (sql) => {
      // 1. تحديث حالة الحجز إلى confirmed
      await sql`
        UPDATE bookings
        SET status = 'confirmed', updated_at = ${now}
        WHERE id = ${bookingId}
      `;

      // 2. تثبيت حالة الفترة المحجوزة
      await sql`
        UPDATE booking_slots
        SET status = 'confirmed'
        WHERE booking_id = ${bookingId}
      `;

      // 3. إشعار الزبون بالموافقة
      await sql`
        INSERT INTO notifications (
          id, user_id, title, message, type, is_read, action_url, created_at
        ) VALUES (
          ${notifId}, ${booking.customer_id}, 'تم تأكيد حجزك بنجاح! 🎉',
          ${`وافقت إدارة المنشأة على طلب حجزك رقم (${booking.booking_reference}) ليوم ${booking.event_date}. نتمنى لك مناسبة سعيدة!`},
          'booking_status', false, '/my-bookings', ${now}
        )
      `;
    });

    revalidatePath("/owner");
    revalidatePath("/owner/bookings");
    revalidatePath("/owner/calendar");
    revalidatePath("/my-bookings");

    return { success: true, data: { success: true } };
  } catch (err: unknown) {
    console.error("approveOwnerBookingAction error:", err);
    const msg = err instanceof Error ? err.message : "فشل قبول الحجز.";
    return { success: false, error: msg };
  }
}

/**
 * Server Action: رفض طلب الحجز وإلغاء حجز الفترة لإتاحتها للآخرين
 */
export async function rejectOwnerBookingAction(
  bookingId: string,
  reason?: string
): Promise<ActionResult<{ success: boolean }>> {
  try {
    const { user } = await requireOwnerOrAdmin();

    const [booking] = await client<
      [{
        id: string;
        venue_id: string;
        customer_id: string;
        booking_reference: string;
        status: string;
        event_date: string;
      }?]
    >`
      SELECT id, venue_id, customer_id, booking_reference, status, event_date
      FROM bookings
      WHERE id = ${bookingId}
      LIMIT 1
    `;

    if (!booking) {
      return { success: false, error: "الحجز غير موجود." };
    }

    await assertUserOwnsVenue(user.id, user.role, booking.venue_id);

    const now = new Date().toISOString();
    const notifId = crypto.randomUUID();
    const rejectReason = reason?.trim() || "تعذر قبول الحجز للموعد المطلوب";

    await client.begin(async (sql) => {
      // 1. تحديث حالة الحجز إلى cancelled_by_owner
      await sql`
        UPDATE bookings
        SET status = 'cancelled_by_owner',
            cancellation_reason = ${rejectReason},
            cancelled_at = ${now},
            updated_at = ${now}
        WHERE id = ${bookingId}
      `;

      // 2. تحرير وحذف الفترات من booking_slots لإعادتها للتقويم فوراً
      await sql`
        DELETE FROM booking_slots
        WHERE booking_id = ${bookingId}
      `;

      // 3. إشعار الزبون
      await sql`
        INSERT INTO notifications (
          id, user_id, title, message, type, is_read, action_url, created_at
        ) VALUES (
          ${notifId}, ${booking.customer_id}, 'اعتذار عن قبول طلب الحجز',
          ${`نعتذر، لم تتمكن إدارة المنشأة من تأكيد طلبك رقم (${booking.booking_reference}) ليوم ${booking.event_date}. ${rejectReason}.`},
          'booking_status', false, '/my-bookings', ${now}
        )
      `;
    });

    revalidatePath("/owner");
    revalidatePath("/owner/bookings");
    revalidatePath("/owner/calendar");
    revalidatePath("/my-bookings");

    return { success: true, data: { success: true } };
  } catch (err: unknown) {
    console.error("rejectOwnerBookingAction error:", err);
    const msg = err instanceof Error ? err.message : "فشل رفض الحجز.";
    return { success: false, error: msg };
  }
}

/**
 * Server Action: إضافة حجز يدوي مباشر من طرف صاحب المنشأة (للحجوزات الهاتفية والورقية)
 */
export async function createManualBookingAction(
  formData: FormData
): Promise<ActionResult<{ bookingReference: string }>> {
  try {
    const { user } = await requireOwnerOrAdmin();

    const venueId = (formData.get("venueId") as string)?.trim();
    const eventDate = (formData.get("eventDate") as string)?.trim();
    const shift = (formData.get("shift") as "morning" | "evening" | "full_day") || "evening";
    const customerName = (formData.get("customerName") as string)?.trim();
    const customerPhone = (formData.get("customerPhone") as string)?.trim();
    const totalAmount = parseFloat((formData.get("totalAmount") as string) || "0") || 0;
    const notes = (formData.get("notes") as string)?.trim() || "حجز يدوي حضوري / هاتفي";

    if (!venueId || !eventDate || !customerName || !customerPhone) {
      return { success: false, error: "يرجى استكمال جميع الحقول الإلزامية." };
    }

    await assertUserOwnsVenue(user.id, user.role, venueId);

    // التحقق من عدم حجز الفترة مسبقاً
    const [existingSlot] = await client<[{ id: string }?]>`
      SELECT id FROM booking_slots
      WHERE venue_id = ${venueId} AND event_date = ${eventDate} AND shift = ${shift}
      LIMIT 1
    `;

    if (existingSlot) {
      return { success: false, error: `الفترة (${shift}) في تاريخ ${eventDate} محجوزة مسبقاً!` };
    }

    // جلب الوحدة الرئيسية
    const [unit] = await client<[{ id: string }?]>`
      SELECT id FROM venue_units WHERE venue_id = ${venueId} AND is_active = true LIMIT 1
    `;
    const unitId = unit?.id || "default_unit";

    const bookingId = crypto.randomUUID();
    const slotId = crypto.randomUUID();
    const bookingRef = `MAN-${eventDate.replace(/-/g, "").substring(2)}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
    const now = new Date().toISOString();

    const timeSlotStart = shift === "morning"
      ? `${eventDate}T08:00:00.000Z`
      : shift === "evening"
      ? `${eventDate}T16:00:00.000Z`
      : `${eventDate}T08:00:00.000Z`;

    const timeSlotEnd = shift === "morning"
      ? `${eventDate}T14:00:00.000Z`
      : shift === "evening"
      ? `${eventDate}T23:59:59.000Z`
      : `${eventDate}T23:59:59.000Z`;

    await client.begin(async (sql) => {
      await sql`
        INSERT INTO bookings (
          id, venue_id, customer_id, booking_reference, booking_source,
          is_full_venue, event_type, guest_count, event_date, shift,
          time_slot_start, time_slot_end, status, total_amount, deposit_amount,
          currency, customer_notes, cancellation_policy_snapshot, created_at, updated_at
        ) VALUES (
          ${bookingId}, ${venueId}, ${user.id}, ${bookingRef}, 'manual_owner',
          true, 'other', 100, ${eventDate}, ${shift},
          ${timeSlotStart}, ${timeSlotEnd}, 'confirmed', ${totalAmount}, ${totalAmount},
          'YER', ${`الزبون: ${customerName} (${customerPhone}) - ${notes}`}, '{}', ${now}, ${now}
        )
      `;

      await sql`
        INSERT INTO booking_requested_units (id, booking_id, venue_id, unit_id, created_at)
        VALUES (${crypto.randomUUID()}, ${bookingId}, ${venueId}, ${unitId}, ${now})
      `;

      await sql`
        INSERT INTO booking_slots (
          id, booking_id, venue_id, unit_id, event_date, shift,
          time_slot_start, time_slot_end, status, created_at
        ) VALUES (
          ${slotId}, ${bookingId}, ${venueId}, ${unitId}, ${eventDate}, ${shift},
          ${timeSlotStart}, ${timeSlotEnd}, 'confirmed', ${now}
        )
      `;
    });

    revalidatePath("/owner");
    revalidatePath("/owner/bookings");
    revalidatePath("/owner/calendar");

    return { success: true, data: { bookingReference: bookingRef } };
  } catch (err: unknown) {
    console.error("createManualBookingAction error:", err);
    const msg = err instanceof Error ? err.message : "فشل إنشاء الحجز اليدوي.";
    return { success: false, error: msg };
  }
}

/**
 * Server Action: إغلاق فترة محددة للصيانة أو الحجز الخاص
 */
export async function blockSlotForMaintenanceAction(
  formData: FormData
): Promise<ActionResult<{ success: boolean }>> {
  try {
    const { user } = await requireOwnerOrAdmin();

    const venueId = (formData.get("venueId") as string)?.trim();
    const eventDate = (formData.get("eventDate") as string)?.trim();
    const shift = (formData.get("shift") as "morning" | "evening" | "full_day") || "evening";
    const reason = (formData.get("reason") as string)?.trim() || "صيانة وتجهيزات خاصة";

    if (!venueId || !eventDate) {
      return { success: false, error: "يرجى تحديد المنشأة والتاريخ." };
    }

    await assertUserOwnsVenue(user.id, user.role, venueId);

    // فحص إذا كانت الفترة محجوزة بالفعل
    const [existing] = await client<[{ id: string }?]>`
      SELECT id FROM booking_slots
      WHERE venue_id = ${venueId} AND event_date = ${eventDate} AND shift = ${shift}
      LIMIT 1
    `;

    if (existing) {
      return { success: false, error: "هذه الفترة محجوزة بالفعل ولا يمكن إغلاقها." };
    }

    const [unit] = await client<[{ id: string }?]>`
      SELECT id FROM venue_units WHERE venue_id = ${venueId} AND is_active = true LIMIT 1
    `;
    const unitId = unit?.id || "default_unit";

    const bookingId = crypto.randomUUID();
    const slotId = crypto.randomUUID();
    const bookingRef = `BLK-${eventDate.replace(/-/g, "").substring(2)}-${Math.random().toString(36).substring(2, 5).toUpperCase()}`;
    const now = new Date().toISOString();

    const timeSlotStart = shift === "morning"
      ? `${eventDate}T08:00:00.000Z`
      : shift === "evening"
      ? `${eventDate}T16:00:00.000Z`
      : `${eventDate}T08:00:00.000Z`;

    const timeSlotEnd = shift === "morning"
      ? `${eventDate}T14:00:00.000Z`
      : shift === "evening"
      ? `${eventDate}T23:59:59.000Z`
      : `${eventDate}T23:59:59.000Z`;

    await client.begin(async (sql) => {
      await sql`
        INSERT INTO bookings (
          id, venue_id, customer_id, booking_reference, booking_source,
          is_full_venue, event_type, guest_count, event_date, shift,
          time_slot_start, time_slot_end, status, total_amount, deposit_amount,
          currency, customer_notes, cancellation_policy_snapshot, created_at, updated_at
        ) VALUES (
          ${bookingId}, ${venueId}, ${user.id}, ${bookingRef}, 'manual_owner',
          true, 'other', 0, ${eventDate}, ${shift},
          ${timeSlotStart}, ${timeSlotEnd}, 'confirmed', 0, 0,
          'YER', ${`مغلق للصيانة: ${reason}`}, '{}', ${now}, ${now}
        )
      `;

      await sql`
        INSERT INTO booking_requested_units (id, booking_id, venue_id, unit_id, created_at)
        VALUES (${crypto.randomUUID()}, ${bookingId}, ${venueId}, ${unitId}, ${now})
      `;

      await sql`
        INSERT INTO booking_slots (
          id, booking_id, venue_id, unit_id, event_date, shift,
          time_slot_start, time_slot_end, status, created_at
        ) VALUES (
          ${slotId}, ${bookingId}, ${venueId}, ${unitId}, ${eventDate}, ${shift},
          ${timeSlotStart}, ${timeSlotEnd}, 'confirmed', ${now}
        )
      `;
    });

    revalidatePath("/owner/calendar");
    revalidatePath("/owner/bookings");

    return { success: true, data: { success: true } };
  } catch (err: unknown) {
    console.error("blockSlotForMaintenanceAction error:", err);
    const msg = err instanceof Error ? err.message : "فشل إغلاق الفترة.";
    return { success: false, error: msg };
  }
}

/**
 * Server Action: تعديل إعدادات وأسعار وسعة المنشأة من قبل المالك
 */
export async function updateOwnerVenueSettingsAction(
  formData: FormData
): Promise<ActionResult<{ success: boolean }>> {
  try {
    const { user } = await requireOwnerOrAdmin();

    const venueId = (formData.get("venueId") as string)?.trim();
    const maxCapacity = parseInt((formData.get("maxCapacity") as string) || "0", 10);
    const eveningPrice = parseFloat((formData.get("eveningPrice") as string) || "0");
    const morningPrice = parseFloat((formData.get("morningPrice") as string) || "0");
    const fullDayPrice = parseFloat((formData.get("fullDayPrice") as string) || "0");
    const isActive = formData.get("isActive") === "true";

    if (!venueId) {
      return { success: false, error: "معرف المنشأة مطلوب." };
    }

    await assertUserOwnsVenue(user.id, user.role, venueId);

    const now = new Date().toISOString();
    const newStatus = isActive ? "active" : "suspended";

    await client.begin(async (sql) => {
      // 1. تحديث المنشأة
      await sql`
        UPDATE venues
        SET status = ${newStatus}, updated_at = ${now}
        WHERE id = ${venueId}
      `;

      // 2. تحديث السعة في الوحدة الرئيسية
      if (maxCapacity > 0) {
        await sql`
          UPDATE venue_units
          SET capacity_max = ${maxCapacity}, updated_at = ${now}
          WHERE venue_id = ${venueId}
        `;
      }

      // 3. تحديث الأسعار
      const upsertShiftPrice = async (shift: string, price: number) => {
        if (price <= 0) return;
        const [existing] = await sql<[{ id: string }?]>`
          SELECT id FROM pricing_tiers WHERE venue_id = ${venueId} AND shift = ${shift} LIMIT 1
        `;
        if (existing) {
          await sql`
            UPDATE pricing_tiers SET price = ${price} WHERE id = ${existing.id}
          `;
        } else {
          await sql`
            INSERT INTO pricing_tiers (id, venue_id, shift, price, currency, created_at)
            VALUES (${"tier_" + crypto.randomUUID().substring(0, 8)}, ${venueId}, ${shift}, ${price}, 'YER', ${now})
          `;
        }
      };

      await upsertShiftPrice("morning", morningPrice);
      await upsertShiftPrice("evening", eveningPrice);
      await upsertShiftPrice("full_day", fullDayPrice);
    });

    revalidatePath("/owner");
    revalidatePath("/owner/venues");
    revalidatePath("/explore");
    revalidatePath("/");

    return { success: true, data: { success: true } };
  } catch (err: unknown) {
    console.error("updateOwnerVenueSettingsAction error:", err);
    const msg = err instanceof Error ? err.message : "فشل حفظ التعديلات.";
    return { success: false, error: msg };
  }
}
