import { db, schema } from "@/db";
import { eq, or } from "drizzle-orm";
import crypto from "crypto";
import { hashPassword, verifyPassword } from "./password";
import {
  createSession,
  SafeUser,
  sanitizeUser,
  rotateSession,
  setSessionCookie,
  removeSessionCookie,
  invalidateSession,
} from "./session";
import { checkRateLimit, recordFailedAttempt, resetRateLimit } from "./rate-limit";

export interface RegisterInput {
  email?: string;
  phone?: string;
  fullName: string;
  password: string;
  role?: "customer" | "owner";
}

export interface LoginInput {
  identifier: string; // البريد الإلكتروني أو رقم الهاتف
  password: string;
  clientIp?: string;
  currentSignedToken?: string | null;
}

/**
 * تنظيف وتوحيد صيغة البريد الإلكتروني
 */
export function normalizeEmail(email?: string): string | null {
  if (!email) return null;
  const trimmed = email.trim().toLowerCase();
  return trimmed.length > 0 ? trimmed : null;
}

/**
 * تنظيف وتوحيد صيغة رقم الهاتف
 */
export function normalizePhone(phone?: string): string | null {
  if (!phone) return null;
  const trimmed = phone.trim().replace(/\s+/g, "");
  return trimmed.length > 0 ? trimmed : null;
}

/**
 * تسجيل حساب مستخدم جديد
 */
export async function registerUser(
  input: RegisterInput
): Promise<{ user: SafeUser; session: schema.Session; signedCookieValue: string }> {
  const email = normalizeEmail(input.email);
  const phone = normalizePhone(input.phone);
  const fullName = input.fullName?.trim();

  if (!fullName) {
    throw new Error("يرجى إدخال الاسم الكامل.");
  }

  if (!email && !phone) {
    throw new Error("يجب تقديم البريد الإلكتروني أو رقم الهاتف على الأقل للتسجيل.");
  }

  if (!input.password || input.password.length < 8) {
    throw new Error("كلمة المرور يجب أن تتكون من 8 خانات على الأقل.");
  }

  // منع محاولة التسجيل بدور مدير نظام (Admin) من الواجهة العامة
  const allowedRole: "customer" | "owner" =
    input.role === "owner" ? "owner" : "customer";

  // 1. التحقق من عدم تكرار البريد الإلكتروني
  if (email) {
    const [existingEmail] = await db
      .select({ id: schema.users.id })
      .from(schema.users)
      .where(eq(schema.users.email, email));

    if (existingEmail) {
      throw new Error("البريد الإلكتروني مسجل مسبقاً في المنصة.");
    }
  }

  // 2. التحقق من عدم تكرار رقم الهاتف
  if (phone) {
    const [existingPhone] = await db
      .select({ id: schema.users.id })
      .from(schema.users)
      .where(eq(schema.users.phone, phone));

    if (existingPhone) {
      throw new Error("رقم الهاتف مسجل مسبقاً في المنصة.");
    }
  }

  // 3. تشفير كلمة المرور عبر Argon2id
  const passwordHash = await hashPassword(input.password);

  const userId = crypto.randomUUID();
  const now = new Date().toISOString();

  const newUser: schema.NewUser = {
    id: userId,
    email,
    phone,
    fullName,
    passwordHash,
    role: allowedRole,
    isActive: true,
    failedLoginAttempts: 0,
    lockoutUntil: null,
    createdAt: now,
    updatedAt: now,
  };

  // 4. كتابة المستخدم وإنشاء الجلسة بحفظ الهاش المشفر فقط
  await db.insert(schema.users).values(newUser);

  const { session, signedCookieValue } = await createSession(userId);

  // تثبيت الكوكي إذا توفر سياق Next.js Headers
  try {
    await setSessionCookie(signedCookieValue, new Date(session.expiresAt));
  } catch {
    // تخطي في بيئات الاختبار بدون سياق Cookies
  }

  const [user] = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.id, userId));

  return {
    user: sanitizeUser(user!),
    session,
    signedCookieValue,
  };
}

