import { requireOwnerOrAdmin } from "@/lib/auth/guards";
import { client } from "@/db";
import { OwnerVenuesClient, VenueDetailItem } from "@/components/owner/OwnerVenuesClient";
import { Building2, ChevronRight } from "lucide-react";
import Link from "next/link";

export const instant = false;

interface RawVenueRow {
  id: string;
  name: string;
  slug: string;
  status: string;
  district: string;
  city: string;
  max_capacity: number | null;
}

interface RawTierRow {
  venue_id: string;
  shift: string;
  price: number;
}

export default async function OwnerVenuesPage() {
  const { user } = await requireOwnerOrAdmin();

  // جلب المنشآت مع السعة القصوى
  let rawVenues: RawVenueRow[] = [];
  if (user.role === "admin") {
    rawVenues = await client<RawVenueRow[]>`
      SELECT 
        v.id, v.name, v.slug, v.status, v.district, v.city,
        COALESCE(vu.capacity_max, 500) as max_capacity
      FROM venues v
      LEFT JOIN venue_units vu ON vu.venue_id = v.id AND vu.is_active = true
      WHERE v.deleted_at IS NULL
      ORDER BY v.created_at DESC
      LIMIT 20
    `;
  } else {
    rawVenues = await client<RawVenueRow[]>`
      SELECT 
        v.id, v.name, v.slug, v.status, v.district, v.city,
        COALESCE(vu.capacity_max, 500) as max_capacity
      FROM venues v
      JOIN venue_members vm ON vm.venue_id = v.id
      LEFT JOIN venue_units vu ON vu.venue_id = v.id AND vu.is_active = true
      WHERE vm.user_id = ${user.id} AND v.deleted_at IS NULL
      ORDER BY v.created_at DESC
    `;
  }

  const venueIds = rawVenues.map((v) => v.id);

  // جلب الأسعار لكل منشأة
  let pricingTiers: RawTierRow[] = [];
  if (venueIds.length > 0) {
    pricingTiers = await client<RawTierRow[]>`
      SELECT venue_id, shift, price
      FROM pricing_tiers
      WHERE venue_id = ANY(${venueIds})
    `;
  }

  const venues: VenueDetailItem[] = rawVenues.map((v) => {
    const venueTiers = pricingTiers.filter((t) => t.venue_id === v.id);
    const morningPrice = venueTiers.find((t) => t.shift === "morning")?.price || 0;
    const eveningPrice = venueTiers.find((t) => t.shift === "evening")?.price || 0;
    const fullDayPrice = venueTiers.find((t) => t.shift === "full_day")?.price || 0;

    return {
      id: v.id,
      name: v.name,
      slug: v.slug,
      status: v.status,
      district: v.district,
      city: v.city,
      maxCapacity: v.max_capacity || 500,
      morningPrice,
      eveningPrice,
      fullDayPrice,
    };
  });

  return (
    <div className="flex-1 flex flex-col p-4 sm:p-5 space-y-4 animate-in fade-in duration-300">
      {/* Top Bar */}
      <div className="flex items-center justify-between pt-1">
        <div className="flex items-center gap-2">
          <Link
            href="/owner"
            className="p-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition"
          >
            <ChevronRight className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-base font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
              <Building2 className="w-4 h-4 text-amber-700 dark:text-amber-400" />
              إدارة المنشآت
            </h1>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              تعديل السعة والأسعار وتفعيل أو إيقاف الحجوزات
            </p>
          </div>
        </div>
      </div>

      {venues.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 text-center text-slate-400">
          لا توجد منشآت مرتبطة بحسابك حالياً. يرجى التواصل مع إدارة المنصة.
        </div>
      ) : (
        <OwnerVenuesClient venues={venues} />
      )}
    </div>
  );
}
