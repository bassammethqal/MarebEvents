CREATE TABLE `amenities` (
	`id` text PRIMARY KEY NOT NULL,
	`slug` text NOT NULL,
	`name_ar` text NOT NULL,
	`icon_name` text,
	`category` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `amenities_slug_unique` ON `amenities` (`slug`);--> statement-breakpoint
CREATE TABLE `booking_audit_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`booking_id` text NOT NULL,
	`actor_id` text,
	`from_status` text,
	`to_status` text NOT NULL,
	`action_description` text NOT NULL,
	`payload` text DEFAULT '{}' NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`booking_id`) REFERENCES `bookings`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`actor_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `idx_booking_audit_logs_booking` ON `booking_audit_logs` (`booking_id`);--> statement-breakpoint
CREATE TABLE `booking_extras` (
	`id` text PRIMARY KEY NOT NULL,
	`booking_id` text NOT NULL,
	`amenity_id` text,
	`name_ar` text NOT NULL,
	`unit_price` real NOT NULL,
	`quantity` integer DEFAULT 1 NOT NULL,
	`total_price` real NOT NULL,
	`currency` text DEFAULT 'YER' NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`booking_id`) REFERENCES `bookings`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`amenity_id`) REFERENCES `amenities`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `idx_booking_extras_booking` ON `booking_extras` (`booking_id`);--> statement-breakpoint
CREATE TABLE `booking_guest_details` (
	`booking_id` text PRIMARY KEY NOT NULL,
	`guest_name` text NOT NULL,
	`guest_phone` text NOT NULL,
	`notes` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`booking_id`) REFERENCES `bookings`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `booking_price_items` (
	`id` text PRIMARY KEY NOT NULL,
	`booking_id` text NOT NULL,
	`item_type` text NOT NULL,
	`description_ar` text NOT NULL,
	`unit_price` real NOT NULL,
	`quantity` integer DEFAULT 1 NOT NULL,
	`total_price` real NOT NULL,
	`currency` text DEFAULT 'YER' NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`booking_id`) REFERENCES `bookings`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_booking_price_items_booking` ON `booking_price_items` (`booking_id`);--> statement-breakpoint
CREATE TABLE `booking_requested_units` (
	`id` text PRIMARY KEY NOT NULL,
	`booking_id` text NOT NULL,
	`venue_id` text NOT NULL,
	`unit_id` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`booking_id`) REFERENCES `bookings`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`venue_id`) REFERENCES `venues`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`unit_id`) REFERENCES `venue_units`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_booking_requested_units_unique` ON `booking_requested_units` (`booking_id`,`unit_id`);--> statement-breakpoint
CREATE INDEX `idx_booking_requested_units_lookup` ON `booking_requested_units` (`booking_id`,`venue_id`);--> statement-breakpoint
CREATE TABLE `booking_slots` (
	`id` text PRIMARY KEY NOT NULL,
	`booking_id` text NOT NULL,
	`venue_id` text NOT NULL,
	`unit_id` text NOT NULL,
	`event_date` text NOT NULL,
	`shift` text NOT NULL,
	`time_slot_start` text NOT NULL,
	`time_slot_end` text NOT NULL,
	`status` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`booking_id`) REFERENCES `bookings`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`venue_id`) REFERENCES `venues`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`unit_id`) REFERENCES `venue_units`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE INDEX `idx_booking_slots_unit_conflict` ON `booking_slots` (`unit_id`,`event_date`,`shift`,`status`);--> statement-breakpoint
CREATE INDEX `idx_booking_slots_booking` ON `booking_slots` (`booking_id`);--> statement-breakpoint
CREATE TABLE `bookings` (
	`id` text PRIMARY KEY NOT NULL,
	`booking_reference` text NOT NULL,
	`idempotency_key` text,
	`venue_id` text NOT NULL,
	`customer_id` text,
	`booking_source` text DEFAULT 'online' NOT NULL,
	`is_full_venue` integer DEFAULT false NOT NULL,
	`event_type` text NOT NULL,
	`guest_count` integer NOT NULL,
	`event_date` text NOT NULL,
	`shift` text NOT NULL,
	`time_slot_start` text NOT NULL,
	`time_slot_end` text NOT NULL,
	`status` text DEFAULT 'pending_payment' NOT NULL,
	`total_amount` real NOT NULL,
	`deposit_amount` real NOT NULL,
	`currency` text DEFAULT 'YER' NOT NULL,
	`cancellation_policy_snapshot` text DEFAULT '{}' NOT NULL,
	`customer_notes` text,
	`owner_private_notes` text,
	`expires_at` text,
	`owner_review_expires_at` text,
	`admin_escalation_expires_at` text,
	`confirmed_at` text,
	`completed_at` text,
	`cancelled_at` text,
	`cancellation_reason` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`venue_id`) REFERENCES `venues`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`customer_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE UNIQUE INDEX `bookings_booking_reference_unique` ON `bookings` (`booking_reference`);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_bookings_customer_idempotency` ON `bookings` (`customer_id`,`idempotency_key`);--> statement-breakpoint