/**
 * تسجيل الدخول مع التحقق المزدوج (حماية الحساب + حماية IP)
 * وتدوير الجلسات وحفظ البصمات المشفرة
 */
export async function loginUser(
  input: LoginInput
): Promise<{ user: SafeUser; session: schema.Session; signedCookieValue: string }> {
  const rawIdentifier = input.identifier?.trim();
  const password = input.password;

  if (!rawIdentifier || !password) {
    throw new Error("يرجى إدخال البريد الإلكتروني أو رقم الهاتف وكلمة المرور.");
  }

  const clientIp = input.clientIp || "unknown";
  const normalizedIdent = rawIdentifier.toLowerCase();

  // 1. فحص مزدوج لمعدل المحاولات:
  // أ) فحص الحساب المحدد (مقاوم لمحاولات التناوب عبر عناوين IP مختلفة)
  const identRateKey = `ident:${normalizedIdent}`;
  const identRateStatus = await checkRateLimit(identRateKey, 5, 15 * 60, 15 * 60);
  if (!identRateStatus.allowed) {
    throw new Error(
      `تم قفل الحساب مؤقتاً بسبب تكرار المحاولات الخاطئة. يرجى المحاولة بعد ${identRateStatus.retryAfterSeconds} ثانية.`
    );
  }

  // ب) فحص عنوان الـ IP (مقاوم لمحاولات التخمين الشامل عبر عدة حسابات من نفس المصدر)
  const ipRateKey = `ip:${clientIp}`;
  const ipRateStatus = await checkRateLimit(ipRateKey, 30, 15 * 60, 15 * 60);
  if (!ipRateStatus.allowed) {
    throw new Error(
      `تم حظر الطلبات من هذا العنوان مؤقتاً. يرجى المحاولة بعد ${ipRateStatus.retryAfterSeconds} ثانية.`
    );
  }

  // 2. استعلام المستخدم عبر البريد أو الهاتف
  const normalizedEmail = normalizeEmail(rawIdentifier);
  const normalizedPhone = normalizePhone(rawIdentifier);

  const [user] = await db
    .select()
    .from(schema.users)
    .where(
      or(
        normalizedEmail ? eq(schema.users.email, normalizedEmail) : undefined,
        normalizedPhone ? eq(schema.users.phone, normalizedPhone) : undefined
      )
    );

  if (!user || !user.passwordHash) {
    await recordFailedAttempt(identRateKey, 5, 15 * 60);
    await recordFailedAttempt(ipRateKey, 30, 15 * 60);
    throw new Error("بيانات الدخول غير صحيحة.");
  }

  // 3. التحقق من حالة تفعيل الحساب
  if (!user.isActive) {
    throw new Error("تم تعطيل هذا الحساب. يرجى مراجعة إدارة المنصة.");
  }

  // 4. التحقق من فترة القفل المؤقت لحساب المستخدم
  if (user.lockoutUntil) {
    const lockoutDate = new Date(user.lockoutUntil);
    const now = new Date();
    if (lockoutDate > now) {
      const waitSeconds = Math.ceil((lockoutDate.getTime() - now.getTime()) / 1000);
      throw new Error(
        `الحساب مقفل مؤقتاً بسبب تكرار المحاولات الخاطئة. انتظر ${waitSeconds} ثانية.`
      );
    }
  }

  // 5. التحقق من صحة كلمة المرور عبر Argon2id
  const isPasswordValid = await verifyPassword(password, user.passwordHash);

  if (!isPasswordValid) {
    const updatedAttempts = (user.failedLoginAttempts || 0) + 1;
    const isLocked = updatedAttempts >= 5;
    const lockoutUntil = isLocked
      ? new Date(Date.now() + 15 * 60 * 1000).toISOString()
      : null;

    await db.update(schema.users)
      .set({
        failedLoginAttempts: updatedAttempts,
        lockoutUntil,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(schema.users.id, user.id));

    await recordFailedAttempt(identRateKey, 5, 15 * 60);
    await recordFailedAttempt(ipRateKey, 30, 15 * 60);

    throw new Error("بيانات الدخول غير صحيحة.");
  }

  // 6. في حال النجاح: تصفير المحاولات وتدوير الجلسة (Session Rotation)
  await db.update(schema.users)
    .set({
      failedLoginAttempts: 0,
      lockoutUntil: null,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(schema.users.id, user.id));

  await resetRateLimit(identRateKey);
  await resetRateLimit(ipRateKey);

  // تدوير الجلسة: إبطال أي جلسة قديمة لنفس المتصفح وتوليد جلسة جديدة تماماً
  const { session, signedCookieValue } = await rotateSession(
    user.id,
    input.currentSignedToken
  );

  try {
    await setSessionCookie(signedCookieValue, new Date(session.expiresAt));
  } catch {
    // تخطي في بيئة الاختبار بدون Header Context
  }

  return {
    user: sanitizeUser(user),
    session,
    signedCookieValue,
  };
}

/**
 * تسجيل الخروج وإبطال الجلسة الحالية
 */
export async function logoutUser(tokenOrSignedValue?: string): Promise<void> {
  if (tokenOrSignedValue) {
    await invalidateSession(tokenOrSignedValue);
  }
  try {
    await removeSessionCookie();
  } catch {
    // تجاهل في حال عدم وجود Cookies context
  }
}

/**
 * زرع حساب المدير الأول (Initial Admin Seeding)
 * محمي بالكامل: يشترط وجود ومطابقة الرمز السري INITIAL_ADMIN_SEED_SECRET في الخادم دائماً
 */
export async function seedInitialAdmin(params: {
  fullName: string;
  email: string;
  phone?: string;
  password: string;
  secretToken?: string;
}): Promise<SafeUser> {
  // التحقق الأمني: لا يمكن زرع أي مدير دون وجود مفتاح سري قوي في متغيرات البيئة
  const requiredSecret = process.env.INITIAL_ADMIN_SEED_SECRET;
  if (!requiredSecret || requiredSecret.length < 16) {
    throw new Error(
      "تم حظر إنشاء حساب المدير: لم يتم ضبط الرمز السري INITIAL_ADMIN_SEED_SECRET في متغيرات بيئة الخادم أو أنه غير كافٍ أمنياً (يجب أن يكون 16 خانة على الأقل)."
    );
  }

  if (!params.secretToken || params.secretToken !== requiredSecret) {
    throw new Error("الرمز السري لتفويض إنشاء المدير غير صحيح.");
  }

  const [existingAdmin] = await db
    .select({ id: schema.users.id })
    .from(schema.users)
    .where(eq(schema.users.role, "admin"));

  if (existingAdmin) {
    throw new Error(
      "يوجد مدير نظام مسجل مسبقاً بالفعل في المنصة. لإنشاء مدراء إضافيين، يجب استخدام لوحة التحكم بواسطة المدير الحالي."
    );
  }

  if (params.password.length < 10) {
    throw new Error("كلمة مرور المدير يجب ألا تقل عن 10 خانات قوية.");
  }

  const email = normalizeEmail(params.email);
  if (!email) {
    throw new Error("البريد الإلكتروني مطلوب لإنشاء حساب المدير.");
  }

  const phone = normalizePhone(params.phone);
  const passwordHash = await hashPassword(params.password);
  const userId = crypto.randomUUID();
  const now = new Date().toISOString();

  const newAdmin: schema.NewUser = {
    id: userId,
    email,
    phone,
    fullName: params.fullName.trim(),
    passwordHash,
    role: "admin",
    isActive: true,
    failedLoginAttempts: 0,
    lockoutUntil: null,
    createdAt: now,
    updatedAt: now,
  };

  await db.insert(schema.users).values(newAdmin);

  const [createdUser] = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.id, userId));

  return sanitizeUser(createdUser!);
}
