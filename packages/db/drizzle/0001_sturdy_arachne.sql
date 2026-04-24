CREATE TABLE `employer_verifications` (
	`id` text PRIMARY KEY NOT NULL,
	`work_history_id` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`verifier_email` text NOT NULL,
	`verifier_domain` text NOT NULL,
	`method` text DEFAULT 'email_hr' NOT NULL,
	`token_hash` text NOT NULL,
	`signature` text,
	`requested_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`responded_at` integer,
	`expires_at` integer NOT NULL,
	`notes` text,
	FOREIGN KEY (`work_history_id`) REFERENCES `work_history`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `work_history` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`company` text NOT NULL,
	`company_domain` text,
	`title` text NOT NULL,
	`start_date` text NOT NULL,
	`end_date` text,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
ALTER TABLE `users` ADD `claimed` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `seeded` integer DEFAULT false NOT NULL;