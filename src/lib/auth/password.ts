import { hash, verify } from "@node-rs/argon2";

/**
 * خيارات تشفير Argon2id الموصى بها أمنياً من OWASP
 * algorithm: 2 يمثل Argon2id
 */
const ARGON2_OPTIONS = {
  algorithm: 2 as const, // Algorithm.Argon2id
  memoryCost: 19456, // 19 MiB
  timeCost: 2,
  parallelism: 1,
};

/**
 * تشفير كلمة المرور باستخدام خوارزمية Argon2id
 */
export async function hashPassword(password: string): Promise<string> {
  if (!password || typeof password !== "string") {
    throw new Error("كلمة المرور غير صالحة للتشفير");
  }
  return await hash(password, ARGON2_OPTIONS);
}

/**
 * التحقق من مطابقة كلمة المرور مع الهاش المخزن
 */
export async function verifyPassword(password: string, passwordHash: string): Promise<boolean> {
  if (!password || !passwordHash) {
    return false;
  }
  try {
    return await verify(passwordHash, password);
  } catch {
    return false;
  }
}
