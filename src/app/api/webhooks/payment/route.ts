import { NextRequest, NextResponse } from "next/server";
import { sqlite } from "@/db";
import { BOOKING_CONFIG } from "@/lib/booking/config";
import { processPaymentWebhook, verifyWebhookSignature } from "@/lib/booking/payments";
import type { PaymentWebhookPayload } from "@/lib/booking/types";

export const instant = false;

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const signature =
      req.headers.get("x-signature") ||
      req.headers.get("x-provider-signature") ||
      req.headers.get("x-hub-signature-256");

    // 1. التحقق من التوقيع الرقمي المشفر
    const isValid = verifyWebhookSignature(
      rawBody,
      signature,
      BOOKING_CONFIG.PAYMENT_WEBHOOK_SECRET
    );

    if (!isValid) {
      return NextResponse.json(
        { error: "INVALID_SIGNATURE: Cryptographic verification failed" },
        { status: 401 }
      );
    }

    // 2. تحليل نص الـ JSON
    let payload: PaymentWebhookPayload;
    try {
      payload = JSON.parse(rawBody);
    } catch {
      return NextResponse.json(
        { error: "BAD_REQUEST: Invalid JSON payload" },
        { status: 400 }
      );
    }

    if (!payload.provider || !payload.eventId || !payload.providerTransactionId || !payload.bookingReference) {
      return NextResponse.json(
        { error: "VALIDATION_ERROR: Missing required webhook fields" },
        { status: 422 }
      );
    }

    // 3. معالجة العملية المالية وحالة الحجز ذرياً
    const result = processPaymentWebhook(sqlite, payload, rawBody);

    return NextResponse.json({
      success: result.success,
      idempotent: result.idempotent,
      bookingUpdated: result.bookingUpdated,
      newBookingStatus: result.newBookingStatus,
      paymentId: result.payment?.id,
      message: result.message,
    });
  } catch (error: unknown) {
    console.error("Payment webhook error:", error);
    return NextResponse.json(
      { error: (error as Error).message || "INTERNAL_PAYMENT_ERROR" },
      { status: 500 }
    );
  }
}
