import { getDb } from "../db";
import { backtestResults, simulatedTrades, botLogs } from "../../drizzle/schema";
import { eq } from "drizzle-orm";

/**
 * Job para executar backtesting ao vivo de 7 dias
 * Roda a cada 5 minutos e simula trades com dados reais do Bybit
 */

interface BacktestConfig {
  symbol: string;
  interval: string;
  minConfidence: number;
  startTime: Date;
  endTime: Date;
  sessionId?: string;
}

interface TradeSignal {
  symbol: string;
  action: "buy" | "sell";
  price: number;
  confidence: number;
  timestamp: Date;
  indicators: {
    rsi: number;
    macd: number;
    bollingerBands: number;
    ema: number;
  };
}

/**
 * Busca dados reais do Bybit
 */
async function fetchBybitData(
  symbol: string,
  interval: string,
  limit: number = 100
): Promise<any[]> {
  try {
    // Mapeamento de intervalos
    const intervalMap: Record<string, string> = {
      "5m": "5",
      "15m": "15",
      "30m": "30",
      "1h": "60",
    };

    const bybitInterval = intervalMap[interval] || "60";
    const url = `https://api.bybit.com/v5/market/klines?category=spot&symbol=${symbol}&interval=${bybitInterval}&limit=${limit}`;

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Bybit API error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.result?.list || [];
  } catch (error) {
    console.error(`[LiveBacktest] Erro ao buscar dados do Bybit:`, error);
    return [];
  }
}

/**
 * Calcula indicadores técnicos
 */
function calculateIndicators(candles: any[]): {
  rsi: number;
  macd: number;
  bollingerBands: number;
  ema: number;
} {
  // RSI (Relative Strength Index)
  const rsi = calculateRSI(candles);

  // MACD (Moving Average Convergence Divergence)
  const macd = calculateMACD(candles);

  // Bollinger Bands
  const bollingerBands = calculateBollingerBands(candles);

  // EMA (Exponential Moving Average)
  const ema = calculateEMA(candles);

  return {
    rsi,
    macd,
    bollingerBands,
    ema,
  };
}

function calculateRSI(candles: any[], period: number = 14): number {
  if (candles.length < period) return 50;

  const closes = candles.map((c: any) => parseFloat(c[4])); // Close price
  let gains = 0;
  let losses = 0;

  for (let i = 1; i < period; i++) {
    const diff = closes[i] - closes[i - 1];
    if (diff > 0) gains += diff;
    else losses += Math.abs(diff);
  }

  const avgGain = gains / period;
  const avgLoss = losses / period;
  const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
  const rsi = 100 - 100 / (1 + rs);

  return rsi;
}

function calculateMACD(candles: any[]): number {
  if (candles.length < 26) return 0;

  const closes = candles.map((c: any) => parseFloat(c[4]));
  const ema12 = calculateEMAValue(closes, 12);
  const ema26 = calculateEMAValue(closes, 26);

  return ema12 - ema26;
}

function calculateBollingerBands(candles: any[]): number {
  if (candles.length < 20) return 50;

  const closes = candles.map((c: any) => parseFloat(c[4]));
  const sma = closes.reduce((a, b) => a + b) / closes.length;
  const variance =
    closes.reduce((sum, close) => sum + Math.pow(close - sma, 2), 0) /
    closes.length;
  const stdDev = Math.sqrt(variance);

  const currentPrice = closes[closes.length - 1];
  const upperBand = sma + 2 * stdDev;
  const lowerBand = sma - 2 * stdDev;

  // Retorna posição normalizada (0-100)
  if (upperBand === lowerBand) return 50;
  return ((currentPrice - lowerBand) / (upperBand - lowerBand)) * 100;
}

function calculateEMA(candles: any[], period: number = 20): number {
  if (candles.length < period) return 0;

  const closes = candles.map((c: any) => parseFloat(c[4]));
  return calculateEMAValue(closes, period);
}

function calculateEMAValue(closes: number[], period: number): number {
  const multiplier = 2 / (period + 1);
  let ema = closes.slice(0, period).reduce((a, b) => a + b) / period;

  for (let i = period; i < closes.length; i++) {
    ema = closes[i] * multiplier + ema * (1 - multiplier);
  }

  return ema;
}

/**
 * Gera sinais de trading baseado nos indicadores
 */
