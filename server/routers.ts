import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import * as db from "./db";

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
          'info',
          'Configuração do bot atualizada',
          input
        );
        
        return { success: true };
      }),

    start: protectedProcedure.mutation(async ({ ctx }) => {
      await db.updateBotConfig(ctx.user.id, { isActive: true });
      await db.createBotLog(ctx.user.id, 'info', 'Bot iniciado');
      return { success: true, message: 'Bot iniciado com sucesso' };
    }),

    stop: protectedProcedure.mutation(async ({ ctx }) => {
      await db.updateBotConfig(ctx.user.id, { isActive: false });
      await db.createBotLog(ctx.user.id, 'info', 'Bot parado');
      return { success: true, message: 'Bot parado com sucesso' };
    }),
  }),

  // Trades Management
  trades: router({
    list: protectedProcedure
      .input(z.object({
        limit: z.number().min(1).max(1000).default(100),
      }).optional())
      .query(async ({ ctx, input }) => {
        const limit = input?.limit || 100;
        return await db.getTradesByUser(ctx.user.id, limit);
      }),

    openTrades: protectedProcedure.query(async ({ ctx }) => {
      return await db.getOpenTrades(ctx.user.id);
    }),

    statistics: protectedProcedure.query(async ({ ctx }) => {
      return await db.getTradeStatistics(ctx.user.id);
    }),
  }),

  // Market Analysis
  market: router({
    latest: protectedProcedure.query(async () => {
      return await db.getAllLatestAnalysis();
    }),

    getAnalysis: protectedProcedure
      .input(z.object({
        symbol: z.string(),
        interval: z.string(),
      }))
      .query(async ({ input }) => {
        return await db.getLatestMarketAnalysis(input.symbol, input.interval);
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
});

export type AppRouter = typeof appRouter;
