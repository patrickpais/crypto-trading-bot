#!/usr/bin/env python3
"""
Cliente para integração com Bybit API
Gerencia coleta de dados e execução de trades
"""

import os
import sys
from datetime import datetime, timedelta
from pybit.unified_trading import HTTP
import pandas as pd
import time

class BybitClient:
    def __init__(self, testnet=False):
        """
        Inicializa cliente Bybit
        
        Args:
            testnet: Se True, usa testnet. Se False, usa produção.
        """
        api_key = os.getenv('BYBIT_API_KEY')
        api_secret = os.getenv('BYBIT_API_SECRET')
        
        if not api_key or not api_secret:
            raise ValueError("BYBIT_API_KEY and BYBIT_API_SECRET must be set")
        
        self.session = HTTP(
            testnet=testnet,
            api_key=api_key,
            api_secret=api_secret
        )
        
        self.testnet = testnet
    
    def get_klines(self, symbol, interval, start_time=None, end_time=None, limit=200):
        """
        Busca dados de velas (klines) da Bybit
        
        Args:
            symbol: Par de trading (ex: BTCUSDT)
            interval: Intervalo das velas (1, 3, 5, 15, 30, 60, 120, 240, 360, 720, D, W, M)
            start_time: Timestamp de início em milissegundos
            end_time: Timestamp de fim em milissegundos
            limit: Número máximo de velas (max 1000)
        
        Returns:
            DataFrame com dados OHLCV
        """
        try:
            response = self.session.get_kline(
                category="spot",
                symbol=symbol,
                interval=interval,
                start=start_time,
                end=end_time,
                limit=limit
            )
            
            if response['retCode'] != 0:
                raise Exception(f"Bybit API error: {response['retMsg']}")
            
            klines = response['result']['list']
            
            # Converter para DataFrame
            df = pd.DataFrame(klines, columns=[
                'timestamp', 'open', 'high', 'low', 'close', 'volume', 'turnover'
            ])
            
            # Converter tipos
            df['timestamp'] = pd.to_datetime(df['timestamp'].astype(int), unit='ms')
            for col in ['open', 'high', 'low', 'close', 'volume', 'turnover']:
                df[col] = df[col].astype(float)
            
            # Ordenar por timestamp (mais antigo primeiro)
            df = df.sort_values('timestamp').reset_index(drop=True)
            
            return df
            
        except Exception as e:
            print(f"Error fetching klines: {e}")
            return None
    
    def get_historical_data(self, symbol, interval, days=365):
        """
        Busca dados históricos completos
        
        Args:
            symbol: Par de trading
            interval: Intervalo das velas
            days: Número de dias para buscar
        
        Returns:
            DataFrame com dados históricos
        """
        print(f"Fetching {days} days of {symbol} {interval} data from Bybit...")
        
        # Calcular timestamps
        end_time = int(datetime.now().timestamp() * 1000)
        start_time = int((datetime.now() - timedelta(days=days)).timestamp() * 1000)
        
        all_data = []
        current_end = end_time
        
        # Mapear intervalo para milissegundos
        interval_ms = {
            '1': 60 * 1000,
            '3': 3 * 60 * 1000,
            '5': 5 * 60 * 1000,
            '15': 15 * 60 * 1000,
            '30': 30 * 60 * 1000,
            '60': 60 * 60 * 1000,
            '120': 120 * 60 * 1000,
            '240': 240 * 60 * 1000,
            'D': 24 * 60 * 60 * 1000,
        }.get(interval, 60 * 60 * 1000)
        
        # Buscar em lotes de 1000 velas
        while current_end > start_time:
            df = self.get_klines(symbol, interval, end_time=current_end, limit=1000)
            
            if df is None or len(df) == 0:
                break
            
            all_data.append(df)
            
            # Atualizar current_end para buscar velas mais antigas
            current_end = int(df['timestamp'].iloc[0].timestamp() * 1000) - 1
            
            print(f"  Fetched {len(df)} candles, oldest: {df['timestamp'].iloc[0]}")
            
            # Rate limiting
            time.sleep(0.1)
            
            # Verificar se chegamos ao início
            if current_end <= start_time:
                break
        
        if not all_data:
            return None
        
        # Combinar todos os dados
        result = pd.concat(all_data, ignore_index=True)
        result = result.sort_values('timestamp').reset_index(drop=True)
        result = result.drop_duplicates(subset=['timestamp']).reset_index(drop=True)
        
        print(f"✓ Total: {len(result)} candles from {result['timestamp'].iloc[0]} to {result['timestamp'].iloc[-1]}")
        
        return result
    
    def get_account_balance(self):
        """Busca saldo da conta"""
        try:
            response = self.session.get_wallet_balance(
                accountType="UNIFIED"
            )
            
            if response['retCode'] != 0:
                raise Exception(f"Bybit API error: {response['retMsg']}")
            
            return response['result']
        except Exception as e:
            print(f"Error fetching balance: {e}")
            return None
    
    def place_order(self, symbol, side, order_type, qty, price=None):
        """
        Coloca uma ordem na Bybit
        
        Args:
            symbol: Par de trading
            side: 'Buy' ou 'Sell'
            order_type: 'Market' ou 'Limit'
            qty: Quantidade
            price: Preço (obrigatório para Limit orders)
        
        Returns:
            Resposta da API
        """
        try:
            params = {
                "category": "spot",
                "symbol": symbol,
                "side": side,
                "orderType": order_type,
                "qty": str(qty),
            }
            
            if order_type == "Limit" and price:
                params["price"] = str(price)
            
            response = self.session.place_order(**params)
            
            if response['retCode'] != 0:
                raise Exception(f"Bybit API error: {response['retMsg']}")
            
            return response['result']
        except Exception as e:
            print(f"Error placing order: {e}")
            return None
    
    def get_ticker(self, symbol):
        """Busca preço atual de um símbolo"""
        try:
            response = self.session.get_tickers(
                category="spot",
                symbol=symbol
            )
            
            if response['retCode'] != 0:
                raise Exception(f"Bybit API error: {response['retMsg']}")
            
            ticker = response['result']['list'][0]
            return {
                'symbol': ticker['symbol'],
                'lastPrice': float(ticker['lastPrice']),
                'bid': float(ticker['bid1Price']),
                'ask': float(ticker['ask1Price']),
                'volume24h': float(ticker['volume24h']),
            }
        except Exception as e:
            print(f"Error fetching ticker: {e}")
            return None


