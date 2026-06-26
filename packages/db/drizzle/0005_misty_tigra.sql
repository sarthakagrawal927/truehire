CREATE TABLE `ai_build_profiles` (
	`user_id` text PRIMARY KEY NOT NULL,
	`schema_version` text NOT NULL,
	`cli_version` text NOT NULL,
	`generated_at` integer NOT NULL,
	`published_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`composite` integer,
	`data_completeness` real DEFAULT 0 NOT NULL,
	`dimensions_json` text DEFAULT '[]' NOT NULL,
	`signals_json` text DEFAULT '{}' NOT NULL,
	`tools_detected_json` text DEFAULT '[]' NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `cli_publish_tokens` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`token_hash` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`expires_at` integer NOT NULL,
	`used_at` integer,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `cli_publish_tokens_token_hash_unique` ON `cli_publish_tokens` (`token_hash`);--> statement-breakpoint
CREATE INDEX `cli_publish_tokens_user_idx` ON `cli_publish_tokens` (`user_id`);--> statement-breakpoint
CREATE INDEX `activity_months_user_idx` ON `activity_months` (`user_id`);--> statement-breakpoint
CREATE INDEX `contributions_user_idx` ON `contributions` (`user_id`);--> statement-breakpoint
CREATE INDEX `employer_verifications_work_history_idx` ON `employer_verifications` (`work_history_id`);--> statement-breakpoint
CREATE INDEX `work_history_user_idx` ON `work_history` (`user_id`);