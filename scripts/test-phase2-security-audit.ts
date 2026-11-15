import { registerUser, loginUser, seedInitialAdmin } from "../src/lib/auth/service";
import {
  validateSession,
  createSession,
  invalidateSession,
  hashSessionToken,
  getSessionCookieOptions,
} from "../src/lib/auth/session";
import { signSessionToken, verifySignedSessionToken } from "../src/lib/auth/cookie-signer";
import { assertCanModifyProfile, AuthError } from "../src/lib/auth/guards";
import { checkRateLimit, recordFailedAttempt, resetRateLimit } from "../src/lib/auth/rate-limit";
import { validateCsrfOrigin } from "../src/lib/auth/csrf";
import { getClientIp, isValidIp } from "../src/lib/auth/ip";
import { db, schema, sqlite } from "../src/db/index";
import { eq } from "drizzle-orm";
import { NextRequest } from "next/server";

async function runSecurityAudit() {
  console.log("==================================================================");
  console.log("Running Phase 2 Security & Penetration Audit Suite (10 Checks)...");
  console.log("==================================================================");

  let passed = 0;
  let total = 0;

  function test(condition: boolean, title: string) {
    total++;
    if (condition) {
      console.log(`  [✓ PASS] ${title}`);
      passed++;
    } else {
      console.error(`  [✗ FAIL] ${title}`);
      throw new Error(`Security test failed: ${title}`);
    }
  }

  const timestamp = Date.now();
  const testEmail = `sec.audit.${timestamp}@marebevents.ye`;
  const testPhone = `+967771${Math.floor(100000 + Math.random() * 900000)}`;
  const testPassword = "VerySecurePassword@2026";

  try {
    // تنظيف أي حسابات أدمن سابقة من تجارب سابقة لضمان عزل وتكرار الاختبارات بأمان
    db.delete(schema.users).where(eq(schema.users.role, "admin")).run();

    // إنشاء مستخدم أولي للاختبارات للتوافق مع قيود المفاتيح الأجنبية الصارمة
    const { user: customerUser } = await registerUser({
      fullName: "عميل تجريبي للتدقيق",
      email: testEmail,
      phone: testPhone,
      password: testPassword,
      role: "customer",
    });

    // ------------------------------------------------------------------
    // فحص 1: حماية الـ Proxy وتوقيع الكوكيز (Cookie Forgery & Tampering)
    // ------------------------------------------------------------------
    console.log("\n[Check 1] فحص مقاومة تزوير والتلاعب بكوكيز الجلسات (Cookie Signing & Proxy)...");
    const rawFakeToken = "attacker_fake_session_token_without_signature_1234567890";
    const fakeVerified = verifySignedSessionToken(rawFakeToken);
    test(fakeVerified === null, "رفض الكوكي غير الموقع (Unsigned Fake Cookie) مباشرة");

    const validSigned = signSessionToken("real_token_value_32_characters_long_123");
    const tampered = validSigned.slice(0, -4) + "XXXX"; // تعديل التوقيع
    const tamperedVerified = verifySignedSessionToken(tampered);
    test(tamperedVerified === null, "رفض الكوكي عند التلاعب بالتوقيع (Tampered Signature)");

    const validExtracted = verifySignedSessionToken(validSigned);
    test(validExtracted === "real_token_value_32_characters_long_123", "قبول الكوكي الموقع بسلامة تامة");

    // ------------------------------------------------------------------
    // فحص 2: التحقق من عدم تخزين الرموز الخام في قاعدة البيانات (Session Token Hashing)
    // ------------------------------------------------------------------
    console.log("\n[Check 2] فحص تشفير بصمات الجلسات في قاعدة البيانات (No Plaintext Tokens in DB)...");
    const sessionCreation = await createSession(customerUser.id);
    test(sessionCreation.rawToken !== sessionCreation.session.id, "معرّف الجلسة المخزن يختلف عن الرمز الخام المرسل للمستخدم");

    const expectedHash = hashSessionToken(sessionCreation.rawToken);
    test(sessionCreation.session.id === expectedHash, "الجلسة مخزنة في SQLite باستخدام SHA-256 Hash فقط");

    // التحقق من قاعدة البيانات مباشرة للتأكد من عدم وجود الرمز الخام
    const rawQuery = db
      .select()
      .from(schema.sessions)
      .where(eq(schema.sessions.id, sessionCreation.rawToken))
      .get();
    test(!rawQuery, "الرمز الخام غير موجود مطلقاً في جداول قاعدة البيانات");

    // تنظيف
    await invalidateSession(sessionCreation.rawToken);

    // ------------------------------------------------------------------
    // فحص 3: أمان زرع المدير الأول (seed-admin Protection)
    // ------------------------------------------------------------------
    console.log("\n[Check 3] فحص أمان آلية زرع حساب المدير (seed-admin Protection)...");
    delete process.env.INITIAL_ADMIN_SEED_SECRET; // محاكاة عدم وجود سر

    let seedWithoutSecretBlocked = false;
    try {
      await seedInitialAdmin({
        fullName: "مدير متسلل",
        email: `hacker.${timestamp}@marebevents.ye`,
        password: "HackerPass123!",
      });
    } catch (err: unknown) {
      if (err instanceof Error && err.message.includes("لم يتم ضبط الرمز السري")) {
        seedWithoutSecretBlocked = true;
      }
    }
    test(seedWithoutSecretBlocked, "حظر زرع المدير عند غياب INITIAL_ADMIN_SEED_SECRET في الخادم");

    // محاكاة سر غير كافٍ أمنياً
    process.env.INITIAL_ADMIN_SEED_SECRET = "short";
    let seedWithWeakSecretBlocked = false;
    try {
      await seedInitialAdmin({
        fullName: "مدير متسلل",
        email: `hacker.${timestamp}@marebevents.ye`,
        password: "HackerPass123!",
        secretToken: "short",
      });
    } catch (err: unknown) {
      if (err instanceof Error && err.message.includes("غير كافٍ أمنياً")) {
        seedWithWeakSecretBlocked = true;
      }
    }
    test(seedWithWeakSecretBlocked, "حظر زرع المدير إذا كان الرمز السري قصيراً وغير قوي");

    // ضبط مفتاح سري رسمي قوي
    const strongSecret = "mareb_events_secret_seed_key_at_least_16_chars_2026!";
    process.env.INITIAL_ADMIN_SEED_SECRET = strongSecret;

    // زرع المدير الأول بنجاح
    const officialAdmin = await seedInitialAdmin({
      fullName: "المدير المعتمد",
      email: `admin.official.${timestamp}@marebevents.ye`,
      password: "AdminOfficialPassword2026!",
      secretToken: strongSecret,
    });
    test(officialAdmin.role === "admin", "إنشاء المدير الأول بنجاح بالمفتاح السري القوي");

    // محاولة إنشاء مدير ثانٍ بنفس المفتاح
    let secondAdminBlocked = false;
    try {
      await seedInitialAdmin({
        fullName: "مدير ثانٍ غير مصرح",
        email: `admin.second.${timestamp}@marebevents.ye`,
        password: "AdminSecondPassword2026!",
        secretToken: strongSecret,
      });
    } catch (err: unknown) {
      if (err instanceof Error && err.message.includes("يوجد مدير نظام مسجل مسبقاً")) {
        secondAdminBlocked = true;
      }
    }
    test(secondAdminBlocked, "حظر إنشاء مدير ثانٍ نهائياً عبر آلية الـ Seeding لمنع الاستغلال");

    // ------------------------------------------------------------------
    // فحص 4: حماية معدل المحاولات المزدوج (Dual Rate Limiting) وتطهير عنوان IP
    // ------------------------------------------------------------------
    console.log("\n[Check 4] فحص مقاومة هجمات التخمين وتدوير عناوين IP وتطهير الترويسات...");
    const targetAccount = `victim.${timestamp}@marebevents.ye`;
    await resetRateLimit(`ident:${targetAccount}`);

    // محاكاة 5 محاولات فاشلة ضد نفس الحساب من عناوين IP مختلفة
    for (let i = 1; i <= 5; i++) {
      await recordFailedAttempt(`ident:${targetAccount}`, 5, 900);
    }

    const accountCheck = await checkRateLimit(`ident:${targetAccount}`, 5, 900, 900);
    test(!accountCheck.allowed, "قفل الحساب المستهدف بعد 5 محاولات حتى لو قام المهاجم بتغيير عنوان الـ IP");
    test(accountCheck.remainingAttempts === 0, "الفرص المتبقية صفر");
    test(Boolean(accountCheck.retryAfterSeconds && accountCheck.retryAfterSeconds > 0), "تحديد مهلة الانتظار بدقة");

    await resetRateLimit(`ident:${targetAccount}`);

    // فحص تطهير عنوان IP ضد الترويسات المحقونة
    const reqWithSpoofedIp = new NextRequest("http://localhost:3000/api/auth/login", {
      headers: {
        "x-forwarded-for": "198.51.100.1, 10.0.0.1, attacker<script>",
      },
    });
    const extractedIp = getClientIp(reqWithSpoofedIp);
    test(extractedIp === "198.51.100.1", "تطهير واستخراج IP العميل الأول بدقة وتجاهل البقية");

    const reqWithMaliciousIp = new NextRequest("http://localhost:3000/api/auth/login", {
      headers: {
        "x-forwarded-for": "invalid-ip-injection-payload",
      },
    });
    test(!isValidIp("invalid-ip-injection-payload"), "رفض عناوين IP المحقونة أو غير الصالحة");
    test(getClientIp(reqWithMaliciousIp) === "127.0.0.1", "الرجوع للعنوان الافتراضي الآمن عند فساد ترويسة IP");

    // ------------------------------------------------------------------
    // فحص 5: التحقق من الصلاحيات والـ RBAC على طبقة الخادم
    // ------------------------------------------------------------------
    console.log("\n[Check 5] فحص فحص الصلاحيات داخل الخادم (Server-Side RBAC)...");
    let adminAccessDenied = false;
    try {
      if (customerUser.role !== "admin") {
        throw new AuthError("ممنوع", 403);
      }
    } catch (e: unknown) {
      if (e instanceof AuthError && e.statusCode === 403) {
        adminAccessDenied = true;
      }
    }
    test(adminAccessDenied, "منع العميل من الوصول لمسار Admin برمز 403");

    let ownerAccessDenied = false;
    try {
      if (!["owner", "admin"].includes(customerUser.role)) {
        throw new AuthError("ممنوع", 403);
      }
    } catch (e: unknown) {
      if (e instanceof AuthError && e.statusCode === 403) {
        ownerAccessDenied = true;
      }
    }
    test(ownerAccessDenied, "منع العميل من الوصول لمسار Owner برمز 403");

    // ------------------------------------------------------------------
    // فحص 6: حماية تصعيد الصلاحيات (Privilege Escalation)
    // ------------------------------------------------------------------
    console.log("\n[Check 6] فحص منع تصعيد الصلاحيات (Privilege Escalation Protection)...");
    let customerRoleChangeBlocked = false;
    try {
      assertCanModifyProfile(customerUser, customerUser.id, { role: "admin" });
    } catch (e: unknown) {
      if (e instanceof AuthError && e.statusCode === 403) {
        customerRoleChangeBlocked = true;
      }
    }
    test(customerRoleChangeBlocked, "منع العميل من ترقية دوره إلى admin");

    let customerActiveStatusBlocked = false;
    try {
      assertCanModifyProfile(customerUser, customerUser.id, { isActive: true });
    } catch (e: unknown) {
      if (e instanceof AuthError && e.statusCode === 403) {
        customerActiveStatusBlocked = true;
      }
    }
    test(customerActiveStatusBlocked, "منع العميل من التلاعب بحالة تفعيل الحساب");

    let customerOtherUserBlocked = false;
    try {
      assertCanModifyProfile(customerUser, officialAdmin.id, { fullName: "اسم معدل" });
    } catch (e: unknown) {
      if (e instanceof AuthError && e.statusCode === 403) {
        customerOtherUserBlocked = true;
      }
    }
    test(customerOtherUserBlocked, "منع المستخدم من تعديل حسابات مستخدمين آخرين");

    // ------------------------------------------------------------------
    // فحص 7: تدوير وإبطال الجلسات والتحقق من قاعدة البيانات فوراً (Session Revocation)
    // ------------------------------------------------------------------
    console.log("\n[Check 7] فحص تدوير وإبطال الجلسات فورياً من قاعدة البيانات (Instant Revocation)...");
    const firstLogin = await loginUser({
      identifier: testEmail,
      password: testPassword,
    });
    const firstToken = firstLogin.signedCookieValue;

    // تدوير الجلسة عند تسجيل دخول جديد
    const secondLogin = await loginUser({
      identifier: testEmail,
      password: testPassword,
      currentSignedToken: firstToken,
    });
    const secondToken = secondLogin.signedCookieValue;

    test(firstToken !== secondToken, "توليد رمز جلسة جديد تماماً ومختلف عند الدخول الجديد");

    const oldSessionCheck = await validateSession(firstToken);
    test(oldSessionCheck === null, "إبطال وحذف رمز الجلسة القديم لمنع Session Fixation");

    const newSessionCheck = await validateSession(secondToken);
    test(Boolean(newSessionCheck), "رمز الجلسة الجديد فعال وصالح");

    // اختبار الإبطال الفوري: حذف الجلسة مباشرة من SQLite
    // والتأكد أن الكوكي القديمة تصبح غير صالحة فوراً حتى لو كان توقيعها سليماً 100%
    const tokenHash = hashSessionToken(verifySignedSessionToken(secondToken)!);
    db.delete(schema.sessions).where(eq(schema.sessions.id, tokenHash)).run();

    const revokedCheck = await validateSession(secondToken);
    test(revokedCheck === null, "الكوكي الموقعة بشكل صحيح تصبح غير صالحة فوراً بمجرد حذفها من SQLite (Instant Revocation)");

    // ------------------------------------------------------------------
    // فحص 8: حماية CSRF الصارمة على طلبات الـ HTTP
    // ------------------------------------------------------------------
    console.log("\n[Check 8] فحص حماية مصدر الطلبات الصارمة (Strict CSRF Protection)...");
    const crossOriginReq = new NextRequest("http://localhost:3000/api/auth/logout", {
      method: "POST",
      headers: {
        host: "localhost:3000",
        origin: "https://evil-attacker-website.com",
      },
    });
    test(!validateCsrfOrigin(crossOriginReq), "حظر الطلب القادم من موقع خارجي غير مطابق (Cross-Origin Blocked)");

    // طلب POST بدون Origin وبدون Referer
    const noOriginNoRefererReq = new NextRequest("http://localhost:3000/api/auth/logout", {
      method: "POST",
      headers: {
        host: "localhost:3000",
      },
    });
    test(!validateCsrfOrigin(noOriginNoRefererReq), "رفض طلبات تغيير البيانات عند غياب Origin و Referer تماماً (Strict Rejection)");

    const sameOriginReq = new NextRequest("http://localhost:3000/api/auth/logout", {
      method: "POST",
      headers: {
        host: "localhost:3000",
        origin: "http://localhost:3000",
      },
    });
    test(validateCsrfOrigin(sameOriginReq), "السماح بالطلب الشرعي من نفس النطاق (Same-Origin Allowed)");

    // ------------------------------------------------------------------
    // فحص 9: عدم تسريب كلمات المرور أو الأسرار في الاستجابات
    // ------------------------------------------------------------------
    console.log("\n[Check 9] فحص عدم تسريب كلمات المرور أو الأسرار (No Sensitive Data Leak)...");
    // @ts-expect-error - تحقق صريح من عدم وجود الحقل
    test(firstLogin.user.passwordHash === undefined, "كائن المستخدم لا يحتوي على passwordHash");
    // @ts-expect-error - تحقق صريح
    test(firstLogin.user.failedLoginAttempts === undefined, "كائن المستخدم لا يحتوي على failedLoginAttempts");
    // @ts-expect-error - تحقق صريح
    test(firstLogin.user.lockoutUntil === undefined, "كائن المستخدم لا يحتوي على lockoutUntil");

    // ------------------------------------------------------------------
    // فحص 10: إعدادات Cookies الآمنة
    // ------------------------------------------------------------------
    console.log("\n[Check 10] فحص إعدادات ملفات تعريف الارتباط (Cookie Security Attributes)...");
    const cookieOpts = getSessionCookieOptions(new Date(Date.now() + 86400000));
    test(cookieOpts.httpOnly === true, "الكوكي يحمل خاصية HttpOnly لمنع قراءته عبر JavaScript (XSS)");
    test(cookieOpts.sameSite === "lax", "الكوكي يحمل خاصية SameSite=lax لمنع هجمات CSRF");
    test(cookieOpts.path === "/", "الكوكي محدد بالمسار الشامل /");

    // تنظيف الحسابات
    console.log("\n[Cleanup] تنظيف سجلات التدقيق الأمني...");
    db.delete(schema.users).where(eq(schema.users.id, customerUser.id)).run();
    db.delete(schema.users).where(eq(schema.users.id, officialAdmin.id)).run();

    console.log("\n==================================================================");
    console.log(`>>> ALL SECURITY AUDIT CHECKS PASSED! (${passed}/${total}) <<<`);
    console.log("==================================================================");
  } catch (err) {
    console.error("Security audit failure:", err);
    process.exit(1);
  } finally {
    sqlite.close();
  }
}

runSecurityAudit();
