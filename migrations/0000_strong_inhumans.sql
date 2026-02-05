CREATE TABLE `group` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`createdAt` integer DEFAULT (unixepoch()) NOT NULL,
	`renotifySeconds` integer,
	`updatedAt` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `group_name_unique` ON `group` (`name`);--> statement-breakpoint
CREATE TABLE `groupToNotifier` (
	`groupId` integer NOT NULL,
	`notifierId` integer NOT NULL,
	PRIMARY KEY(`groupId`, `notifierId`),
	FOREIGN KEY (`groupId`) REFERENCES `group`(`id`) ON UPDATE cascade ON DELETE cascade,
	FOREIGN KEY (`notifierId`) REFERENCES `notifier`(`id`) ON UPDATE cascade ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `history` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`serviceId` integer NOT NULL,
	`result` text,
	`status` integer NOT NULL,
	`createdAt` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`serviceId`) REFERENCES `service`(`id`) ON UPDATE cascade ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `ix_serviceId_createdAt` ON `history` (`serviceId`,`createdAt`);--> statement-breakpoint
CREATE TABLE `keyVal` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text
);
--> statement-breakpoint
CREATE TABLE `notifier` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`active` integer NOT NULL,
	`params` text NOT NULL,
	`createdAt` integer DEFAULT (unixepoch()) NOT NULL,
	`updatedAt` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `notifier_name_unique` ON `notifier` (`name`);--> statement-breakpoint
CREATE TABLE `service` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`groupId` integer DEFAULT 1 NOT NULL,
	`active` integer NOT NULL,
	`params` text NOT NULL,
	`checkSeconds` integer NOT NULL,
	`failuresBeforeDown` integer NOT NULL,
	`successesBeforeUp` integer NOT NULL,
	`retainCount` integer NOT NULL,
	`createdAt` integer DEFAULT (unixepoch()) NOT NULL,
	`updatedAt` integer NOT NULL,
	FOREIGN KEY (`groupId`) REFERENCES `group`(`id`) ON UPDATE cascade ON DELETE set default
);
--> statement-breakpoint
CREATE UNIQUE INDEX `service_name_unique` ON `service` (`name`);--> statement-breakpoint
CREATE TABLE `serviceToTag` (
	`serviceId` integer NOT NULL,
	`tagId` integer NOT NULL,
	PRIMARY KEY(`serviceId`, `tagId`),
	FOREIGN KEY (`serviceId`) REFERENCES `service`(`id`) ON UPDATE cascade ON DELETE cascade,
	FOREIGN KEY (`tagId`) REFERENCES `tag`(`id`) ON UPDATE cascade ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `state` (
	`id` integer PRIMARY KEY NOT NULL,
	`nextCheckAt` integer NOT NULL,
	`failures` integer NOT NULL,
	`successes` integer NOT NULL,
	`current` text,
	`uptime1d` real NOT NULL,
	`uptime30d` real NOT NULL,
	`latency1d` real,
	`status` integer NOT NULL,
	`miniHistory` text NOT NULL,
	`changedAt` integer DEFAULT (unixepoch()) NOT NULL,
	`createdAt` integer DEFAULT (unixepoch()) NOT NULL,
	`updatedAt` integer NOT NULL,
	FOREIGN KEY (`id`) REFERENCES `service`(`id`) ON UPDATE cascade ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `tag` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `tag_name_unique` ON `tag` (`name`);--> statement-breakpoint
CREATE VIEW `historySummary` AS 
    select
      name,
      id,
      serviceId,
      result,
      status,
      createdAt
    from (
      select
        h.*,
        s.name,
        lag(h.status) over win as prevStatus,
        lag(h.result) over win as prevResult
      from history as h
      inner join service as s on s.id = h.serviceId
      window win as (
        partition by h.serviceId
        order by h.createdAt
      )
    )
    where prevStatus is null
      or status != prevStatus
      or (
        result is not null and prevResult is not null and (
          json_extract(result, '$.kind') != json_extract(prevResult, '$.kind')
          or json_extract(result, '$.reason') != json_extract(prevResult, '$.reason')
          or json_extract(result, '$.message') != json_extract(prevResult, '$.message')
        )
      )
    order by createdAt desc;