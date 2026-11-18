import { notFound } from "next/navigation";
import Link from "next/link";
import { getCurrentSession } from "@/lib/auth/session";
import { client } from "@/db";
import {
  MapPin,
  Users,
  Phone,
  MessageCircle,
  ArrowRight,
  ShieldCheck,
  Check,
} from "lucide-react";
import { FavoriteButton } from "@/components/ui/FavoriteButton";
import { BookingForm } from "@/components/venues/BookingForm";

export const instant = false;

interface VenueData {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  city: string;
  district: string;
  address_details: string | null;
  contact_phone: string;
  contact_whatsapp: string | null;
  default_currency: string;
  category_name: string | null;
  max_capacity: number | null;
}

interface ImageRow {
  id: string;
  image_url: string;
  is_cover: boolean;
}

interface UnitRow {
  id: string;
  name: string;
  unit_type: string;
  capacity_max: number;
}

interface PricingRow {
  shift: string;
  price: number;
  currency: string;
}

interface AmenityRow {
  id: string;
  name_ar: string;
}

async function getVenueBySlug(slug: string) {
  try {
    const [venue] = await client<VenueData[]>`
      SELECT 
        v.id,
        v.name,
        v.slug,
        v.description,
        v.city,
        v.district,
        v.address_details,
        v.contact_phone,
        v.contact_whatsapp,
        v.default_currency,
        c.name_ar as category_name,
        (SELECT MAX(capacity_max) FROM venue_units WHERE venue_id = v.id) as max_capacity
      FROM venues v
      LEFT JOIN venue_categories c ON c.id = v.category_id
      WHERE v.slug = ${slug} AND v.status = 'active'
      LIMIT 1
    `;

    if (!venue) return null;

    const [images, units, pricing, amenities] = await Promise.all([
      client<ImageRow[]>`
        SELECT id, image_url, is_cover FROM venue_images WHERE venue_id = ${venue.id} ORDER BY is_cover DESC
      `,
      client<UnitRow[]>`
        SELECT id, name, unit_type, capacity_max FROM venue_units WHERE venue_id = ${venue.id} AND is_active = true
      `,
      client<PricingRow[]>`
        SELECT shift, price, currency FROM pricing_tiers WHERE venue_id = ${venue.id}
      `,
      client<AmenityRow[]>`
        SELECT a.id, a.name_ar 
        FROM venue_amenities va
        JOIN amenities a ON a.id = va.amenity_id
        WHERE va.venue_id = ${venue.id}
      `,
    ]);

    return {
      venue,
      images,
      units,
      pricing,
      amenities,
    };
  } catch (error) {
    console.error("Failed to load venue:", error);
    return null;
  }
}

