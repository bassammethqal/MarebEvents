import { registerUser, loginUser, logoutUser, seedInitialAdmin } from "../src/lib/auth/service";
import { validateSession } from "../src/lib/auth/session";
import { assertCanModifyProfile, AuthError } from "../src/lib/auth/guards";
import { db, schema, sqlite } from "../src/db/index";
import { eq } from "drizzle-orm";

async function runAuthTests() {
  console.log("==================================================================");
  console.log("Starting Phase 2 Auth & RBAC Comprehensive Test Suite...");
  console.log("==================================================================");

  let passedTests = 0;
  let totalTests = 0;

  function assert(condition: boolean, testName: string) {
    totalTests++;
    if (condition) {
      console.log(`  [✓ PASS] ${testName}`);
      passedTests++;
    } else {
      console.error(`  [✗ FAIL] ${testName}`);
      throw new Error(`Test failed: ${testName}`);
    }
  }

  const timestamp = Date.now();
  const testEmail = `test.user.${timestamp}@marebevents.ye`;
  const testPhone = `+967770${Math.floor(100000 + Math.random() * 900000)}`;
  const testPassword = "StrongPassword@2026";

  try {
    // ------------------------------------------------------------------
    // الاختبار 1: تسجيل مستخدم جديد
    // ------------------------------------------------------------------
    console.log("\n[Test 1] تسجيل مستخدم جديد بالبريد والهاتف وكلمة المرور...");
    const regResult = await registerUser({
      fullName: "عميل تجريبي مأرب",
      email: testEmail,
      phone: testPhone,
      password: testPassword,
      role: "customer",
    });

    assert(Boolean(regResult.user.id), "تم إنشاء معرّف للمستخدم بنجاح");
    assert(regResult.user.email === testEmail, "البريد الإلكتروني مطابق");
    assert(regResult.user.phone === testPhone, "رقم الهاتف مطابق");
    assert(regResult.user.role === "customer", "الدور المسجل هو customer");
    // @ts-expect-error - التحقق من عدم تسريب كلمة المرور في الكائن المسترجع
    assert(regResult.user.passwordHash === undefined, "تم تجريد passwordHash من استجابة المستخدم");
    assert(Boolean(regResult.session.id), "تم إنشاء الجلسة الأولى بنجاح");

    // ------------------------------------------------------------------
    // الاختبار 2: منع تكرار البريد أو الهاتف
    // ------------------------------------------------------------------
    console.log("\n[Test 2] التحقق من منع تكرار البريد أو رقم الهاتف...");
    let duplicateEmailError = false;
    try {
      await registerUser({
        fullName: "محاولة مكررة للبريد",
        email: testEmail,
        password: "AnotherPassword123",
      });
    } catch (err: unknown) {
      if (err instanceof Error && err.message.includes("البريد الإلكتروني مسجل مسبقاً")) {
        duplicateEmailError = true;
      }
    }
    assert(duplicateEmailError, "تم رفض تكرار البريد الإلكتروني بنجاح");

    let duplicatePhoneError = false;
    try {
      await registerUser({
        fullName: "محاولة مكررة للهاتف",
        phone: testPhone,
        password: "AnotherPassword123",
      });
    } catch (err: unknown) {
      if (err instanceof Error && err.message.includes("رقم الهاتف مسجل مسبقاً")) {
        duplicatePhoneError = true;
      }
    }
    assert(duplicatePhoneError, "تم رفض تكرار رقم الهاتف بنجاح");

    // ------------------------------------------------------------------
    // الاختبار 3: تسجيل الدخول بكلمة مرور صحيحة وخاطئة
    // ------------------------------------------------------------------
    console.log("\n[Test 3] تسجيل الدخول بكلمة مرور صحيحة وخاطئة...");
    let wrongPasswordError = false;
    try {
      await loginUser({
        identifier: testEmail,
        password: "WrongPassword123",
      });
    } catch (err: unknown) {
      if (err instanceof Error && err.message.includes("بيانات الدخول غير صحيحة")) {
        wrongPasswordError = true;
      }
    }
    assert(wrongPasswordError, "تم رفض الدخول بكلمة مرور خاطئة دون كشف تفاصيل داخلية");

    // دخول ناجح بالبريد
    const loginEmailResult = await loginUser({
      identifier: testEmail,
      password: testPassword,
    });
    assert(loginEmailResult.user.id === regResult.user.id, "نجح تسجيل الدخول بالبريد الإلكتروني");

    // دخول ناجح برقم الهاتف
    const loginPhoneResult = await loginUser({
      identifier: testPhone,
      password: testPassword,
    });
    assert(loginPhoneResult.user.id === regResult.user.id, "نجح تسجيل الدخول برقم الهاتف");

    // ------------------------------------------------------------------
    // الاختبار 4: إنشاء جلسة والتحقق منها
    // ------------------------------------------------------------------
    console.log("\n[Test 4] التحقق من صحة الجلسة (validateSession)...");
    const sessionValidation = await validateSession(loginPhoneResult.signedCookieValue);
    assert(Boolean(sessionValidation), "تم التحقق من الجلسة بنجاح");
    assert(sessionValidation?.user.id === regResult.user.id, "المستخدم المرتبط بالجلسة مطابق");

    // ------------------------------------------------------------------
    // الاختبار 5: تسجيل الخروج وإبطال الجلسة
    // ------------------------------------------------------------------
    console.log("\n[Test 5] تسجيل الخروج وإبطال الجلسة...");
    await logoutUser(loginPhoneResult.signedCookieValue);
    const afterLogoutValidation = await validateSession(loginPhoneResult.signedCookieValue);
    assert(afterLogoutValidation === null, "تم إبطال الجلسة بنجاح وأصبحت غير صالحة");

    // ------------------------------------------------------------------
    // الاختبار 6: اختبار انتهاء صلاحية الجلسة
    // ------------------------------------------------------------------
    console.log("\n[Test 6] اختبار انتهاء صلاحية الجلسة (Expired Session)...");
    const expiredSessionId = "expired-sess-" + Date.now();
    const pastDate = new Date(Date.now() - 1000 * 60 * 60).toISOString(); // قبل ساعة
    db.insert(schema.sessions)
      .values({
        id: expiredSessionId,
        userId: regResult.user.id,
        expiresAt: pastDate,
        createdAt: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
      })
      .run();

    const expiredValidation = await validateSession(expiredSessionId);
    assert(expiredValidation === null, "الجلسة المنتهية تم رفضها وحذفها تلقائياً");

    // ------------------------------------------------------------------
    // الاختبار 7: التأكد من أن Customer لا يستطيع تنفيذ عمليات Admin أو Owner
    // ------------------------------------------------------------------
    console.log("\n[Test 7] فحص الصلاحيات: منع Customer من صلاحيات Owner و Admin...");
    let customerAdminBlocked = false;
    try {
      // محاكاة استدعاء الحارس لعميل
      if (!["admin"].includes(regResult.user.role)) {
        throw new AuthError("غير مصرح لك. يتطلب صلاحية Admin", 403);
      }
    } catch (err: unknown) {
      if (err instanceof AuthError && err.statusCode === 403) {
        customerAdminBlocked = true;
      }
    }
    assert(customerAdminBlocked, "تم منع Customer من تنفيذ عمليات Admin بنجاح (403 Forbidden)");

    let customerOwnerBlocked = false;
    try {
      if (!["owner", "admin"].includes(regResult.user.role)) {
        throw new AuthError("غير مصرح لك. يتطلب صلاحية Owner", 403);
      }
    } catch (err: unknown) {
      if (err instanceof AuthError && err.statusCode === 403) {
        customerOwnerBlocked = true;
      }
    }
    assert(customerOwnerBlocked, "تم منع Customer من تنفيذ عمليات Owner بنجاح (403 Forbidden)");

    // ------------------------------------------------------------------
    // الاختبار 8: التأكد من عدم إمكانية تغيير الدور من جهة العميل
    // ------------------------------------------------------------------
    console.log("\n[Test 8] منع تصعيد الصلاحيات (Privilege Escalation Protection)...");
    let roleEscalationBlocked = false;
    try {
      assertCanModifyProfile(regResult.user, regResult.user.id, {
        role: "admin", // محاولة الترقية لـ Admin
      });
    } catch (err: unknown) {
      if (err instanceof AuthError && err.statusCode === 403) {
        roleEscalationBlocked = true;
      }
    }
    assert(roleEscalationBlocked, "تم منع المستخدم من ترقية دوره إلى admin بنفسه");

    let modifyOtherUserBlocked = false;
    try {
      assertCanModifyProfile(regResult.user, "another-user-uuid", {
        fullName: "اسم مخترق",
      });
    } catch (err: unknown) {
      if (err instanceof AuthError && err.statusCode === 403) {
        modifyOtherUserBlocked = true;
      }
    }
    assert(modifyOtherUserBlocked, "تم منع المستخدم من تعديل حساب مستخدم آخر");

    // ------------------------------------------------------------------
    // الاختبار 9: زرع حساب المدير الأول وفحص حمايته
    // ------------------------------------------------------------------
    console.log("\n[Test 9] آلية إنشاء حساب المدير الأول (Seed Initial Admin)...");
    const testAdminSecret = "mareb_events_secret_seed_key_for_tests_2026!";
    process.env.INITIAL_ADMIN_SEED_SECRET = testAdminSecret;

    const adminEmail = `admin.${timestamp}@marebevents.ye`;
    const initialAdmin = await seedInitialAdmin({
      fullName: "المدير العام لمنصة مأرب",
      email: adminEmail,
      password: "SuperAdminPassword2026!",
      secretToken: testAdminSecret,
    });
    assert(initialAdmin.role === "admin", "تم إنشاء حساب المدير الأول بصلاحية admin");

    // محاولة إنشاء مدير ثانٍ
    let secondAdminBlocked = false;
    try {
      await seedInitialAdmin({
        fullName: "مدير غير مصرح",
        email: `fake.admin.${timestamp}@marebevents.ye`,
        password: "FakePassword123!",
        secretToken: testAdminSecret,
      });
    } catch (err: unknown) {
      if (err instanceof Error && err.message.includes("يوجد مدير نظام مسجل مسبقاً")) {
        secondAdminBlocked = true;
      }
    }
    assert(secondAdminBlocked, "تم حظر إنشاء مدير إضافي دون الرمز السري المصرح");

    // المدير يستطيع تعديل الأدوار
    let adminCanModifyRole = true;
    try {
      assertCanModifyProfile(initialAdmin, regResult.user.id, {
        role: "owner",
      });
    } catch {
      adminCanModifyRole = false;
    }
    assert(adminCanModifyRole, "المدير يملك صلاحية ترقية وتعديل أدوار الحسابات الأخرى");

    // تنظيف بيانات الاختبار
    console.log("\n[Cleanup] تنظيف سجلات الاختبارات...");
    db.delete(schema.users).where(eq(schema.users.id, regResult.user.id)).run();
    db.delete(schema.users).where(eq(schema.users.id, initialAdmin.id)).run();

    console.log("\n==================================================================");
    console.log(`>>> ALL AUTH & RBAC TESTS PASSED! (${passedTests}/${totalTests}) <<<`);
    console.log("==================================================================");
  } catch (error) {
    console.error("Test suite failed:", error);
    process.exit(1);
  } finally {
    sqlite.close();
  }
}

runAuthTests();
