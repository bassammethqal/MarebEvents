import crypto from "crypto";
import type Database from "better-sqlite3";
import { client } from "@/db";
import type { Booking, Payment } from "@/db/schema";
import { transitionBookingStatus } from "./service";
import type {
  BookingStatus,
  CurrencyType,
  PaymentProcessingResult,
  PaymentWebhookPayload,
} from "./types";

/**
 * التحقق الرقمي المشفر من صحة توقيع الـ Webhook (HMAC-SHA256) لمنع التزوير
 */
export function verifyWebhookSignature(
  rawBody: string,
  signatureHeader: string | null,
  secret: string
): boolean {
  if (!signatureHeader || !rawBody || !secret) {
    return false;
  }

  try {
    const computedSignature = crypto
      .createHmac("sha256", secret)
      .update(rawBody)
      .digest("hex");

    const headerBuffer = Buffer.from(signatureHeader.replace(/^sha256=/, ""), "hex");
    const computedBuffer = Buffer.from(computedSignature, "hex");

    if (headerBuffer.length !== computedBuffer.length) {
      return false;
    }

    return crypto.timingSafeEqual(headerBuffer, computedBuffer);
  } catch {
    return false;
  }
}

/**
 * معالج عمليات الدفع والـ Webhooks المنفصل عن جلسات المستخدمين
 * يفصل تماماً بين الحالة المالية وسجل الحسابات وبين دورة حياة الحجز التشغيلية
 */
