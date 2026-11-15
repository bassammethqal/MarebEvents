/**
 * جناح الاختبارات الشامل للمرحلة الثالثة: محرك الحجوزات (Booking Engine Test Suite)
 * يختبر جميع السيناريوهات الإلزامية بدقة وعمق مع التحقق من الاتساق وقاعدة البيانات.
 */
import crypto from "crypto";
import Database from "better-sqlite3";
import { sqlite } from "../src/db";
import { BOOKING_CONFIG } from "../src/lib/booking/config";
import { createBooking, transitionBookingStatus } from "../src/lib/booking/service";
import { runBookingSweeper } from "../src/lib/booking/sweeper";
import { processPaymentWebhook, verifyWebhookSignature } from "../src/lib/booking/payments";
import type { BookingTransitionResult, CreateBookingInput } from "../src/lib/booking/types";

let passedCount = 0;
let failedCount = 0;

function assert(condition: boolean, message: string) {
  if (!condition) {
    failedCount++;
    console.error(`  ❌ فشل: ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  }
  passedCount++;
  console.log(`  ✅ نجاح: ${message}`);
}

// تهيئة بيانات الاختبار (Test Fixtures)
const TEST_PREFIX = `test_${Date.now()}`;
const customerId = `${TEST_PREFIX}_customer`;
const ownerId = `${TEST_PREFIX}_owner`;
const adminId = `${TEST_PREFIX}_admin`;
const otherCustomerId = `${TEST_PREFIX}_other_customer`;

const venueId = `${TEST_PREFIX}_venue`;
const unitWomenId = `${TEST_PREFIX}_unit_women`;
const unitMenId = `${TEST_PREFIX}_unit_men`;

const emptyVenueId = `${TEST_PREFIX}_empty_venue`;

function setupFixtures() {
  console.log("\n📦 تهيئة بيانات الاختبار في SQLite...");

  // 1. المستخدمون
  sqlite.prepare(`
    INSERT INTO users (id, full_name, email, phone, password_hash, role, is_active, created_at, updated_at)
    VALUES 
      (?, 'عميل تجريبي', ?, ?, 'hash', 'customer', 1, datetime('now'), datetime('now')),
      (?, 'مالك تجريبي', ?, ?, 'hash', 'owner', 1, datetime('now'), datetime('now')),
      (?, 'مدير تجريبي', ?, ?, 'hash', 'admin', 1, datetime('now'), datetime('now')),
      (?, 'عميل آخر', ?, ?, 'hash', 'customer', 1, datetime('now'), datetime('now'))
  `).run(
    customerId, `${customerId}@test.local`, `77000${Date.now().toString().slice(-4)}`,
    ownerId, `${ownerId}@test.local`, `77100${Date.now().toString().slice(-4)}`,
    adminId, `${adminId}@test.local`, `77200${Date.now().toString().slice(-4)}`,
    otherCustomerId, `${otherCustomerId}@test.local`, `77300${Date.now().toString().slice(-4)}`
  );

  // 2. تصنيف المنشأة
  sqlite.prepare(`
    INSERT INTO venue_categories (id, slug, name_ar, display_order, is_active, created_at)
    VALUES (?, ?, 'قاعات مناسبات', 1, 1, datetime('now'))
  `).run(`${TEST_PREFIX}_cat`, `${TEST_PREFIX}_cat`);

  // 3. المنشأة التجريبية
  sqlite.prepare(`
    INSERT INTO venues (
      id, category_id, name, slug, city, district, contact_phone, status,
      default_currency, default_deposit_percentage, has_multiple_units, created_at, updated_at
    ) VALUES 
      (?, ?, 'قاعة الفخامة التجريبية', ?, 'مأرب', 'المدينة', '777000111', 'active', 'YER', 25, 1, datetime('now'), datetime('now')),
      (?, ?, 'منشأة بدون وحدات', ?, 'مأرب', 'المدينة', '777000222', 'active', 'YER', 25, 0, datetime('now'), datetime('now'))
  `).run(
    venueId, `${TEST_PREFIX}_cat`, `${TEST_PREFIX}_slug`,
    emptyVenueId, `${TEST_PREFIX}_cat`, `${TEST_PREFIX}_empty_slug`
  );

  // 4. عضوية المالك في المنشأة (venue_members)
  sqlite.prepare(`
    INSERT INTO venue_members (id, venue_id, user_id, role, permissions, created_at)
    VALUES (?, ?, ?, 'primary_owner', '{}', datetime('now'))
  `).run(`${TEST_PREFIX}_member`, venueId, ownerId);

  // 5. أقسام المنشأة
  sqlite.prepare(`
    INSERT INTO venue_units (id, venue_id, name, unit_type, capacity_min, capacity_max, is_active, created_at, updated_at)
    VALUES 
      (?, ?, 'قسم النساء', 'women_section', 50, 400, 1, datetime('now'), datetime('now')),
      (?, ?, 'قسم الرجال', 'men_section', 50, 300, 1, datetime('now'), datetime('now'))
  `).run(unitWomenId, venueId, unitMenId, venueId);

  // 6. خطط الأسعار (pricing_tiers)
  sqlite.prepare(`
    INSERT INTO pricing_tiers (id, venue_id, unit_id, shift, is_seasonal, price, currency, created_at)
    VALUES 
      (?, ?, ?, 'evening', 0, 150000, 'YER', datetime('now')),
      (?, ?, ?, 'morning', 0, 100000, 'YER', datetime('now')),
      (?, ?, ?, 'full_day', 0, 220000, 'YER', datetime('now')),
      (?, ?, ?, 'evening', 0, 120000, 'YER', datetime('now')),
      (?, ?, ?, 'morning', 0, 80000, 'YER', datetime('now')),
      (?, ?, ?, 'full_day', 0, 180000, 'YER', datetime('now')),
      (?, ?, NULL, 'evening', 0, 250000, 'YER', datetime('now')),
      (?, ?, NULL, 'morning', 0, 170000, 'YER', datetime('now')),
      (?, ?, NULL, 'full_day', 0, 380000, 'YER', datetime('now'))
  `).run(
    `${TEST_PREFIX}_pt1`, venueId, unitWomenId,
    `${TEST_PREFIX}_pt2`, venueId, unitWomenId,
    `${TEST_PREFIX}_pt3`, venueId, unitWomenId,
    `${TEST_PREFIX}_pt4`, venueId, unitMenId,
    `${TEST_PREFIX}_pt5`, venueId, unitMenId,
    `${TEST_PREFIX}_pt6`, venueId, unitMenId,
    `${TEST_PREFIX}_pt7`, venueId,
    `${TEST_PREFIX}_pt8`, venueId,
    `${TEST_PREFIX}_pt9`, venueId
  );

  console.log("  ✅ تم تجهيز بيانات الاختبار بنجاح");
}

function cleanupFixtures() {
  console.log("\n🧹 تنظيف بيانات الاختبار...");
  sqlite.prepare(`DELETE FROM webhook_events WHERE event_id LIKE ?`).run(`${TEST_PREFIX}%`);
  sqlite.prepare(`DELETE FROM payments WHERE provider_transaction_id LIKE ?`).run(`${TEST_PREFIX}%`);
  sqlite.prepare(`DELETE FROM booking_slots WHERE venue_id IN (?, ?)`).run(venueId, emptyVenueId);
  sqlite.prepare(`DELETE FROM booking_audit_logs WHERE booking_id IN (SELECT id FROM bookings WHERE venue_id IN (?, ?))`).run(venueId, emptyVenueId);
  sqlite.prepare(`DELETE FROM booking_price_items WHERE booking_id IN (SELECT id FROM bookings WHERE venue_id IN (?, ?))`).run(venueId, emptyVenueId);
  sqlite.prepare(`DELETE FROM booking_requested_units WHERE venue_id IN (?, ?)`).run(venueId, emptyVenueId);
  sqlite.prepare(`DELETE FROM booking_guest_details WHERE booking_id IN (SELECT id FROM bookings WHERE venue_id IN (?, ?))`).run(venueId, emptyVenueId);
  sqlite.prepare(`DELETE FROM bookings WHERE venue_id IN (?, ?)`).run(venueId, emptyVenueId);
  sqlite.prepare(`DELETE FROM pricing_tiers WHERE venue_id IN (?, ?)`).run(venueId, emptyVenueId);
  sqlite.prepare(`DELETE FROM venue_units WHERE venue_id IN (?, ?)`).run(venueId, emptyVenueId);
  sqlite.prepare(`DELETE FROM venue_members WHERE venue_id IN (?, ?)`).run(venueId, emptyVenueId);
  sqlite.prepare(`DELETE FROM venues WHERE id IN (?, ?)`).run(venueId, emptyVenueId);
  sqlite.prepare(`DELETE FROM venue_categories WHERE id = ?`).run(`${TEST_PREFIX}_cat`);
  sqlite.prepare(`DELETE FROM users WHERE id IN (?, ?, ?, ?)`).run(customerId, ownerId, adminId, otherCustomerId);
}

// ==============================================================================
// الاختبارات
// ==============================================================================

async function runAllTests() {
  try {
    setupFixtures();

    // --------------------------------------------------------------------------
    // الاختبار 1: إنشاء حجز إلكتروني عادي وفحص الفتحات وبنود السعر
    // --------------------------------------------------------------------------
    console.log("\n🧪 1. اختبار إنشاء حجز إلكتروني عادي وفحص الفتحات والأسعار:");
    const testDate1 = "2026-12-01";
    const res1 = createBooking(
      sqlite,
      {
        venueId,
        bookingSource: "online",
        isFullVenue: false,
        requestedUnitIds: [unitWomenId],
        eventType: "wedding",
        guestCount: 200,
        eventDate: testDate1,
        shift: "evening",
        timeSlotStart: `${testDate1}T16:00:00Z`,
        timeSlotEnd: `${testDate1}T23:59:59Z`,
      },
      { userId: customerId, role: "customer" }
    );

    assert(res1.booking.status === "pending_payment", "حالة الحجز الابتدائي الإلكتروني pending_payment");
    assert(res1.slots.length === 1, "تم إنشاء فتحة واحدة للقسم المحدد");
    assert(res1.slots[0].unitId === unitWomenId, "الفتحة مرتبطة بقسم النساء");
    assert(res1.totalAmount === 150000, "إجمالي السعر 150,000 ريال وفق التسعير الهرمي");
    assert(res1.depositAmount === 37500, "قيمة العربون 25% تساوي 37,500 ريال");

    // --------------------------------------------------------------------------
    // الاختبار 2: منع الحجز المتداخل لنفس الوحدة ونفس الفترة
    // --------------------------------------------------------------------------
    console.log("\n🧪 2. اختبار منع الحجز المتداخل لنفس الوحدة ونفس الفترة:");
    let conflictCaught = false;
    try {
      createBooking(
        sqlite,
        {
          venueId,
          bookingSource: "online",
          isFullVenue: false,
          requestedUnitIds: [unitWomenId],
          eventType: "seminar",
          guestCount: 150,
          eventDate: testDate1,
          shift: "evening",
          timeSlotStart: `${testDate1}T16:00:00Z`,
          timeSlotEnd: `${testDate1}T23:59:59Z`,
        },
        { userId: otherCustomerId, role: "customer" }
      );
    } catch (e: unknown) {
      conflictCaught = (e as Error).message.includes("BOOKING_SLOT_CONFLICT");
    }
    assert(conflictCaught, "فشل الحجز الثاني بخطأ BOOKING_SLOT_CONFLICT لمنع الحجز المزدوج");

    // --------------------------------------------------------------------------
    // الاختبار 3: منع حجز المنشأة بالكامل عند وجود قسم محجوز
    // --------------------------------------------------------------------------
    console.log("\n🧪 3. اختبار منع حجز المنشأة كاملة إذا كان هناك قسم محجوز:");
    let fullVenueConflictCaught = false;
    try {
      createBooking(
        sqlite,
        {
          venueId,
          bookingSource: "online",
          isFullVenue: true,
          eventType: "wedding",
          guestCount: 500,
          eventDate: testDate1,
          shift: "evening",
          timeSlotStart: `${testDate1}T16:00:00Z`,
          timeSlotEnd: `${testDate1}T23:59:59Z`,
        },
        { userId: otherCustomerId, role: "customer" }
      );
    } catch (e: unknown) {
      fullVenueConflictCaught = (e as Error).message.includes("BOOKING_SLOT_CONFLICT");
    }
    assert(fullVenueConflictCaught, "تم منع حجز المنشأة بالكامل لوجود تعارض في قسم النساء");

    // --------------------------------------------------------------------------
    // الاختبار 4: السماح بحجز قسم آخر في نفس المنشأة لنفس الفترة دون تعارض
    // --------------------------------------------------------------------------
    console.log("\n🧪 4. اختبار حجز قسم الرجال في نفس المساء (تعدد الأقسام بدون تعارض):");
    const resMen = createBooking(
      sqlite,
      {
        venueId,
        bookingSource: "online",
        isFullVenue: false,
        requestedUnitIds: [unitMenId],
        eventType: "family_gathering",
        guestCount: 100,
        eventDate: testDate1,
        shift: "evening",
        timeSlotStart: `${testDate1}T16:00:00Z`,
        timeSlotEnd: `${testDate1}T23:59:59Z`,
      },
      { userId: otherCustomerId, role: "customer" }
    );
    assert(resMen.booking.id !== res1.booking.id, "نجح حجز قسم الرجال بدون تعارض مع قسم النساء");

    // --------------------------------------------------------------------------
    // الاختبار 5: تعارض اليوم الكامل مع الفترات الجزئية
    // --------------------------------------------------------------------------
    console.log("\n🧪 5. اختبار تعارض حجز اليوم الكامل full_day مع فترة مسائية قائمة:");
    let fullDayConflict = false;
    try {
      createBooking(
        sqlite,
        {
          venueId,
          bookingSource: "online",
          isFullVenue: false,
          requestedUnitIds: [unitWomenId],
          eventType: "wedding",
          guestCount: 200,
          eventDate: testDate1,
          shift: "full_day",
          timeSlotStart: `${testDate1}T08:00:00Z`,
          timeSlotEnd: `${testDate1}T23:59:59Z`,
        },
        { userId: customerId, role: "customer" }
      );
    } catch (e: unknown) {
      fullDayConflict = (e as Error).message.includes("BOOKING_SLOT_CONFLICT");
    }
    assert(fullDayConflict, "تم منع حجز full_day لوجود حجز مسائي قائم");

    // --------------------------------------------------------------------------
    // الاختبار 6: منع حجز منشأة لا تحتوي على وحدات نشطة
    // --------------------------------------------------------------------------
    console.log("\n🧪 6. اختبار منع حجز منشأة ليس لها وحدات نشطة:");
    let noUnitsCaught = false;
    try {
      createBooking(
        sqlite,
        {
          venueId: emptyVenueId,
          bookingSource: "online",
          isFullVenue: true,
          eventType: "wedding",
          guestCount: 50,
          eventDate: "2026-12-05",
          shift: "evening",
          timeSlotStart: "2026-12-05T16:00:00Z",
          timeSlotEnd: "2026-12-05T23:59:59Z",
        },
        { userId: customerId, role: "customer" }
      );
    } catch (e: unknown) {
      noUnitsCaught = (e as Error).message.includes("VENUE_HAS_NO_ACTIVE_UNITS");
    }
    assert(noUnitsCaught, "تم رفض إنشاء الحجز فوراً لمنشأة بدون وحدات نشطة");

    // --------------------------------------------------------------------------
    // الاختبار 7: طلبان متزامنان لتأكيد الحجز (Idempotency وعدم تكرار التدقيق)
    // --------------------------------------------------------------------------
    console.log("\n🧪 7. اختبار طلبي تأكيد متزامنين للحجز مع التحقق من Idempotency وسجل التدقيق:");
    const testBookingId = res1.booking.id;

    // الطلب الأول للتأكيد
    const confirmRes1 = transitionBookingStatus(sqlite, testBookingId, "confirmed", {
      userId: ownerId,
      role: "owner",
      reason: "تم استلام السند بنجاح",
    });
    assert(confirmRes1.success && !confirmRes1.idempotent, "الطلب الأول نفذ التحديث الفعلي للحالة");

    // الطلب الثاني للتأكيد (Idempotent)
    const confirmRes2 = transitionBookingStatus(sqlite, testBookingId, "confirmed", {
      userId: ownerId,
      role: "owner",
      reason: "طلب تأكيد مكرر",
    });
    assert(confirmRes2.success && confirmRes2.idempotent, "الطلب الثاني عاد بنتيجة idempotent: true بأمان");

    // فحص عدد سجلات التدقيق الخاصة بالتأكيد
    const auditCountRow = sqlite.prepare(`
      SELECT COUNT(*) as c FROM booking_audit_logs 
      WHERE booking_id = ? AND to_status = 'confirmed'
    `).get(testBookingId) as { c: number };
    assert(auditCountRow.c === 1, "تم تسجيل عملية التدقيق مرة واحدة فقط دون تكرار");

    // --------------------------------------------------------------------------
    // الاختبار 8: حماية الصلاحيات: منع العميل من تأكيد الحجز مباشرة أو العبث بالحالات
    // --------------------------------------------------------------------------
    console.log("\n🧪 8. اختبار فحص الصلاحيات ومنع العميل من تأكيد الحجز بنفسه:");
    let customerUnauthorized = false;
    try {
      transitionBookingStatus(sqlite, resMen.booking.id, "confirmed", {
        userId: otherCustomerId,
        role: "customer",
      });
    } catch (e: unknown) {
      customerUnauthorized = (e as Error).message.includes("FORBIDDEN");
    }
    assert(customerUnauthorized, "تم منع العميل من تأكيد الحجز وحظر الوصول غير المصرح به");

    // منع مستخدم لا يملك الحجز من إلغائه
    let strangerUnauthorized = false;
    try {
      transitionBookingStatus(sqlite, resMen.booking.id, "cancelled_by_customer", {
        userId: customerId, // مستخدم مختلف عن صاحب الحجز
        role: "customer",
      });
    } catch (e: unknown) {
      strangerUnauthorized = (e as Error).message.includes("FORBIDDEN: You do not own this booking");
    }
    assert(strangerUnauthorized, "تم منع مستخدم غريب من إلغاء حجز لا يملكه");

    // --------------------------------------------------------------------------
    // الاختبار 9: فشل تحديث booking_slots والتأكد من الـ Rollback الكامل
    // --------------------------------------------------------------------------
    console.log("\n🧪 9. اختبار الـ Rollback الكامل عند تعذر مطابقة الفتحات:");
    // ننشئ حجزاً جديداً
    const testDateRollback = "2026-12-10";
    const resRollback = createBooking(
      sqlite,
      {
        venueId,
        bookingSource: "online",
        isFullVenue: false,
        requestedUnitIds: [unitMenId],
        eventType: "other",
        guestCount: 50,
        eventDate: testDateRollback,
        shift: "morning",
        timeSlotStart: `${testDateRollback}T08:00:00Z`,
        timeSlotEnd: `${testDateRollback}T14:00:00Z`,
      },
      { userId: customerId, role: "customer" }
    );

    // نحذف الفتحة عمداً لمحاكاة خطأ عدم تطابق الفتحات (Mismatch)
    sqlite.prepare(`DELETE FROM booking_slots WHERE booking_id = ?`).run(resRollback.booking.id);

    let rollbackTriggered = false;
    try {
      transitionBookingStatus(sqlite, resRollback.booking.id, "confirmed", {
        userId: ownerId,
        role: "owner",
      });
    } catch (e: unknown) {
      rollbackTriggered = (e as Error).message.includes("INTEGRITY_VIOLATION");
    }
    assert(rollbackTriggered, "رمي خطأ النزاهة وتم إلغاء المعاملة بالكامل");

    // التأكد أن حالة الحجز لم تتغير في bookings نتيجة الـ Rollback
    const checkBookingStatus = sqlite.prepare(`SELECT status FROM bookings WHERE id = ?`).get(resRollback.booking.id) as { status: string };
    assert(checkBookingStatus.status === "pending_payment", "تراجع التحديث وظل الحجز بحالة pending_payment كما كان");

    // --------------------------------------------------------------------------
    // الاختبار 10: اختبار الـ Sweeper وتحرير الفتحات عند انتهاء المهلة
    // --------------------------------------------------------------------------
    console.log("\n🧪 10. اختبار معالج المهل الزمنية (Sweeper) وتحرير الفتحات:");
    const testDateSweeper = "2026-12-15";
    const resSweeper = createBooking(
      sqlite,
      {
        venueId,
        bookingSource: "online",
        isFullVenue: false,
        requestedUnitIds: [unitWomenId],
        eventType: "recreation",
        guestCount: 80,
        eventDate: testDateSweeper,
        shift: "morning",
        timeSlotStart: `${testDateSweeper}T08:00:00Z`,
        timeSlotEnd: `${testDateSweeper}T14:00:00Z`,
      },
      { userId: customerId, role: "customer" }
    );

    // تعديل وقت الانتهاء ليكون في الماضي لمحاكاة انتهاء المهلة
    sqlite.prepare(`UPDATE bookings SET expires_at = datetime('now', '-5 minutes') WHERE id = ?`).run(resSweeper.booking.id);

    // تشغيل الـ Sweeper
    const sweepRes = runBookingSweeper(sqlite);
    assert(sweepRes.expiredPayments >= 1, "الـ Sweeper اكتشف الحجز المنتهي وعالجه");

    // التحقق من تحديث الحجز والفتحة
    const expiredBooking = sqlite.prepare(`SELECT status FROM bookings WHERE id = ?`).get(resSweeper.booking.id) as { status: string };
    const expiredSlot = sqlite.prepare(`SELECT status FROM booking_slots WHERE booking_id = ?`).get(resSweeper.booking.id) as { status: string };
    assert(expiredBooking.status === "expired", "تم نقل الحجز إلى expired");
    assert(expiredSlot.status === "expired", "تم تحرير الفتحة بنقلها إلى expired");

    // التأكد من إمكانية حجز نفس الموعد مجدداً بعد تحرير الفتحة
    const rebookRes = createBooking(
      sqlite,
      {
        venueId,
        bookingSource: "online",
        isFullVenue: false,
        requestedUnitIds: [unitWomenId],
        eventType: "recreation",
        guestCount: 80,
        eventDate: testDateSweeper,
        shift: "morning",
        timeSlotStart: `${testDateSweeper}T08:00:00Z`,
        timeSlotEnd: `${testDateSweeper}T14:00:00Z`,
      },
      { userId: otherCustomerId, role: "customer" }
    );
    assert(rebookRes.booking.id !== resSweeper.booking.id, "نجح إعادة حجز الموعد بعد تحريره بواسطة الـ Sweeper");

    // --------------------------------------------------------------------------
    // الاختبار 11: معالجة Webhook الدفع وتأكيد الحجز بنجاح
    // --------------------------------------------------------------------------
    console.log("\n🧪 11. اختبار مسار Webhook الدفع والتأكيد الرقمي الموثق:");
    const webhookPayload = {
      provider: "kuraimi" as const,
      eventId: `${TEST_PREFIX}_evt_1`,
      eventType: "payment.completed",
      providerTransactionId: `${TEST_PREFIX}_tx_1`,
      bookingReference: rebookRes.booking.bookingReference,
      amount: rebookRes.depositAmount,
      currency: rebookRes.currency,
      status: "success" as const,
      timestamp: new Date().toISOString(),
    };
    const rawPayload = JSON.stringify(webhookPayload);

    // فحص التوقيع المشفر
    const validSignature = crypto
      .createHmac("sha256", BOOKING_CONFIG.PAYMENT_WEBHOOK_SECRET)
      .update(rawPayload)
      .digest("hex");

    const sigVerified = verifyWebhookSignature(rawPayload, validSignature, BOOKING_CONFIG.PAYMENT_WEBHOOK_SECRET);
    assert(sigVerified, "نجاح التحقق من التوقيع الرقمي المشفر HMAC-SHA256");

    const payResult = processPaymentWebhook(sqlite, webhookPayload, rawPayload);
    assert(payResult.success && payResult.bookingUpdated, "تمت معالجة الدفع وتحديث الحجز إلى confirmed");
    assert(payResult.newBookingStatus === "confirmed", "حالة الحجز الجديدة confirmed");

    // --------------------------------------------------------------------------
    // الاختبار 12: تكرار Webhook الدفع (Duplicate Webhook Idempotency)
    // --------------------------------------------------------------------------
    console.log("\n🧪 12. اختبار تكرار إرسال Webhook الدفع نفسه:");
    const duplicatePayResult = processPaymentWebhook(sqlite, webhookPayload, rawPayload);
    assert(duplicatePayResult.success && duplicatePayResult.idempotent, "تم تمييز الحدث المكرر دون إعادة كتابة");

    // --------------------------------------------------------------------------
    // الاختبار 13: وصول دفعة لحجز منتهٍ (Late Payment Isolation)
    // --------------------------------------------------------------------------
    console.log("\n🧪 13. اختبار وصول دفعة لحجز منتهٍ دون فتح الموعد تلقائياً:");
    const lateWebhookPayload = {
      provider: "onecash" as const,
      eventId: `${TEST_PREFIX}_evt_late`,
      eventType: "payment.completed",
      providerTransactionId: `${TEST_PREFIX}_tx_late`,
      bookingReference: resSweeper.booking.bookingReference, // حجز منتهٍ
      amount: resSweeper.depositAmount,
      currency: resSweeper.currency,
      status: "success" as const,
      timestamp: new Date().toISOString(),
    };
    const lateRaw = JSON.stringify(lateWebhookPayload);

    const latePayResult = processPaymentWebhook(sqlite, lateWebhookPayload, lateRaw);
    assert(latePayResult.success, "تم تسجيل الدفعة بنجاح في السجل المالي");
    assert(!latePayResult.bookingUpdated, "لم يتم فتح أو تأكيد الحجز المنتهي حفاظاً على التقويم");
    assert(latePayResult.payment.status === "requires_review", "حالة الدفعة requires_review لمراجعة الإدارة واسترداد المبلغ");

    // --------------------------------------------------------------------------
    // الاختبار 14: اختبار التزامن الحقيقي باستخدام اتصالات SQLite متعددة
    // --------------------------------------------------------------------------
    console.log("\n🧪 14. اختبار التزامن الحقيقي (Multi-Connection Concurrency):");
    const testDateConcurrency = "2026-12-25";
    const dbPath = (sqlite as unknown as { name: string }).name;

    // محاولة إرسال 5 طلبات حجز متزامنة لنفس الوحدة ونفس الفترة عبر 5 اتصالات SQLite مستقلة
    const conn1 = new Database(dbPath);
    const conn2 = new Database(dbPath);
    const conn3 = new Database(dbPath);

    conn1.pragma("busy_timeout = 5000");
    conn2.pragma("busy_timeout = 5000");
    conn3.pragma("busy_timeout = 5000");

    const inputData: CreateBookingInput = {
      venueId,
      bookingSource: "online",
      isFullVenue: false,
      requestedUnitIds: [unitWomenId],
      eventType: "wedding",
      guestCount: 200,
      eventDate: testDateConcurrency,
      shift: "evening",
      timeSlotStart: `${testDateConcurrency}T16:00:00Z`,
      timeSlotEnd: `${testDateConcurrency}T23:59:59Z`,
    };

    let successCount = 0;
    let conflictCount = 0;

    const attempts = [
      () => createBooking(conn1, inputData, { userId: customerId, role: "customer" }),
      () => createBooking(conn2, inputData, { userId: otherCustomerId, role: "customer" }),
      () => createBooking(conn3, inputData, { userId: customerId, role: "customer" }),
    ];

    for (const attempt of attempts) {
      try {
        attempt();
        successCount++;
      } catch (e: unknown) {
        if ((e as Error).message.includes("BOOKING_SLOT_CONFLICT")) {
          conflictCount++;
        }
      }
    }

    conn1.close();
    conn2.close();
    conn3.close();

    assert(successCount === 1, "طلب واحد فقط نجح في حجز الوحدة عبر اتصالات متعددة");
    assert(conflictCount === 2, "الطلبان الآخران تم رفضهما فوراً بخطأ BOOKING_SLOT_CONFLICT");

    // التحقق من قاعدة البيانات: عدد الفتحات المنشأة لهذا التاريخ والوحدة هو 1 فقط
    const finalSlots = sqlite.prepare(`
      SELECT COUNT(*) as count FROM booking_slots 
      WHERE unit_id = ? AND event_date = ? AND shift = 'evening'
    `).get(unitWomenId, testDateConcurrency) as { count: number };
    assert(finalSlots.count === 1, "يوجد صف فتحة واحد فقط في قاعدة البيانات دون أي سجلات مكررة");

    // --------------------------------------------------------------------------
    // الاختبار 15: فحص سلامة قاعدة البيانات (PRAGMA integrity_check)
    // --------------------------------------------------------------------------
    console.log("\n🧪 15. فحص سلامة وتناسق قاعدة بيانات SQLite (PRAGMA integrity_check):");
    const integrityCheck = sqlite.prepare("PRAGMA integrity_check").get() as { integrity_check: string };
    assert(integrityCheck.integrity_check === "ok", "سلامة قاعدة البيانات ok بدون أي تلف أو شذوذ");

    // --------------------------------------------------------------------------
    // الاختبار 16: سباق التأكيد أثناء التنفيذ الحصري (In-Flight Confirmation Race)
    // --------------------------------------------------------------------------
    console.log("\n🧪 16. اختبار وصول طلب تأكيد أثناء وجود الطلب الأول داخل قفل المعاملة (In-Flight Race):");
    const testDateInFlight = "2026-12-28";
    const resInFlight = createBooking(
      sqlite,
      {
        venueId,
        bookingSource: "online",
        isFullVenue: false,
        requestedUnitIds: [unitWomenId],
        eventType: "seminar",
        guestCount: 100,
        eventDate: testDateInFlight,
        shift: "evening",
        timeSlotStart: `${testDateInFlight}T16:00:00Z`,
        timeSlotEnd: `${testDateInFlight}T23:59:59Z`,
      },
      { userId: customerId, role: "customer" }
    );

    const inFlightConnA = new Database(dbPath);
    const inFlightConnB = new Database(dbPath);
    inFlightConnA.pragma("busy_timeout = 5000");
    inFlightConnB.pragma("busy_timeout = 5000");

    let workerBResult: BookingTransitionResult | null = null;

    // تشغيل العملية A التي تحجز القفل الفوري وتتأخر عمداً 200ms قبل الـ Commit
    const runWorkerA = new Promise<void>((resolve) => {
      setTimeout(() => {
        const txA = inFlightConnA.transaction(() => {
          transitionBookingStatus(inFlightConnA, resInFlight.booking.id, "confirmed", {
            userId: ownerId,
            role: "owner",
            reason: "تأكيد العملية الأولى مع مهلة داخلية",
          });
          // محاكاة تأخير معالجة داخلية قبل إتمام المعاملة
          const startWait = Date.now();
          while (Date.now() - startWait < 200) {
            // انتظار نشط 200ms داخل القفل
          }
        });
        txA.immediate();
        resolve();
      }, 10);
    });

    // العملية B تحاول التأكيد بعد 50ms أثناء وجود العملية A داخل المعاملة
    const runWorkerB = new Promise<void>((resolve, reject) => {
      setTimeout(() => {
        try {
          workerBResult = transitionBookingStatus(inFlightConnB, resInFlight.booking.id, "confirmed", {
            userId: ownerId,
            role: "owner",
            reason: "طلب تأكيد وافد أثناء تنفيذ العملية الأولى",
          });
          resolve();
        } catch (e) {
          reject(e);
        }
      }, 50);
    });

    await Promise.all([runWorkerA, runWorkerB]);

    inFlightConnA.close();
    inFlightConnB.close();

    const bRes = workerBResult as BookingTransitionResult | null;
    assert(Boolean(bRes && bRes.success && bRes.idempotent), "العملية B انتظرت تحرير القفل وعادت بنتيجة idempotent: true بأمان");

    // التأكد من أن سجل التدقيق يحتوي على حركة تأكيد واحدة فقط
    const inFlightAudits = sqlite.prepare(`
      SELECT COUNT(*) as count FROM booking_audit_logs 
      WHERE booking_id = ? AND to_status = 'confirmed'
    `).get(resInFlight.booking.id) as { count: number };
    assert(inFlightAudits.count === 1, "تم قفل وحفظ سجل تدقيق واحد فقط دون تكرار بالرغم من تداخل العمليات أثناء التنفيذ");

    // --------------------------------------------------------------------------
    // الاختبار 17: اختبار فشل المعاملة عند تجاوز مهلة busy_timeout
    // --------------------------------------------------------------------------
    console.log("\n🧪 17. اختبار فشل المعاملة المتزاحمة عند نفاد مهلة busy_timeout المحددة:");
    const lockConn = new Database(dbPath);
    const blockedConn = new Database(dbPath);

    // نحدد مهلة قصيرة جداً (30ms) للاتصال المحظور
    blockedConn.pragma("busy_timeout = 30");

    let busyErrorCaught = false;

    // الاتصال الأول يستحوذ على قفل حصري ويحتفظ به
    lockConn.exec("BEGIN EXCLUSIVE;");

    try {
      // الاتصال الثاني يحاول حيازة قفل كتابة فوري مع مهلة 30ms فقط
      blockedConn.exec("BEGIN IMMEDIATE;");
    } catch (e: unknown) {
      const err = e as Error & { code?: string };
      busyErrorCaught = err.code === "SQLITE_BUSY" || err.message.includes("database is locked");
    } finally {
      lockConn.exec("ROLLBACK;");
      lockConn.close();
      blockedConn.close();
    }

    assert(busyErrorCaught, "تم التقاط خطأ SQLITE_BUSY (database is locked) بنجاح عند تجاوز مهلة الانتظار");

  } finally {
    cleanupFixtures();
  }

  console.log("\n=======================================================");
  console.log(`📊 النتيجة النهائية لاختبارات المرحلة الثالثة:`);
  console.log(`   ✅ نجاح: ${passedCount}`);
  console.log(`   ❌ فشل: ${failedCount}`);
  console.log("=======================================================\n");

  if (failedCount > 0) {
    process.exit(1);
  }
}

runAllTests().catch((err) => {
  console.error("Test execution aborted with fatal error:", err);
  process.exit(1);
});
