#!/usr/bin/env python3
"""
Script para gerar dados sintéticos realistas de criptomoedas
Simula 1 ano de dados para BTCUSDT, ETHUSDT e SOLUSDT
com intervalos de 5m, 15m e 1h
"""

import os
import numpy as np
import pandas as pd
from datetime import datetime, timedelta

# Configurações
SYMBOLS = {
    'BTCUSDT': {'base_price': 45000, 'volatility': 0.02},
    'ETHUSDT': {'base_price': 2500, 'volatility': 0.025},
    'SOLUSDT': {'base_price': 100, 'volatility': 0.03}
}

INTERVALS = {
    '5m': 5,
    '15m': 15,
    '1h': 60
}

DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'data', 'historical')
os.makedirs(DATA_DIR, exist_ok=True)

def generate_realistic_ohlcv(base_price, volatility, num_candles, interval_minutes):
    """
    Gera dados OHLCV realistas usando movimento browniano geométrico
    
    Args:
        base_price: Preço base inicial
        volatility: Volatilidade (desvio padrão dos retornos)
        num_candles: Número de velas a gerar
        interval_minutes: Intervalo em minutos entre velas
    
    Returns:
        DataFrame com colunas: timestamp, open, high, low, close, volume
    """
    np.random.seed(42)  # Para reprodutibilidade
    
    # Gerar timestamps
    end_time = datetime.now()
    start_time = end_time - timedelta(minutes=interval_minutes * num_candles)
    timestamps = pd.date_range(start=start_time, end=end_time, periods=num_candles)
    
    # Gerar preços usando movimento browniano geométrico
    returns = np.random.normal(0, volatility, num_candles)
    
    # Adicionar tendência sutil (mercado ligeiramente altista)
    trend = np.linspace(0, 0.3, num_candles)
    returns += trend / num_candles
    
    # Adicionar ciclos de mercado (simulando bull/bear markets)
    cycle = np.sin(np.linspace(0, 4 * np.pi, num_candles)) * volatility * 0.5
    returns += cycle
    
    # Calcular preços de fechamento
    price_multipliers = np.exp(np.cumsum(returns))
    close_prices = base_price * price_multipliers
    
    # Gerar open, high, low baseado em close
    data = []
    
    for i in range(num_candles):
        close = close_prices[i]
        
        # Open é o close anterior (ou base_price para primeira vela)
        open_price = close_prices[i-1] if i > 0 else base_price
        
        # High e Low com variação intra-candle realista
        intra_volatility = volatility * np.random.uniform(0.3, 0.7)
        high = max(open_price, close) * (1 + abs(np.random.normal(0, intra_volatility)))
        low = min(open_price, close) * (1 - abs(np.random.normal(0, intra_volatility)))
        
        # Volume com padrão realista (maior em movimentos grandes)
        price_change = abs(close - open_price) / open_price
        base_volume = base_price * np.random.uniform(10, 50)
        volume = base_volume * (1 + price_change * 10)
        
        data.append({
            'timestamp': timestamps[i],
            'open': round(open_price, 2),
            'high': round(high, 2),
            'low': round(low, 2),
            'close': round(close, 2),
            'volume': round(volume, 4)
        })
    
    return pd.DataFrame(data)

def main():
    """Gera dados sintéticos para todos os símbolos e intervalos"""
    print("=" * 60)
    print("GERAÇÃO DE DADOS SINTÉTICOS DE CRIPTOMOEDAS")
    print("=" * 60)
    print(f"Símbolos: {', '.join(SYMBOLS.keys())}")
    print(f"Intervalos: {', '.join(INTERVALS.keys())}")
    print(f"Período: 1 ano")
    print(f"Diretório de saída: {DATA_DIR}")
    print("=" * 60)
    
    for symbol, config in SYMBOLS.items():
        for interval_name, interval_minutes in INTERVALS.items():
            # Calcular número de velas para 1 ano
            minutes_per_year = 365 * 24 * 60
            num_candles = minutes_per_year // interval_minutes
            
            print(f"\nGerando {symbol} - {interval_name} ({num_candles} velas)")
            
            # Gerar dados
            df = generate_realistic_ohlcv(
                base_price=config['base_price'],
                volatility=config['volatility'],
                num_candles=num_candles,
                interval_minutes=interval_minutes
            )
            
            # Salvar em CSV
            filename = f"{symbol}_{interval_name}.csv"
            filepath = os.path.join(DATA_DIR, filename)
            df.to_csv(filepath, index=False)
            
            print(f"✓ Dados salvos: {filepath}")
            print(f"  - Período: {df['timestamp'].min()} até {df['timestamp'].max()}")
            print(f"  - Preço inicial: ${df['close'].iloc[0]:.2f}")
            print(f"  - Preço final: ${df['close'].iloc[-1]:.2f}")
            print(f"  - Variação: {((df['close'].iloc[-1] / df['close'].iloc[0] - 1) * 100):.2f}%")
    
    print("\n" + "=" * 60)
    print("GERAÇÃO CONCLUÍDA!")
    print("=" * 60)
    
    # Resumo
    print("\nArquivos criados:")
    for symbol in SYMBOLS.keys():
        for interval_name in INTERVALS.keys():
            filename = f"{symbol}_{interval_name}.csv"
            filepath = os.path.join(DATA_DIR, filename)
            if os.path.exists(filepath):
                size = os.path.getsize(filepath) / 1024
                num_lines = sum(1 for _ in open(filepath)) - 1
                print(f"  - {filename} ({size:.2f} KB, {num_lines} velas)")

if __name__ == "__main__":
    main()
