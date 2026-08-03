ALTER TABLE `notes` ADD `tags_json` text DEFAULT '[]' NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX `notes_title_author_idx` ON `notes` (`title`,`author_email`);