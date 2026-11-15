import type Database from "better-sqlite3";
import { BOOKING_CONFIG } from "./config";
import { transitionBookingStatus } from "./service";
import type { Booking } from "@/db/schema";

export interface SweeperRunResult {
  expiredPayments: number;
  timedOutOwnerReviews: number;
  expiredEscalations: number;
  errors: Array<{ bookingId: string; error: string }>;
}

/**
 * معالج المهام الموقوتة وتنظيف الحجوزات المنتهية (Booking Lifecycle Sweeper)
 * يحرر الفتحات فورياً وينقل الحجوزات لحالاتها النظامية المستحقة
 */
export function runBookingSweeper(sqlite: Database.Database): SweeperRunResult {
  const nowIso = new Date().toISOString();
  const result: SweeperRunResult = {
    expiredPayments: 0,
    timedOutOwnerReviews: 0,
    expiredEscalations: 0,
    errors: [],
  };

  // 1. معالجة الحجوزات المنتهية في مرحلة السداد (pending_payment -> expired)
  const expiredPaymentBookings = sqlite
    .prepare(`
      SELECT * FROM bookings 
      WHERE status = 'pending_payment' 
        AND expires_at IS NOT NULL 
        AND expires_at <= ?
    `)
    .all(nowIso) as Booking[];

  for (const booking of expiredPaymentBookings) {
    try {
      transitionBookingStatus(sqlite, booking.id, "expired", {
        role: "system",
        reason: "PAYMENT_WINDOW_EXPIRED",
      });
      result.expiredPayments++;
    } catch (err: unknown) {
      result.errors.push({
        bookingId: booking.id,
        error: (err as Error).message,
      });
    }
  }

  // 2. معالجة تعثر رد المالك (pending_owner_approval -> owner_review_timed_out)
  const timedOutOwnerBookings = sqlite
    .prepare(`
      SELECT * FROM bookings 
      WHERE status = 'pending_owner_approval' 
        AND owner_review_expires_at IS NOT NULL 
        AND owner_review_expires_at <= ?
    `)
    .all(nowIso) as Booking[];

  for (const booking of timedOutOwnerBookings) {
    try {
      // نقل الحالة إلى مؤقت رد المالك
      transitionBookingStatus(sqlite, booking.id, "owner_review_timed_out", {
        role: "system",
        reason: "OWNER_REVIEW_TIMEOUT_ESCALATED_TO_ADMIN",
      });

      // تعيين مهلة التصعيد الإداري المركزية
      const adminEscalationExpiresAt = new Date(
        Date.now() + BOOKING_CONFIG.ADMIN_ESCALATION_HOURS * 3600 * 1000
      ).toISOString();

      sqlite
        .prepare(`
          UPDATE bookings 
          SET admin_escalation_expires_at = ? 
          WHERE id = ?
        `)
        .run(adminEscalationExpiresAt, booking.id);

      result.timedOutOwnerReviews++;
    } catch (err: unknown) {
      result.errors.push({
        bookingId: booking.id,
        error: (err as Error).message,
      });
    }
  }

  // 3. معالجة انقضاء مهلة التصعيد الإداري (owner_review_timed_out -> expired)
  const expiredEscalations = sqlite
    .prepare(`
      SELECT * FROM bookings 
      WHERE status = 'owner_review_timed_out' 
        AND admin_escalation_expires_at IS NOT NULL 
        AND admin_escalation_expires_at <= ?
    `)
    .all(nowIso) as Booking[];

  for (const booking of expiredEscalations) {
    try {
      transitionBookingStatus(sqlite, booking.id, "expired", {
        role: "system",
        reason: "ADMIN_ESCALATION_TIMEOUT_RELEASED",
      });
      result.expiredEscalations++;
    } catch (err: unknown) {
      result.errors.push({
        bookingId: booking.id,
        error: (err as Error).message,
      });
    }
  }

  return result;
}