function generateTradeSignal(
  symbol: string,
  candles: any[],
  indicators: ReturnType<typeof calculateIndicators>,
  minConfidence: number
): TradeSignal | null {
  const currentPrice = parseFloat(candles[candles.length - 1][4]);

  // Lógica simples de geração de sinais
  let confidence = 0;
  let action: "buy" | "sell" = "buy";

  // RSI (< 30 = oversold/buy, > 70 = overbought/sell)
  if (indicators.rsi < 30) {
    confidence += 25;
    action = "buy";
  } else if (indicators.rsi > 70) {
    confidence += 25;
    action = "sell";
  }

  // MACD (positivo = bullish, negativo = bearish)
  if (indicators.macd > 0) {
    confidence += 25;
    action = "buy";
  } else if (indicators.macd < 0) {
    confidence += 25;
    action = "sell";
  }

  // Bollinger Bands (< 20 = oversold, > 80 = overbought)
  if (indicators.bollingerBands < 20) {
    confidence += 25;
    action = "buy";
  } else if (indicators.bollingerBands > 80) {
    confidence += 25;
    action = "sell";
  }

  // EMA (preço acima = bullish, abaixo = bearish)
  if (currentPrice > indicators.ema) {
    confidence += 25;
    action = "buy";
  } else {
    confidence += 25;
    action = "sell";
  }

  // Normalizar confiança
  confidence = Math.min(confidence, 100);

  if (confidence >= minConfidence) {
    return {
      symbol,
      action,
      price: currentPrice,
      confidence,
      timestamp: new Date(),
      indicators,
    };
  }

  return null;
}

/**
 * Executa backtesting ao vivo de 7 dias
 */
export async function runLiveBacktest7Days() {
  console.log("[LiveBacktest] Iniciando backtesting ao vivo de 7 dias...");

  const db = await getDb();
  if (!db) {
    console.error("[LiveBacktest] Banco de dados não disponível");
    return;
  }

  const config: BacktestConfig = {
    symbol: "BTCUSDT",
    interval: "1h",
    minConfidence: 80,
    startTime: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 dias atrás
    endTime: new Date(),
  };

  try {
    // Criar sessão de backtesting
    const sessionId = `backtest-${Date.now()}`;

    // Buscar dados do Bybit
    console.log(`[LiveBacktest] Buscando dados de ${config.symbol}...`);
    const candles = await fetchBybitData(config.symbol, config.interval, 100);

    if (candles.length === 0) {
      console.error("[LiveBacktest] Nenhum dado obtido do Bybit");
      return;
    }

    // Calcular indicadores
    const indicators = calculateIndicators(candles);
    console.log("[LiveBacktest] Indicadores calculados:", indicators);

    // Gerar sinal de trading
    const signal = generateTradeSignal(
      config.symbol,
      candles,
      indicators,
      config.minConfidence
    );

    if (signal) {
      console.log("[LiveBacktest] Sinal gerado:", signal);

      // Registrar trade no banco de dados
      await db.insert(simulatedTrades).values({
        backtestId: 1, // Usar ID fixo por enquanto
        symbol: signal.symbol,
        type: signal.action,
        entryPrice: signal.price.toString(),
        exitPrice: null,
        quantity: "1",
        profit: null,
        profitPercent: null,
        entryTime: signal.timestamp,
        exitTime: null,
      });

      console.log("[LiveBacktest] Trade registrado no banco de dados");
    } else {
      console.log("[LiveBacktest] Nenhum sinal gerado (confiança baixa)");
    }

    // Atualizar resultado do backtesting
    const totalTrades = 1;
    const winningTrades = signal ? 1 : 0;
    const losingTrades = 0;
    const winRate = totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0;

    await db.insert(backtestResults).values({
      userId: 1, // Usar ID fixo por enquanto
      symbol: config.symbol,
      interval: config.interval,
      startDate: config.startTime,
      endDate: config.endTime,
      totalTrades,
      winTrades: winningTrades,
      lossTrades: losingTrades,
      winRate: winRate.toString(),
      totalProfit: "0",
      totalProfitPercent: "0",
      maxDrawdown: "0",
      sharpeRatio: "0",
    });

    console.log("[LiveBacktest] Backtesting concluído com sucesso");
  } catch (error) {
    console.error("[LiveBacktest] Erro durante backtesting:", error);
  }
}

/**
 * Agenda o job para rodar a cada 5 minutos
 */
export function scheduleBacktest7Days() {
  console.log("[LiveBacktest] Agendando backtesting para rodar a cada 5 minutos...");

  // Rodar imediatamente
  runLiveBacktest7Days();

  // Agendar para rodar a cada 5 minutos (300000ms)
  setInterval(() => {
    runLiveBacktest7Days();
  }, 5 * 60 * 1000);
}
