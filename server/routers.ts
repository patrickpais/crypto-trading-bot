import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import { spawn } from "child_process";
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

  // Backtesting
  backtest: router({
    run: protectedProcedure
      .input(z.object({
        symbol: z.string(),
        interval: z.string(),
        confidenceThreshold: z.number().min(0).max(100),
      }))
      .mutation(async ({ input }) => {
        const { spawn } = require('child_process');
        const path = require('path');
        
        return new Promise((resolve, reject) => {
          const scriptPath = path.join(__dirname, '..', 'scripts', 'backtest.py');
          const python = spawn('python3', [
            scriptPath,
            input.symbol,
            input.interval,
            input.confidenceThreshold.toString()
          ]);
          
          let stdout = '';
          let stderr = '';
          
          python.stdout.on('data', (data: Buffer) => {
            stdout += data.toString();
          });
          
          python.stderr.on('data', (data: Buffer) => {
            stderr += data.toString();
          });
          
          python.on('close', (code: number) => {
            if (code !== 0) {
              reject(new Error(`Backtest failed: ${stderr}`));
              return;
            }
            
            try {
              const fs = require('fs');
              const resultsPath = path.join(__dirname, '..', 'backtest_results.json');
              const results = JSON.parse(fs.readFileSync(resultsPath, 'utf8'));
              resolve(results);
            } catch (error) {
              reject(error);
            }
          });
        });
      }),
  }),

  // Retreinamento
  retrain: router({
    start: protectedProcedure
      .input(z.object({
        updateData: z.boolean().default(false),
      }))
      .mutation(async ({ ctx, input }) => {
        const { spawn } = require('child_process');
        const path = require('path');
        
        await db.createBotLog(
          ctx.user.id,
          'info',
          'Retreinamento iniciado',
          { updateData: input.updateData }
        );
        
        return new Promise((resolve, reject) => {
          const scriptPath = path.join(__dirname, '..', 'scripts', 'retrain.py');
          const args = ['python3', scriptPath];
          if (input.updateData) {
            args.push('--update-data');
          }
          
          const python = spawn(args[0], args.slice(1));
          
          python.on('close', async (code: number) => {
            if (code !== 0) {
              await db.createBotLog(
                ctx.user.id,
                'error',
                'Retreinamento falhou'
              );
              reject(new Error('Retreinamento falhou'));
              return;
            }
            
            await db.createBotLog(
              ctx.user.id,
              'info',
              'Retreinamento concluído com sucesso'
            );
            
            resolve({ success: true, message: 'Retreinamento concluído' });
          });
        });
      }),

    logs: protectedProcedure.query(async () => {
      const fs = require('fs');
      const path = require('path');
      
      try {
        const logPath = path.join(__dirname, '..', 'retrain_log.json');
        const logs = JSON.parse(fs.readFileSync(logPath, 'utf8'));
        return logs.slice(-10); // Últimos 10 logs
      } catch (error) {
        return [];
      }
    }),
  }),
});

export type AppRouter = typeof appRouter;
