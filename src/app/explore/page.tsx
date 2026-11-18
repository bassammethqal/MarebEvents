import { getCurrentSession } from "@/lib/auth/session";
import { client } from "@/db";
import { getUserFavoriteIds } from "@/lib/favorites/actions";
import { ExploreClient } from "@/components/explore/ExploreClient";
import type { VenueItem } from "@/components/home/VenueFeedWithFilter";

export const instant = false;

async function getAllActiveVenues(): Promise<VenueItem[]> {
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
    console.error("Failed to load venues for explore:", error);
    return [];
  }
}

export default async function ExplorePage() {
  const venues = await getAllActiveVenues();
  const session = await getCurrentSession();
  const favoriteVenueIds = session?.user
    ? await getUserFavoriteIds(session.user.id)
    : [];

  return (
    <ExploreClient venues={venues} favoriteVenueIds={favoriteVenueIds} />
  );
}
