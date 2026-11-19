"use server";

import { registerUser, loginUser, logoutUser, normalizeEmail, normalizePhone, type RegisterInput } from "./service";
import { getCurrentSession, removeSessionCookie, type SafeUser } from "./session";
import { requireAuth, requireAdmin, assertCanModifyProfile } from "./guards";
import { hashPassword } from "./password";
import { db, schema, client } from "@/db";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import crypto from "crypto";

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

    // منع إنشاء أي حساب بصلاحية owner من واجهات التسجيل العامة (يُسمح فقط بإنشاء customer)
    const role: "customer" = "customer";

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
 * Server Action: تسجيل الخروج الفوري مع توجيه مخصص حسب الدور
 */
export async function logoutAction(): Promise<void> {
  let targetPath = "/login?logged_out=1";

  try {
    const current = await getCurrentSession();
    if (current) {
      if (current.user.role === "admin") {
        targetPath = "/admin/login?logged_out=1";
      } else if (current.user.role === "owner") {
        targetPath = "/owner/login?logged_out=1";
      }

      // حذف الجلسة من جدول sessions في الخلفية بدون حجب الاستجابة
      const sessionId = current.session.id;
      void db
        .delete(schema.sessions)
        .where(eq(schema.sessions.id, sessionId))
        .catch((err) => console.error("Async session deletion error:", err));
    }
  } catch (err) {
    console.error("logoutAction error:", err);
  }

  // حذف كوكي الجلسة فوراً
  try {
    await removeSessionCookie();
  } catch (err) {
    console.error("removeSessionCookie error:", err);
  }

  revalidatePath("/", "layout");
  redirect(targetPath);
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

/**
 * Server Action: إنشاء حساب مالك منشأة بواسطة إدارة المنصة مع كلمة مرور مؤقتة (دون الحاجة لربطه بمنشأة مسبقاً)
 */
export async function createOwnerByAdminAction(
  formData: FormData
): Promise<ActionResult<{ userId: string; fullName: string; tempPassword: string; identifier: string }>> {
  try {
    // 1. التحقق من صلاحية المدير حصراً
    await requireAdmin();

    const fullName = (formData.get("fullName") as string)?.trim();
    const rawEmail = (formData.get("email") as string) || null;
    const rawPhone = (formData.get("phone") as string) || null;
    const tempPassword = (formData.get("tempPassword") as string)?.trim();

    const email = normalizeEmail(rawEmail || undefined);
    const phone = normalizePhone(rawPhone || undefined);

    if (!fullName) {
      return { success: false, error: "يرجى كتابة الاسم الكامل للمالك." };
    }

    if (!email && !phone) {
      return { success: false, error: "يجب تقديم البريد الإلكتروني أو رقم الهاتف على الأقل." };
    }

    if (!tempPassword || tempPassword.length < 8) {
      return { success: false, error: "كلمة المرور المؤقتة يجب أن تتكون من 8 خانات على الأقل." };
    }

    // 2. التحقق من عدم تكرار البريد ورقم الهاتف
    if (email) {
      const [existingEmail] = await client<[{ id: string }?]>`
        SELECT id FROM users WHERE email = ${email} LIMIT 1
      `;
      if (existingEmail) {
        return { success: false, error: "البريد الإلكتروني مسجل مسبقاً لمستخدم آخر." };
      }
    }

    if (phone) {
      const [existingPhone] = await client<[{ id: string }?]>`
        SELECT id FROM users WHERE phone = ${phone} LIMIT 1
      `;
      if (existingPhone) {
        return { success: false, error: "رقم الهاتف مسجل مسبقاً لمستخدم آخر." };
      }
    }

    // 3. تشفير كلمة المرور المؤقتة عبر Argon2id
    const passwordHash = await hashPassword(tempPassword);
    const newUserId = crypto.randomUUID();
    const now = new Date().toISOString();

    // 4. إدراج المالك وتعيين mustChangePassword = true
    await client`
      INSERT INTO users (
        id, email, phone, password_hash, full_name, role,
        avatar_url, is_active, failed_login_attempts, lockout_until,
        must_change_password, created_at, updated_at
      ) VALUES (
        ${newUserId}, ${email}, ${phone}, ${passwordHash}, ${fullName}, 'owner',
        NULL, true, 0, NULL,
        true, ${now}, ${now}
      )
    `;

    revalidatePath("/admin");
    return {
      success: true,
      data: {
        userId: newUserId,
        fullName,
        tempPassword,
        identifier: phone || email || "",
      },
    };
  } catch (err: unknown) {
    console.error("createOwnerByAdminAction error:", err);
    const message = err instanceof Error ? err.message : "تعذر إنشاء حساب المالك.";
    return { success: false, error: message };
  }
}

/**
 * Server Action: تغيير كلمة المرور الإجباري عند أول تسجيل دخول للمالك
 */
export async function completeFirstLoginPasswordChangeAction(
  formData: FormData
): Promise<ActionResult<{ success: boolean }>> {
  try {
    const { user } = await requireAuth();

    const newPassword = (formData.get("newPassword") as string) || "";
    const confirmPassword = (formData.get("confirmPassword") as string) || "";

    if (!newPassword || newPassword.length < 8) {
      return { success: false, error: "كلمة المرور الجديدة يجب أن تتكون من 8 خانات على الأقل." };
    }

    if (newPassword !== confirmPassword) {
      return { success: false, error: "كلمتا المرور غير متطابقتين." };
    }

    const passwordHash = await hashPassword(newPassword);
    const now = new Date().toISOString();

    await client`
      UPDATE users 
      SET password_hash = ${passwordHash}, 
          must_change_password = false, 
          updated_at = ${now}
      WHERE id = ${user.id}
    `;

    revalidatePath("/owner");
    revalidatePath("/");

    return { success: true, data: { success: true } };
  } catch (err: unknown) {
    console.error("completeFirstLoginPasswordChangeAction error:", err);
    const message = err instanceof Error ? err.message : "فشل تحديث كلمة المرور.";
    return { success: false, error: message };
  }
}
