import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import { users } from "../drizzle/schema";
import { getDb } from "./db";
import * as db from "./db";
import crypto from "crypto";

// Backtesting router
const backtestRouter = router({
  run: protectedProcedure
    .input(z.object({
      symbol: z.string(),
      interval: z.string(),
      confidenceThreshold: z.number(),
    }))
    .mutation(async ({ ctx, input }) => {
      // TODO: Implement backtesting logic
      return { success: true, message: "Backtesting iniciado" };
    }),

  startLive: protectedProcedure
    .input(z.object({
      symbols: z.array(z.string()),
      intervals: z.array(z.string()),
    }))
    .mutation(async ({ ctx, input }) => {
      // TODO: Implement live backtesting
      return { success: true, message: "Backtesting ao vivo iniciado" };
    }),

  getResults: protectedProcedure
    .input(z.object({
      limit: z.number().default(10),
    }))
    .query(async ({ ctx, input }) => {
      return await db.getBacktestResults(ctx.user.id, input.limit);
    }),

  listResults: protectedProcedure.query(async ({ ctx }) => {
    return await db.getBacktestResults(ctx.user.id);
  }),

  getTrades: protectedProcedure
    .input(z.object({
      backtestId: z.number(),
    }))
    .query(async ({ input }) => {
      return await db.getSimulatedTrades(input.backtestId);
    }),
});

export const appRouter = router({
  system: systemRouter,
  
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
    changePassword: protectedProcedure
      .input(z.object({
        currentPassword: z.string().min(1),
        newPassword: z.string().min(6),
      }))
      .mutation(async ({ ctx, input }) => {
        try {
          if (!ctx.user?.id) {
            throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Not authenticated' });
          }
          
          const newHash = crypto.createHash("sha256").update(input.newPassword).digest("hex");
          
          // Update password in database
          const database = await getDb();
          if (!database) {
            throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
          }
          
          await database.update(users).set({ passwordHash: newHash }).where(eq(users.id, ctx.user.id));
          
          return { success: true, message: "Senha alterada com sucesso" };
        } catch (error: any) {
          console.error("[changePassword] Error:", error);
          throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });
        }
      }),
  }),

  // Bot Configuration
  bot: router({
    getConfig: protectedProcedure.query(async ({ ctx }) => {
      let config = await db.getBotConfig(ctx.user.id);
      
      // Create default config if doesn't exist
      if (!config) {
        await db.createBotConfig(ctx.user.id);
        config = await db.getBotConfig(ctx.user.id);
      }
      
      return config;
    }),

    updateConfig: protectedProcedure
      .input(z.object({
        isActive: z.boolean().optional(),
        balancePerTrade: z.number().min(1).max(100).optional(),
        riskRewardRatio: z.string().optional(),
        confidenceThreshold: z.number().min(0).max(100).optional(),
        maxDailyTrades: z.number().min(1).max(100).optional(),
        stopLoss: z.string().optional(),
        takeProfit: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        await db.updateBotConfig(ctx.user.id, input);
        
        // Log configuration change
        await db.createBotLog(
          ctx.user.id,
          "info",
          "Configuração do bot atualizada",
          input
        );
        
        return { success: true };
      }),

    start: protectedProcedure.mutation(async ({ ctx }) => {
      await db.updateBotConfig(ctx.user.id, { isActive: true });
      await db.createBotLog(ctx.user.id, "info", "Bot iniciado");
      return { success: true, message: "Bot iniciado com sucesso" };
    }),

    stop: protectedProcedure.mutation(async ({ ctx }) => {
      await db.updateBotConfig(ctx.user.id, { isActive: false });
      await db.createBotLog(ctx.user.id, "info", "Bot parado");
      return { success: true, message: "Bot parado com sucesso" };
    }),
  }),

  // Trades
  trades: router({
    list: protectedProcedure
      .input(z.object({
        limit: z.number().min(1).max(200).default(100),
      }).optional())
      .query(async ({ ctx, input }) => {
        const limit = input?.limit || 100;
        return await db.getTradesByUser(ctx.user.id, limit);
      }),

    open: protectedProcedure.query(async ({ ctx }) => {
      return await db.getOpenTrades(ctx.user.id);
    }),

    statistics: protectedProcedure.query(async ({ ctx }) => {
      return await db.getTradeStatistics(ctx.user.id);
    }),
  }),

  // Market Analysis
  market: router({
    latest: protectedProcedure.query(async () => {
      return [];
    }),

    getAnalysis: protectedProcedure
      .input(z.object({
        symbol: z.string(),
        interval: z.string(),
      }))
      .query(async ({ input }) => {
        return undefined;
      }),
  }),

  // Bot Logs
  logs: router({
    list: protectedProcedure
      .input(z.object({
        limit: z.number().min(1).max(200).default(50),
      }).optional())
      .query(async ({ ctx, input }) => {
        const limit = input?.limit || 50;
        return await db.getBotLogs(ctx.user.id, limit);
      }),
  }),

  // Retreinamento
  retrain: router({
    start: protectedProcedure
      .input(z.object({
        symbol: z.string().default('BTCUSDT'),
        interval: z.string().default('1h'),
        period: z.number().default(365),
      }))
      .mutation(async ({ ctx, input }) => {
        const symbol = input.symbol || 'BTCUSDT';
        const interval = input.interval || '1h';
        const period = input.period || 365;
        
        await db.createRetrainLog(ctx.user.id, symbol, interval, period);
        
        return { 
          success: true, 
          message: `Retreinamento iniciado para ${symbol} ${interval}` 
        };
      }),

    status: protectedProcedure.query(async ({ ctx }) => {
      const status = await db.getRetrainStatus(ctx.user.id);
      return status || { status: 'idle', progress: 0 };
    }),

    logs: protectedProcedure.query(async ({ ctx }) => {
      return await db.getRetrainLogs(ctx.user.id, 50);
    }),
  }),

  // Backtesting
  backtest: backtestRouter,
});

export type AppRouter = typeof appRouter;
