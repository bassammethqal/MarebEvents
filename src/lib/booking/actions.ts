"use server";

import { getCurrentSession } from "@/lib/auth/session";
import { sqlite } from "@/db";
import { createBooking } from "@/lib/booking/service";
import { BookingShift, EventType } from "@/lib/booking/types";
import { revalidatePath } from "next/cache";

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
      // Full day until next morning 08:00
      const nextDay = new Date(new Date(eventDate).getTime() + 24 * 60 * 60 * 1000)
        .toISOString()
        .slice(0, 10);
      timeSlotEnd = `${nextDay}T08:00:00.000Z`;
    }

    const isFullVenue = !unitId || unitId === "full";
    const requestedUnitIds = unitId && unitId !== "full" ? [unitId] : undefined;
    const guestCount = guestCountStr && parseInt(guestCountStr, 10) > 0 ? parseInt(guestCountStr, 10) : 100;
    const idempotencyKey = crypto.randomUUID();

    const result = createBooking(
      sqlite,
      {
        venueId,
        bookingSource: "online",
        isFullVenue,
        requestedUnitIds,
        eventType,
        guestCount,
        eventDate,
        shift,
        timeSlotStart,
        timeSlotEnd,
        idempotencyKey,
        customerNotes: customerNotes || undefined,
        requiresOwnerApproval: true,
      },
      {
        userId: session.user.id,
        role: "customer",
      }
    );

    revalidatePath("/my-bookings");
    revalidatePath("/");

    return {
      success: true,
      bookingId: result.booking.id,
      bookingNumber: result.booking.bookingReference,
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
