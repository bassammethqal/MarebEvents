import { NextResponse, type NextRequest } from "next/server";
import { logoutUser } from "@/lib/auth/service";
import { SESSION_COOKIE_NAME } from "@/lib/auth/session";
import { validateCsrfOrigin } from "@/lib/auth/csrf";

export async function POST(request: NextRequest) {
  if (!validateCsrfOrigin(request)) {
    return NextResponse.json(
      { success: false, error: "تم رفض الطلب: فشل التحقق من أمان المصدر (CSRF Protection)." },
      { status: 403 }
    );
  }

  try {
    const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME);
    if (sessionCookie && sessionCookie.value) {
      await logoutUser(sessionCookie.value);
    }

    const response = NextResponse.json({ success: true, message: "تم تسجيل الخروج بنجاح." });
    response.cookies.delete(SESSION_COOKIE_NAME);
    return response;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "فشل تسجيل الخروج.";
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
