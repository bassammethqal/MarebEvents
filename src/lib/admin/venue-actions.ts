"use server";

import { client } from "@/db";
import { requireAdmin } from "@/lib/auth/guards";
import { revalidatePath, revalidateTag } from "next/cache";
import crypto from "crypto";

export interface ActionResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

const DEFAULT_VENUE_IMAGE =
  "https://images.unsplash.com/photo-1519167758481-83f550bb49b3?auto=format&fit=crop&w=1200&q=80";

function generateSlug(text: string): string {
  const arabicToLatinMap: Record<string, string> = {
    "أ": "a", "إ": "e", "آ": "a", "ا": "a", "ب": "b", "ت": "t", "ث": "th",
    "ج": "j", "ح": "h", "خ": "kh", "د": "d", "ذ": "dh", "ر": "r", "ز": "z",
    "س": "s", "ش": "sh", "ص": "s", "ض": "d", "ط": "t", "ظ": "z", "ع": "aa",
    "غ": "gh", "ف": "f", "ق": "q", "ك": "k", "ل": "l", "م": "m", "ن": "n",
    "ه": "h", "و": "w", "ي": "y", "ى": "a", "ة": "h", "ء": "", "ئ": "y", "ؤ": "o"
  };

  const transliterated = text
    .split("")
    .map((char) => arabicToLatinMap[char] !== undefined ? arabicToLatinMap[char] : char)
    .join("")
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  const suffix = Math.random().toString(36).substring(2, 7);
  return transliterated ? `${transliterated}-${suffix}` : `venue-${suffix}`;
}

/**
 * Server Action: إنشاء منشأة جديدة من الصفر بواسطة إدارة المنصة
 */
export async function createVenueByAdminAction(
  formData: FormData
): Promise<ActionResult<{ venueId: string; name: string; slug: string }>> {
  try {
    // 1. التحقق من صلاحية المدير حصراً
    await requireAdmin();

    const name = (formData.get("name") as string)?.trim();
    const categoryId = (formData.get("categoryId") as string)?.trim();
    const district = (formData.get("district") as string)?.trim() || "حي الروضة";
    const city = (formData.get("city") as string)?.trim() || "مأرب";
    const addressDetails = (formData.get("addressDetails") as string)?.trim() || null;
    const description = (formData.get("description") as string)?.trim() || null;
    const maxCapacity = Math.max(1, parseInt((formData.get("maxCapacity") as string) || "300", 10));
    const coverImageUrl = (formData.get("coverImageUrl") as string)?.trim() || DEFAULT_VENUE_IMAGE;
    const contactPhone = (formData.get("contactPhone") as string)?.trim() || "773461637";
    const contactWhatsapp = (formData.get("contactWhatsapp") as string)?.trim() || "967773461637";
    const ownerUserId = (formData.get("ownerUserId") as string)?.trim() || null;

    // الأسعار بالريال اليمني
    const morningPrice = parseFloat((formData.get("morningPrice") as string) || "0") || null;
    const eveningPrice = parseFloat((formData.get("eveningPrice") as string) || "0") || 150000;
    const fullDayPrice = parseFloat((formData.get("fullDayPrice") as string) || "0") || null;

    if (!name) {
      return { success: false, error: "يرجى إدخال اسم المنشأة / القاعة." };
    }

    if (!categoryId) {
      return { success: false, error: "يرجى تحديد تصنيف المنشأة." };
    }

    const venueId = "venue_" + crypto.randomUUID().replace(/-/g, "").substring(0, 12);
    const slug = generateSlug(name);
    const unitId = "unit_" + crypto.randomUUID().replace(/-/g, "").substring(0, 12);
    const imageId = "img_" + crypto.randomUUID().replace(/-/g, "").substring(0, 12);
    const now = new Date().toISOString();

    await client.begin(async (sql) => {
      // 1. إدراج المنشأة
      await sql`
        INSERT INTO venues (
          id, category_id, name, slug, description, city, district,
          address_details, contact_phone, contact_whatsapp, status,
          default_currency, default_deposit_percentage, has_multiple_units,
          featured, created_at, updated_at
        ) VALUES (
          ${venueId}, ${categoryId}, ${name}, ${slug}, ${description}, ${city}, ${district},
          ${addressDetails}, ${contactPhone}, ${contactWhatsapp}, 'active',
          'YER', 30.0, false,
          false, ${now}, ${now}
        )
      `;

      // 2. إدراج الصورة الرئيسية للمنشأة
      await sql`
        INSERT INTO venue_images (
          id, venue_id, image_url, storage_path, storage_type,
          alt_text, is_cover, display_order, created_at
        ) VALUES (
          ${imageId}, ${venueId}, ${coverImageUrl}, ${coverImageUrl}, 'local',
          ${name}, true, 0, ${now}
        )
      `;

      // 3. إدراج الوحدة الرئيسية للمنشأة
      await sql`
        INSERT INTO venue_units (
          id, venue_id, name, unit_type, capacity_min, capacity_max,
          is_active, created_at, updated_at
        ) VALUES (
          ${unitId}, ${venueId}, 'القاعة الرئيسية', 'full_venue', 50, ${maxCapacity},
          true, ${now}, ${now}
        )
      `;

      // 4. إدراج جدول الأسعار (الفترة المسائية أساسية + الصباحية واليوم الكامل إن وجد)
      const eveningTierId = "tier_" + crypto.randomUUID().replace(/-/g, "").substring(0, 12);
      await sql`
        INSERT INTO pricing_tiers (
          id, venue_id, unit_id, shift, price, currency, created_at
        ) VALUES (
          ${eveningTierId}, ${venueId}, ${unitId}, 'evening', ${eveningPrice}, 'YER', ${now}
        )
      `;

      if (morningPrice && morningPrice > 0) {
        const morningTierId = "tier_" + crypto.randomUUID().replace(/-/g, "").substring(0, 12);
        await sql`
          INSERT INTO pricing_tiers (
            id, venue_id, unit_id, shift, price, currency, created_at
          ) VALUES (
            ${morningTierId}, ${venueId}, ${unitId}, 'morning', ${morningPrice}, 'YER', ${now}
          )
        `;
      }

      if (fullDayPrice && fullDayPrice > 0) {
        const fullDayTierId = "tier_" + crypto.randomUUID().replace(/-/g, "").substring(0, 12);
        await sql`
          INSERT INTO pricing_tiers (
            id, venue_id, unit_id, shift, price, currency, created_at
          ) VALUES (
            ${fullDayTierId}, ${venueId}, ${unitId}, 'full_day', ${fullDayPrice}, 'YER', ${now}
          )
        `;
      }

      // 5. ربط المالك بالمنشأة إن تم اختياره
      if (ownerUserId) {
        const memberId = crypto.randomUUID();
        await sql`
          INSERT INTO venue_members (
            id, venue_id, user_id, role, permissions, created_at
          ) VALUES (
            ${memberId}, ${venueId}, ${ownerUserId}, 'primary_owner', '{"full_access":true}', ${now}
          )
          ON CONFLICT (venue_id, user_id) DO UPDATE SET role = 'primary_owner'
        `;
      }
    });

    revalidateTag("venues", { expire: 0 });
    revalidatePath("/admin");
    revalidatePath("/explore");
    revalidatePath("/");

    return {
      success: true,
      data: {
        venueId,
        name,
        slug,
      },
    };
  } catch (err: unknown) {
    console.error("createVenueByAdminAction error:", err);
    const message = err instanceof Error ? err.message : "فشل إنشاء المنشأة.";
    return { success: false, error: message };
  }
}

