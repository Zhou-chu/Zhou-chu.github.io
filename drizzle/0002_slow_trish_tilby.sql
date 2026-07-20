ALTER TABLE `notes` ADD `source_path` text;--> statement-breakpoint
ALTER TABLE `notes` ADD `links_json` text DEFAULT '[]' NOT NULL;