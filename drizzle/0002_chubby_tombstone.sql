CREATE TABLE `payments` (
	`id` text PRIMARY KEY NOT NULL,
	`booking_id` text NOT NULL,
	`provider` text NOT NULL,
	`provider_transaction_id` text NOT NULL,
	`amount` real NOT NULL,
	`currency` text DEFAULT 'YER' NOT NULL,
	`status` text DEFAULT 'initiated' NOT NULL,
	`review_reason` text,
	`metadata` text DEFAULT '{}' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`booking_id`) REFERENCES `bookings`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_payments_provider_tx` ON `payments` (`provider`,`provider_transaction_id`);--> statement-breakpoint
CREATE INDEX `idx_payments_booking` ON `payments` (`booking_id`);--> statement-breakpoint
CREATE INDEX `idx_payments_status` ON `payments` (`status`);--> statement-breakpoint
CREATE TABLE `webhook_events` (
	`id` text PRIMARY KEY NOT NULL,
	`provider` text NOT NULL,
	`event_id` text NOT NULL,
	`event_type` text NOT NULL,
	`payload` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`error_message` text,
	`processed_at` text,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_webhook_events_provider_event` ON `webhook_events` (`provider`,`event_id`);--> statement-breakpoint
CREATE INDEX `idx_webhook_events_status` ON `webhook_events` (`status`);