def main():
    """Teste do cliente Bybit"""
    if len(sys.argv) < 2:
        print("Usage: python3 bybit_client.py <command> [args]")
        print("Commands:")
        print("  balance - Show account balance")
        print("  ticker <symbol> - Get current price")
        print("  klines <symbol> <interval> <days> - Fetch historical data")
        sys.exit(1)
    
    command = sys.argv[1]
    client = BybitClient(testnet=False)
    
    if command == "balance":
        balance = client.get_account_balance()
        if balance:
            print(json.dumps(balance, indent=2))
    
    elif command == "ticker":
        if len(sys.argv) < 3:
            print("Usage: python3 bybit_client.py ticker <symbol>")
            sys.exit(1)
        
        symbol = sys.argv[2]
        ticker = client.get_ticker(symbol)
        if ticker:
            print(json.dumps(ticker, indent=2))
    
    elif command == "klines":
        if len(sys.argv) < 5:
            print("Usage: python3 bybit_client.py klines <symbol> <interval> <days>")
            sys.exit(1)
        
        symbol = sys.argv[2]
        interval = sys.argv[3]
        days = int(sys.argv[4])
        
        df = client.get_historical_data(symbol, interval, days)
        if df is not None:
            print(df.head())
            print(f"\nTotal rows: {len(df)}")


if __name__ == "__main__":
    import json
    main()
