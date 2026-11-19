import { unstable_cache } from "next/cache";
import { client } from "@/db";
import type { VenueItem } from "@/components/home/VenueFeedWithFilter";

export interface CategoryItem {
  id: string;
  nameAr: string;
}

/**
 * جلب قائمة القاعات النشطة المخزنة مؤقتاً في الذاكرة (استجابة فائقة السرعة < 20ms)
 * يتم تجديدها تلقائياً كل 60 ثانية أو عند استدعاء revalidateTag('venues')
 */
export const getCachedActiveVenues = unstable_cache(
  async (): Promise<VenueItem[]> => {
    try {
      const rows = await client<VenueItem[]>`
        SELECT 
          v.id,
          v.name,
          v.slug,
          v.description,
          v.city,
          v.district,
          v.contact_phone,
          v.contact_whatsapp,
          v.default_currency,
          c.name_ar as category_name,
          (SELECT image_url FROM venue_images WHERE venue_id = v.id AND is_cover = true LIMIT 1) as cover_image,
          (SELECT MIN(price) FROM pricing_tiers WHERE venue_id = v.id AND shift = 'evening') as starting_price,
          (SELECT MAX(capacity_max) FROM venue_units WHERE venue_id = v.id) as max_capacity
        FROM venues v
        LEFT JOIN venue_categories c ON c.id = v.category_id
        WHERE v.status = 'active'
        ORDER BY v.featured DESC, v.created_at DESC
      `;
      return rows;
    } catch (error) {
      console.error("Failed to load cached venues:", error);
      return [];
    }
  },
  ["active-venues-list"],
  {
    revalidate: 60,
    tags: ["venues"],
  }
);

/**
 * جلب تصنيفات المنشآت مع التخزين المؤقت
 */
export const getCachedCategories = unstable_cache(
  async (): Promise<CategoryItem[]> => {
    try {
      const rows = await client<[{ id: string; name_ar: string }]>`
        SELECT id, name_ar FROM venue_categories ORDER BY display_order ASC
      `;
      return rows.map((r) => ({ id: r.id, nameAr: r.name_ar }));
    } catch (error) {
      console.error("Failed to load cached categories:", error);
      return [];
    }
  },
  ["venue-categories-list"],
  {
    revalidate: 300,
    tags: ["categories", "venues"],
  }
);