export default async function VenueDetailsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [data, session] = await Promise.all([
    getVenueBySlug(slug),
    getCurrentSession(),
  ]);

  if (!data) {
    notFound();
  }

  const { venue, images, units, pricing, amenities } = data;
  const isAuthenticated = !!session?.user;

  // Check if venue is favorited by current user
  let isFavorited = false;
  if (session?.user) {
    const [fav] = await client`
      SELECT id FROM favorites WHERE user_id = ${session.user.id} AND venue_id = ${venue.id} LIMIT 1
    `;
    isFavorited = !!fav;
  }

  const coverImage =
    images.find((img) => img.is_cover)?.image_url ||
    images[0]?.image_url ||
    "https://images.unsplash.com/photo-1519167758481-83f550bb49b3?auto=format&fit=crop&w=800&q=80";

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-slate-950 text-slate-900 dark:text-slate-100 pb-20">
      {/* Top Header */}
      <div className="sticky top-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-100 dark:border-slate-800 px-4 h-14 flex items-center justify-between">
        <Link
          href="/"
          className="w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center hover:bg-slate-200 transition"
          aria-label="العودة للرئيسية"
        >
          <ArrowRight className="w-4 h-4" />
        </Link>
        <span className="font-bold text-sm truncate max-w-[200px]">{venue.name}</span>
        <FavoriteButton venueId={venue.id} initialFavorited={isFavorited} />
      </div>

      {/* Main Cover Image */}
      <div className="relative h-60 w-full bg-slate-200 dark:bg-slate-800">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={coverImage}
          alt={venue.name}
          className="w-full h-full object-cover"
        />
        {venue.category_name && (
          <div className="absolute bottom-3 right-3 bg-slate-900/80 backdrop-blur-sm text-white text-xs font-bold px-3 py-1 rounded-full">
            {venue.category_name}
          </div>
        )}
      </div>

      {/* Content Container */}
      <div className="px-4 py-5 space-y-5">
        {/* Title & Basic Info */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-100 dark:border-slate-800 shadow-xs">
          <h1 className="text-xl font-black text-slate-900 dark:text-white mb-2">
            {venue.name}
          </h1>

          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400 mb-3">
            <div className="flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-amber-600 shrink-0" />
              <span>
                {venue.city} - {venue.district}
              </span>
            </div>
            {venue.max_capacity && (
              <div className="flex items-center gap-1">
                <Users className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span>حتى {venue.max_capacity} ضيف</span>
              </div>
            )}
          </div>

          {venue.address_details && (
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed bg-slate-50 dark:bg-slate-800/50 p-2.5 rounded-xl mb-4">
              {venue.address_details}
            </p>
          )}

          {venue.description && (
            <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
              {venue.description}
            </p>
          )}

          {/* Direct contact buttons */}
          <div className="grid grid-cols-2 gap-2 mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
            <a
              href={`tel:${venue.contact_phone}`}
              className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs font-bold hover:bg-slate-200 transition"
            >
              <Phone className="w-3.5 h-3.5 text-amber-600" />
              <span>اتصال مباشر</span>
            </a>
            {venue.contact_whatsapp ? (
              <a
                href={`https://wa.me/${venue.contact_whatsapp.replace(/\+/g, "")}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-bold hover:bg-emerald-500/20 transition"
              >
                <MessageCircle className="w-3.5 h-3.5" />
                <span>محادثة واتساب</span>
              </a>
            ) : (
              <div className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 text-slate-400 text-xs font-bold">
                <span>واتساب غير متوفر</span>
              </div>
            )}
          </div>
        </div>

        {/* Pricing Tiers */}
        {pricing.length > 0 && (
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-100 dark:border-slate-800 shadow-xs">
            <h3 className="font-bold text-sm text-slate-900 dark:text-white mb-3">
              أسعار الفترات المعتمدة
            </h3>
            <div className="grid grid-cols-3 gap-2">
              {pricing.map((p) => {
                const shiftLabel =
                  p.shift === "morning"
                    ? "صباحية"
                    : p.shift === "evening"
                    ? "مسائية"
                    : "يوم كامل";
                return (
                  <div
                    key={p.shift}
                    className="p-3 bg-amber-500/5 border border-amber-500/20 rounded-2xl text-center"
                  >
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 mb-1">
                      {shiftLabel}
                    </div>
                    <div className="font-black text-xs text-amber-700 dark:text-amber-400">
                      {p.price.toLocaleString("ar-YE")}
                    </div>
                    <div className="text-[9px] text-slate-400">{p.currency}</div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Amenities */}
        {amenities.length > 0 && (
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-100 dark:border-slate-800 shadow-xs">
            <h3 className="font-bold text-sm text-slate-900 dark:text-white mb-3">
              المرافق والخدمات المتوفرة
            </h3>
            <div className="grid grid-cols-2 gap-2">
              {amenities.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300"
                >
                  <div className="w-5 h-5 rounded-full bg-emerald-500/15 text-emerald-600 flex items-center justify-center shrink-0">
                    <Check className="w-3 h-3 stroke-[3]" />
                  </div>
                  <span>{item.name_ar}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Booking Form Card */}
        <BookingForm
          venueId={venue.id}
          venueName={venue.name}
          units={units.map((u) => ({
            id: u.id,
            name: u.name,
            unitType: u.unit_type,
            capacityMax: u.capacity_max,
          }))}
          pricing={pricing}
          defaultCurrency={venue.default_currency}
          isAuthenticated={isAuthenticated}
        />

        {/* Security guarantee notice */}
        <div className="bg-slate-100 dark:bg-slate-900/60 rounded-2xl p-4 flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
          <ShieldCheck className="w-6 h-6 text-emerald-500 shrink-0" />
          <p>
            حجزك مضمون ومحمي بواسطة نظام مأرب الذري لمنع التعارض المزدوج في المواعيد.
          </p>
        </div>
      </div>
    </div>
  );
}
