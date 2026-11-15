import { NextResponse, type NextRequest } from "next/server";
import { loginUser } from "@/lib/auth/service";
import { SESSION_COOKIE_NAME, SESSION_DURATION_SECONDS } from "@/lib/auth/session";
import { validateCsrfOrigin } from "@/lib/auth/csrf";
import { getClientIp } from "@/lib/auth/ip";

export async function POST(request: NextRequest) {
  // فحص حماية CSRF
  if (!validateCsrfOrigin(request)) {
    return NextResponse.json(
      { success: false, error: "تم رفض الطلب: فشل التحقق من أمان المصدر (CSRF Protection)." },
      { status: 403 }
    );
  }

  try {
    const body = await request.json();
    const clientIp = getClientIp(request);
    const currentSignedToken = request.cookies.get(SESSION_COOKIE_NAME)?.value || null;

    const { user, session, signedCookieValue } = await loginUser({
      identifier: body.identifier,
      password: body.password,
      clientIp,
      currentSignedToken,
    });

    const response = NextResponse.json(
      { success: true, user },
      { status: 200 }
    );

    // تثبيت الكوكي الموقع تشفيرياً
    response.cookies.set(SESSION_COOKIE_NAME, signedCookieValue, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: SESSION_DURATION_SECONDS,
      expires: new Date(session.expiresAt),
    });

    return response;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "فشل تسجيل الدخول.";
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
