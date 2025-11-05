/**
 * Trading Bot Service
 * Gerencia análise de mercado e execução de trades usando modelos de IA
 */

import * as db from './db';
import path from 'path';
import { spawn } from 'child_process';

const MODELS_DIR = path.join(__dirname, '..', 'models');
const SCRIPTS_DIR = path.join(__dirname, '..', 'scripts');

// Símbolos e intervalos suportados
const SUPPORTED_PAIRS = [
  { symbol: 'ETHUSDT', interval: '1h' },
  { symbol: 'SOLUSDT', interval: '1h' },
];

interface PredictionResult {
  symbol: string;
  interval: string;
  prediction: 'buy' | 'sell' | 'hold';
  confidence: number;
  currentPrice: number;
  indicators: any;
}

/**
 * Executa script Python para fazer predição usando modelo treinado
 */
async function runPrediction(symbol: string, interval: string): Promise<PredictionResult | null> {
  return new Promise((resolve, reject) => {
    const scriptPath = path.join(SCRIPTS_DIR, 'predict.py');
    
    const python = spawn('python3', [scriptPath, symbol, interval]);
    
    let stdout = '';
    let stderr = '';
    
    python.stdout.on('data', (data) => {
      stdout += data.toString();
    });
    
    python.stderr.on('data', (data) => {
      stderr += data.toString();
    });
    
    python.on('close', (code) => {
      if (code !== 0) {
        console.error(`Prediction script error for ${symbol} ${interval}:`, stderr);
        resolve(null);
        return;
      }
      
      try {
        const result = JSON.parse(stdout);
        resolve(result);
      } catch (error) {
        console.error(`Failed to parse prediction result for ${symbol} ${interval}:`, error);
        resolve(null);
      }
    });
    
    python.on('error', (error) => {
      console.error(`Failed to start prediction script:`, error);
      resolve(null);
    });
  });
}

/**
 * Analisa mercado para um par específico
 */
async function analyzeMarket(symbol: string, interval: string): Promise<PredictionResult | null> {
  try {
    console.log(`[Bot] Analyzing ${symbol} ${interval}...`);
    
    const prediction = await runPrediction(symbol, interval);
    
    if (!prediction) {
      console.log(`[Bot] No prediction available for ${symbol} ${interval}`);
      return null;
    }
    
    // TODO: Salvar análise no banco quando a tabela estiver disponível
    
    console.log(`[Bot] ${symbol} ${interval}: ${prediction.prediction.toUpperCase()} (${prediction.confidence}% confidence)`);
    
    return prediction;
  } catch (error) {
    console.error(`[Bot] Error analyzing ${symbol} ${interval}:`, error);
    return null;
  }
}

/**
 * Executa trade baseado na predição
 */
async function executeTrade(
  userId: number,
  prediction: PredictionResult,
  config: any
): Promise<boolean> {
  try {
    // Verificar se confiança está acima do threshold
    if (prediction.confidence < config.confidenceThreshold) {
      console.log(`[Bot] Confidence ${prediction.confidence}% below threshold ${config.confidenceThreshold}%`);
      return false;
    }
    
    // Verificar se já atingiu o limite diário de trades
    const todayTrades = await db.getTodayTradesCount(userId);
    if (todayTrades >= config.maxDailyTrades) {
      console.log(`[Bot] Daily trade limit reached: ${todayTrades}/${config.maxDailyTrades}`);
      return false;
    }
    
    // Verificar se já existe trade aberto para este símbolo
    const openTrades = await db.getOpenTrades(userId);
    const existingTrade = openTrades.find(t => 
      t.symbol === prediction.symbol && t.interval === prediction.interval
    );
    
    if (existingTrade) {
      console.log(`[Bot] Trade already open for ${prediction.symbol} ${prediction.interval}`);
      return false;
    }
    
    // Criar novo trade
    const quantity = 0.01; // Quantidade simulada (em produção, calcular baseado em balancePerTrade)
    
    await db.createTrade({
      userId,
      symbol: prediction.symbol,
      interval: prediction.interval,
      type: prediction.prediction as 'buy' | 'sell',
      entryPrice: prediction.currentPrice.toString(),
      exitPrice: null,
      quantity: quantity.toString(),
      status: 'open',
      profit: null,
      profitPercent: null,
      entryTime: new Date(),
      exitTime: null,
    });
    
    await db.createBotLog(
      userId,
      'info',
      `Trade ${prediction.prediction.toUpperCase()} executado para ${prediction.symbol}`,
      {
        symbol: prediction.symbol,
        interval: prediction.interval,
        type: prediction.prediction,
        price: prediction.currentPrice,
        confidence: prediction.confidence,
      }
    );
    
    console.log(`[Bot] Trade executed: ${prediction.prediction.toUpperCase()} ${prediction.symbol} @ ${prediction.currentPrice}`);
    
    return true;
  } catch (error) {
    console.error(`[Bot] Error executing trade:`, error);
    await db.createBotLog(userId, 'error', 'Erro ao executar trade', { error: String(error) });
    return false;
  }
}

