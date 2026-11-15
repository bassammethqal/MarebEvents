import { NextRequest } from "next/server";

// تعبير نمطي للتحقق من سلامة صيغة IPv4
const IPV4_REGEX = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;

// تعبير نمطي مبسط للتحقق من سلامة صيغة IPv6
const IPV6_REGEX = /^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$|^::1$|^::$/;

/**
 * استخراج وتطهير عنوان IP العميل بأمان ومقاومة التلاعب
 *
 * آلية العمل:
 * 1. في بيئة التطوير المحلية: الإرجاع الافتراضي 127.0.0.1.
 * 2. في بيئة الإنتاج خلف Reverse Proxy موثوق (مثل Cloudflare أو Nginx):
 *    - فحص ترويسة cf-connecting-ip أولاً (غير قابلة للتزوير من العميل على Cloudflare).
 *    - فحص ترويسة x-real-ip (يضعها البروكسي كعنوان العميل الفعلي).
 *    - فحص x-forwarded-for: استخراج العنوان الأول وتطهيره وفحصه ضد تعابير IPv4/IPv6.
 * 3. في حال وجود قيم غير صالحة أو محاولات حقن ترويسات: الإرجاع الآمن "unknown".
 */
export function getClientIp(request: NextRequest): string {
  // 1. فحص ترويسات البروكسي الموثوقة ذات الأولوية
  const cfConnectingIp = request.headers.get("cf-connecting-ip");
  if (cfConnectingIp && isValidIp(cfConnectingIp.trim())) {
    return cfConnectingIp.trim();
  }

  const xRealIp = request.headers.get("x-real-ip");
  if (xRealIp && isValidIp(xRealIp.trim())) {
    return xRealIp.trim();
  }

  // 2. فحص ترويسة X-Forwarded-For مع التطهير الصارم
  const xForwardedFor = request.headers.get("x-forwarded-for");
  if (xForwardedFor) {
    // استخراج أول عنوان IP وتجريده من الفراغات
    const firstIp = xForwardedFor.split(",")[0].trim();
    if (isValidIp(firstIp)) {
      return firstIp;
    }
  }

  // 3. في بيئة التطوير المحلي، الافتراضي هو Localhost
  if (process.env.NODE_ENV !== "production") {
    return "127.0.0.1";
  }

  return "unknown";
}

/**
 * التحقق من مطابقة السلسلة النصية لصيغة IP حقيقية
 */
export function isValidIp(ip: string): boolean {
  if (!ip || typeof ip !== "string" || ip.length > 45) {
    return false;
  }
  return IPV4_REGEX.test(ip) || IPV6_REGEX.test(ip);
}
