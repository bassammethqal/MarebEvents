import { NextResponse, type NextRequest } from "next/server";
import { verifySignedSessionToken } from "@/lib/auth/cookie-signer";
import { validateSession } from "@/lib/auth/session";

export const SESSION_COOKIE_NAME = "mareb_session";

/**
 * Next.js 16 Proxy لمعالجة حماية المسارات وفحص الجلسات الموقعة تشفيرياً
 */
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME);

  const isProtectedPath =
    pathname.startsWith("/admin") ||
    pathname.startsWith("/owner") ||
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/my-bookings");

  if (isProtectedPath) {
    if (!sessionCookie || !sessionCookie.value) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("next", pathname);
      return NextResponse.redirect(loginUrl);
    }

    // 1. فحص التوقيع المشفر
    const verifiedToken = verifySignedSessionToken(sessionCookie.value);
    if (!verifiedToken) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("next", pathname);
      const response = NextResponse.redirect(loginUrl);
      response.cookies.delete(SESSION_COOKIE_NAME);
      return response;
    }

    // 2. التحقق الفعلي من وجود الجلسة وصلاحيتها في قاعدة بيانات SQLite
    const activeSession = await validateSession(sessionCookie.value);
    if (!activeSession) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("next", pathname);
      const response = NextResponse.redirect(loginUrl);
      response.cookies.delete(SESSION_COOKIE_NAME);
      return response;
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
