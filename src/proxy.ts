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

  const isAdminProtected =
    pathname.startsWith("/admin") && !pathname.startsWith("/admin/login");

  const isOwnerProtected =
    pathname.startsWith("/owner") && !pathname.startsWith("/owner/login");

  const isProtectedPath =
    isAdminProtected ||
    isOwnerProtected ||
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/my-bookings");

  if (isProtectedPath) {
    let loginTarget = "/login";
    if (isAdminProtected) {
      loginTarget = "/admin/login";
    } else if (isOwnerProtected) {
      loginTarget = "/owner/login";
    }

    // 1. عدم وجود كوكي الجلسة
    if (!sessionCookie || !sessionCookie.value) {
      const loginUrl = new URL(loginTarget, request.url);
      if (!isAdminProtected && !isOwnerProtected) {
        loginUrl.searchParams.set("next", pathname);
      }
      return NextResponse.redirect(loginUrl);
    }

    // 2. فحص التوقيع المشفر
    const verifiedToken = verifySignedSessionToken(sessionCookie.value);
    if (!verifiedToken) {
      const loginUrl = new URL(loginTarget, request.url);
      if (!isAdminProtected && !isOwnerProtected) {
        loginUrl.searchParams.set("next", pathname);
      }
      const response = NextResponse.redirect(loginUrl);
      response.cookies.delete(SESSION_COOKIE_NAME);
      return response;
    }

    // 3. التحقق الفعلي من وجود الجلسة وصلاحيتها
    const activeSession = await validateSession(sessionCookie.value);
    if (!activeSession) {
      const loginUrl = new URL(loginTarget, request.url);
      if (!isAdminProtected && !isOwnerProtected) {
        loginUrl.searchParams.set("next", pathname);
      }
      const response = NextResponse.redirect(loginUrl);
      response.cookies.delete(SESSION_COOKIE_NAME);
      return response;
    }

    // 4. التحقق من الصلاحيات الخاصة بمسارات الإدارة ومسارات الملاك
    if (isAdminProtected && activeSession.user.role !== "admin") {
      const loginUrl = new URL("/admin/login", request.url);
      return NextResponse.redirect(loginUrl);
    }

    if (
      isOwnerProtected &&
      activeSession.user.role !== "owner" &&
      activeSession.user.role !== "admin"
    ) {
      const loginUrl = new URL("/owner/login", request.url);
      return NextResponse.redirect(loginUrl);
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
