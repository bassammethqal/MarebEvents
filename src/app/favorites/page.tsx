import Link from "next/link";
import { getCurrentSession } from "@/lib/auth/session";
import { sqlite } from "@/db";
import { ArrowLeft } from "lucide-react";
import { FavoriteButton } from "@/components/ui/FavoriteButton";
import { Heart3D, Pin3D } from "@/components/ui/Icons3D";

export const instant = false;

interface FavoritedVenue {
  id: string;
  name: string;
  slug: string;
  city: string;
  district: string;
  category_name: string | null;
  cover_image: string | null;
  starting_price: number | null;
  default_currency: string;
}

function getUserFavorites(userId: string): FavoritedVenue[] {
  try {
    const query = `
      SELECT 
        v.id,
        v.name,
        v.slug,
        v.city,
        v.district,
        v.default_currency,
        c.name_ar as category_name,
        (SELECT image_url FROM venue_images WHERE venue_id = v.id AND is_cover = 1 LIMIT 1) as cover_image,
        (SELECT MIN(price) FROM pricing_tiers WHERE venue_id = v.id AND shift = 'evening') as starting_price
      FROM favorites f
      JOIN venues v ON v.id = f.venue_id
      LEFT JOIN venue_categories c ON c.id = v.category_id
      WHERE f.user_id = ?
      ORDER BY f.created_at DESC
    `;
    return sqlite.prepare(query).all(userId) as FavoritedVenue[];
  } catch (error) {
    console.error("Failed to load user favorites:", error);
    return [];
  }
}

export default async function FavoritesPage() {
  const session = await getCurrentSession();
  const user = session?.user;

  if (!user) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] dark:bg-slate-950 text-slate-900 dark:text-slate-100 px-4 py-6">
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4 mb-6">
          <h1 className="text-lg font-black">القاعات المفضلة</h1>
          <Link
            href="/"
            className="text-xs text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-1 font-bold"
          >
            <span>الرئيسية</span>
            <ArrowLeft className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="text-center py-16 px-4 bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-xs">
          <div className="w-14 h-14 rounded-2xl bg-rose-50 dark:bg-rose-950/30 flex items-center justify-center mx-auto mb-3">
            <Heart3D className="w-8 h-8" active={true} />
          </div>
          <h2 className="text-base font-bold mb-2">سجل دخولك لعرض المفضلة</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-5 leading-relaxed max-w-xs mx-auto">
            احفظ القاعات والاستراحات التي تعجبك وارجع إليها في أي وقت ومن أي جهاز.
          </p>
          <Link
            href="/login?next=/favorites"
            className="inline-block bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs py-2.5 px-6 rounded-xl transition shadow-xs"
          >
            تسجيل الدخول الآن
          </Link>
        </div>
      </div>
    );
  }

  const favorites = getUserFavorites(user.id);

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-slate-950 text-slate-900 dark:text-slate-100 px-4 py-6">
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4 mb-6">
        <div>
          <h1 className="text-lg font-black">القاعات المفضلة</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {favorites.length} منشآت محفوظة
          </p>
        </div>
        <Link
          href="/"
          className="text-xs text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-1 font-bold"
        >
          <span>الرئيسية</span>
          <ArrowLeft className="w-3.5 h-3.5" />
        </Link>
      </div>

      {favorites.length === 0 ? (
        <div className="text-center py-16 px-4 bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-xs">
          <div className="w-14 h-14 rounded-2xl bg-rose-50 dark:bg-rose-950/30 flex items-center justify-center mx-auto mb-3">
            <Heart3D className="w-8 h-8" active={true} />
          </div>
          <h2 className="text-base font-bold mb-1">قائمتك المفضلة فارغة حالياً</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-5 leading-relaxed max-w-xs mx-auto">
            اضغط على أيقونة القلب على أي قاعة أو شاليه أثناء تصفحك لحفظها هنا.
          </p>
          <Link
            href="/"
            className="inline-block bg-slate-900 dark:bg-amber-500 text-white dark:text-slate-950 font-bold text-xs py-2.5 px-6 rounded-xl transition shadow-xs"
          >
            استكشف القاعات الآن
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {favorites.map((venue) => {
            const displayPrice = venue.starting_price
              ? `${venue.starting_price.toLocaleString("ar-YE")} ${venue.default_currency}`
              : "حسب الفترة";

            return (
              <div
                key={venue.id}
                className="bg-white dark:bg-slate-900 rounded-3xl overflow-hidden border border-slate-100 dark:border-slate-800 shadow-xs hover:shadow-md transition"
              >
                <div className="relative h-40 w-full bg-slate-100 dark:bg-slate-800">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={
                      venue.cover_image ||
                      "https://images.unsplash.com/photo-1519167758481-83f550bb49b3?auto=format&fit=crop&w=800&q=80"
                    }
                    alt={venue.name}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-3 left-3">
                    <FavoriteButton venueId={venue.id} initialFavorited={true} />
                  </div>
                </div>

                <div className="p-4 text-right">
                  <h3 className="font-bold text-base text-slate-900 dark:text-white leading-snug">
                    {venue.name}
                  </h3>
                  <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 mt-1 mb-3">
                    <Pin3D className="w-4 h-4 shrink-0" />
                    <span>
                      {venue.city} - {venue.district}
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800">
                    <div>
                      <div className="text-[10px] text-slate-400">ابتداءً من:</div>
                      <div className="text-sm font-black text-amber-600 dark:text-amber-400">
                        {displayPrice}
                      </div>
                    </div>
                    <Link
                      href={`/venues/${venue.slug}`}
                      className="bg-slate-900 dark:bg-amber-500 hover:bg-slate-800 text-white dark:text-slate-950 text-xs font-bold px-4 py-2 rounded-xl transition shadow-xs active:scale-95"
                    >
                      عرض وحجز
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
