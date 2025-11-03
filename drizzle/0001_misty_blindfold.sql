CREATE TABLE `bot_config` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`isActive` boolean NOT NULL DEFAULT false,
	`balancePerTrade` int NOT NULL DEFAULT 100,
	`riskRewardRatio` decimal(5,2) NOT NULL DEFAULT '2.00',
	`confidenceThreshold` int NOT NULL DEFAULT 80,
	`maxDailyTrades` int NOT NULL DEFAULT 10,
	`stopLoss` decimal(5,2) NOT NULL DEFAULT '3.00',
	`takeProfit` decimal(5,2) NOT NULL DEFAULT '5.00',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `bot_config_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `bot_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`level` enum('info','warning','error') NOT NULL,
	`message` text NOT NULL,
	`details` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `bot_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `market_analysis` (
	`id` int AUTO_INCREMENT NOT NULL,
	`symbol` varchar(20) NOT NULL,
	`interval` varchar(10) NOT NULL,
	`currentPrice` decimal(18,8) NOT NULL,
	`prediction` enum('buy','sell','hold') NOT NULL,
	`confidence` int NOT NULL,
	`indicators` text,
	`inTrade` boolean NOT NULL DEFAULT false,
	`analyzedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `market_analysis_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `trades` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`symbol` varchar(20) NOT NULL,
	`interval` varchar(10) NOT NULL,
	`type` enum('buy','sell') NOT NULL,
	`entryPrice` decimal(18,8) NOT NULL,
	`exitPrice` decimal(18,8),
	`quantity` decimal(18,8) NOT NULL,
	`confidence` int NOT NULL,
	`status` enum('open','closed','cancelled') NOT NULL DEFAULT 'open',
	`profit` decimal(18,8),
	`profitPercentage` decimal(10,4),
	`entryTime` timestamp NOT NULL DEFAULT (now()),
	`exitTime` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `trades_id` PRIMARY KEY(`id`)
);
