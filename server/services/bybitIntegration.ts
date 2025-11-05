import { getDb } from "../db";
import { historicalData } from "../../drizzle/schema";

/**
 * Serviço de integração com Bybit
 * Busca dados em tempo real e armazena no banco de dados
 */

interface BybitCandle {
  timestamp: string;
  open: string;
  high: string;
  low: string;
  close: string;
  volume: string;
}

interface MarketData {
  symbol: string;
  interval: string;
  timestamp: Date;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

const BYBIT_API_BASE = "https://api.bybit.com/v5/market";
const SYMBOLS = ["BTCUSDT", "ETHUSDT", "SOLUSDT"];
const INTERVALS = ["5", "15", "30", "60"]; // 5m, 15m, 30m, 1h

/**
 * Busca dados de velas do Bybit
 */
export async function fetchBybitCandles(
  symbol: string,
  interval: string,
  limit: number = 100
): Promise<BybitCandle[]> {
  try {
    const url = `${BYBIT_API_BASE}/klines?category=spot&symbol=${symbol}&interval=${interval}&limit=${limit}`;
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Bybit API error: ${response.statusText}`);
    }

    const data = await response.json();
    const candles = data.result?.list || [];

    return candles.map((candle: any[]) => ({
      timestamp: candle[0],
      open: candle[1],
      high: candle[2],
      low: candle[3],
      close: candle[4],
      volume: candle[5],
    }));
  } catch (error) {
    console.error(`[BybitIntegration] Erro ao buscar candles de ${symbol}:`, error);
    return [];
  }
}

/**
 * Busca dados de ticker (preço atual)
 */
export async function fetchBybitTicker(symbol: string): Promise<{
  price: number;
  change24h: number;
  volume24h: number;
} | null> {
  try {
    const url = `${BYBIT_API_BASE}/tickers?category=spot&symbol=${symbol}`;
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Bybit API error: ${response.statusText}`);
    }

    const data = await response.json();
    const ticker = data.result?.list?.[0];

    if (!ticker) return null;

    return {
      price: parseFloat(ticker.lastPrice),
      change24h: parseFloat(ticker.price24hPcnt) * 100,
      volume24h: parseFloat(ticker.volume24h),
    };
  } catch (error) {
    console.error(`[BybitIntegration] Erro ao buscar ticker de ${symbol}:`, error);
    return null;
  }
}

/**
 * Armazena dados históricos no banco de dados
 */
export async function storeHistoricalData(
  marketData: MarketData[]
): Promise<boolean> {
  try {
    const db = await getDb();
    if (!db) {
      console.error("[BybitIntegration] Banco de dados não disponível");
      return false;
    }

    for (const data of marketData) {
      await db.insert(historicalData).values({
        symbol: data.symbol,
        interval: data.interval,
        timestamp: data.timestamp,
        open: data.open.toString(),
        high: data.high.toString(),
        low: data.low.toString(),
        close: data.close.toString(),
        volume: data.volume.toString(),
      });
    }

    console.log(`[BybitIntegration] ${marketData.length} registros armazenados`);
    return true;
  } catch (error) {
    console.error("[BybitIntegration] Erro ao armazenar dados:", error);
    return false;
  }
}

/**
 * Busca e armazena dados de múltiplos pares e intervalos
 */
export async function fetchAndStoreMarketData(): Promise<void> {
  console.log("[BybitIntegration] Iniciando coleta de dados de mercado...");

  const allMarketData: MarketData[] = [];

  for (const symbol of SYMBOLS) {
    for (const interval of INTERVALS) {
      try {
        const candles = await fetchBybitCandles(symbol, interval, 50);

        if (candles.length === 0) {
          console.warn(`[BybitIntegration] Nenhum candle obtido para ${symbol} ${interval}m`);
          continue;
        }

        const marketData = candles.map((candle) => ({
          symbol,
          interval: `${interval}m`,
          timestamp: new Date(parseInt(candle.timestamp)),
          open: parseFloat(candle.open),
          high: parseFloat(candle.high),
          low: parseFloat(candle.low),
          close: parseFloat(candle.close),
          volume: parseFloat(candle.volume),
        }));

        allMarketData.push(...marketData);
        console.log(`[BybitIntegration] ${marketData.length} candles obtidos para ${symbol} ${interval}m`);
      } catch (error) {
        console.error(`[BybitIntegration] Erro ao processar ${symbol} ${interval}m:`, error);
      }
    }
  }

  // Armazenar todos os dados
  if (allMarketData.length > 0) {
    await storeHistoricalData(allMarketData);
  }
}

/**
 * Busca dados de mercado em tempo real para todos os pares
 */
export async function getRealtimeMarketData(): Promise<{
  [symbol: string]: {
    price: number;
    change24h: number;
    volume24h: number;
  };
}> {
  console.log("[BybitIntegration] Buscando dados em tempo real...");

  const realtimeData: {
    [symbol: string]: {
      price: number;
      change24h: number;
      volume24h: number;
    };
  } = {};

  for (const symbol of SYMBOLS) {
    const ticker = await fetchBybitTicker(symbol);
    if (ticker) {
      realtimeData[symbol] = ticker;
      console.log(`[BybitIntegration] ${symbol}: $${ticker.price.toFixed(2)} (${ticker.change24h.toFixed(2)}%)`);
    }
  }

  return realtimeData;
}

/**
 * Agenda coleta de dados a cada 5 minutos
 */
export function scheduleMarketDataCollection(): void {
  console.log("[BybitIntegration] Agendando coleta de dados a cada 5 minutos...");

  // Executar imediatamente
  fetchAndStoreMarketData();

  // Agendar para rodar a cada 5 minutos
  setInterval(() => {
    fetchAndStoreMarketData();
  }, 5 * 60 * 1000);
}

/**
 * Agenda atualização de dados em tempo real a cada 1 minuto
 */
export function scheduleRealtimeDataUpdate(): void {
  console.log("[BybitIntegration] Agendando atualização de dados em tempo real a cada 1 minuto...");

  // Executar imediatamente
  getRealtimeMarketData();

  // Agendar para rodar a cada 1 minuto
  setInterval(() => {
    getRealtimeMarketData();
  }, 60 * 1000);
}
