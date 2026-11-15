import { NextResponse, type NextRequest } from "next/server";
import { registerUser } from "@/lib/auth/service";
import { SESSION_COOKIE_NAME, SESSION_DURATION_SECONDS } from "@/lib/auth/session";
import { validateCsrfOrigin } from "@/lib/auth/csrf";

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
    const { user, session, signedCookieValue } = await registerUser(body);

    const response = NextResponse.json(
      { success: true, user },
      { status: 201 }
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
    const message = error instanceof Error ? error.message : "فشل إنشاء الحساب.";
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
