import {
  sqliteTable,
  text,
  integer,
  real,
  primaryKey,
  uniqueIndex,
  index,
} from "drizzle-orm/sqlite-core";
import { relations } from "drizzle-orm";

// ==============================================================================
// 1. المستخدمون والمصادقة المحلية (Users & Local Auth)
// ==============================================================================
export const users = sqliteTable(
  "users",
  {
    id: text("id").primaryKey(), // UUID
    email: text("email").unique(),
    phone: text("phone").unique(),
    passwordHash: text("password_hash"),
    fullName: text("full_name").notNull(),
    role: text("role", { enum: ["customer", "owner", "admin"] })
      .notNull()
      .default("customer"),
    avatarUrl: text("avatar_url"),
    isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
    failedLoginAttempts: integer("failed_login_attempts").notNull().default(0),
    lockoutUntil: text("lockout_until"),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (table) => [
    index("idx_users_role").on(table.role),
    index("idx_users_email").on(table.email),
    index("idx_users_phone").on(table.phone),
  ]
);

// جلسات المصادقة (Auth Sessions)
export const sessions = sqliteTable(
  "sessions",
  {
    id: text("id").primaryKey(), // Session token / ID
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    expiresAt: text("expires_at").notNull(),
    createdAt: text("created_at").notNull(),
  },
  (table) => [
    index("idx_sessions_user").on(table.userId),
    index("idx_sessions_expires").on(table.expiresAt),
  ]
);

// سجل حماية محاولات تسجيل الدخول وتحديد المعدل (Rate Limiting)
export const authRateLimits = sqliteTable("auth_rate_limits", {
  key: text("key").primaryKey(), // ip:xxx or ident:xxx
  attempts: integer("attempts").notNull().default(0),
  lastAttemptAt: text("last_attempt_at").notNull(),
  lockoutUntil: text("lockout_until"),
});

// ==============================================================================
// 2. تصنيفات المنشآت وسياستها (Categories & Policies)
// ==============================================================================
export const venueCategories = sqliteTable("venue_categories", {
  id: text("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  nameAr: text("name_ar").notNull(),
  descriptionAr: text("description_ar"),
  displayOrder: integer("display_order").notNull().default(0),
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
  createdAt: text("created_at").notNull(),
});

export const cancellationPolicies = sqliteTable("cancellation_policies", {
  id: text("id").primaryKey(),
  nameAr: text("name_ar").notNull(),
  descriptionAr: text("description_ar").notNull(),
  rules: text("rules").notNull().default("[]"), // JSON string
  createdAt: text("created_at").notNull(),
});

// ==============================================================================
// 3. المنشآت والوحدات والأعضاء (Venues, Units, Members)
// ==============================================================================
export const venues = sqliteTable(
  "venues",
  {
    id: text("id").primaryKey(),
    categoryId: text("category_id")
      .notNull()
      .references(() => venueCategories.id, { onDelete: "restrict" }),
    name: text("name").notNull(),
    slug: text("slug").notNull().unique(),
    description: text("description"),
    city: text("city").notNull().default("مأرب"),
    district: text("district").notNull(),
    addressDetails: text("address_details"),
    latitude: real("latitude"),
    longitude: real("longitude"),
    contactPhone: text("contact_phone").notNull(),
    contactWhatsapp: text("contact_whatsapp"),
    status: text("status", {
      enum: ["draft", "pending_verification", "active", "suspended", "archived"],
    })
      .notNull()
      .default("draft"),
    cancellationPolicyId: text("cancellation_policy_id").references(
      () => cancellationPolicies.id,
      { onDelete: "set null" }
    ),
    defaultCurrency: text("default_currency", {
      enum: ["YER", "SAR", "USD"],
    })
      .notNull()
      .default("YER"),
    defaultDepositPercentage: real("default_deposit_percentage")
      .notNull()
      .default(30.0),
    hasMultipleUnits: integer("has_multiple_units", { mode: "boolean" })
      .notNull()
      .default(false),
    featured: integer("featured", { mode: "boolean" }).notNull().default(false),
    deletedAt: text("deleted_at"),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (table) => [
    index("idx_venues_category").on(table.categoryId),
    index("idx_venues_status").on(table.status),
    index("idx_venues_city_district").on(table.city, table.district),
  ]
);

export const venueUnits = sqliteTable(
  "venue_units",
  {
    id: text("id").primaryKey(),
    venueId: text("venue_id")
      .notNull()
      .references(() => venues.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    unitType: text("unit_type", {
      enum: [
        "women_section",
        "men_section",
        "dining_hall",
        "full_venue",
        "chalet_unit",
      ],
    }).notNull(),
    capacityMin: integer("capacity_min").notNull().default(0),
    capacityMax: integer("capacity_max").notNull(),
    isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
    deletedAt: text("deleted_at"),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (table) => [
    index("idx_venue_units_venue").on(table.venueId),
    index("idx_venue_units_type").on(table.unitType),
  ]
);

export const venueMembers = sqliteTable(
  "venue_members",
  {
    id: text("id").primaryKey(),
    venueId: text("venue_id")
      .notNull()
      .references(() => venues.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    role: text("role", {
      enum: ["primary_owner", "co_owner", "manager", "receptionist"],
    }).notNull(),
    permissions: text("permissions").notNull().default("{}"), // JSON
    createdAt: text("created_at").notNull(),
  },
  (table) => [
    uniqueIndex("idx_venue_members_venue_user").on(table.venueId, table.userId),
    index("idx_venue_members_user").on(table.userId),
  ]
);

// ==============================================================================
// 4. خطط الأسعار والإتاحة المخصصة (Pricing & Availability)
// ==============================================================================
export const venueAvailability = sqliteTable(
  "venue_availability",
  {
    id: text("id").primaryKey(),
    venueId: text("venue_id")
      .notNull()
      .references(() => venues.id, { onDelete: "cascade" }),
    unitId: text("unit_id").references(() => venueUnits.id, {
      onDelete: "cascade",
    }),
    overrideDate: text("override_date").notNull(), // YYYY-MM-DD
    shift: text("shift", {
      enum: ["morning", "evening", "full_day"],
    }).notNull(),
    isBlocked: integer("is_blocked", { mode: "boolean" })
      .notNull()
      .default(false),
    blockReason: text("block_reason"),
    customPrice: real("custom_price"),
    currency: text("currency", {
      enum: ["YER", "SAR", "USD"],
    })
      .notNull()
      .default("YER"),
    createdBy: text("created_by").references(() => users.id, {
      onDelete: "set null",
    }),
    createdAt: text("created_at").notNull(),
  },
  (table) => [
    index("idx_venue_availability_lookup").on(
      table.venueId,
      table.unitId,
      table.overrideDate,
      table.shift
    ),
  ]
);

export const pricingTiers = sqliteTable(
  "pricing_tiers",
  {
    id: text("id").primaryKey(),
    venueId: text("venue_id")
      .notNull()
      .references(() => venues.id, { onDelete: "cascade" }),
    unitId: text("unit_id").references(() => venueUnits.id, {
      onDelete: "cascade",
    }),
    shift: text("shift", {
      enum: ["morning", "evening", "full_day"],
    }).notNull(),
    dayOfWeek: integer("day_of_week"), // 0: Sunday .. 6: Saturday
    isSeasonal: integer("is_seasonal", { mode: "boolean" })
      .notNull()
      .default(false),
    seasonStart: text("season_start"),
    seasonEnd: text("season_end"),
    price: real("price").notNull(),
    currency: text("currency", {
      enum: ["YER", "SAR", "USD"],
    })
      .notNull()
      .default("YER"),
    createdAt: text("created_at").notNull(),
  },
  (table) => [
    index("idx_pricing_tiers_lookup").on(
      table.venueId,
      table.unitId,
      table.shift
    ),
  ]
);

// ==============================================================================
// 5. المرافق والخدمات (Amenities)
// ==============================================================================
export const amenities = sqliteTable("amenities", {
  id: text("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  nameAr: text("name_ar").notNull(),
  iconName: text("icon_name"),
  category: text("category", {
    enum: ["general", "entertainment", "hospitality"],
  }).notNull(),
  createdAt: text("created_at").notNull(),
});

export const venueAmenities = sqliteTable(
  "venue_amenities",
  {
    venueId: text("venue_id")
      .notNull()
      .references(() => venues.id, { onDelete: "cascade" }),
    amenityId: text("amenity_id")
      .notNull()
      .references(() => amenities.id, { onDelete: "cascade" }),
    isFree: integer("is_free", { mode: "boolean" }).notNull().default(true),
    additionalPrice: real("additional_price").notNull().default(0.0),
    currency: text("currency", {
      enum: ["YER", "SAR", "USD"],
    })
      .notNull()
      .default("YER"),
    createdAt: text("created_at").notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.venueId, table.amenityId] }),
  ]
);

// ==============================================================================
// 6. الحجوزات والفتحات المحجوزة (Bookings & Slots)
// ==============================================================================
export const bookings = sqliteTable(
  "bookings",
  {
    id: text("id").primaryKey(),
    bookingReference: text("booking_reference").notNull().unique(),
    idempotencyKey: text("idempotency_key"),
    venueId: text("venue_id")
      .notNull()
      .references(() => venues.id, { onDelete: "restrict" }),
    customerId: text("customer_id").references(() => users.id, {
      onDelete: "restrict",
    }),
    bookingSource: text("booking_source", {
      enum: ["online", "manual_owner"],
    })
      .notNull()
      .default("online"),
    isFullVenue: integer("is_full_venue", { mode: "boolean" })
      .notNull()
      .default(false),
    eventType: text("event_type", {
      enum: [
        "wedding",
        "engagement",
        "seminar",
        "family_gathering",
        "recreation",
        "other",
      ],
    }).notNull(),
    guestCount: integer("guest_count").notNull(),
    eventDate: text("event_date").notNull(), // YYYY-MM-DD
    shift: text("shift", {
      enum: ["morning", "evening", "full_day"],
    }).notNull(),
    timeSlotStart: text("time_slot_start").notNull(), // ISO String
    timeSlotEnd: text("time_slot_end").notNull(), // ISO String
    status: text("status", {
      enum: [
        "pending_payment",
        "pending_owner_approval",
        "confirmed",
        "completed",
        "cancelled_by_customer",
        "cancelled_by_owner",
        "expired",
        "rejected",
        "owner_review_timed_out",
      ],
    })
      .notNull()
      .default("pending_payment"),
    totalAmount: real("total_amount").notNull(),
    depositAmount: real("deposit_amount").notNull(),
    currency: text("currency", {
      enum: ["YER", "SAR", "USD"],
    })
      .notNull()
      .default("YER"),
    cancellationPolicySnapshot: text("cancellation_policy_snapshot")
      .notNull()
      .default("{}"), // JSON
    customerNotes: text("customer_notes"),
    ownerPrivateNotes: text("owner_private_notes"),
    expiresAt: text("expires_at"),
    ownerReviewExpiresAt: text("owner_review_expires_at"),
    adminEscalationExpiresAt: text("admin_escalation_expires_at"),
    confirmedAt: text("confirmed_at"),
    completedAt: text("completed_at"),
    cancelledAt: text("cancelled_at"),
    cancellationReason: text("cancellation_reason"),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (table) => [
    uniqueIndex("idx_bookings_customer_idempotency").on(
      table.customerId,
      table.idempotencyKey
    ),
    index("idx_bookings_venue_date").on(table.venueId, table.eventDate),
    index("idx_bookings_status").on(table.status),
    index("idx_bookings_customer").on(table.customerId),
  ]
);

export const bookingRequestedUnits = sqliteTable(
  "booking_requested_units",
  {
    id: text("id").primaryKey(),
    bookingId: text("booking_id")
      .notNull()
      .references(() => bookings.id, { onDelete: "cascade" }),
    venueId: text("venue_id")
      .notNull()
      .references(() => venues.id, { onDelete: "cascade" }),
    unitId: text("unit_id")
      .notNull()
      .references(() => venueUnits.id, { onDelete: "restrict" }),
    createdAt: text("created_at").notNull(),
  },
  (table) => [
    uniqueIndex("idx_booking_requested_units_unique").on(
      table.bookingId,
      table.unitId
    ),
    index("idx_booking_requested_units_lookup").on(
      table.bookingId,
      table.venueId
    ),
  ]
);

// الفتحات المحجوزة لمنع التضارب وحماية التزامن
export const bookingSlots = sqliteTable(
  "booking_slots",
  {
    id: text("id").primaryKey(),
    bookingId: text("booking_id")
      .notNull()
      .references(() => bookings.id, { onDelete: "cascade" }),
    venueId: text("venue_id")
      .notNull()
      .references(() => venues.id, { onDelete: "cascade" }),
    unitId: text("unit_id")
      .notNull()
      .references(() => venueUnits.id, { onDelete: "restrict" }),
    eventDate: text("event_date").notNull(),
    shift: text("shift", {
      enum: ["morning", "evening", "full_day"],
    }).notNull(),
    timeSlotStart: text("time_slot_start").notNull(),
    timeSlotEnd: text("time_slot_end").notNull(),
    status: text("status").notNull(), // Active statuses lock the slot
    createdAt: text("created_at").notNull(),
  },
  (table) => [
    index("idx_booking_slots_unit_conflict").on(
      table.unitId,
      table.eventDate,
      table.shift,
      table.status
    ),
    index("idx_booking_slots_booking").on(table.bookingId),
  ]
);

// ==============================================================================
// 6.1. سجل المدفوعات وأحداث الـ Webhooks (Payments & Webhook Events)
// ==============================================================================
export const payments = sqliteTable(
  "payments",
  {
    id: text("id").primaryKey(),
    bookingId: text("booking_id")
      .notNull()
      .references(() => bookings.id, { onDelete: "restrict" }),
    provider: text("provider", {
      enum: ["kuraimi", "onecash", "floosak", "stripe", "bank_transfer", "mock"],
    }).notNull(),
    providerTransactionId: text("provider_transaction_id").notNull(),
    amount: real("amount").notNull(),
    currency: text("currency", {
      enum: ["YER", "SAR", "USD"],
    })
      .notNull()
      .default("YER"),
    status: text("status", {
      enum: ["initiated", "completed", "failed", "refunded", "requires_review"],
    })
      .notNull()
      .default("initiated"),
    reviewReason: text("review_reason"),
    metadata: text("metadata").notNull().default("{}"), // JSON
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (table) => [
    uniqueIndex("idx_payments_provider_tx").on(
      table.provider,
      table.providerTransactionId
    ),
    index("idx_payments_booking").on(table.bookingId),
    index("idx_payments_status").on(table.status),
  ]
);

export const webhookEvents = sqliteTable(
  "webhook_events",
  {
    id: text("id").primaryKey(),
    provider: text("provider").notNull(),
    eventId: text("event_id").notNull(),
    eventType: text("event_type").notNull(),
    payload: text("payload").notNull(), // Raw JSON payload
    status: text("status", {
      enum: ["pending", "processed", "failed", "duplicate", "ignored"],
    })
      .notNull()
      .default("pending"),
    errorMessage: text("error_message"),
    processedAt: text("processed_at"),
    createdAt: text("created_at").notNull(),
  },
  (table) => [
    uniqueIndex("idx_webhook_events_provider_event").on(
      table.provider,
      table.eventId
    ),
    index("idx_webhook_events_status").on(table.status),
  ]
);

export const bookingGuestDetails = sqliteTable("booking_guest_details", {
  bookingId: text("booking_id")
    .primaryKey()
    .references(() => bookings.id, { onDelete: "cascade" }),
  guestName: text("guest_name").notNull(),
  guestPhone: text("guest_phone").notNull(),
  notes: text("notes"),
  createdAt: text("created_at").notNull(),
});

export const bookingPriceItems = sqliteTable(
  "booking_price_items",
  {
    id: text("id").primaryKey(),
    bookingId: text("booking_id")
      .notNull()
      .references(() => bookings.id, { onDelete: "cascade" }),
    itemType: text("item_type", {
      enum: [
        "unit_rate",
        "full_venue_rate",
        "extra_service",
        "discount",
        "custom_override",
      ],
    }).notNull(),
    descriptionAr: text("description_ar").notNull(),
    unitPrice: real("unit_price").notNull(),
    quantity: integer("quantity").notNull().default(1),
    totalPrice: real("total_price").notNull(),
    currency: text("currency", {
      enum: ["YER", "SAR", "USD"],
    })
      .notNull()
      .default("YER"),
    createdAt: text("created_at").notNull(),
  },
  (table) => [index("idx_booking_price_items_booking").on(table.bookingId)]
);

export const bookingExtras = sqliteTable(
  "booking_extras",
  {
    id: text("id").primaryKey(),
    bookingId: text("booking_id")
      .notNull()
      .references(() => bookings.id, { onDelete: "cascade" }),
    amenityId: text("amenity_id").references(() => amenities.id, {
      onDelete: "set null",
    }),
    nameAr: text("name_ar").notNull(),
    unitPrice: real("unit_price").notNull(),
    quantity: integer("quantity").notNull().default(1),
    totalPrice: real("total_price").notNull(),
    currency: text("currency", {
      enum: ["YER", "SAR", "USD"],
    })
      .notNull()
      .default("YER"),
    createdAt: text("created_at").notNull(),
  },
  (table) => [index("idx_booking_extras_booking").on(table.bookingId)]
);

export const bookingAuditLogs = sqliteTable(
  "booking_audit_logs",
  {
    id: text("id").primaryKey(),
    bookingId: text("booking_id")
      .notNull()
      .references(() => bookings.id, { onDelete: "cascade" }),
    actorId: text("actor_id").references(() => users.id, {
      onDelete: "set null",
    }),
    fromStatus: text("from_status"),
    toStatus: text("to_status").notNull(),
    actionDescription: text("action_description").notNull(),
    payload: text("payload").notNull().default("{}"), // JSON
    createdAt: text("created_at").notNull(),
  },
  (table) => [index("idx_booking_audit_logs_booking").on(table.bookingId)]
);

// ==============================================================================
// 7. إدارة الصور والوسائط (Media & File Storage - Portable)
// ==============================================================================
export const venueImages = sqliteTable(
  "venue_images",
  {
    id: text("id").primaryKey(),
    venueId: text("venue_id")
      .notNull()
      .references(() => venues.id, { onDelete: "cascade" }),
    unitId: text("unit_id").references(() => venueUnits.id, {
      onDelete: "cascade",
    }),
    imageUrl: text("image_url").notNull(),
    storagePath: text("storage_path").notNull(),
    storageType: text("storage_type", {
      enum: ["local", "s3", "r2"],
    })
      .notNull()
      .default("local"),
    altText: text("alt_text"),
    isCover: integer("is_cover", { mode: "boolean" }).notNull().default(false),
    displayOrder: integer("display_order").notNull().default(0),
    createdAt: text("created_at").notNull(),
  },
  (table) => [
    index("idx_venue_images_venue").on(table.venueId),
    index("idx_venue_images_unit").on(table.unitId),
  ]
);

// ==============================================================================
// 8. التقييمات والمراجعات (Reviews & Ratings)
// ==============================================================================
export const reviews = sqliteTable(
  "reviews",
  {
    id: text("id").primaryKey(),
    venueId: text("venue_id")
      .notNull()
      .references(() => venues.id, { onDelete: "cascade" }),
    bookingId: text("booking_id").references(() => bookings.id, {
      onDelete: "set null",
    }),
    customerId: text("customer_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    rating: integer("rating").notNull(), // 1 to 5
    cleanlinessRating: integer("cleanliness_rating"),
    serviceRating: integer("service_rating"),
    comment: text("comment"),
    isApproved: integer("is_approved", { mode: "boolean" })
      .notNull()
      .default(true),
    ownerReply: text("owner_reply"),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (table) => [
    index("idx_reviews_venue").on(table.venueId),
    index("idx_reviews_customer").on(table.customerId),
  ]
);

// ==============================================================================
// 9. المفضلة (Favorites)
// ==============================================================================
export const favorites = sqliteTable(
  "favorites",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    venueId: text("venue_id")
      .notNull()
      .references(() => venues.id, { onDelete: "cascade" }),
    createdAt: text("created_at").notNull(),
  },
  (table) => [
    uniqueIndex("idx_favorites_user_venue").on(table.userId, table.venueId),
    index("idx_favorites_user").on(table.userId),
  ]
);

// ==============================================================================
// 10. الإشعارات (Notifications)
// ==============================================================================
export const notifications = sqliteTable(
  "notifications",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    message: text("message").notNull(),
    type: text("type", {
      enum: ["booking_status", "payment", "reminder", "system"],
    })
      .notNull()
      .default("system"),
    isRead: integer("is_read", { mode: "boolean" }).notNull().default(false),
    actionUrl: text("action_url"),
    createdAt: text("created_at").notNull(),
  },
  (table) => [
    index("idx_notifications_user_read").on(table.userId, table.isRead),
  ]
);

// ==============================================================================
// 11. علاقات Drizzle (Relations)
// ==============================================================================
export const usersRelations = relations(users, ({ many }) => ({
  sessions: many(sessions),
  venueMembers: many(venueMembers),
  bookings: many(bookings),
  reviews: many(reviews),
  favorites: many(favorites),
  notifications: many(notifications),
}));

export const venuesRelations = relations(venues, ({ one, many }) => ({
  category: one(venueCategories, {
    fields: [venues.categoryId],
    references: [venueCategories.id],
  }),
  cancellationPolicy: one(cancellationPolicies, {
    fields: [venues.cancellationPolicyId],
    references: [cancellationPolicies.id],
  }),
  units: many(venueUnits),
  members: many(venueMembers),
  availability: many(venueAvailability),
  pricingTiers: many(pricingTiers),
  venueAmenities: many(venueAmenities),
  images: many(venueImages),
  bookings: many(bookings),
  reviews: many(reviews),
  favorites: many(favorites),
}));

export const venueUnitsRelations = relations(venueUnits, ({ one, many }) => ({
  venue: one(venues, {
    fields: [venueUnits.venueId],
    references: [venues.id],
  }),
  availability: many(venueAvailability),
  pricingTiers: many(pricingTiers),
  images: many(venueImages),
  bookingSlots: many(bookingSlots),
}));

export const bookingsRelations = relations(bookings, ({ one, many }) => ({
  venue: one(venues, {
    fields: [bookings.venueId],
    references: [venues.id],
  }),
  customer: one(users, {
    fields: [bookings.customerId],
    references: [users.id],
  }),
  requestedUnits: many(bookingRequestedUnits),
  slots: many(bookingSlots),
  guestDetails: one(bookingGuestDetails, {
    fields: [bookings.id],
    references: [bookingGuestDetails.bookingId],
  }),
  priceItems: many(bookingPriceItems),
  extras: many(bookingExtras),
  auditLogs: many(bookingAuditLogs),
  payments: many(payments),
  review: one(reviews, {
    fields: [bookings.id],
    references: [reviews.bookingId],
  }),
}));

export const paymentsRelations = relations(payments, ({ one }) => ({
  booking: one(bookings, {
    fields: [payments.bookingId],
    references: [bookings.id],
  }),
}));

// ==============================================================================
// 12. استخراج الأنواع (Inferred Types)
// ==============================================================================
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export type Session = typeof sessions.$inferSelect;
export type NewSession = typeof sessions.$inferInsert;

export type VenueCategory = typeof venueCategories.$inferSelect;
export type NewVenueCategory = typeof venueCategories.$inferInsert;

export type CancellationPolicy = typeof cancellationPolicies.$inferSelect;
export type NewCancellationPolicy = typeof cancellationPolicies.$inferInsert;

export type Venue = typeof venues.$inferSelect;
export type NewVenue = typeof venues.$inferInsert;

export type VenueUnit = typeof venueUnits.$inferSelect;
export type NewVenueUnit = typeof venueUnits.$inferInsert;

export type VenueMember = typeof venueMembers.$inferSelect;
export type NewVenueMember = typeof venueMembers.$inferInsert;

export type VenueAvailability = typeof venueAvailability.$inferSelect;
export type NewVenueAvailability = typeof venueAvailability.$inferInsert;

export type PricingTier = typeof pricingTiers.$inferSelect;
export type NewPricingTier = typeof pricingTiers.$inferInsert;

export type Amenity = typeof amenities.$inferSelect;
export type NewAmenity = typeof amenities.$inferInsert;

export type VenueAmenity = typeof venueAmenities.$inferSelect;
export type NewVenueAmenity = typeof venueAmenities.$inferInsert;

export type Booking = typeof bookings.$inferSelect;
export type NewBooking = typeof bookings.$inferInsert;

export type BookingSlot = typeof bookingSlots.$inferSelect;
export type NewBookingSlot = typeof bookingSlots.$inferInsert;

export type BookingRequestedUnit = typeof bookingRequestedUnits.$inferSelect;
export type NewBookingRequestedUnit = typeof bookingRequestedUnits.$inferInsert;

export type BookingGuestDetail = typeof bookingGuestDetails.$inferSelect;
export type NewBookingGuestDetail = typeof bookingGuestDetails.$inferInsert;

export type BookingPriceItem = typeof bookingPriceItems.$inferSelect;
export type NewBookingPriceItem = typeof bookingPriceItems.$inferInsert;

export type BookingExtra = typeof bookingExtras.$inferSelect;
export type NewBookingExtra = typeof bookingExtras.$inferInsert;

export type BookingAuditLog = typeof bookingAuditLogs.$inferSelect;
export type NewBookingAuditLog = typeof bookingAuditLogs.$inferInsert;

export type Payment = typeof payments.$inferSelect;
export type NewPayment = typeof payments.$inferInsert;

export type WebhookEvent = typeof webhookEvents.$inferSelect;
export type NewWebhookEvent = typeof webhookEvents.$inferInsert;

export type VenueImage = typeof venueImages.$inferSelect;
export type NewVenueImage = typeof venueImages.$inferInsert;

export type Review = typeof reviews.$inferSelect;
export type NewReview = typeof reviews.$inferInsert;

export type Favorite = typeof favorites.$inferSelect;
export type NewFavorite = typeof favorites.$inferInsert;

export type Notification = typeof notifications.$inferSelect;
export type NewNotification = typeof notifications.$inferInsert;

export type AuthRateLimit = typeof authRateLimits.$inferSelect;
export type NewAuthRateLimit = typeof authRateLimits.$inferInsert;
