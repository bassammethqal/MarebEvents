import { NextRequest } from "next/server";

/**
 * التحقق الصارم من مصدر الطلب (Strict CSRF Origin Validation)
 * يرفض أي طلب تغيير حالة (POST, PUT, DELETE, PATCH) إذا كان Origin أو Referer
 * مفقوداً أو غير موثوق أو غير مطابق تماماً لـ Host
 */
export function validateCsrfOrigin(request: NextRequest): boolean {
  // الطلبات الآمنة للقراءة فقط
  if (["GET", "HEAD", "OPTIONS"].includes(request.method)) {
    return true;
  }

  const host = request.headers.get("host");
  if (!host) {
    return false;
  }

  const origin = request.headers.get("origin");
  if (origin) {
    try {
      const originHost = new URL(origin).host;
      return originHost === host;
    } catch {
      return false;
    }
  }

  const referer = request.headers.get("referer");
  if (referer) {
    try {
      const refererHost = new URL(referer).host;
      return refererHost === host;
    } catch {
      return false;
    }
  }

  // في حال غياب Origin و Referer تماماً عن طلب تغيير بيانات، يتم الرفض الحتمي
  return false;
}