/**
 * Server Action: تبديل حالة المنشأة (تفعيل / إيقاف مؤقت)
 */
export async function toggleVenueStatusAction(
  venueId: string,
  currentStatus: string
): Promise<ActionResult<{ newStatus: string }>> {
  try {
    await requireAdmin();

    const newStatus = currentStatus === "active" ? "suspended" : "active";
    const now = new Date().toISOString();

    await client`
      UPDATE venues
      SET status = ${newStatus}, updated_at = ${now}
      WHERE id = ${venueId}
    `;

    revalidateTag("venues", { expire: 0 });
    revalidatePath("/admin");
    revalidatePath("/explore");
    revalidatePath("/");

    return { success: true, data: { newStatus } };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "فشل تغيير حالة المنشأة.";
    return { success: false, error: message };
  }
}

/**
 * Server Action: حذف المنشأة تجريبياً مع كافة ارتباطاتها
 */
export async function deleteVenueAction(
  venueId: string
): Promise<ActionResult<{ success: boolean }>> {
  try {
    await requireAdmin();

    await client.begin(async (sql) => {
      await sql`DELETE FROM pricing_tiers WHERE venue_id = ${venueId}`;
      await sql`DELETE FROM venue_images WHERE venue_id = ${venueId}`;
      await sql`DELETE FROM venue_units WHERE venue_id = ${venueId}`;
      await sql`DELETE FROM venue_members WHERE venue_id = ${venueId}`;
      await sql`DELETE FROM venues WHERE id = ${venueId}`;
    });

    revalidateTag("venues", { expire: 0 });
    revalidatePath("/admin");
    revalidatePath("/explore");
    revalidatePath("/");

    return { success: true, data: { success: true } };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "فشل حذف المنشأة.";
    return { success: false, error: message };
  }
}
