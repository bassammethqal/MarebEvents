import { getCurrentSession } from "@/lib/auth/session";
import { getCachedActiveVenues } from "@/lib/venues/cached";
import { getUserFavoriteIds } from "@/lib/favorites/actions";
import { ExploreClient } from "@/components/explore/ExploreClient";

export const instant = false;

export default async function ExplorePage() {
  const session = await getCurrentSession();
  const [venues, favoriteVenueIds] = await Promise.all([
    getCachedActiveVenues(),
    session?.user ? getUserFavoriteIds(session.user.id) : Promise.resolve([]),
  ]);

  return (
    <ExploreClient venues={venues} favoriteVenueIds={favoriteVenueIds} />
  );
}