CREATE INDEX `idx_bookings_venue_date` ON `bookings` (`venue_id`,`event_date`);--> statement-breakpoint
CREATE INDEX `idx_bookings_status` ON `bookings` (`status`);--> statement-breakpoint
CREATE INDEX `idx_bookings_customer` ON `bookings` (`customer_id`);--> statement-breakpoint
CREATE TABLE `cancellation_policies` (
	`id` text PRIMARY KEY NOT NULL,
	`name_ar` text NOT NULL,
	`description_ar` text NOT NULL,
	`rules` text DEFAULT '[]' NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `favorites` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`venue_id` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`venue_id`) REFERENCES `venues`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_favorites_user_venue` ON `favorites` (`user_id`,`venue_id`);--> statement-breakpoint
CREATE INDEX `idx_favorites_user` ON `favorites` (`user_id`);--> statement-breakpoint
CREATE TABLE `notifications` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`title` text NOT NULL,
	`message` text NOT NULL,
	`type` text DEFAULT 'system' NOT NULL,
	`is_read` integer DEFAULT false NOT NULL,
	`action_url` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_notifications_user_read` ON `notifications` (`user_id`,`is_read`);--> statement-breakpoint
CREATE TABLE `pricing_tiers` (
	`id` text PRIMARY KEY NOT NULL,
	`venue_id` text NOT NULL,
	`unit_id` text,
	`shift` text NOT NULL,
	`day_of_week` integer,
	`is_seasonal` integer DEFAULT false NOT NULL,
	`season_start` text,
	`season_end` text,
	`price` real NOT NULL,
	`currency` text DEFAULT 'YER' NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`venue_id`) REFERENCES `venues`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`unit_id`) REFERENCES `venue_units`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_pricing_tiers_lookup` ON `pricing_tiers` (`venue_id`,`unit_id`,`shift`);--> statement-breakpoint
CREATE TABLE `reviews` (
	`id` text PRIMARY KEY NOT NULL,
	`venue_id` text NOT NULL,
	`booking_id` text,
	`customer_id` text NOT NULL,
	`rating` integer NOT NULL,
	`cleanliness_rating` integer,
	`service_rating` integer,
	`comment` text,
	`is_approved` integer DEFAULT true NOT NULL,
	`owner_reply` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`venue_id`) REFERENCES `venues`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`booking_id`) REFERENCES `bookings`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`customer_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_reviews_venue` ON `reviews` (`venue_id`);--> statement-breakpoint
CREATE INDEX `idx_reviews_customer` ON `reviews` (`customer_id`);--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`expires_at` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_sessions_user` ON `sessions` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_sessions_expires` ON `sessions` (`expires_at`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text,
	`phone` text,
	`password_hash` text,
	`full_name` text NOT NULL,
	`role` text DEFAULT 'customer' NOT NULL,
	`avatar_url` text,
	`is_active` integer DEFAULT true NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);--> statement-breakpoint
CREATE UNIQUE INDEX `users_phone_unique` ON `users` (`phone`);--> statement-breakpoint
CREATE INDEX `idx_users_role` ON `users` (`role`);--> statement-breakpoint
CREATE INDEX `idx_users_email` ON `users` (`email`);--> statement-breakpoint
CREATE INDEX `idx_users_phone` ON `users` (`phone`);--> statement-breakpoint
CREATE TABLE `venue_amenities` (
	`venue_id` text NOT NULL,
	`amenity_id` text NOT NULL,
	`is_free` integer DEFAULT true NOT NULL,
	`additional_price` real DEFAULT 0 NOT NULL,
	`currency` text DEFAULT 'YER' NOT NULL,
	`created_at` text NOT NULL,
	PRIMARY KEY(`venue_id`, `amenity_id`),
	FOREIGN KEY (`venue_id`) REFERENCES `venues`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`amenity_id`) REFERENCES `amenities`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `venue_availability` (
	`id` text PRIMARY KEY NOT NULL,
	`venue_id` text NOT NULL,
	`unit_id` text,
	`override_date` text NOT NULL,
	`shift` text NOT NULL,
	`is_blocked` integer DEFAULT false NOT NULL,
	`block_reason` text,
	`custom_price` real,
	`currency` text DEFAULT 'YER' NOT NULL,
	`created_by` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`venue_id`) REFERENCES `venues`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`unit_id`) REFERENCES `venue_units`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `idx_venue_availability_lookup` ON `venue_availability` (`venue_id`,`unit_id`,`override_date`,`shift`);--> statement-breakpoint
CREATE TABLE `venue_categories` (
	`id` text PRIMARY KEY NOT NULL,
	`slug` text NOT NULL,
	`name_ar` text NOT NULL,
	`description_ar` text,
	`display_order` integer DEFAULT 0 NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `venue_categories_slug_unique` ON `venue_categories` (`slug`);--> statement-breakpoint
CREATE TABLE `venue_images` (
	`id` text PRIMARY KEY NOT NULL,
	`venue_id` text NOT NULL,
	`unit_id` text,
	`image_url` text NOT NULL,
	`storage_path` text NOT NULL,
	`storage_type` text DEFAULT 'local' NOT NULL,
	`alt_text` text,
	`is_cover` integer DEFAULT false NOT NULL,
	`display_order` integer DEFAULT 0 NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`venue_id`) REFERENCES `venues`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`unit_id`) REFERENCES `venue_units`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_venue_images_venue` ON `venue_images` (`venue_id`);--> statement-breakpoint
