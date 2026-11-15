import crypto from "crypto";
import { sqlite } from "../src/db";

export function seedVenues() {
  console.log("🌱 بدء إضافة بيانات المنشآت التجريبية في مأرب...");

  // فحص ما إذا كانت المنشآت موجودة بالفعل
  const existingCount = sqlite.prepare("SELECT COUNT(*) as count FROM venues").get() as { count: number };
  if (existingCount.count > 0) {
    console.log(`ℹ️ المنشآت موجودة بالفعل (${existingCount.count} منشأة).`);
    return;
  }

  // 1. إضافة التصنيفات
  const categories = [
    { id: "cat_weddings", slug: "wedding-halls", nameAr: "قاعات الأفراح والمناسبات", displayOrder: 1 },
    { id: "cat_chalets", slug: "chalets", nameAr: "شاليهات ومنتجعات خاصة", displayOrder: 2 },
    { id: "cat_resthouses", slug: "rest-houses", nameAr: "استراحات عائلية وشبابية", displayOrder: 3 },
    { id: "cat_conferences", slug: "conferences", nameAr: "قاعات مؤتمرات وندوات", displayOrder: 4 },
  ];

  const insertCat = sqlite.prepare(`
    INSERT OR IGNORE INTO venue_categories (id, slug, name_ar, display_order, is_active, created_at)
    VALUES (?, ?, ?, ?, 1, datetime('now'))
  `);
  for (const c of categories) {
    insertCat.run(c.id, c.slug, c.nameAr, c.displayOrder);
  }

  // 2. المرافق العامة
  const amenitiesList = [
    { id: "am_wifi", slug: "wifi", nameAr: "إنترنت واي فاي سريع", category: "general" },
    { id: "am_gen", slug: "generator", nameAr: "تغذية كهربائية ومولد مستمر", category: "general" },
    { id: "am_suite", slug: "bride-suite", nameAr: "جناح خاص للعروس", category: "hospitality" },
    { id: "am_park", slug: "parking", nameAr: "مواقف سيارات واسعة ومؤمنة", category: "general" },
    { id: "am_sound", slug: "sound-laser", nameAr: "أنظمة صوت وإضاءة احترافية", category: "entertainment" },
    { id: "am_pool", slug: "pool", nameAr: "مسبح خاص معقم", category: "entertainment" },
    { id: "am_ac", slug: "ac", nameAr: "تكييف مركزي متطور", category: "general" },
    { id: "am_kitchen", slug: "kitchen", nameAr: "مطبخ متكامل لخدمات الضيافة", category: "hospitality" },
  ];

  const insertAmenity = sqlite.prepare(`
    INSERT OR IGNORE INTO amenities (id, slug, name_ar, category, created_at)
    VALUES (?, ?, ?, ?, datetime('now'))
  `);
  for (const a of amenitiesList) {
    insertAmenity.run(a.id, a.slug, a.nameAr, a.category);
  }

  // 3. المنشآت
  const venuesList = [
    {
      id: "venue_balqees",
      categoryId: "cat_weddings",
      name: "قصر بلقيس الملكي للمناسبات الكبرى",
      slug: "qasr-balqees",
      description: "أرقى قاعات الأفراح والمناسبات في مدينة مأرب، تصاميم ملكية فخمة، قاعات فسيحة للرجال والنساء، تجهيزات صوت وإضاءة عالمية، ومواقف سيارات محروسة.",
      city: "مأرب",
      district: "المجمع - شارع الأربعين",
      contactPhone: "777123456",
      contactWhatsapp: "967777123456",
      featured: 1,
      currency: "YER",
      depositPct: 25,
      priceMorning: 180000,
      priceEvening: 280000,
      priceFull: 420000,
      capacityMax: 700,
      imageCover: "https://images.unsplash.com/photo-1519167758481-83f550bb49b3?auto=format&fit=crop&w=1200&q=80",
      amenities: ["am_wifi", "am_gen", "am_suite", "am_park", "am_sound", "am_ac"],
    },
    {
      id: "venue_waha_saba",
      categoryId: "cat_chalets",
      name: "شاليهات واحة سبأ الفندقية",
      slug: "waha-saba-chalets",
      description: "شاليهات استجمام فاخرة وخصوصية تامة، مسابح خاصة للأطفال والكبار، مسطحات خضراء، جلسات عريش يمنية أصيلة، ومنطقة شواء متكاملة.",
      city: "مأرب",
      district: "جو النسيم",
      contactPhone: "771987654",
      contactWhatsapp: "967771987654",
      featured: 1,
      currency: "YER",
      depositPct: 20,
      priceMorning: 80000,
      priceEvening: 130000,
      priceFull: 190000,
      capacityMax: 90,
      imageCover: "https://images.unsplash.com/photo-1580587771525-78b9dba3b914?auto=format&fit=crop&w=1200&q=80",
      amenities: ["am_wifi", "am_gen", "am_pool", "am_kitchen", "am_park", "am_ac"],
    },
    {
      id: "venue_laylati",
      categoryId: "cat_weddings",
      name: "قاعة ليلتي الكبرى للأفراح",
      slug: "laylati-hall",
      description: "قاعة راقية متكاملة الخدمات للأعراس والمناسبات السعيدة، ديكورات عصرية، كوشة فاخرة، ممر عروس مميز، وأطقم ضيافة متكاملة.",
      city: "مأرب",
      district: "الروضة",
      contactPhone: "773456789",
      contactWhatsapp: "967773456789",
      featured: 1,
      currency: "YER",
      depositPct: 25,
      priceMorning: 140000,
      priceEvening: 230000,
      priceFull: 340000,
      capacityMax: 500,
      imageCover: "https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?auto=format&fit=crop&w=1200&q=80",
      amenities: ["am_wifi", "am_gen", "am_suite", "am_sound", "am_park", "am_ac"],
    },
    {
      id: "venue_asateer",
      categoryId: "cat_conferences",
      name: "قاعة الأساطير للمؤتمرات والفعاليات",
      slug: "asateer-conference",
      description: "مركز الفعاليات والمؤتمرات الأول في مأرب، مجهز بشاشات عملاقة، منصات متحدثين، أنظمة ترجمة صوتية، وإنترنت فضائي فائق السرعة.",
      city: "مأرب",
      district: "شارع المحافظة",
      contactPhone: "775112233",
      contactWhatsapp: "967775112233",
      featured: 1,
      currency: "YER",
      depositPct: 30,
      priceMorning: 120000,
      priceEvening: 180000,
      priceFull: 260000,
      capacityMax: 350,
      imageCover: "https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&w=1200&q=80",
      amenities: ["am_wifi", "am_gen", "am_sound", "am_ac", "am_park"],
    },
    {
      id: "venue_nakheel",
      categoryId: "cat_resthouses",
      name: "استراحة النخيل العائلية",
      slug: "nakheel-resthouse",
      description: "استراحة مميزة للمناسبات العائلية واجتماعات الأعياد والأصدقاء، مسطحات خضراء، ألعاب أطفال، جلسات عربية مريحة، وأجواء هادئة.",
      city: "مأرب",
      district: "الفاو",
      contactPhone: "770889900",
      contactWhatsapp: "967770889900",
      featured: 0,
      currency: "YER",
      depositPct: 20,
      priceMorning: 60000,
      priceEvening: 95000,
      priceFull: 140000,
      capacityMax: 150,
      imageCover: "https://images.unsplash.com/photo-1540541338287-41700207dee6?auto=format&fit=crop&w=1200&q=80",
      amenities: ["am_gen", "am_kitchen", "am_park", "am_pool"],
    },
    {
      id: "venue_resort_saba",
      categoryId: "cat_chalets",
      name: "منتجع وادي سبأ الترفيهي",
      slug: "wadi-saba-resort",
      description: "منتجع سياحي فاخر يجمع بين الهدوء والرفاهية، مسابح أولمبية، صالات ضيافة واسعة، إطلالات خلابة، وخدمات VIP متكاملة.",
      city: "مأرب",
      district: "كرى",
      contactPhone: "772334455",
      contactWhatsapp: "967772334455",
      featured: 1,
      currency: "YER",
      depositPct: 25,
      priceMorning: 100000,
      priceEvening: 170000,
      priceFull: 250000,
      capacityMax: 220,
      imageCover: "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1200&q=80",
      amenities: ["am_wifi", "am_gen", "am_pool", "am_sound", "am_ac", "am_park", "am_kitchen"],
    },
  ];

  for (const v of venuesList) {
    sqlite
      .prepare(`
        INSERT OR IGNORE INTO venues (
          id, category_id, name, slug, description, city, district,
          contact_phone, contact_whatsapp, status, default_currency,
          default_deposit_percentage, has_multiple_units, featured,
          created_at, updated_at
        ) VALUES (
          ?, ?, ?, ?, ?, ?, ?,
          ?, ?, 'active', ?,
          ?, 1, ?,
          datetime('now'), datetime('now')
        )
      `)
      .run(
        v.id,
        v.categoryId,
        v.name,
        v.slug,
        v.description,
        v.city,
        v.district,
        v.contactPhone,
        v.contactWhatsapp,
        v.currency,
        v.depositPct,
        v.featured
      );

    // إضافة أقسام المنشأة
    const unitWomenId = `${v.id}_unit_women`;
    const unitMenId = `${v.id}_unit_men`;

    sqlite
      .prepare(`
        INSERT OR IGNORE INTO venue_units (id, venue_id, name, unit_type, capacity_min, capacity_max, is_active, created_at, updated_at)
        VALUES 
          (?, ?, 'قسم النساء الرئيسي', 'women_section', 30, ?, 1, datetime('now'), datetime('now')),
          (?, ?, 'قسم الرجال والضيوف', 'men_section', 30, ?, 1, datetime('now'), datetime('now'))
      `)
      .run(
        unitWomenId, v.id, Math.round(v.capacityMax * 0.6),
        unitMenId, v.id, Math.round(v.capacityMax * 0.4)
      );

    // أسعار الفترات لكامل المنشأة
    sqlite
      .prepare(`
        INSERT OR IGNORE INTO pricing_tiers (id, venue_id, unit_id, shift, is_seasonal, price, currency, created_at)
        VALUES 
          (?, ?, NULL, 'morning', 0, ?, ?, datetime('now')),
          (?, ?, NULL, 'evening', 0, ?, ?, datetime('now')),
          (?, ?, NULL, 'full_day', 0, ?, ?, datetime('now'))
      `)
      .run(
        `${v.id}_pt_m`, v.id, v.priceMorning, v.currency,
        `${v.id}_pt_e`, v.id, v.priceEvening, v.currency,
        `${v.id}_pt_f`, v.id, v.priceFull, v.currency
      );

    // صور المنشأة
    sqlite
      .prepare(`
        INSERT OR IGNORE INTO venue_images (id, venue_id, image_url, storage_path, storage_type, is_cover, display_order, created_at)
        VALUES (?, ?, ?, ?, 'local', 1, 0, datetime('now'))
      `)
      .run(crypto.randomUUID(), v.id, v.imageCover, v.imageCover);

    // ربط المرافق
    const insertVenueAmenity = sqlite.prepare(`
      INSERT OR IGNORE INTO venue_amenities (venue_id, amenity_id, is_free, additional_price, currency, created_at)
      VALUES (?, ?, 1, 0, 'YER', datetime('now'))
    `);
    for (const amId of v.amenities) {
      insertVenueAmenity.run(v.id, amId);
    }
  }

  console.log("✅ تمت إضافة 6 منشآت واقعية في مأرب بنجاح مع كافة الأقسام والأسعار والمرافق!");
}

seedVenues();
