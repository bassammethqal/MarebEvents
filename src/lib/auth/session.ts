import { db, schema } from "@/db";
import { eq } from "drizzle-orm";
import crypto from "crypto";
import { cookies } from "next/headers";
import { cache } from "react";
import { signSessionToken, verifySignedSessionToken } from "./cookie-signer";

export const SESSION_COOKIE_NAME = "mareb_session";
export const SESSION_DURATION_DAYS = 30;
export const SESSION_DURATION_SECONDS = SESSION_DURATION_DAYS * 24 * 60 * 60;

export type SafeUser = Omit<
  schema.User,
  "passwordHash" | "failedLoginAttempts" | "lockoutUntil"
>;

/**
 * دالة مساعدة لتجريد المستخدم من الحقول الحساسة (كلمة المرور وسجلات القفل)
 */
export function sanitizeUser(user: schema.User): SafeUser {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { passwordHash, failedLoginAttempts, lockoutUntil, ...safeUser } = user;
  return safeUser;
}

/**
 * دالة تشفير بصمة رمز الجلسة (SHA-256 Hash) لتخزينه بأمان في قاعدة البيانات
 * دون تخزين الرمز الخام أبداً
 */
export function hashSessionToken(rawToken: string): string {
  return crypto.createHash("sha256").update(rawToken).digest("hex");
}

/**
 * إنشاء جلسة جديدة وحفظ الهاش المشفر فقط في قاعدة البيانات
 * مع إرجاع الرمز الخام لتثبيته في الكوكي المشفر للمستخدم
 */
export async function createSession(
  userId: string
): Promise<{ session: schema.Session; rawToken: string; signedCookieValue: string }> {
  // 1. توليد رمز جلسة عشوائي آمن تشفيرياً (256-bit)
  const rawToken = crypto.randomBytes(32).toString("hex");

  // 2. حساب بصمة الهاش المشفرة للتخزين في قاعدة البيانات (OWASP Safe Storage)
  const tokenHash = hashSessionToken(rawToken);

  const now = new Date();
  const expiresAt = new Date(now.getTime() + SESSION_DURATION_SECONDS * 1000);

  const newSession: schema.NewSession = {
    id: tokenHash, // تخزين بصمة الهاش فقط كمعرّف للجلسة
    userId,
    expiresAt: expiresAt.toISOString(),
    createdAt: now.toISOString(),
  };

  await db.insert(schema.sessions).values(newSession);

  // 3. توقيع الرمز الخام تشفيرياً عبر HMAC-SHA256
  const signedCookieValue = signSessionToken(rawToken);

  return {
    session: newSession as schema.Session,
    rawToken,
    signedCookieValue,
  };
}

/**
 * التحقق من صلاحية الجلسة باستخدام الرمز الخام أو القيمة الموقعة
 * ومطابقة البصمة المشفرة في قاعدة البيانات (Memoized عبر React cache لمنع التكرار)
 */
export const validateSession = cache(async (
  tokenOrSignedValue: string
): Promise<{ session: schema.Session; user: SafeUser } | null> => {
  if (!tokenOrSignedValue || typeof tokenOrSignedValue !== "string") {
    return null;
  }

  // إذا كانت القيمة موقّعة، يتم التحقق من توقيع HMAC أولاً واستخراج الرمز الخام
  let rawToken: string | null = tokenOrSignedValue;
  if (tokenOrSignedValue.includes(".")) {
    rawToken = verifySignedSessionToken(tokenOrSignedValue);
    if (!rawToken) {
      return null; // توقيع مزور أو غير صالح
    }
  }

  if (!rawToken || rawToken.length < 32) {
    return null;
  }

  // حساب الهاش للبحث في قاعدة البيانات
  const tokenHash = hashSessionToken(rawToken);

  const [session] = await db
    .select()
    .from(schema.sessions)
    .where(eq(schema.sessions.id, tokenHash));

  if (!session) {
    return null;
  }

  const now = new Date();
  const expiresDate = new Date(session.expiresAt);

  // إذا انتهت صلاحية الجلسة، يتم حذفها فوراً
  if (now >= expiresDate) {
    await db.delete(schema.sessions).where(eq(schema.sessions.id, tokenHash));
    return null;
  }

  // استرجاع بيانات المستخدم المرتبط بالجلسة
  const [user] = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.id, session.userId));

  if (!user || !user.isActive) {
    // إذا كان المستخدم محذوفاً أو معطلاً، يتم إلغاء الجلسة
    await db.delete(schema.sessions).where(eq(schema.sessions.id, tokenHash));
    return null;
  }

  return {
    session,
    user: sanitizeUser(user),
  };
});

/**
 * إبطال وحذف جلسة محددة عبر الرمز الخام أو القيمة الموقعة
 */
export async function invalidateSession(tokenOrSignedValue: string): Promise<void> {
  if (!tokenOrSignedValue) return;

  let rawToken: string | null = tokenOrSignedValue;
  if (tokenOrSignedValue.includes(".")) {
    rawToken = verifySignedSessionToken(tokenOrSignedValue);
  }

  if (rawToken) {
    const tokenHash = hashSessionToken(rawToken);
    await db.delete(schema.sessions).where(eq(schema.sessions.id, tokenHash));
  }
}

/**
 * إبطال جميع جلسات المستخدم
 */
export async function invalidateAllUserSessions(userId: string): Promise<void> {
  if (!userId) return;
  await db.delete(schema.sessions).where(eq(schema.sessions.userId, userId));
}

/**
 * تدوير الجلسة (Session Rotation):
 * إبطال أي جلسة سابقة متصلة، وتوليد جلسة جديدة تماماً لمنع هجمات تثبيت الجلسة (Session Fixation)
 */
export async function rotateSession(
  userId: string,
  oldSignedToken?: string | null
): Promise<{ session: schema.Session; rawToken: string; signedCookieValue: string }> {
  if (oldSignedToken) {
    await invalidateSession(oldSignedToken);
  }

  // تنظيف أي جلسات سابقة لنفس المستخدم
  await db.delete(schema.sessions)
    .where(eq(schema.sessions.userId, userId));

  return await createSession(userId);
}

/**
 * خيارات ملف تعريف الارتباط الآمنة (Cookie Security Attributes)
 */
export function getSessionCookieOptions(expiresAt: Date) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    expires: expiresAt,
    maxAge: SESSION_DURATION_SECONDS,
  };
}

/**
 * تثبيت ملف تعريف الارتباط للجلسة الموقعة في استجابة الخادم
 */
export async function setSessionCookie(
  signedCookieValue: string,
  expiresAt: Date
): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, signedCookieValue, getSessionCookieOptions(expiresAt));
}

/**
 * حذف ملف تعريف الارتباط للجلسة
 */
export async function removeSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}

/**
 * استخراج والتحقق من الجلسة الحالية من الـ Cookies (Memoized عبر React cache لكل طلب)
 */
export const getCurrentSession = cache(async (): Promise<{
  session: schema.Session;
  user: SafeUser;
} | null> => {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME);
    if (!sessionCookie || !sessionCookie.value) {
      return null;
    }
    return await validateSession(sessionCookie.value);
  } catch {
    return null;
  }
});
