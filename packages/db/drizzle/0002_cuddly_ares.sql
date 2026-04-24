ALTER TABLE `contributions` ADD `is_fork` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `contributions` ADD `pushed_at` integer;--> statement-breakpoint
ALTER TABLE `contributions` ADD `craft_json` text;--> statement-breakpoint
ALTER TABLE `scores` ADD `craft` integer DEFAULT 0 NOT NULL;