CREATE INDEX `idx_venue_images_unit` ON `venue_images` (`unit_id`);--> statement-breakpoint
CREATE TABLE `venue_members` (
	`id` text PRIMARY KEY NOT NULL,
	`venue_id` text NOT NULL,
	`user_id` text NOT NULL,
	`role` text NOT NULL,
	`permissions` text DEFAULT '{}' NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`venue_id`) REFERENCES `venues`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_venue_members_venue_user` ON `venue_members` (`venue_id`,`user_id`);--> statement-breakpoint
CREATE INDEX `idx_venue_members_user` ON `venue_members` (`user_id`);--> statement-breakpoint
CREATE TABLE `venue_units` (
	`id` text PRIMARY KEY NOT NULL,
	`venue_id` text NOT NULL,
	`name` text NOT NULL,
	`unit_type` text NOT NULL,
	`capacity_min` integer DEFAULT 0 NOT NULL,
	`capacity_max` integer NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`deleted_at` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`venue_id`) REFERENCES `venues`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_venue_units_venue` ON `venue_units` (`venue_id`);--> statement-breakpoint
CREATE INDEX `idx_venue_units_type` ON `venue_units` (`unit_type`);--> statement-breakpoint
CREATE TABLE `venues` (
	`id` text PRIMARY KEY NOT NULL,
	`category_id` text NOT NULL,
	`name` text NOT NULL,
	`slug` text NOT NULL,
	`description` text,
	`city` text DEFAULT 'مأرب' NOT NULL,
	`district` text NOT NULL,
	`address_details` text,
	`latitude` real,
	`longitude` real,
	`contact_phone` text NOT NULL,
	`contact_whatsapp` text,
	`status` text DEFAULT 'draft' NOT NULL,
	`cancellation_policy_id` text,
	`default_currency` text DEFAULT 'YER' NOT NULL,
	`default_deposit_percentage` real DEFAULT 30 NOT NULL,
	`has_multiple_units` integer DEFAULT false NOT NULL,
	`featured` integer DEFAULT false NOT NULL,
	`deleted_at` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`category_id`) REFERENCES `venue_categories`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`cancellation_policy_id`) REFERENCES `cancellation_policies`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `venues_slug_unique` ON `venues` (`slug`);--> statement-breakpoint
CREATE INDEX `idx_venues_category` ON `venues` (`category_id`);--> statement-breakpoint
CREATE INDEX `idx_venues_status` ON `venues` (`status`);--> statement-breakpoint
CREATE INDEX `idx_venues_city_district` ON `venues` (`city`,`district`);