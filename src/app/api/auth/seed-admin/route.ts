import { NextResponse, type NextRequest } from "next/server";
import { seedInitialAdmin } from "@/lib/auth/service";
import { validateCsrfOrigin } from "@/lib/auth/csrf";

export async function POST(request: NextRequest) {
  if (!validateCsrfOrigin(request)) {
    return NextResponse.json(
      { success: false, error: "تم رفض الطلب: فشل التحقق من أمان المصدر (CSRF Protection)." },
      { status: 403 }
    );
  }

  // في بيئة الإنتاج، يتم حظر هذا المسار افتراضياً ما لم يتم تفعيله صراحة
  if (
    process.env.NODE_ENV === "production" &&
    process.env.ENABLE_ADMIN_SEED_API !== "true"
  ) {
    return NextResponse.json(
      {
        success: false,
        error:
          "تم تعطيل واجهة إنشاء المدير عبر API في بيئة الإنتاج لأسباب أمنية. يرجى استخدام أمر سطر الأوامر الرسمي scripts/seed-admin.ts.",
      },
      { status: 403 }
    );
  }

  try {
    const body = await request.json();
    const admin = await seedInitialAdmin(body);
    return NextResponse.json(
      {
        success: true,
        message: "تم إنشاء حساب المدير بنجاح.",
        user: admin,
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "فشل إنشاء حساب المدير.";
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
