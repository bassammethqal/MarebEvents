import { db, schema } from "@/db";
import { eq } from "drizzle-orm";

export interface RateLimitStatus {
  allowed: boolean;
  attempts: number;
  remainingAttempts: number;
  retryAfterSeconds?: number;
}

const DEFAULT_MAX_ATTEMPTS = 5;
const DEFAULT_WINDOW_SECONDS = 15 * 60; // 15 دقيقة
const DEFAULT_LOCKOUT_SECONDS = 15 * 60; // 15 دقيقة قفل بعد تجاوز المحاولات

/**
 * فحص معدل المحاولات لمعرّف معين (عنوان IP أو بريد/هاتف)
 */
export async function checkRateLimit(
  key: string,
  maxAttempts: number = DEFAULT_MAX_ATTEMPTS,
  windowSeconds: number = DEFAULT_WINDOW_SECONDS,
  lockoutSeconds: number = DEFAULT_LOCKOUT_SECONDS
): Promise<RateLimitStatus> {
  const normalizedKey = key.trim().toLowerCase();
  const now = new Date();

  const [record] = await db
    .select()
    .from(schema.authRateLimits)
    .where(eq(schema.authRateLimits.key, normalizedKey));

  if (!record) {
    return {
      allowed: true,
      attempts: 0,
      remainingAttempts: maxAttempts,
    };
  }

  // 1. التحقق من فترة القفل (Lockout)
  if (record.lockoutUntil) {
    const lockoutDate = new Date(record.lockoutUntil);
    if (lockoutDate > now) {
      const remainingMs = lockoutDate.getTime() - now.getTime();
      const retryAfterSeconds = Math.ceil(remainingMs / 1000);
      return {
        allowed: false,
        attempts: record.attempts,
        remainingAttempts: 0,
        retryAfterSeconds,
      };
    }
  }

  // 2. التحقق من نافذة الوقت للمحاولات السابقة (Window Expiry)
  const lastAttemptDate = new Date(record.lastAttemptAt);
  const diffSeconds = (now.getTime() - lastAttemptDate.getTime()) / 1000;

  if (diffSeconds > windowSeconds) {
    // انتهت النافذة الزمنية، يتم تصفير المحاولات تلقائياً
    await db.delete(schema.authRateLimits)
      .where(eq(schema.authRateLimits.key, normalizedKey));

    return {
      allowed: true,
      attempts: 0,
      remainingAttempts: maxAttempts,
    };
  }

  if (record.attempts >= maxAttempts) {
    // تجاوز المحاولات، يتم فرض قفل إذا لم يكن مفروضاً
    const lockoutUntil = new Date(now.getTime() + lockoutSeconds * 1000).toISOString();
    await db.update(schema.authRateLimits)
      .set({ lockoutUntil })
      .where(eq(schema.authRateLimits.key, normalizedKey));

    return {
      allowed: false,
      attempts: record.attempts,
      remainingAttempts: 0,
      retryAfterSeconds: lockoutSeconds,
    };
  }

  return {
    allowed: true,
    attempts: record.attempts,
    remainingAttempts: Math.max(0, maxAttempts - record.attempts),
  };
}

/**
 * تسجيل محاولة فاشلة
 */
export async function recordFailedAttempt(
  key: string,
  maxAttempts: number = DEFAULT_MAX_ATTEMPTS,
  lockoutSeconds: number = DEFAULT_LOCKOUT_SECONDS
): Promise<RateLimitStatus> {
  const normalizedKey = key.trim().toLowerCase();
  const now = new Date();
  const nowIso = now.toISOString();

  const [record] = await db
    .select()
    .from(schema.authRateLimits)
    .where(eq(schema.authRateLimits.key, normalizedKey));

  const newAttempts = (record ? record.attempts : 0) + 1;
  const isLocked = newAttempts >= maxAttempts;
  const lockoutUntil = isLocked
    ? new Date(now.getTime() + lockoutSeconds * 1000).toISOString()
    : null;

  if (record) {
    await db.update(schema.authRateLimits)
      .set({
        attempts: newAttempts,
        lastAttemptAt: nowIso,
        lockoutUntil,
      })
      .where(eq(schema.authRateLimits.key, normalizedKey));
  } else {
    await db.insert(schema.authRateLimits)
      .values({
        key: normalizedKey,
        attempts: newAttempts,
        lastAttemptAt: nowIso,
        lockoutUntil,
      });
  }

  return {
    allowed: !isLocked,
    attempts: newAttempts,
    remainingAttempts: Math.max(0, maxAttempts - newAttempts),
    retryAfterSeconds: isLocked ? lockoutSeconds : undefined,
  };
}

/**
 * تصفير سجل المحاولات عند تسجيل الدخول الناجح
 */
export async function resetRateLimit(key: string): Promise<void> {
  const normalizedKey = key.trim().toLowerCase();
  await db.delete(schema.authRateLimits)
    .where(eq(schema.authRateLimits.key, normalizedKey));
}
