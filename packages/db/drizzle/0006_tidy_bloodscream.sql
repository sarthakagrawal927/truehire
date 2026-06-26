CREATE TABLE `cli_auth_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`device_code_hash` text NOT NULL,
	`user_code` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`user_id` text,
	`label` text,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`expires_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `cli_auth_sessions_device_code_hash_unique` ON `cli_auth_sessions` (`device_code_hash`);--> statement-breakpoint
CREATE UNIQUE INDEX `cli_auth_sessions_user_code_unique` ON `cli_auth_sessions` (`user_code`);--> statement-breakpoint
CREATE INDEX `cli_auth_sessions_user_code_idx` ON `cli_auth_sessions` (`user_code`);--> statement-breakpoint
CREATE TABLE `cli_tokens` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`token_hash` text NOT NULL,
	`label` text,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`last_used_at` integer,
	`revoked_at` integer,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `cli_tokens_token_hash_unique` ON `cli_tokens` (`token_hash`);--> statement-breakpoint
CREATE INDEX `cli_tokens_user_idx` ON `cli_tokens` (`user_id`);