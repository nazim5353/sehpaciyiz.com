CREATE TABLE `cloud_entities` (
	`company_id` text NOT NULL,
	`kind` text NOT NULL,
	`id` text NOT NULL,
	`payload` text NOT NULL,
	PRIMARY KEY(`company_id`, `kind`, `id`),
	FOREIGN KEY (`company_id`) REFERENCES `cloud_revision`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `cloud_revision` (
	`id` text PRIMARY KEY NOT NULL,
	`revision` integer DEFAULT 0 NOT NULL,
	CONSTRAINT "revision_conflict" CHECK("cloud_revision"."revision">=0)
);
