import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, decimal, boolean, json } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  passwordHash: varchar("passwordHash", { length: 255 }),
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
  balancePerTrade: int("balancePerTrade").default(100).notNull(),
  riskRewardRatio: decimal("riskRewardRatio", { precision: 5, scale: 2 }).default("2.00").notNull(),
  confidenceThreshold: int("confidenceThreshold").default(80).notNull(),
  maxDailyTrades: int("maxDailyTrades").default(10).notNull(),
  stopLoss: decimal("stopLoss", { precision: 5, scale: 2 }).default("3.00").notNull(),
  takeProfit: decimal("takeProfit", { precision: 5, scale: 2 }).default("5.00").notNull(),
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
  profit: decimal("profit", { precision: 18, scale: 8 }),
  profitPercent: decimal("profitPercent", { precision: 5, scale: 2 }),
  status: mysqlEnum("status", ["open", "closed", "cancelled"]).default("open").notNull(),
  entryTime: timestamp("entryTime").notNull(),
  exitTime: timestamp("exitTime"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Trade = typeof trades.$inferSelect;
export type InsertTrade = typeof trades.$inferInsert;

/**
 * Historical market data table
 */
export const historicalData = mysqlTable("historical_data", {
  id: int("id").autoincrement().primaryKey(),
  symbol: varchar("symbol", { length: 20 }).notNull(),
  interval: varchar("interval", { length: 10 }).notNull(),
  timestamp: timestamp("timestamp").notNull(),
  open: decimal("open", { precision: 18, scale: 8 }).notNull(),
  high: decimal("high", { precision: 18, scale: 8 }).notNull(),
  low: decimal("low", { precision: 18, scale: 8 }).notNull(),
  close: decimal("close", { precision: 18, scale: 8 }).notNull(),
  volume: decimal("volume", { precision: 18, scale: 8 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type HistoricalData = typeof historicalData.$inferSelect;
export type InsertHistoricalData = typeof historicalData.$inferInsert;

/**
 * Backtesting results table
 */
export const backtestResults = mysqlTable("backtest_results", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  symbol: varchar("symbol", { length: 20 }).notNull(),
  interval: varchar("interval", { length: 10 }).notNull(),
  startDate: timestamp("startDate").notNull(),
  endDate: timestamp("endDate").notNull(),
  totalTrades: int("totalTrades").default(0).notNull(),
  winTrades: int("winTrades").default(0).notNull(),
  lossTrades: int("lossTrades").default(0).notNull(),
  winRate: decimal("winRate", { precision: 5, scale: 2 }).default("0.00").notNull(),
  totalProfit: decimal("totalProfit", { precision: 18, scale: 8 }).default("0").notNull(),
  totalProfitPercent: decimal("totalProfitPercent", { precision: 5, scale: 2 }).default("0").notNull(),
  maxDrawdown: decimal("maxDrawdown", { precision: 5, scale: 2 }).default("0").notNull(),
  sharpeRatio: decimal("sharpeRatio", { precision: 5, scale: 2 }).default("0").notNull(),
  metadata: json("metadata"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type BacktestResult = typeof backtestResults.$inferSelect;
export type InsertBacktestResult = typeof backtestResults.$inferInsert;

/**
 * Simulated trades table
 */
export const simulatedTrades = mysqlTable("simulated_trades", {
  id: int("id").autoincrement().primaryKey(),
  backtestId: int("backtestId").notNull(),
  symbol: varchar("symbol", { length: 20 }).notNull(),
  type: mysqlEnum("type", ["buy", "sell"]).notNull(),
  entryPrice: decimal("entryPrice", { precision: 18, scale: 8 }).notNull(),
  exitPrice: decimal("exitPrice", { precision: 18, scale: 8 }),
  quantity: decimal("quantity", { precision: 18, scale: 8 }).notNull(),
  profit: decimal("profit", { precision: 18, scale: 8 }),
  profitPercent: decimal("profitPercent", { precision: 5, scale: 2 }),
  entryTime: timestamp("entryTime").notNull(),
  exitTime: timestamp("exitTime"),
  confidence: decimal("confidence", { precision: 5, scale: 2 }).default("0").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type SimulatedTrade = typeof simulatedTrades.$inferSelect;
export type InsertSimulatedTrade = typeof simulatedTrades.$inferInsert;

/**
 * AI Models table
 */
export const aiModels = mysqlTable("ai_models", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  symbol: varchar("symbol", { length: 20 }).notNull(),
  modelType: varchar("modelType", { length: 50 }).default("random_forest").notNull(),
  version: int("version").default(1).notNull(),
  accuracy: decimal("accuracy", { precision: 5, scale: 4 }).default("0").notNull(),
  trainingDataPoints: int("trainingDataPoints").default(0).notNull(),
  lastTrainedAt: timestamp("lastTrainedAt"),
  metadata: json("metadata"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type AIModel = typeof aiModels.$inferSelect;
export type InsertAIModel = typeof aiModels.$inferInsert;

/**
 * Bot logs table
 */
export const botLogs = mysqlTable("bot_logs", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  level: mysqlEnum("level", ["info", "warning", "error", "debug"]).default("info").notNull(),
  message: text("message").notNull(),
  metadata: json("metadata"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type BotLog = typeof botLogs.$inferSelect;
export type InsertBotLog = typeof botLogs.$inferInsert;

/**
 * Retrain logs table
 */
export const retrainLogs = mysqlTable("retrain_logs", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  symbol: varchar("symbol", { length: 20 }).notNull(),
  interval: varchar("interval", { length: 10 }).notNull(),
  period: int("period").default(365).notNull(),
  status: mysqlEnum("status", ["pending", "running", "completed", "failed"]).default("pending").notNull(),
  accuracy: decimal("accuracy", { precision: 5, scale: 4 }),
  dataPoints: int("dataPoints").default(0).notNull(),
  message: text("message"),
  metadata: json("metadata"),
  startedAt: timestamp("startedAt").defaultNow().notNull(),
  completedAt: timestamp("completedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type RetrainLog = typeof retrainLogs.$inferSelect;
export type InsertRetrainLog = typeof retrainLogs.$inferInsert;
