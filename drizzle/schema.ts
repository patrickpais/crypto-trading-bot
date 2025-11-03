import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, decimal, boolean } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Bot configuration table
 */
export const botConfig = mysqlTable("bot_config", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  isActive: boolean("isActive").default(false).notNull(),
  balancePerTrade: int("balancePerTrade").default(100).notNull(), // Porcentagem do saldo (1-100%)
  riskRewardRatio: decimal("riskRewardRatio", { precision: 5, scale: 2 }).default("2.00").notNull(),
  confidenceThreshold: int("confidenceThreshold").default(80).notNull(), // Porcentagem (0-100%)
  maxDailyTrades: int("maxDailyTrades").default(10).notNull(),
  stopLoss: decimal("stopLoss", { precision: 5, scale: 2 }).default("3.00").notNull(), // Porcentagem
  takeProfit: decimal("takeProfit", { precision: 5, scale: 2 }).default("5.00").notNull(), // Porcentagem
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type BotConfig = typeof botConfig.$inferSelect;
export type InsertBotConfig = typeof botConfig.$inferInsert;

/**
 * Trades history table
 */
export const trades = mysqlTable("trades", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  symbol: varchar("symbol", { length: 20 }).notNull(),
  interval: varchar("interval", { length: 10 }).notNull(),
  type: mysqlEnum("type", ["buy", "sell"]).notNull(),
  entryPrice: decimal("entryPrice", { precision: 18, scale: 8 }).notNull(),
  exitPrice: decimal("exitPrice", { precision: 18, scale: 8 }),
  quantity: decimal("quantity", { precision: 18, scale: 8 }).notNull(),
  confidence: int("confidence").notNull(), // Porcentagem (0-100%)
  status: mysqlEnum("status", ["open", "closed", "cancelled"]).default("open").notNull(),
  profit: decimal("profit", { precision: 18, scale: 8 }),
  profitPercentage: decimal("profitPercentage", { precision: 10, scale: 4 }),
  entryTime: timestamp("entryTime").defaultNow().notNull(),
  exitTime: timestamp("exitTime"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Trade = typeof trades.$inferSelect;
export type InsertTrade = typeof trades.$inferInsert;

/**
 * Market analysis table - stores current market conditions
 */
export const marketAnalysis = mysqlTable("market_analysis", {
  id: int("id").autoincrement().primaryKey(),
  symbol: varchar("symbol", { length: 20 }).notNull(),
  interval: varchar("interval", { length: 10 }).notNull(),
  currentPrice: decimal("currentPrice", { precision: 18, scale: 8 }).notNull(),
  prediction: mysqlEnum("prediction", ["buy", "sell", "hold"]).notNull(),
  confidence: int("confidence").notNull(), // Porcentagem (0-100%)
  indicators: text("indicators"), // JSON string with indicator values
  inTrade: boolean("inTrade").default(false).notNull(),
  analyzedAt: timestamp("analyzedAt").defaultNow().notNull(),
});

export type MarketAnalysis = typeof marketAnalysis.$inferSelect;
export type InsertMarketAnalysis = typeof marketAnalysis.$inferInsert;

/**
 * Bot activity logs
 */
export const botLogs = mysqlTable("bot_logs", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  level: mysqlEnum("level", ["info", "warning", "error"]).notNull(),
  message: text("message").notNull(),
  details: text("details"), // JSON string with additional details
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type BotLog = typeof botLogs.$inferSelect;
export type InsertBotLog = typeof botLogs.$inferInsert;
