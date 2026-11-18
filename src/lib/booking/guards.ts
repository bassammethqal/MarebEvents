import { client } from "@/db";
import type { Booking, VenueUnit } from "@/db/schema";
import type { BookingStatus, TransitionActor } from "./types";

/**
 * مصفوفة انتقالات الحالات الصارمة
 */
export const ALLOWED_TRANSITIONS: Record<BookingStatus, BookingStatus[]> = {
  pending_owner_approval: [
    "pending_payment",       // موافقة المالك (يفتح مهلة السداد للعميل)
    "confirmed",             // موافقة المالك المباشرة في حال عدم طلب عربون (deposit = 0)
    "rejected",              // رفض المالك للطلب
    "cancelled_by_customer", // إلغاء العميل لطلبه قبل رد المالك
    "owner_review_timed_out",// انتهاء مهلة رد المالك وتحويله للتصعيد
  ],
  pending_payment: [
    "confirmed",             // سداد العميل بنجاح
    "cancelled_by_customer", // إلغاء العميل قبل السداد
    "expired",               // انتهاء مهلة السداد دون دفع
  ],
  owner_review_timed_out: [
    "pending_payment",       // حسم الإدارة بالموافقة مع اشتراط السداد
    "confirmed",             // حسم الإدارة بالموافقة والتأكيد المباشر
    "rejected",              // حسم الإدارة بالرفض
    "cancelled_by_customer", // إلغاء العميل
    "expired",               // انتهاء مهلة تصعيد الإدارة دون حسم
  ],
  confirmed: [
    "completed",             // انتهاء الفعالية بنجاح
    "cancelled_by_customer", // إلغاء العميل للحجز المؤكد وفق الشروط
    "cancelled_by_owner",    // إلغاء المالك الاضطراري
  ],
  completed: [],             // حالة نهائية
  cancelled_by_customer: [], // حالة نهائية
  cancelled_by_owner: [],    // حالة نهائية
  expired: [],               // حالة نهائية
  rejected: [],              // حالة نهائية
};

/**
 * الحالات التي تحجز الفتحة وتمنع التعارض الزمني
 */
export const BLOCKING_STATUSES: BookingStatus[] = [
  "pending_owner_approval",
  "pending_payment",
  "owner_review_timed_out",
  "confirmed",
];

export function isBlockingStatus(status: BookingStatus): boolean {
  return BLOCKING_STATUSES.includes(status);
}

/**
 * استخراج وفحص الأقسام والوحدات النشطة للمنشأة مع منع الحجز لمنشأة فارغة
 */
export async function getActiveVenueUnits(
  venueId: string
): Promise<VenueUnit[]> {
  const units = await client<VenueUnit[]>`
    SELECT * FROM venue_units 
    WHERE venue_id = ${venueId} AND is_active = true AND deleted_at IS NULL
  `;

  if (!units || units.length === 0) {
    throw new Error(
      `VENUE_HAS_NO_ACTIVE_UNITS: Cannot book venue ${venueId}. It has no active units configured.`
    );
  }

  return units;
}

/**
 * فحص الصلاحيات الإلزامية لانتقالات الحالة داخل الخادم
 * يتم فحص الصلاحية قبل فحص الـ Idempotency لضمان عدم تسريب معلومات لأي مستخدم غير مخول
 */
export async function assertCanTransitionBooking(
  booking: Booking,
  targetStatus: BookingStatus,
  actor: TransitionActor
): Promise<void> {
  const rawRecord = booking as unknown as Record<string, unknown>;
  const venueId = (rawRecord.venue_id as string) || booking.venueId;
  const customerId = (rawRecord.customer_id as string) || booking.customerId;

  // 1. مهمة النظام التلقائية ومعالجات الـ Webhook (System Sweeper & Verified Payment Webhook)
  if (actor.role === "system") {
    if (["expired", "owner_review_timed_out", "confirmed"].includes(targetStatus)) {
      return;
    }
    throw new Error(`FORBIDDEN: System actor cannot transition booking to ${targetStatus}`);
  }

  // 2. المدير العام (Admin)
  if (actor.role === "admin") {
    return;
  }

  // 3. العميل (Customer)
  if (actor.role === "customer") {
    // التحقق من ملكية الحجز للعميل
    if (!actor.userId || customerId !== actor.userId) {
      throw new Error("FORBIDDEN: You do not own this booking");
    }

    // العميل مسموح له فقط بإلغاء حجزه
    if (targetStatus !== "cancelled_by_customer") {
      throw new Error(
        `FORBIDDEN: Customers are only permitted to cancel their own booking, not transition to ${targetStatus}`
      );
    }
    return;
  }

  // 4. مالك أو مدير المنشأة (Owner)
  if (actor.role === "owner") {
    if (!actor.userId) {
      throw new Error("UNAUTHORIZED: Actor userId is missing");
    }

    // التحقق من عضوية المالك وصلاحياته على المنشأة التابع لها الحجز
    const [member] = await client<{ role: string }[]>`
      SELECT role FROM venue_members 
      WHERE venue_id = ${venueId} AND user_id = ${actor.userId}
    `;

    const allowedRoles = ["primary_owner", "co_owner", "manager"];
    if (!member || !allowedRoles.includes(member.role)) {
      throw new Error(
        `FORBIDDEN: You do not have owner/manager permissions for venue ${venueId}`
      );
    }

    // الانتقالات المسموحة لمالك المنشأة
    const allowedOwnerTargets: BookingStatus[] = [
      "pending_payment",       // موافقة المالك
      "confirmed",             // موافقة المالك المباشرة
      "rejected",              // رفض المالك
      "cancelled_by_owner",    // إلغاء المالك
    ];

    if (!allowedOwnerTargets.includes(targetStatus)) {
      throw new Error(
        `FORBIDDEN: Venue owners cannot transition booking to ${targetStatus}`
      );
    }
    return;
  }

  throw new Error("UNAUTHORIZED: Unknown actor role");
}
