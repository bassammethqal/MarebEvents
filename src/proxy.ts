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

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-pathname", pathname);

  const isOwnerProtected =
    pathname.startsWith("/owner") && !pathname.startsWith("/owner/login");

  const isProtectedPath =
    pathname.startsWith("/admin") ||
    isOwnerProtected ||
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/my-bookings");

  if (isProtectedPath) {
    const loginTarget = isOwnerProtected ? "/owner/login" : "/login";

    if (!sessionCookie || !sessionCookie.value) {
      const loginUrl = new URL(loginTarget, request.url);
      if (!isOwnerProtected) {
        loginUrl.searchParams.set("next", pathname);
      }
      return NextResponse.redirect(loginUrl);
    }

    // 1. فحص التوقيع المشفر
    const verifiedToken = verifySignedSessionToken(sessionCookie.value);
    if (!verifiedToken) {
      const loginUrl = new URL(loginTarget, request.url);
      if (!isOwnerProtected) {
        loginUrl.searchParams.set("next", pathname);
      }
      const response = NextResponse.redirect(loginUrl);
      response.cookies.delete(SESSION_COOKIE_NAME);
      return response;
    }

    // 2. التحقق الفعلي من وجود الجلسة وصلاحيتها
    const activeSession = await validateSession(sessionCookie.value);
    if (!activeSession) {
      const loginUrl = new URL(loginTarget, request.url);
      if (!isOwnerProtected) {
        loginUrl.searchParams.set("next", pathname);
      }
      const response = NextResponse.redirect(loginUrl);
      response.cookies.delete(SESSION_COOKIE_NAME);
      return response;
    }
  }

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
