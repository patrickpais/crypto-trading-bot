import { eq, desc, and, gte, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users, botConfig, trades, botLogs, historicalData, backtestResults, simulatedTrades, aiModels, retrainLogs, BotConfig, Trade, BotLog, HistoricalData, BacktestResult, SimulatedTrade, AIModel, RetrainLog } from "../drizzle/schema";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// ========== User Functions ==========

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// ========== Bot Config Functions ==========

export async function getBotConfig(userId: number): Promise<BotConfig | undefined> {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(botConfig).where(eq(botConfig.userId, userId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function createBotConfig(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(botConfig).values({
    userId,
    isActive: false,
    balancePerTrade: 10, // 10% do saldo por trade
    riskRewardRatio: "2.00",
    confidenceThreshold: 80,
    maxDailyTrades: 10,
    stopLoss: "3.00",
    takeProfit: "5.00",
  });

  return result;
}

export async function updateBotConfig(userId: number, config: Partial<BotConfig>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(botConfig).set(config).where(eq(botConfig.userId, userId));
}

// ========== Trades Functions ==========

export async function createTrade(trade: Omit<Trade, 'id' | 'createdAt' | 'updatedAt'>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(trades).values(trade as any);
  return result;
}

export async function getTradesByUser(userId: number, limit: number = 100): Promise<Trade[]> {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(trades)
    .where(eq(trades.userId, userId))
    .orderBy(desc(trades.createdAt))
    .limit(limit);
}

export async function getOpenTrades(userId: number): Promise<Trade[]> {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(trades)
    .where(and(
      eq(trades.userId, userId),
      eq(trades.status, 'open')
    ))
    .orderBy(desc(trades.createdAt));
}

export async function closeTrade(tradeId: number, exitPrice: string, profit: string, profitPercentage: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(trades).set({
    status: 'closed',
    exitPrice,
    profit,
    profitPercent: profitPercentage,
    exitTime: new Date(),
  }).where(eq(trades.id, tradeId));
}

export async function getTodayTradesCount(userId: number): Promise<number> {
  const db = await getDb();
  if (!db) return 0;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const result = await db.select({ count: sql<number>`count(*)` })
    .from(trades)
    .where(and(
      eq(trades.userId, userId),
      gte(trades.createdAt, today)
    ));

  return result[0]?.count || 0;
}

// ========== Market Analysis Functions ==========

// ========== Historical Data Functions ==========

export async function saveHistoricalData(data: Omit<HistoricalData, 'id' | 'createdAt'>[]) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.insert(historicalData).values(data as any);
}

export async function getHistoricalData(symbol: string, interval: string, limit: number = 1000) {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(historicalData)
    .where(and(
      eq(historicalData.symbol, symbol),
      eq(historicalData.interval, interval)
    ))
    .orderBy(desc(historicalData.timestamp))
    .limit(limit);
}

// ========== Backtest Results Functions ==========

export async function saveBacktestResult(result: Omit<BacktestResult, 'id' | 'createdAt'>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db.insert(backtestResults).values(result as any);
}

export async function getBacktestResults(userId: number, limit: number = 10) {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(backtestResults)
    .where(eq(backtestResults.userId, userId))
    .orderBy(desc(backtestResults.createdAt))
    .limit(limit);
}

// ========== Simulated Trades Functions ==========

export async function saveSimulatedTrade(trade: Omit<SimulatedTrade, 'id' | 'createdAt'>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db.insert(simulatedTrades).values(trade as any);
}

export async function getSimulatedTrades(backtestId: number) {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(simulatedTrades)
    .where(eq(simulatedTrades.backtestId, backtestId))
    .orderBy(desc(simulatedTrades.createdAt));
}

// ========== AI Model Functions ==========

export async function saveAIModel(model: Omit<AIModel, 'id' | 'createdAt' | 'updatedAt'>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db.insert(aiModels).values(model as any);
}

export async function getAIModel(userId: number, symbol: string) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(aiModels)
    .where(and(
      eq(aiModels.userId, userId),
      eq(aiModels.symbol, symbol)
    ))
    .orderBy(desc(aiModels.createdAt))
    .limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// ========== Bot Logs Functions ==========

export async function createBotLog(userId: number, level: 'info' | 'warning' | 'error', message: string, metadata?: any) {
  const db = await getDb();
  if (!db) return;

  await db.insert(botLogs).values({
    userId,
    level,
    message,
    metadata: metadata || null,
  });
}

export async function getBotLogs(userId: number, limit: number = 50) {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(botLogs)
    .where(eq(botLogs.userId, userId))
    .orderBy(desc(botLogs.createdAt))
    .limit(limit);
}

// ========== Statistics Functions ==========

export async function getTradeStatistics(userId: number) {
  const db = await getDb();
  if (!db) return null;

  const allTrades = await db.select().from(trades)
    .where(eq(trades.userId, userId));

  const closedTrades = allTrades.filter(t => t.status === 'closed');
  
  const totalTrades = closedTrades.length;
  const winningTrades = closedTrades.filter(t => parseFloat(t.profit || '0') > 0).length;
  const losingTrades = closedTrades.filter(t => parseFloat(t.profit || '0') < 0).length;
  
  const totalProfit = closedTrades.reduce((sum, t) => sum + parseFloat(t.profit || '0'), 0);
  const winRate = totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0;

  return {
    totalTrades,
    winningTrades,
    losingTrades,
    winRate: winRate.toFixed(2),
    totalProfit: totalProfit.toFixed(2),
    openTrades: allTrades.filter(t => t.status === 'open').length,
  };
}

export async function getUserById(userId: number) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function updateUserPassword(userId: number, passwordHash: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot update user password: database not available");
    return;
  }

  try {
    await db.update(users).set({ passwordHash }).where(eq(users.id, userId));
  } catch (error) {
    console.error("[Database] Failed to update user password:", error);
    throw error;
  }
}

// ========== Retrain Functions ==========

export async function createRetrainLog(userId: number, symbol: string, interval: string, period: number) {
  const db = await getDb();
  if (!db) return null;

  const result = await db.insert(retrainLogs).values({
    userId,
    symbol,
    interval,
    period,
    status: 'running',
  });

  return result;
}

export async function updateRetrainLog(id: number, status: 'pending' | 'running' | 'completed' | 'failed', accuracy?: number, dataPoints?: number, message?: string) {
  const db = await getDb();
  if (!db) return null;

  await db.update(retrainLogs).set({
    status,
    accuracy: accuracy ? accuracy.toString() : undefined,
    dataPoints,
    message,
    completedAt: status === 'completed' || status === 'failed' ? new Date() : undefined,
  }).where(eq(retrainLogs.id, id));
}

export async function getRetrainLogs(userId: number, limit: number = 50) {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(retrainLogs)
    .where(eq(retrainLogs.userId, userId))
    .orderBy(desc(retrainLogs.createdAt))
    .limit(limit);
}

export async function getRetrainStatus(userId: number) {
  const db = await getDb();
  if (!db) return null;

  const lastLog = await db.select().from(retrainLogs)
    .where(eq(retrainLogs.userId, userId))
    .orderBy(desc(retrainLogs.createdAt))
    .limit(1);

  return lastLog.length > 0 ? lastLog[0] : null;
}
