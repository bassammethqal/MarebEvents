"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Search,
  X,
  Sparkles,
  Users,
  Building2,
  SlidersHorizontal,
} from "lucide-react";
import { FavoriteButton } from "@/components/ui/FavoriteButton";
import { Pin3D } from "@/components/ui/Icons3D";
import { ScrollReveal } from "@/components/ui/ScrollReveal";
import type { VenueItem } from "@/components/home/VenueFeedWithFilter";

interface ExploreClientProps {
  venues: VenueItem[];
  favoriteVenueIds: string[];
}

const CATEGORIES = [
  { id: "all", label: "الكل" },
  { id: "wedding", label: "قاعات أفراح" },
  { id: "chalet", label: "شاليهات" },
  { id: "resthouse", label: "استراحات" },
  { id: "conference", label: "مؤتمرات" },
];

const SORT_OPTIONS = [
  { id: "default", label: "المميز والمقترح" },
  { id: "price_asc", label: "السعر: الأقل أولاً" },
  { id: "price_desc", label: "السعر: الأعلى أولاً" },
  { id: "capacity_desc", label: "السعة: الأكبر أولاً" },
];

export function ExploreClient({ venues, favoriteVenueIds }: ExploreClientProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [sortBy, setSortBy] = useState("default");
  const [showFilters, setShowFilters] = useState(false);

  const filteredAndSortedVenues = useMemo(() => {
    // 1. Filter
    const list = venues.filter((venue) => {
      // Category match
      if (selectedCategory !== "all") {
        const cat = venue.category_name || "";
        if (selectedCategory === "wedding" && !cat.includes("قاع") && !cat.includes("أفراح")) {
          return false;
        }
        if (selectedCategory === "chalet" && !cat.includes("شاليه")) {
          return false;
        }
        if (selectedCategory === "resthouse" && !cat.includes("استراح")) {
          return false;
        }
        if (selectedCategory === "conference" && !cat.includes("مؤتمر")) {
          return false;
        }
      }

      // Search match (name, district, city, description)
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        const matchesName = venue.name.toLowerCase().includes(q);
        const matchesDistrict = venue.district.toLowerCase().includes(q);
        const matchesCity = venue.city.toLowerCase().includes(q);
        const matchesDesc = (venue.description || "").toLowerCase().includes(q);
        if (!matchesName && !matchesDistrict && !matchesCity && !matchesDesc) {
          return false;
        }
      }

      return true;
    });

    // 2. Sort
    return list.sort((a, b) => {
      if (sortBy === "price_asc") {
        return (a.starting_price || 0) - (b.starting_price || 0);
      }
      if (sortBy === "price_desc") {
        return (b.starting_price || 0) - (a.starting_price || 0);
      }
      if (sortBy === "capacity_desc") {
        return (b.max_capacity || 0) - (a.max_capacity || 0);
      }
      return 0; // default order preserved from query
    });
  }, [venues, selectedCategory, searchQuery, sortBy]);

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-slate-950 text-slate-900 dark:text-slate-100 pb-20">
      {/* 2. Search & Controls */}
      <div className="p-4 space-y-3">
        {/* Count Pill */}
        <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 px-0.5">
          <span className="font-bold">القاعات المتاحة للحجز المباشر</span>
          <span className="bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 text-[11px] font-bold px-2.5 py-0.5 rounded-full">
            {filteredAndSortedVenues.length} منشأة
          </span>
        </div>
        {/* Search Bar with Filter Toggle */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ابحث باسم القاعة، الحي، أو المنطقة..."
              className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl py-3 pr-10 pl-10 text-xs sm:text-sm text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/50 shadow-2xs transition"
            />
            <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                aria-label="مسح البحث"
                className="w-5 h-5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-slate-600 flex items-center justify-center absolute left-3 top-1/2 -translate-y-1/2 transition"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={() => setShowFilters(!showFilters)}
            aria-label="خيارات الترتيب"
            className={`w-11 h-11 rounded-2xl border flex items-center justify-center transition active:scale-95 shrink-0 ${
              showFilters || sortBy !== "default"
                ? "bg-amber-500 border-amber-500 text-slate-950 font-bold"
                : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
            }`}
          >
            <SlidersHorizontal className="w-4 h-4" />
          </button>
        </div>

        {/* Collapsible Sorting Bar */}
        {showFilters && (
          <div className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs text-xs space-y-2 animate-in fade-in duration-150">
            <span className="font-bold text-slate-500 dark:text-slate-400 block text-[11px]">
              ترتيب النتائج حسب:
            </span>
            <div className="grid grid-cols-2 gap-1.5">
              {SORT_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setSortBy(opt.id)}
                  className={`py-2 px-2.5 rounded-xl text-center text-xs transition ${
                    sortBy === opt.id
                      ? "bg-amber-500/15 dark:bg-amber-950/60 border border-amber-500 text-amber-700 dark:text-amber-400 font-bold"
                      : "bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Category Filter Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
          {CATEGORIES.map((cat) => {
            const isSelected = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.id)}
                className={`shrink-0 px-4 py-2 rounded-full text-xs font-bold transition active:scale-95 cursor-pointer shadow-2xs ${
                  isSelected
                    ? "bg-amber-500 text-slate-950 shadow-amber-500/20"
                    : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800"
                }`}
              >
                {cat.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. Venue Cards List */}
      <div className="px-4 space-y-4">
        {filteredAndSortedVenues.length === 0 ? (
          <div className="text-center py-16 bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-xs px-4">
            <Building2 className="h-10 w-10 text-slate-300 dark:text-slate-700 mx-auto mb-2" />
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
              لا توجد منشآت تطابق هذا البحث
            </h3>
            <p className="text-xs text-slate-400 mt-1 mb-4">
              جرّب تغيير التصنيف، أو تعديل كلمة البحث، أو إعادة ضبط الفلاتر.
            </p>
            <button
              type="button"
              onClick={() => {
                setSelectedCategory("all");
                setSearchQuery("");
                setSortBy("default");
              }}
              className="inline-block text-xs font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-4 py-2 rounded-xl hover:bg-amber-100 transition"
            >
              عرض كافة القاعات
            </button>
          </div>
        ) : (
          filteredAndSortedVenues.map((venue, index) => {
            const displayPrice = venue.starting_price
              ? `${venue.starting_price.toLocaleString("ar-YE")} ${venue.default_currency}`
              : "حسب الفترة";

            const isFavorited = favoriteVenueIds.includes(venue.id);

            return (
              <ScrollReveal key={venue.id} delayMs={(index % 4) * 70}>
                <div
                  className="bg-white dark:bg-slate-900 rounded-3xl overflow-hidden border border-slate-100 dark:border-slate-800 shadow-xs hover:shadow-md transition duration-200 group"
                >
                  {/* Image Container with Badge & Heart */}
                  <div className="relative h-44 w-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    <Link href={`/venues/${venue.slug}`} prefetch={true} className="block w-full h-full">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={
                          venue.cover_image ||
                          "https://images.unsplash.com/photo-1519167758481-83f550bb49b3?auto=format&fit=crop&w=800&q=80"
                        }
                        alt={venue.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                      />
                    </Link>

                    {/* Top Right: Category Badge */}
                    <div className="absolute top-3 right-3 bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm text-slate-800 dark:text-slate-100 text-[11px] font-bold px-3 py-1 rounded-full shadow-sm flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-amber-500" />
                      <span>{venue.category_name || "تأكيد فوري"}</span>
                    </div>

                    {/* Top Left: Heart Button */}
                    <div className="absolute top-3 left-3">
                      <FavoriteButton
                        venueId={venue.id}
                        initialFavorited={isFavorited}
                      />
                    </div>
                  </div>

                  {/* Card Content */}
                  <div className="p-4 text-right">
                    <Link href={`/venues/${venue.slug}`} prefetch={true}>
                      <h3 className="font-bold text-base text-slate-900 dark:text-white leading-snug hover:text-amber-600 transition">
                        {venue.name}
                      </h3>
                    </Link>

                    <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 mt-1 mb-3">
                      <Pin3D className="w-4 h-4 shrink-0" />
                      <span>
                        {venue.city} - {venue.district}
                      </span>
                      {venue.max_capacity && (
                        <>
                          <span className="text-slate-300 dark:text-slate-700">•</span>
                          <Users className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>حتى {venue.max_capacity} ضيف</span>
                        </>
                      )}
                    </div>

                    {/* Price & Booking Button */}
                    <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800">
                      <div>
                        <div className="text-[11px] text-slate-400 font-medium">
                          ابتداءً من:
                        </div>
                        <div className="text-sm font-black text-amber-600 dark:text-amber-400">
                          {displayPrice}
                        </div>
                      </div>

                      <Link
                        href={`/venues/${venue.slug}`}
                        prefetch={true}
                        className="bg-slate-900 dark:bg-amber-500 hover:bg-slate-800 dark:hover:bg-amber-400 text-white dark:text-slate-950 text-xs font-bold px-4 py-2 rounded-xl transition shadow-xs active:scale-95"
                      >
                        احجز الآن
                      </Link>
                    </div>
                  </div>
                </div>
              </ScrollReveal>
            );
          })
        )}
      </div>
    </div>
  );
}
