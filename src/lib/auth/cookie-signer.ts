import crypto from "crypto";

const DEFAULT_DEV_SECRET =
  "mareb_events_super_secure_session_signing_secret_dev_key_2026";

/**
 * الحصول على المفتاح السري للتوقيع المشفر لملفات تعريف الارتباط
 */
export function getSessionSecret(): string {
  return process.env.SESSION_SECRET || DEFAULT_DEV_SECRET;
}

/**
 * توقيع رمز الجلسة مشفراً باستخدام HMAC-SHA256
 * الصيغة: token.signature
 */
export function signSessionToken(token: string): string {
  if (!token || typeof token !== "string") {
    throw new Error("رمز الجلسة غير صالح للتوقيع.");
  }

  const secret = getSessionSecret();
  const signature = crypto
    .createHmac("sha256", secret)
    .update(token)
    .digest("base64url");

  return `${token}.${signature}`;
}

/**
 * التحقق المشفر من توقيع الكوكي واستخراج الرمز الخام بأمان
 * يعتمد على التوقيت الآمن (Timing Safe Comparison) لمنع هجمات التوقيت (Timing Attacks)
 */
export function verifySignedSessionToken(signedValue?: string | null): string | null {
  if (!signedValue || typeof signedValue !== "string") {
    return null;
  }

  const parts = signedValue.split(".");
  if (parts.length !== 2) {
    return null;
  }

  const [token, signature] = parts;
  if (!token || !signature || token.length < 32) {
    return null;
  }

  const secret = getSessionSecret();
  const expectedSignature = crypto
    .createHmac("sha256", secret)
    .update(token)
    .digest("base64url");

  const sigBuffer = Buffer.from(signature);
  const expectedSigBuffer = Buffer.from(expectedSignature);

  if (sigBuffer.length !== expectedSigBuffer.length) {
    return null;
  }

  if (!crypto.timingSafeEqual(sigBuffer, expectedSigBuffer)) {
    return null;
  }

  return token;
}
