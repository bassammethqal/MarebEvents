import type Database from "better-sqlite3";
import type { BookingShift, CurrencyType } from "./types";

export interface ResolvedPriceItem {
  itemType: "unit_rate" | "full_venue_rate" | "extra_service" | "discount" | "custom_override";
  descriptionAr: string;
  unitPrice: number;
  quantity: number;
  totalPrice: number;
  currency: CurrencyType;
  unitId?: string;
  amenityId?: string;
}

export interface PricingCalculationResult {
  items: ResolvedPriceItem[];
  totalAmount: number;
  depositAmount: number;
  currency: CurrencyType;
}

/**
 * حساب السعر الهرمي للوحدة أو المنشأة بالكامل وفق قواعد الأولوية الحتمية
 */
export function calculateBookingPrice(
  sqlite: Database.Database,
  params: {
    venueId: string;
    isFullVenue: boolean;
    unitIds: string[];
    eventDate: string; // YYYY-MM-DD
    shift: BookingShift;
    extraAmenityIds?: string[];
  }
): PricingCalculationResult {
  const { venueId, isFullVenue, unitIds, eventDate, shift, extraAmenityIds = [] } = params;

  // استخراج يوم الأسبوع من التاريخ (0: الأحد .. 6: السبت)
  const dateObj = new Date(`${eventDate}T00:00:00Z`);
  const dayOfWeek = dateObj.getUTCDay();

  // جلب إعدادات العملة والعربون الافتراضي من المنشأة
  const venueRow = sqlite
    .prepare(`SELECT default_currency, default_deposit_percentage FROM venues WHERE id = ?`)
    .get(venueId) as { default_currency: CurrencyType; default_deposit_percentage: number } | undefined;

  if (!venueRow) {
    throw new Error(`VENUE_NOT_FOUND: Venue ${venueId} does not exist`);
  }

  const currency = venueRow.default_currency || "YER";
  const depositPercentage = venueRow.default_deposit_percentage || 25;

  const items: ResolvedPriceItem[] = [];

  if (isFullVenue) {
    // 1. حساب السعر الشامل لكامل المنشأة وفق سلم الأولويات
    const fullVenuePrice = resolveTierPrice(sqlite, {
      venueId,
      unitId: null,
      eventDate,
      shift,
      dayOfWeek,
    });

    if (fullVenuePrice === null) {
      throw new Error(`PRICING_NOT_FOUND: No pricing tier found for full venue on ${eventDate} (${shift})`);
    }

    items.push({
      itemType: "full_venue_rate",
      descriptionAr: "إيجار المنشأة بالكامل للفترة المحددة",
      unitPrice: fullVenuePrice,
      quantity: 1,
      totalPrice: fullVenuePrice,
      currency,
    });
  } else {
    // 2. حساب السعر لكل قسم/وحدة مطلوبة
    for (const unitId of unitIds) {
      const unitRow = sqlite
        .prepare(`SELECT name FROM venue_units WHERE id = ?`)
        .get(unitId) as { name: string } | undefined;

      const unitName = unitRow?.name || `قسم ${unitId}`;
      const unitPrice = resolveTierPrice(sqlite, {
        venueId,
        unitId,
        eventDate,
        shift,
        dayOfWeek,
      });

      if (unitPrice === null) {
        throw new Error(`PRICING_NOT_FOUND: No pricing tier found for unit "${unitName}" on ${eventDate} (${shift})`);
      }

      items.push({
        itemType: "unit_rate",
        descriptionAr: `إيجار ${unitName} للفترة المحددة`,
        unitPrice,
        quantity: 1,
        totalPrice: unitPrice,
        currency,
        unitId,
      });
    }
  }

  // 3. إضافة الخدمات والمرافق الإضافية المطلوبة
  if (extraAmenityIds.length > 0) {
    const placeholders = extraAmenityIds.map(() => "?").join(",");
    const extraRows = sqlite
      .prepare(`
        SELECT va.amenity_id, va.additional_price, va.is_free, a.name_ar 
        FROM venue_amenities va
        JOIN amenities a ON a.id = va.amenity_id
        WHERE va.venue_id = ? AND va.amenity_id IN (${placeholders})
      `)
      .all(venueId, ...extraAmenityIds) as Array<{
        amenity_id: string;
        additional_price: number;
        is_free: number;
        name_ar: string;
      }>;

    for (const extra of extraRows) {
      const price = extra.is_free ? 0 : (extra.additional_price || 0);
      items.push({
        itemType: "extra_service",
        descriptionAr: `خدمة إضافية: ${extra.name_ar}`,
        unitPrice: price,
        quantity: 1,
        totalPrice: price,
        currency,
        amenityId: extra.amenity_id,
      });
    }
  }

  const totalAmount = items.reduce((sum, item) => sum + item.totalPrice, 0);
  const depositAmount = Math.round((totalAmount * (depositPercentage / 100)) * 100) / 100;

  return {
    items,
    totalAmount,
    depositAmount,
    currency,
  };
}

