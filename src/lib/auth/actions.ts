"use server";

import { registerUser, loginUser, logoutUser, type RegisterInput } from "./service";
import { getCurrentSession, type SafeUser } from "./session";
import { requireAuth, assertCanModifyProfile } from "./guards";
import { db, schema } from "@/db";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export interface ActionResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Server Action: تسجيل حساب جديد
 */
export async function registerAction(
  formData: FormData
): Promise<ActionResult<SafeUser>> {
  try {
    const fullName = formData.get("fullName") as string;
    const email = (formData.get("email") as string) || null;
    const phone = (formData.get("phone") as string) || null;
    const password = formData.get("password") as string;
    const roleParam = (formData.get("role") as string) || "customer";

    const role: "customer" | "owner" =
      roleParam === "owner" ? "owner" : "customer";

    const input: RegisterInput = {
      fullName,
      email: email || undefined,
      phone: phone || undefined,
      password,
      role,
    };

    const { user } = await registerUser(input);
    revalidatePath("/");
    return { success: true, data: user };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "فشل إنشاء الحساب.";
    return { success: false, error: message };
  }
}

/**
 * Server Action: تسجيل الدخول
 */
export async function loginAction(
  formData: FormData
): Promise<ActionResult<SafeUser>> {
  try {
    const identifier = formData.get("identifier") as string;
    const password = formData.get("password") as string;

    const { user } = await loginUser({ identifier, password });
    revalidatePath("/");
    return { success: true, data: user };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "فشل تسجيل الدخول.";
    return { success: false, error: message };
  }
}

/**
 * Server Action: تسجيل الخروج
 */
export async function logoutAction(): Promise<void> {
  try {
    const current = await getCurrentSession();
    if (current) {
      await logoutUser(current.session.id);
    }
  } catch {
    // تجاهل أخطاء الجلسة أثناء الخروج
  }
  revalidatePath("/");
}

/**
 * Server Action: جلب بيانات المستخدم المسجل حالياً
 */
export async function getMeAction(): Promise<ActionResult<SafeUser | null>> {
  try {
    const current = await getCurrentSession();
    return { success: true, data: current ? current.user : null };
  } catch {
    return { success: false, error: "تعذر التحقق من الجلسة." };
  }
}

/**
 * Server Action: تحديث الملف الشخصي مع حماية تصعيد الصلاحيات
 */
export async function updateProfileAction(
  targetUserId: string,
  updates: {
    fullName?: string;
    avatarUrl?: string | null;
    role?: "customer" | "owner" | "admin";
    isActive?: boolean;
  }
): Promise<ActionResult<SafeUser>> {
  try {
    const { user: actor } = await requireAuth();

    // فحص الصلاحية لمنع تعديل الدور أو الحسابات الأخرى لغير المدراء
    assertCanModifyProfile(actor, targetUserId, updates);

    const updatePayload: Partial<schema.User> = {
      updatedAt: new Date().toISOString(),
    };

    if (updates.fullName) updatePayload.fullName = updates.fullName.trim();
    if (updates.avatarUrl !== undefined) updatePayload.avatarUrl = updates.avatarUrl;

    // يُسمح فقط للمدير بتحديث الدور وحالة التنشيط
    if (actor.role === "admin") {
      if (updates.role) updatePayload.role = updates.role;
      if (updates.isActive !== undefined) updatePayload.isActive = updates.isActive;
    }

    await db.update(schema.users)
      .set(updatePayload)
      .where(eq(schema.users.id, targetUserId));

    const [updated] = await db
      .select()
      .from(schema.users)
      .where(eq(schema.users.id, targetUserId));

    revalidatePath("/");
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { passwordHash, failedLoginAttempts, lockoutUntil, ...safeUser } = updated!;
    return { success: true, data: safeUser };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "فشل تعديل البيانات.";
    return { success: false, error: message };
  }
}
