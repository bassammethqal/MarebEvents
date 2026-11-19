"use server";

import { registerUser, loginUser, logoutUser, normalizeEmail, normalizePhone, type RegisterInput } from "./service";
import { getCurrentSession, type SafeUser } from "./session";
import { requireAuth, requireAdmin, assertCanModifyProfile } from "./guards";
import { hashPassword } from "./password";
import { db, schema, client } from "@/db";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
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

/**
 * Server Action: إنشاء حساب مالك منشأة بواسطة إدارة المنصة مع كلمة مرور مؤقتة وربطه بالمنشأة
 */
export async function createOwnerByAdminAction(
  formData: FormData
): Promise<ActionResult<{ userId: string; fullName: string; tempPassword: string; venueId: string }>> {
  try {
    // 1. التحقق من صلاحية المدير حصراً
    await requireAdmin();

    const fullName = (formData.get("fullName") as string)?.trim();
    const rawEmail = (formData.get("email") as string) || null;
    const rawPhone = (formData.get("phone") as string) || null;
    const tempPassword = (formData.get("tempPassword") as string)?.trim();
    const venueId = (formData.get("venueId") as string)?.trim();

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

    if (!venueId) {
      return { success: false, error: "يرجى تحديد المنشأة المراد ربط المالك بها." };
    }

    let finalVenueId = venueId;
    let finalVenueName = "";

    // إذا تم اختيار إنشاء منشأة جديدة في نفس الوقت
    if (venueId === "__new__") {
      const newVenueName = (formData.get("newVenueName") as string)?.trim();
      const newVenueCategoryId = (formData.get("newVenueCategoryId") as string)?.trim();
      const newVenueDistrict = (formData.get("newVenueDistrict") as string)?.trim() || "حي الروضة";
      const newVenueCapacity = Math.max(1, parseInt((formData.get("newVenueCapacity") as string) || "300", 10));
      const newVenueEveningPrice = parseFloat((formData.get("newVenueEveningPrice") as string) || "150000") || 150000;

      if (!newVenueName) {
        return { success: false, error: "يرجى كتابة اسم المنشأة الجديدة المراد إنشاؤها." };
      }
      if (!newVenueCategoryId) {
        return { success: false, error: "يرجى تحديد تصنيف المنشأة الجديدة." };
      }

      finalVenueId = "venue_" + crypto.randomUUID().replace(/-/g, "").substring(0, 12);
      finalVenueName = newVenueName;

      const transliteratedSlug = "venue-" + Math.random().toString(36).substring(2, 8);
      const unitId = "unit_" + crypto.randomUUID().replace(/-/g, "").substring(0, 12);
      const imageId = "img_" + crypto.randomUUID().replace(/-/g, "").substring(0, 12);
      const defaultImg = "https://images.unsplash.com/photo-1519167758481-83f550bb49b3?auto=format&fit=crop&w=1200&q=80";
      const nowTime = new Date().toISOString();

      // 4. تشفير كلمة المرور المؤقتة عبر Argon2id
      const passwordHash = await hashPassword(tempPassword);
      const newUserId = crypto.randomUUID();
      const newMemberId = crypto.randomUUID();

      await client.begin(async (sql) => {
        // إنشاء المنشأة الجديدة
        await sql`
          INSERT INTO venues (
            id, category_id, name, slug, description, city, district,
            contact_phone, contact_whatsapp, status, default_currency,
            default_deposit_percentage, has_multiple_units, featured,
            created_at, updated_at
          ) VALUES (
            ${finalVenueId}, ${newVenueCategoryId}, ${newVenueName}, ${transliteratedSlug},
            NULL, 'مأرب', ${newVenueDistrict},
            ${phone || "773461637"}, ${phone ? "967" + phone.replace(/^0+/, "") : "967773461637"},
            'active', 'YER', 30.0, false, false, ${nowTime}, ${nowTime}
          )
        `;

        // إدراج الصورة
        await sql`
          INSERT INTO venue_images (
            id, venue_id, image_url, storage_path, storage_type,
            alt_text, is_cover, display_order, created_at
          ) VALUES (
            ${imageId}, ${finalVenueId}, ${defaultImg}, ${defaultImg}, 'local',
            ${newVenueName}, true, 0, ${nowTime}
          )
        `;

        // إدراج الوحدة
        await sql`
          INSERT INTO venue_units (
            id, venue_id, name, unit_type, capacity_min, capacity_max,
            is_active, created_at, updated_at
          ) VALUES (
            ${unitId}, ${finalVenueId}, 'القاعة الرئيسية', 'full_venue', 50, ${newVenueCapacity},
            true, ${nowTime}, ${nowTime}
          )
        `;

        // إدراج السعر
        const tierId = "tier_" + crypto.randomUUID().replace(/-/g, "").substring(0, 12);
        await sql`
          INSERT INTO pricing_tiers (
            id, venue_id, unit_id, shift, price, currency, created_at
          ) VALUES (
            ${tierId}, ${finalVenueId}, ${unitId}, 'evening', ${newVenueEveningPrice}, 'YER', ${nowTime}
          )
        `;

        // إنشاء المستخدم
        await sql`
          INSERT INTO users (
            id, email, phone, password_hash, full_name, role,
            avatar_url, is_active, failed_login_attempts, lockout_until,
            must_change_password, created_at, updated_at
          ) VALUES (
            ${newUserId}, ${email}, ${phone}, ${passwordHash}, ${fullName}, 'owner',
            NULL, true, 0, NULL,
            true, ${nowTime}, ${nowTime}
          )
        `;

        // ربط المالك بالمنشأة
        await sql`
          INSERT INTO venue_members (
            id, venue_id, user_id, role, permissions, created_at
          ) VALUES (
            ${newMemberId}, ${finalVenueId}, ${newUserId}, 'primary_owner', '{"full_access":true}', ${nowTime}
          )
        `;
      });

      revalidatePath("/admin");
      revalidatePath("/explore");
      revalidatePath("/");

      return {
        success: true,
        data: {
          userId: newUserId,
          fullName,
          tempPassword,
          venueId: finalVenueId,
        },
      };
    }

    // 2. التحقق من وجود المنشأة
    const [venue] = await client<[{ id: string; name: string }?]>`
      SELECT id, name FROM venues WHERE id = ${venueId} LIMIT 1
    `;
    if (!venue) {
      return { success: false, error: "المنشأة المحددة غير موجودة في النظام." };
    }

    // 3. التحقق من عدم تكرار البريد ورقم الهاتف
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

    // 4. تشفير كلمة المرور المؤقتة عبر Argon2id
    const passwordHash = await hashPassword(tempPassword);
    const newUserId = crypto.randomUUID();
    const newMemberId = crypto.randomUUID();
    const now = new Date().toISOString();

    // 5. إدراج المالك وتعيين mustChangePassword = true وربطه بالمنشأة داخل معاملة
    await client.begin(async (sql) => {
      await sql`
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

      await sql`
        INSERT INTO venue_members (
          id, venue_id, user_id, role, permissions, created_at
        ) VALUES (
          ${newMemberId}, ${venueId}, ${newUserId}, 'primary_owner', '{"full_access":true}', ${now}
        )
        ON CONFLICT (venue_id, user_id) DO UPDATE SET role = 'primary_owner'
      `;
    });

    revalidatePath("/admin");
    return {
      success: true,
      data: {
        userId: newUserId,
        fullName,
        tempPassword,
        venueId,
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