/**
 * حل السعر وفق الأولويات الأربع الحتمية:
 * 1. استثناء تاريخ مخصص (custom_price)
 * 2. سعر موسمي (is_seasonal = 1)
 * 3. سعر يوم أسبوع (day_of_week)
 * 4. سعر عام افتراضي (day_of_week IS NULL)
 */
function resolveTierPrice(
  sqlite: Database.Database,
  params: {
    venueId: string;
    unitId: string | null;
    eventDate: string;
    shift: BookingShift;
    dayOfWeek: number;
  }
): number | null {
  const { venueId, unitId, eventDate, shift, dayOfWeek } = params;

  // 1. استثناء إتاحة وسعر مخصص (venue_availability)
  const overrideRow = sqlite
    .prepare(`
      SELECT custom_price FROM venue_availability
      WHERE venue_id = :venueId 
        AND (:unitId IS NULL AND unit_id IS NULL OR unit_id = :unitId)
        AND override_date = :eventDate
        AND shift = :shift
        AND custom_price IS NOT NULL
      LIMIT 1
    `)
    .get({ venueId, unitId, eventDate, shift }) as { custom_price: number } | undefined;

  if (overrideRow && overrideRow.custom_price !== null) {
    return overrideRow.custom_price;
  }

  // 2. سعر موسمي (pricing_tiers مع is_seasonal = 1)
  const seasonalRow = sqlite
    .prepare(`
      SELECT price FROM pricing_tiers
      WHERE venue_id = :venueId
        AND (:unitId IS NULL AND unit_id IS NULL OR unit_id = :unitId)
        AND shift = :shift
        AND is_seasonal = 1
        AND :eventDate >= season_start
        AND :eventDate <= season_end
      LIMIT 1
    `)
    .get({ venueId, unitId, eventDate, shift }) as { price: number } | undefined;

  if (seasonalRow && seasonalRow.price !== null) {
    return seasonalRow.price;
  }

  // 3. سعر يوم محدد من الأسبوع (pricing_tiers مع day_of_week)
  const dowRow = sqlite
    .prepare(`
      SELECT price FROM pricing_tiers
      WHERE venue_id = :venueId
        AND (:unitId IS NULL AND unit_id IS NULL OR unit_id = :unitId)
        AND shift = :shift
        AND is_seasonal = 0
        AND day_of_week = :dayOfWeek
      LIMIT 1
    `)
    .get({ venueId, unitId, shift, dayOfWeek }) as { price: number } | undefined;

  if (dowRow && dowRow.price !== null) {
    return dowRow.price;
  }

  // 4. سعر عام افتراضي للفترة (pricing_tiers مع day_of_week IS NULL)
  const defaultRow = sqlite
    .prepare(`
      SELECT price FROM pricing_tiers
      WHERE venue_id = :venueId
        AND (:unitId IS NULL AND unit_id IS NULL OR unit_id = :unitId)
        AND shift = :shift
        AND is_seasonal = 0
        AND day_of_week IS NULL
      LIMIT 1
    `)
    .get({ venueId, unitId, shift }) as { price: number } | undefined;

  if (defaultRow && defaultRow.price !== null) {
    return defaultRow.price;
  }

  return null;
}
