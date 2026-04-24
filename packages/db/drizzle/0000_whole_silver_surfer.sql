CREATE TABLE `accounts` (
	`userId` text NOT NULL,
	`type` text NOT NULL,
	`provider` text NOT NULL,
	`providerAccountId` text NOT NULL,
	`refresh_token` text,
	`access_token` text,
	`expires_at` integer,
	`token_type` text,
	`scope` text,
	`id_token` text,
	`session_state` text,
	PRIMARY KEY(`provider`, `providerAccountId`),
	FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `activity_months` (
	`user_id` text NOT NULL,
	`month` text NOT NULL,
	`commits` integer DEFAULT 0 NOT NULL,
	PRIMARY KEY(`user_id`, `month`),
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `contributions` (
	`user_id` text NOT NULL,
	`repo_full_name` text NOT NULL,
	`repo_stars` integer DEFAULT 0 NOT NULL,
	`repo_url` text NOT NULL,
	`repo_description` text,
	`primary_language` text,
	`first_commit_at` integer,
	`last_commit_at` integer,
	`commits` integer DEFAULT 0 NOT NULL,
	`additions` integer DEFAULT 0 NOT NULL,
	`deletions` integer DEFAULT 0 NOT NULL,
	`merged_prs` integer DEFAULT 0 NOT NULL,
	`is_author` integer DEFAULT false NOT NULL,
	`weighted_score` real DEFAULT 0 NOT NULL,
	PRIMARY KEY(`user_id`, `repo_full_name`),
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `scores` (
	`user_id` text NOT NULL,
	`computed_at` integer NOT NULL,
	`overall` integer NOT NULL,
	`depth` integer NOT NULL,
	`breadth` integer NOT NULL,
	`recognition` integer NOT NULL,
	`specialization` integer NOT NULL,
	`languages_json` text DEFAULT '[]' NOT NULL,
	`evidence_json` text DEFAULT '[]' NOT NULL,
	`total_commits` integer DEFAULT 0 NOT NULL,
	`total_stars` integer DEFAULT 0 NOT NULL,
	`total_repos` integer DEFAULT 0 NOT NULL,
	`months_active` integer DEFAULT 0 NOT NULL,
	PRIMARY KEY(`user_id`, `computed_at`),
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `scores_user_computed_idx` ON `scores` (`user_id`,`computed_at`);--> statement-breakpoint
CREATE TABLE `sessions` (
	`sessionToken` text PRIMARY KEY NOT NULL,
	`userId` text NOT NULL,
	`expires` integer NOT NULL,
	FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text,
	`email` text,
	`emailVerified` integer,
	`image` text,
	`github_id` integer,
	`github_username` text,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`last_scored_at` integer,
	`last_ingested_at` integer,
	`ingest_status` text DEFAULT 'idle' NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);--> statement-breakpoint
CREATE UNIQUE INDEX `users_github_id_unique` ON `users` (`github_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `users_github_username_unique` ON `users` (`github_username`);--> statement-breakpoint
CREATE TABLE `verificationTokens` (
	`identifier` text NOT NULL,
	`token` text NOT NULL,
	`expires` integer NOT NULL,
	PRIMARY KEY(`identifier`, `token`)
);
