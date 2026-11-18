import { NextRequest, NextResponse } from "next/server";
import { client } from "@/db";
import { BOOKING_CONFIG } from "@/lib/booking/config";
import { verifyWebhookSignature } from "@/lib/booking/payments";
import type { PaymentWebhookPayload } from "@/lib/booking/types";
import crypto from "crypto";

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

    // 3. معالجة العملية المالية وحالة الحجز ذرياً على Supabase PostgreSQL
    const nowIso = new Date().toISOString();
    const paymentId = crypto.randomUUID();

    await client.begin(async (sql) => {
      // Update booking to confirmed if paid
      if (payload.status === "success") {
        await sql`
          UPDATE bookings 
          SET status = 'confirmed', confirmed_at = ${nowIso}, updated_at = ${nowIso}
          WHERE booking_reference = ${payload.bookingReference}
        `;
        await sql`
          UPDATE booking_slots 
          SET status = 'confirmed'
          WHERE booking_id = (SELECT id FROM bookings WHERE booking_reference = ${payload.bookingReference})
        `;
      }

      // Record payment
      await sql`
        INSERT INTO payments (
          id, booking_id, provider, provider_transaction_id, amount,
          currency, status, idempotency_key, raw_response_log, created_at, updated_at
        ) VALUES (
          ${paymentId},
          (SELECT id FROM bookings WHERE booking_reference = ${payload.bookingReference}),
          ${payload.provider},
          ${payload.providerTransactionId},
          ${payload.amount || 0},
          ${payload.currency || "YER"},
          ${payload.status},
          ${payload.eventId},
          ${rawBody},
          ${nowIso},
          ${nowIso}
        )
        ON CONFLICT (idempotency_key) DO NOTHING
      `;
    });

    return NextResponse.json({
      success: true,
      idempotent: true,
      bookingUpdated: true,
      newBookingStatus: "confirmed",
      paymentId,
      message: "Payment processed successfully",
    });
  } catch (error: unknown) {
    console.error("Payment webhook error:", error);
    return NextResponse.json(
      { error: (error as Error).message || "INTERNAL_PAYMENT_ERROR" },
      { status: 500 }
    );
  }
}