/**
 * Monitora trades abertos e fecha quando atingir stop-loss ou take-profit
 */
async function monitorOpenTrades(userId: number, config: any) {
  try {
    const openTrades = await db.getOpenTrades(userId);
    
    for (const trade of openTrades) {
      // TODO: Buscar preço atual quando a função estiver disponível
      // Por enquanto, usar preço de entrada como referência
      const entryPrice = parseFloat(trade.entryPrice);
      const currentPrice = entryPrice; // Placeholder
      
      // Calcular variação percentual
      const priceChange = ((currentPrice - entryPrice) / entryPrice) * 100;
      
      // Ajustar sinal baseado no tipo de trade
      const effectiveChange = trade.type === 'buy' ? priceChange : -priceChange;
      
      const stopLoss = parseFloat(config.stopLoss);
      const takeProfit = parseFloat(config.takeProfit);
      
      // Verificar se deve fechar o trade
      let shouldClose = false;
      let reason = '';
      
      if (effectiveChange <= -stopLoss) {
        shouldClose = true;
        reason = 'Stop-loss atingido';
      } else if (effectiveChange >= takeProfit) {
        shouldClose = true;
        reason = 'Take-profit atingido';
      }
      
      if (shouldClose) {
        const quantity = parseFloat(trade.quantity);
        const profit = (currentPrice - entryPrice) * quantity * (trade.type === 'buy' ? 1 : -1);
        const profitPercentage = effectiveChange;
        
        await db.closeTrade(
          trade.id,
          currentPrice.toString(),
          profit.toString(),
          profitPercentage.toString()
        );
        
        await db.createBotLog(
          userId,
          'info',
          `Trade fechado: ${reason}`,
          {
            symbol: trade.symbol,
            type: trade.type,
            entryPrice,
            exitPrice: currentPrice,
            profit,
            profitPercentage,
          }
        );
        
        console.log(`[Bot] Trade closed: ${trade.symbol} ${trade.type} - ${reason} - Profit: ${profitPercentage.toFixed(2)}%`);
      }
    }
  } catch (error) {
    console.error(`[Bot] Error monitoring trades:`, error);
  }
}

/**
 * Loop principal do bot
 */
export async function runBotCycle(userId: number) {
  try {
    // Buscar configuração do bot
    const config = await db.getBotConfig(userId);
    
    if (!config || !config.isActive) {
      console.log(`[Bot] Bot is not active for user ${userId}`);
      return;
    }
    
    console.log(`[Bot] Running cycle for user ${userId}...`);
    
    // Analisar todos os pares suportados
    for (const pair of SUPPORTED_PAIRS) {
      const prediction = await analyzeMarket(pair.symbol, pair.interval);
      
      if (prediction && prediction.prediction !== 'hold') {
        await executeTrade(userId, prediction, config);
      }
    }
    
    // Monitorar trades abertos
    await monitorOpenTrades(userId, config);
    
    console.log(`[Bot] Cycle completed for user ${userId}`);
  } catch (error) {
    console.error(`[Bot] Error in bot cycle:`, error);
    await db.createBotLog(userId, 'error', 'Erro no ciclo do bot', { error: String(error) });
  }
}

/**
 * Inicia bot para todos os usuários ativos
 */
export async function runBotForAllUsers() {
  // Por enquanto, vamos usar o owner como usuário padrão
  // Em produção, buscar todos os usuários com bot ativo
  const userId = 1; // Assumindo que o owner é o primeiro usuário
  
  await runBotCycle(userId);
}
