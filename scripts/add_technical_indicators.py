#!/usr/bin/env python3
"""
Script para adicionar indicadores técnicos aos dados históricos
Adiciona: EMA, RSI, MACD e SMA (Moving Average)
"""

import os
import pandas as pd
import numpy as np
from ta.trend import EMAIndicator, MACD, SMAIndicator
from ta.momentum import RSIIndicator

# Diretórios
DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'data', 'historical')
PROCESSED_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'data', 'processed')

os.makedirs(PROCESSED_DIR, exist_ok=True)

def add_technical_indicators(df):
    """
    Adiciona indicadores técnicos ao DataFrame
    
    Args:
        df: DataFrame com colunas timestamp, open, high, low, close, volume
    
    Returns:
        DataFrame com indicadores adicionados
    """
    # Criar cópia para não modificar original
    df = df.copy()
    
    # 1. EMA (Exponential Moving Average) - 9, 21, 50 períodos
    df['ema_9'] = EMAIndicator(close=df['close'], window=9).ema_indicator()
    df['ema_21'] = EMAIndicator(close=df['close'], window=21).ema_indicator()
    df['ema_50'] = EMAIndicator(close=df['close'], window=50).ema_indicator()
    
    # 2. SMA (Simple Moving Average) - 20, 50, 200 períodos
    df['sma_20'] = SMAIndicator(close=df['close'], window=20).sma_indicator()
    df['sma_50'] = SMAIndicator(close=df['close'], window=50).sma_indicator()
    df['sma_200'] = SMAIndicator(close=df['close'], window=200).sma_indicator()
    
    # 3. RSI (Relative Strength Index) - 14 períodos
    df['rsi'] = RSIIndicator(close=df['close'], window=14).rsi()
    
    # 4. MACD (Moving Average Convergence Divergence)
    macd = MACD(close=df['close'], window_slow=26, window_fast=12, window_sign=9)
    df['macd'] = macd.macd()
    df['macd_signal'] = macd.macd_signal()
    df['macd_diff'] = macd.macd_diff()
    
    # 5. Indicadores adicionais úteis para trading
    
    # Bollinger Bands (usando SMA 20)
    df['bb_middle'] = df['sma_20']
    rolling_std = df['close'].rolling(window=20).std()
    df['bb_upper'] = df['bb_middle'] + (rolling_std * 2)
    df['bb_lower'] = df['bb_middle'] - (rolling_std * 2)
    
    # Volume médio
    df['volume_sma'] = df['volume'].rolling(window=20).mean()
    
    # Variação percentual do preço
    df['price_change_pct'] = df['close'].pct_change() * 100
    
    # Volatilidade (desvio padrão dos retornos)
    df['volatility'] = df['price_change_pct'].rolling(window=20).std()
    
    # Remover linhas com NaN (primeiras linhas onde indicadores não podem ser calculados)
    df = df.dropna().reset_index(drop=True)
    
    return df

def process_all_files():
    """Processa todos os arquivos CSV adicionando indicadores técnicos"""
    print("=" * 60)
    print("ADICIONANDO INDICADORES TÉCNICOS")
    print("=" * 60)
    print(f"Diretório de entrada: {DATA_DIR}")
    print(f"Diretório de saída: {PROCESSED_DIR}")
    print("=" * 60)
    
    # Listar todos os arquivos CSV
    csv_files = [f for f in os.listdir(DATA_DIR) if f.endswith('.csv')]
    
    if not csv_files:
        print("✗ Nenhum arquivo CSV encontrado no diretório de dados")
        return
    
    print(f"\nArquivos encontrados: {len(csv_files)}")
    
    for filename in csv_files:
        print(f"\nProcessando: {filename}")
        
        # Ler dados
        input_path = os.path.join(DATA_DIR, filename)
        df = pd.read_csv(input_path)
        df['timestamp'] = pd.to_datetime(df['timestamp'])
        
        print(f"  - Velas originais: {len(df)}")
        
        # Adicionar indicadores
        df_processed = add_technical_indicators(df)
        
        print(f"  - Velas após processamento: {len(df_processed)}")
        print(f"  - Indicadores adicionados: {len(df_processed.columns) - len(df.columns)}")
        
        # Salvar dados processados
        output_path = os.path.join(PROCESSED_DIR, filename)
        df_processed.to_csv(output_path, index=False)
        
        print(f"✓ Salvo em: {output_path}")
        
        # Mostrar preview dos indicadores
        print(f"\n  Preview dos últimos valores:")
        last_row = df_processed.iloc[-1]
        print(f"    Close: ${last_row['close']:.2f}")
        print(f"    EMA(9): ${last_row['ema_9']:.2f}")
        print(f"    EMA(21): ${last_row['ema_21']:.2f}")
        print(f"    RSI: {last_row['rsi']:.2f}")
        print(f"    MACD: {last_row['macd']:.2f}")
        print(f"    MACD Signal: {last_row['macd_signal']:.2f}")
    
    print("\n" + "=" * 60)
    print("PROCESSAMENTO CONCLUÍDO!")
    print("=" * 60)
    
    # Resumo
    print("\nArquivos processados:")
    for filename in csv_files:
        output_path = os.path.join(PROCESSED_DIR, filename)
        if os.path.exists(output_path):
            size = os.path.getsize(output_path) / 1024
            num_lines = sum(1 for _ in open(output_path)) - 1
            print(f"  - {filename} ({size:.2f} KB, {num_lines} velas)")

if __name__ == "__main__":
    process_all_files()
