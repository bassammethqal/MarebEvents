/**
 * الإعدادات المركزية لمحرك الحجوزات (Booking Engine Configuration)
 * تتيح ضبط المهل الزمنية وسياسات الحجز مركزياً عبر متغيرات البيئة أو القيم الافتراضية الآمنة.
 */
export const BOOKING_CONFIG = {
  // مهلة سداد العميل للحجز المبدئي (افتراضي: 30 دقيقة)
  PAYMENT_TIMEOUT_MINUTES: Number(process.env.BOOKING_PAYMENT_TIMEOUT_MINUTES || 30),

  // مهلة مراجعة المالك للطلب قبل تحويله لمؤقت تصعيد (افتراضي: 24 ساعة)
  OWNER_REVIEW_HOURS: Number(process.env.BOOKING_OWNER_REVIEW_HOURS || 24),

  // مهلة تصعيد الإدارة لحسم الطلب قبل إنهائه وتحرير الفتحة (افتراضي: 24 ساعة)
  ADMIN_ESCALATION_HOURS: Number(process.env.BOOKING_ADMIN_ESCALATION_HOURS || 24),

  // السر الافتراضي لتوقيع الـ Webhook (في بيئة التطوير والاختبار)
  PAYMENT_WEBHOOK_SECRET: process.env.PAYMENT_WEBHOOK_SECRET || "mareb_events_dev_webhook_secret_key_32chars!",
} as const;
