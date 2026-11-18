import { client } from "@/db";
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
export async function calculateBookingPrice(
  params: {
    venueId: string;
    isFullVenue: boolean;
    unitIds: string[];
    eventDate: string; // YYYY-MM-DD
    shift: BookingShift;
    extraAmenityIds?: string[];
  }
): Promise<PricingCalculationResult> {
  const { venueId, isFullVenue, unitIds, eventDate, shift, extraAmenityIds = [] } = params;

  // استخراج يوم الأسبوع من التاريخ (0: الأحد .. 6: السبت)
  const dateObj = new Date(`${eventDate}T00:00:00Z`);
  const dayOfWeek = dateObj.getUTCDay();

  // جلب إعدادات العملة والعربون الافتراضي من المنشأة
  const [venueRow] = await client<{ default_currency: CurrencyType; default_deposit_percentage: number }[]>`
    SELECT default_currency, default_deposit_percentage FROM venues WHERE id = ${venueId}
  `;

  if (!venueRow) {
    throw new Error(`VENUE_NOT_FOUND: Venue ${venueId} does not exist`);
  }

  const currency = venueRow.default_currency || "YER";
  const depositPercentage = venueRow.default_deposit_percentage || 25;

  const items: ResolvedPriceItem[] = [];

  if (isFullVenue) {
    // 1. حساب السعر الشامل لكامل المنشأة وفق سلم الأولويات
    const fullVenuePrice = await resolveTierPrice({
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
      const [unitRow] = await client<{ name: string }[]>`
        SELECT name FROM venue_units WHERE id = ${unitId}
      `;

      const unitName = unitRow?.name || `قسم ${unitId}`;
      const unitPrice = await resolveTierPrice({
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
    const extraRows = await client<Array<{
      amenity_id: string;
      additional_price: number;
      is_free: boolean;
      name_ar: string;
    }>>`
      SELECT va.amenity_id, va.additional_price, va.is_free, a.name_ar 
      FROM venue_amenities va
      JOIN amenities a ON a.id = va.amenity_id
      WHERE va.venue_id = ${venueId} AND va.amenity_id = ANY(${extraAmenityIds})
    `;

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
 * 2. سعر موسمي (is_seasonal = true)
 * 3. سعر يوم أسبوع (day_of_week)
 * 4. سعر عام افتراضي (day_of_week IS NULL)
 */
async function resolveTierPrice(
  params: {
    venueId: string;
    unitId: string | null;
    eventDate: string;
    shift: BookingShift;
    dayOfWeek: number;
  }
): Promise<number | null> {
  const { venueId, unitId, eventDate, shift, dayOfWeek } = params;

  // 1. استثناء إتاحة وسعر مخصص (venue_availability)
  const [overrideRow] = await client<{ custom_price: number }[]>`
    SELECT custom_price FROM venue_availability
    WHERE venue_id = ${venueId} 
      AND (${unitId}::text IS NULL AND unit_id IS NULL OR unit_id = ${unitId})
      AND override_date = ${eventDate}
      AND shift = ${shift}
      AND custom_price IS NOT NULL
    LIMIT 1
  `;

  if (overrideRow && overrideRow.custom_price !== null) {
    return Number(overrideRow.custom_price);
  }

  // 2. سعر موسمي (pricing_tiers مع is_seasonal = true)
  const [seasonalRow] = await client<{ price: number }[]>`
    SELECT price FROM pricing_tiers
    WHERE venue_id = ${venueId}
      AND (${unitId}::text IS NULL AND unit_id IS NULL OR unit_id = ${unitId})
      AND shift = ${shift}
      AND is_seasonal = true
      AND ${eventDate} >= season_start
      AND ${eventDate} <= season_end
    LIMIT 1
  `;

  if (seasonalRow && seasonalRow.price !== null) {
    return Number(seasonalRow.price);
  }

  // 3. سعر يوم محدد من الأسبوع (pricing_tiers مع day_of_week)
  const [dowRow] = await client<{ price: number }[]>`
    SELECT price FROM pricing_tiers
    WHERE venue_id = ${venueId}
      AND (${unitId}::text IS NULL AND unit_id IS NULL OR unit_id = ${unitId})
      AND shift = ${shift}
      AND is_seasonal = false
      AND day_of_week = ${dayOfWeek}
    LIMIT 1
  `;

  if (dowRow && dowRow.price !== null) {
    return Number(dowRow.price);
  }

  // 4. سعر عام افتراضي للفترة (pricing_tiers مع day_of_week IS NULL)
  const [defaultRow] = await client<{ price: number }[]>`
    SELECT price FROM pricing_tiers
    WHERE venue_id = ${venueId}
      AND (${unitId}::text IS NULL AND unit_id IS NULL OR unit_id = ${unitId})
      AND shift = ${shift}
      AND is_seasonal = false
      AND day_of_week IS NULL
    LIMIT 1
  `;

  if (defaultRow && defaultRow.price !== null) {
    return Number(defaultRow.price);
  }

  // 5. في حال عدم وجود تسعيرة مطابقة تماماً للوحدة، جلب التسعيرة الافتراضية للمنشأة
  const [fallbackRow] = await client<{ price: number }[]>`
    SELECT price FROM pricing_tiers
    WHERE venue_id = ${venueId}
      AND shift = ${shift}
    ORDER BY is_default DESC
    LIMIT 1
  `;

  if (fallbackRow && fallbackRow.price !== null) {
    return Number(fallbackRow.price);
  }

  return null;
}
