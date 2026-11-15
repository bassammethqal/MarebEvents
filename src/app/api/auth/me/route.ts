import { NextResponse, type NextRequest } from "next/server";
import { validateSession, SESSION_COOKIE_NAME } from "@/lib/auth/session";

export async function GET(request: NextRequest) {
  try {
    const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME);
    if (!sessionCookie || !sessionCookie.value) {
      return NextResponse.json({ authenticated: false, user: null }, { status: 401 });
    }

    const result = await validateSession(sessionCookie.value);
    if (!result) {
      const res = NextResponse.json({ authenticated: false, user: null }, { status: 401 });
      res.cookies.delete(SESSION_COOKIE_NAME);
      return res;
    }

    return NextResponse.json({ authenticated: true, user: result.user }, { status: 200 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "فشل جلب بيانات المستخدم.";
    return NextResponse.json({ authenticated: false, error: message }, { status: 500 });
  }
}