export async function processPaymentWebhook(
  sqlite: Database.Database,
  payload: PaymentWebhookPayload,
  rawPayloadString: string
): Promise<PaymentProcessingResult> {
  const {
    provider,
    eventId,
    eventType,
    providerTransactionId,
    bookingReference,
    amount,
    currency,
    status: paymentStatus,
    metadata = {},
  } = payload;

  const processTx = sqlite.transaction(() => {
    const nowIso = new Date().toISOString();

    // 1. فحص تكرار الحدث (Webhook Idempotency)
    const existingEvent = sqlite
      .prepare(`SELECT id, status FROM webhook_events WHERE provider = ? AND event_id = ?`)
      .get(provider, eventId) as { id: string; status: string } | undefined;

    if (existingEvent) {
      // الحدث استُلم وعولج مسبقاً -> Idempotent
      const existingPayment = sqlite
        .prepare(`SELECT * FROM payments WHERE provider = ? AND provider_transaction_id = ?`)
        .get(provider, providerTransactionId) as Payment | undefined;

      return {
        success: true,
        idempotent: true,
        payment: existingPayment!,
        bookingUpdated: false,
        message: "Duplicate webhook event acknowledged without state modification",
      };
    }

    // 2. تسجيل الحدث في جدول webhook_events
    const webhookEventId = crypto.randomUUID();
    sqlite
      .prepare(`
        INSERT INTO webhook_events (id, provider, event_id, event_type, payload, status, created_at)
        VALUES (?, ?, ?, ?, ?, 'pending', ?)
      `)
      .run(webhookEventId, provider, eventId, eventType, rawPayloadString, nowIso);

    // 3. التحقق من وجود الحجز المرتبط عبر booking_reference
    const booking = sqlite
      .prepare(`SELECT * FROM bookings WHERE booking_reference = ?`)
      .get(bookingReference) as Booking | undefined;

    if (!booking) {
      sqlite
        .prepare(`UPDATE webhook_events SET status = 'failed', error_message = ? WHERE id = ?`)
        .run(`BOOKING_NOT_FOUND: ${bookingReference}`, webhookEventId);

      throw new Error(`BOOKING_NOT_FOUND: No booking found with reference ${bookingReference}`);
    }

    // 4. فحص العملة والمبلغ
    const bookingRecord = booking as unknown as Record<string, unknown>;
    const depositAmount = (bookingRecord.deposit_amount as number) ?? booking.depositAmount ?? 0;
    const totalAmount = (bookingRecord.total_amount as number) ?? booking.totalAmount ?? 0;
    const bookingCurrency = (bookingRecord.currency as CurrencyType) || booking.currency;
    const expectedAmount = depositAmount > 0 ? depositAmount : totalAmount;

    if (bookingCurrency !== currency || Math.abs(amount - expectedAmount) > 0.01) {
      // وسم المعاملة للاشتباه المالي (Amount/Currency Mismatch)
      const fraudPaymentId = crypto.randomUUID();
      sqlite
        .prepare(`
          INSERT INTO payments (
            id, booking_id, provider, provider_transaction_id, amount, currency,
            status, review_reason, metadata, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, 'requires_review', ?, ?, ?, ?)
        `)
        .run(
          fraudPaymentId,
          booking.id,
          provider,
          providerTransactionId,
          amount,
          currency,
          `AMOUNT_OR_CURRENCY_MISMATCH: Expected ${expectedAmount} ${bookingCurrency}, received ${amount} ${currency}`,
          JSON.stringify(metadata),
          nowIso,
          nowIso
        );

      sqlite
        .prepare(`UPDATE webhook_events SET status = 'processed', error_message = 'Amount mismatch flagged' WHERE id = ?`)
        .run(webhookEventId);

      const savedPayment = sqlite.prepare(`SELECT * FROM payments WHERE id = ?`).get(fraudPaymentId) as Payment;

      return {
        success: false,
        idempotent: false,
        payment: savedPayment,
        bookingUpdated: false,
        message: "Payment amount or currency mismatch. Flagged for administrative review.",
      };
    }

    // 5. فحص ما إذا كانت المعاملة المالية مسجلة مسبقاً في payments
    const existingPaymentRow = sqlite
      .prepare(`SELECT * FROM payments WHERE provider = ? AND provider_transaction_id = ?`)
      .get(provider, providerTransactionId) as Payment | undefined;

    if (existingPaymentRow) {
      sqlite
        .prepare(`UPDATE webhook_events SET status = 'duplicate', processed_at = ? WHERE id = ?`)
        .run(nowIso, webhookEventId);

      return {
        success: true,
        idempotent: true,
        payment: existingPaymentRow,
        bookingUpdated: false,
        message: "Payment transaction already registered",
      };
    }

    // 6. التعامل مع حالات فشل الدفع من طرف البوابة
    if (paymentStatus === "failed") {
      const failedPaymentId = crypto.randomUUID();
      sqlite
        .prepare(`
          INSERT INTO payments (
            id, booking_id, provider, provider_transaction_id, amount, currency,
            status, review_reason, metadata, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, 'failed', 'GATEWAY_PAYMENT_FAILED', ?, ?, ?)
        `)
        .run(
          failedPaymentId,
          booking.id,
          provider,
          providerTransactionId,
          amount,
          currency,
          JSON.stringify(metadata),
          nowIso,
          nowIso
        );

      sqlite
        .prepare(`UPDATE webhook_events SET status = 'processed', processed_at = ? WHERE id = ?`)
        .run(nowIso, webhookEventId);

      const savedFailed = sqlite.prepare(`SELECT * FROM payments WHERE id = ?`).get(failedPaymentId) as Payment;

      return {
        success: false,
        idempotent: false,
        payment: savedFailed,
        bookingUpdated: false,
        message: "Gateway reported payment failure",
      };
    }

    // 7. الدفع ناجح: تسجيل العملية المالية أولاً في جدول payments
    const paymentId = crypto.randomUUID();
    const currentBookingStatus = booking.status;

    let targetPaymentStatus: "completed" | "requires_review" = "completed";
    let reviewReason: string | null = null;
    let shouldUpdateBooking = false;

    if (currentBookingStatus === "pending_payment") {
      // الحالة الطبيعية المثالية: الحجز بانتظار السداد وتم السداد بنجاح
      targetPaymentStatus = "completed";
      shouldUpdateBooking = true;
    } else if (["expired", "cancelled_by_customer", "cancelled_by_owner", "rejected"].includes(currentBookingStatus)) {
      // وصول دفعة بعد انتهاء الحجز أو إلغائه:
      // نحفظ المال ولا نفتح الحجز لحماية التقويم، ونوسم المعاملة بالاسترداد الإداري
      targetPaymentStatus = "requires_review";
      reviewReason = `LATE_PAYMENT_ON_STATUS_${currentBookingStatus.toUpperCase()}_SCHEDULED_FOR_REFUND`;
      shouldUpdateBooking = false;
    } else if (currentBookingStatus === "pending_owner_approval") {
      // وصول دفعة قبل موافقة المالك المطلوبة:
      targetPaymentStatus = "requires_review";
      reviewReason = "PAYMENT_RECEIVED_BEFORE_REQUIRED_OWNER_APPROVAL";
      shouldUpdateBooking = false;
    } else if (currentBookingStatus === "confirmed") {
      // الحجز مؤكد مسبقاً (دفع مكتمل بالفعل)
      targetPaymentStatus = "completed";
      shouldUpdateBooking = false;
    }

    sqlite
      .prepare(`
        INSERT INTO payments (
          id, booking_id, provider, provider_transaction_id, amount, currency,
          status, review_reason, metadata, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)
      .run(
        paymentId,
        booking.id,
        provider,
        providerTransactionId,
        amount,
        currency,
        targetPaymentStatus,
        reviewReason,
        JSON.stringify(metadata),
        nowIso,
        nowIso
      );

    // 8. تحديث حالة الحجز إذا كانت مستحقة
    if (shouldUpdateBooking) {
      sqlite
        .prepare(`UPDATE bookings SET status = 'confirmed', updated_at = ? WHERE id = ?`)
        .run(nowIso, booking.id);
    }

    // تحديث حالة الحدث إلى مكتمل
    sqlite
      .prepare(`UPDATE webhook_events SET status = 'processed', processed_at = ? WHERE id = ?`)
      .run(nowIso, webhookEventId);

    const savedPayment = sqlite.prepare(`SELECT * FROM payments WHERE id = ?`).get(paymentId) as Payment;

    return {
      success: true,
      idempotent: false,
      payment: savedPayment,
      bookingUpdated: shouldUpdateBooking,
      newBookingStatus: shouldUpdateBooking ? "confirmed" : (booking.status as BookingStatus),
      message: shouldUpdateBooking
        ? "Payment verified and booking confirmed successfully"
        : `Payment recorded with status ${targetPaymentStatus}: ${reviewReason || "No booking state change"}`,
    };
  });

  const res = processTx.immediate();

  if (res.bookingUpdated && bookingReference) {
    try {
      const [pgBooking] = await client<[{ id: string }?]>`
        SELECT id FROM bookings WHERE booking_reference = ${bookingReference} LIMIT 1
      `;
      if (pgBooking?.id) {
        await transitionBookingStatus(pgBooking.id, "confirmed", {
          role: "system",
          reason: `PAYMENT_RECEIVED_VIA_${provider.toUpperCase()}_TX_${providerTransactionId}`,
        });
      }
    } catch (err) {
      console.warn("Could not sync pg booking status on webhook:", err);
    }
  }

  return res;
}
