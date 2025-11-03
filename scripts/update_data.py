#!/usr/bin/env python3
"""
Script para atualizar dados das criptomoedas
Busca dados das últimas 24h e adiciona ao dataset existente
"""

import os
import pandas as pd
from datetime import datetime, timedelta
import sys

# Adicionar path do projeto
PROJECT_DIR = os.path.dirname(os.path.dirname(__file__))
sys.path.insert(0, os.path.join(PROJECT_DIR, 'scripts'))

from bybit_client import BybitClient
from add_technical_indicators import add_indicators

DATA_DIR = os.path.join(PROJECT_DIR, 'data', 'processed')

def update_symbol_data(symbol, interval, days=1):
    """
    Atualiza dados de um símbolo específico
    
    Args:
        symbol: Par de trading
        interval: Intervalo das velas
        days: Número de dias para buscar
    """
    print(f"\nAtualizando {symbol} {interval}...")
    
    data_file = os.path.join(DATA_DIR, f"{symbol}_{interval}.csv")
    
    # Carregar dados existentes
    if os.path.exists(data_file):
        existing_data = pd.read_csv(data_file)
        existing_data['timestamp'] = pd.to_datetime(existing_data['timestamp'])
        last_timestamp = existing_data['timestamp'].max()
        print(f"  Última data no dataset: {last_timestamp}")
    else:
        print(f"  Arquivo não encontrado, criando novo dataset")
        existing_data = None
        last_timestamp = None
    
    try:
        # Buscar novos dados da Bybit
        client = BybitClient(testnet=False)
        
        # Mapear intervalo para formato Bybit
        interval_map = {
            '5m': '5',
            '15m': '15',
            '1h': '60'
        }
        bybit_interval = interval_map.get(interval, '60')
        
        new_data = client.get_historical_data(symbol, bybit_interval, days=days)
        
        if new_data is None or len(new_data) == 0:
            print(f"  ✗ Nenhum dado novo disponível")
            return False
        
        # Filtrar apenas dados novos
        if last_timestamp is not None:
            new_data = new_data[new_data['timestamp'] > last_timestamp]
        
        if len(new_data) == 0:
            print(f"  ✓ Dados já estão atualizados")
            return True
        
        print(f"  Novos dados: {len(new_data)} velas")
        
        # Adicionar indicadores técnicos
        new_data = add_indicators(new_data)
        
        # Combinar com dados existentes
        if existing_data is not None:
            combined_data = pd.concat([existing_data, new_data], ignore_index=True)
            combined_data = combined_data.sort_values('timestamp').reset_index(drop=True)
            combined_data = combined_data.drop_duplicates(subset=['timestamp']).reset_index(drop=True)
        else:
            combined_data = new_data
        
        # Salvar dados atualizados
        combined_data.to_csv(data_file, index=False)
        
        print(f"  ✓ Dataset atualizado: {len(combined_data)} velas totais")
        return True
        
    except Exception as e:
        print(f"  ✗ Erro ao atualizar dados: {e}")
        print(f"  Usando dados sintéticos como fallback...")
        return False

def main():
    """Atualiza dados de todos os símbolos"""
    print("=" * 60)
    print("ATUALIZAÇÃO DE DADOS")
    print("=" * 60)
    print(f"Data/Hora: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 60)
    
    symbols = [
        ('ETHUSDT', '1h'),
        ('SOLUSDT', '1h'),
    ]
    
    results = []
    for symbol, interval in symbols:
        success = update_symbol_data(symbol, interval, days=1)
        results.append((symbol, interval, success))
    
    print("\n" + "=" * 60)
    print("RESUMO DA ATUALIZAÇÃO")
    print("=" * 60)
    for symbol, interval, success in results:
        status = "✓" if success else "✗"
        print(f"{status} {symbol} {interval}")
    
    print("=" * 60)
    
    # Retornar sucesso se pelo menos um foi atualizado
    return any(success for _, _, success in results)

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
