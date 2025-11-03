#!/usr/bin/env python3
"""
Script para coletar dados históricos de criptomoedas
Coleta 1 ano de dados para BTCUSDT, ETHUSDT e SOLUSDT
com intervalos de 5m, 15m e 1h usando CCXT (Binance)
"""

import os
import sys
import time
import json
from datetime import datetime, timedelta
import pandas as pd
import ccxt

# Configurações
SYMBOLS = ['BTC/USDT', 'ETH/USDT', 'SOL/USDT']
SYMBOL_NAMES = {'BTC/USDT': 'BTCUSDT', 'ETH/USDT': 'ETHUSDT', 'SOL/USDT': 'SOLUSDT'}
INTERVALS = ['5m', '15m', '1h']
DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'data', 'historical')

# Criar diretório de dados se não existir
os.makedirs(DATA_DIR, exist_ok=True)

def collect_data_for_symbol(exchange, symbol, timeframe, days=365):
    """
    Coleta dados históricos para um símbolo e intervalo específicos
    
    Args:
        exchange: Instância da exchange (ccxt)
        symbol: Símbolo da cripto (ex: BTC/USDT)
        timeframe: Intervalo (5m, 15m, 1h)
        days: Número de dias para coletar (padrão: 365)
    
    Returns:
        DataFrame com os dados coletados
    """
    symbol_name = SYMBOL_NAMES[symbol]
    print(f"\nColetando dados para {symbol_name} - Intervalo: {timeframe}")
    
    # Calcular timestamps
    since = exchange.parse8601((datetime.now() - timedelta(days=days)).isoformat())
    
    all_ohlcv = []
    
    try:
        # Coletar dados em chunks
        while True:
            try:
                ohlcv = exchange.fetch_ohlcv(symbol, timeframe, since=since, limit=1000)
                
                if not ohlcv:
                    break
                
                all_ohlcv.extend(ohlcv)
                
                # Atualizar since para o próximo batch
                since = ohlcv[-1][0] + 1
                
                print(f"  Coletadas {len(ohlcv)} velas. Total: {len(all_ohlcv)}")
                
                # Se recebemos menos que o limite, chegamos ao fim
                if len(ohlcv) < 1000:
                    break
                
                # Rate limiting
                time.sleep(exchange.rateLimit / 1000)
                
            except ccxt.NetworkError as e:
                print(f"  Erro de rede: {e}. Tentando novamente...")
                time.sleep(5)
                continue
            except ccxt.ExchangeError as e:
                print(f"  Erro da exchange: {e}")
                break
        
        # Converter para DataFrame
        if all_ohlcv:
            df = pd.DataFrame(all_ohlcv, columns=[
                'timestamp', 'open', 'high', 'low', 'close', 'volume'
            ])
            
            # Converter timestamp para datetime
            df['timestamp'] = pd.to_datetime(df['timestamp'], unit='ms')
            
            # Converter tipos numéricos
            for col in ['open', 'high', 'low', 'close', 'volume']:
                df[col] = df[col].astype(float)
            
            # Remover duplicatas
            df = df.drop_duplicates(subset=['timestamp']).reset_index(drop=True)
            
            # Ordenar por timestamp
            df = df.sort_values('timestamp').reset_index(drop=True)
            
            print(f"✓ Coletadas {len(df)} velas de {df['timestamp'].min()} até {df['timestamp'].max()}")
            
            return df
        else:
            print(f"✗ Nenhum dado coletado para {symbol_name} - {timeframe}")
            return pd.DataFrame()
            
    except Exception as e:
        print(f"✗ Erro ao coletar dados: {e}")
        return pd.DataFrame()

def main():
    """Função principal para coletar todos os dados"""
    print("=" * 60)
    print("COLETA DE DADOS HISTÓRICOS DE CRIPTOMOEDAS")
    print("=" * 60)
    print(f"Símbolos: {', '.join([SYMBOL_NAMES[s] for s in SYMBOLS])}")
    print(f"Intervalos: {', '.join(INTERVALS)}")
    print(f"Período: 1 ano")
    print(f"Fonte: Binance (via CCXT)")
    print(f"Diretório de saída: {DATA_DIR}")
    print("=" * 60)
    
    # Inicializar exchange
    try:
        exchange = ccxt.binance({
            'enableRateLimit': True,
            'options': {
                'defaultType': 'future',  # USDT perpetual futures
            }
        })
        
        # Verificar se a exchange suporta OHLCV
        if not exchange.has['fetchOHLCV']:
            print("✗ Exchange não suporta fetch OHLCV")
            return
        
        print(f"✓ Conectado à {exchange.name}")
        
    except Exception as e:
        print(f"✗ Erro ao inicializar exchange: {e}")
        return
    
    # Coletar dados para cada combinação de símbolo e intervalo
    collected_files = []
    
    for symbol in SYMBOLS:
        for timeframe in INTERVALS:
            df = collect_data_for_symbol(exchange, symbol, timeframe, days=365)
            
            if not df.empty:
                # Salvar em CSV
                symbol_name = SYMBOL_NAMES[symbol]
                filename = f"{symbol_name}_{timeframe}.csv"
                filepath = os.path.join(DATA_DIR, filename)
                df.to_csv(filepath, index=False)
                print(f"✓ Dados salvos em: {filepath}")
                collected_files.append((filename, filepath))
            
            # Pausa entre requisições
            time.sleep(1)
    
    print("\n" + "=" * 60)
    print("COLETA CONCLUÍDA!")
    print("=" * 60)
    
    # Resumo dos arquivos criados
    if collected_files:
        print("\nArquivos criados:")
        for filename, filepath in collected_files:
            if os.path.exists(filepath):
                size = os.path.getsize(filepath) / 1024  # KB
                num_lines = sum(1 for _ in open(filepath)) - 1  # -1 para header
                print(f"  - {filename} ({size:.2f} KB, {num_lines} velas)")
    else:
        print("\n✗ Nenhum arquivo foi criado. Verifique os erros acima.")

if __name__ == "__main__":
    main()
