#!/usr/bin/env python3
"""
Sistema de Backtesting para validação de estratégias de trading
Simula trades usando dados históricos e modelos treinados
"""

import os
import sys
import json
import numpy as np
import pandas as pd
import joblib
from datetime import datetime

PROJECT_DIR = os.path.dirname(os.path.dirname(__file__))
MODELS_DIR = os.path.join(PROJECT_DIR, 'models')
DATA_DIR = os.path.join(PROJECT_DIR, 'data', 'processed')

class Backtester:
    def __init__(self, symbol, interval, initial_balance=10000):
        """
        Inicializa backtester
        
        Args:
            symbol: Par de trading (ex: ETHUSDT)
            interval: Intervalo das velas (ex: 1h)
            initial_balance: Saldo inicial em USDT
        """
        self.symbol = symbol
        self.interval = interval
        self.initial_balance = initial_balance
        self.balance = initial_balance
        self.position = None  # None, 'long' ou 'short'
        self.entry_price = 0
        self.trades = []
        
        # Carregar modelo
        self.model, self.scaler, self.feature_names = self.load_model()
        
        # Carregar dados
        self.data = self.load_data()
    
    def load_model(self):
        """Carrega modelo treinado"""
        model_path = os.path.join(MODELS_DIR, f"{self.symbol}_{self.interval}_model.pkl")
        scaler_path = os.path.join(MODELS_DIR, f"{self.symbol}_{self.interval}_scaler.pkl")
        features_path = os.path.join(MODELS_DIR, f"{self.symbol}_{self.interval}_features.txt")
        
        if not os.path.exists(model_path):
            raise FileNotFoundError(f"Model not found: {model_path}")
        
        model = joblib.load(model_path)
        scaler = joblib.load(scaler_path)
        
        with open(features_path, 'r') as f:
            feature_names = [line.strip() for line in f.readlines()]
        
        return model, scaler, feature_names
    
    def load_data(self):
        """Carrega dados históricos"""
        data_path = os.path.join(DATA_DIR, f"{self.symbol}_{self.interval}.csv")
        
        if not os.path.exists(data_path):
            raise FileNotFoundError(f"Data file not found: {data_path}")
        
        df = pd.read_csv(data_path)
        df['timestamp'] = pd.to_datetime(df['timestamp'])
        
        return df
    
    def predict(self, row):
        """Faz predição para uma linha de dados"""
        features = []
        for feature_name in self.feature_names:
            if feature_name in row:
                features.append(row[feature_name])
            else:
                features.append(0)
        
        X = np.array([features])
        X_scaled = self.scaler.transform(X)
        
        prediction = self.model.predict(X_scaled)[0]
        
        if hasattr(self.model, 'predict_proba'):
            probabilities = self.model.predict_proba(X_scaled)[0]
            confidence = max(probabilities) * 100
        else:
            confidence = 75
        
        action_map = {-1: 'sell', 0: 'hold', 1: 'buy'}
        action = action_map.get(prediction, 'hold')
        
        return action, confidence
    
    def open_position(self, row, action, confidence):
        """Abre uma posição"""
        if self.position is not None:
            return  # Já existe posição aberta
        
        price = row['close']
        timestamp = row['timestamp']
        
        # Calcular quantidade baseada em porcentagem do saldo
        position_size = self.balance * 0.1  # 10% do saldo
        quantity = position_size / price
        
        self.position = 'long' if action == 'buy' else 'short'
        self.entry_price = price
        
        trade = {
            'entry_time': timestamp,
            'entry_price': price,
            'type': action,
            'quantity': quantity,
            'confidence': confidence,
            'status': 'open'
        }
        
        self.trades.append(trade)
    
    def close_position(self, row, reason='signal'):
        """Fecha posição aberta"""
        if self.position is None:
            return
        
        price = row['close']
        timestamp = row['timestamp']
        
        trade = self.trades[-1]
        trade['exit_time'] = timestamp
        trade['exit_price'] = price
        trade['status'] = 'closed'
        trade['close_reason'] = reason
        
        # Calcular lucro/prejuízo
        if self.position == 'long':
            pnl = (price - self.entry_price) * trade['quantity']
            pnl_pct = ((price - self.entry_price) / self.entry_price) * 100
        else:  # short
            pnl = (self.entry_price - price) * trade['quantity']
            pnl_pct = ((self.entry_price - price) / self.entry_price) * 100
        
        trade['pnl'] = pnl
        trade['pnl_pct'] = pnl_pct
        
        # Atualizar saldo
        self.balance += pnl
        
        # Resetar posição
        self.position = None
        self.entry_price = 0
    
    def check_stop_loss_take_profit(self, row, stop_loss_pct=3.0, take_profit_pct=5.0):
        """Verifica se atingiu stop-loss ou take-profit"""
        if self.position is None:
            return
        
        price = row['close']
        
        if self.position == 'long':
            pnl_pct = ((price - self.entry_price) / self.entry_price) * 100
        else:  # short
            pnl_pct = ((self.entry_price - price) / self.entry_price) * 100
        
        if pnl_pct <= -stop_loss_pct:
            self.close_position(row, reason='stop_loss')
        elif pnl_pct >= take_profit_pct:
            self.close_position(row, reason='take_profit')
    
    def run(self, confidence_threshold=80, stop_loss=3.0, take_profit=5.0, start_index=1000):
        """
        Executa backtest
        
        Args:
            confidence_threshold: Confiança mínima para abrir posição
            stop_loss: Porcentagem de stop-loss
            take_profit: Porcentagem de take-profit
            start_index: Índice inicial (pular primeiros dados para ter indicadores calculados)
        """
        print(f"\n{'='*60}")
        print(f"BACKTESTING: {self.symbol} {self.interval}")
        print(f"{'='*60}")
        print(f"Saldo inicial: ${self.initial_balance:.2f}")
        print(f"Confiança mínima: {confidence_threshold}%")
        print(f"Stop-loss: {stop_loss}%")
        print(f"Take-profit: {take_profit}%")
        print(f"Período: {self.data.iloc[start_index]['timestamp']} até {self.data.iloc[-1]['timestamp']}")
        print(f"{'='*60}\n")
        
        for idx in range(start_index, len(self.data)):
            row = self.data.iloc[idx]
            
            # Verificar stop-loss/take-profit
            self.check_stop_loss_take_profit(row, stop_loss, take_profit)
            
            # Fazer predição
            action, confidence = self.predict(row)
            
            # Abrir posição se confiança for alta
            if confidence >= confidence_threshold and action in ['buy', 'sell']:
                self.open_position(row, action, confidence)
            
            # Fechar posição se sinal contrário
            elif self.position is not None:
                if (self.position == 'long' and action == 'sell') or \
                   (self.position == 'short' and action == 'buy'):
                    self.close_position(row, reason='opposite_signal')
        
        # Fechar posição aberta ao final
        if self.position is not None:
            self.close_position(self.data.iloc[-1], reason='end_of_data')
        
        return self.calculate_metrics()
    
    def calculate_metrics(self):
        """Calcula métricas de performance"""
        closed_trades = [t for t in self.trades if t['status'] == 'closed']
        
        if not closed_trades:
            return {
                'error': 'No trades executed',
                'initial_balance': self.initial_balance,
                'final_balance': self.balance
            }
        
        # Métricas básicas
        total_trades = len(closed_trades)
        winning_trades = [t for t in closed_trades if t['pnl'] > 0]
        losing_trades = [t for t in closed_trades if t['pnl'] < 0]
        
        win_rate = (len(winning_trades) / total_trades) * 100 if total_trades > 0 else 0
        
        total_pnl = sum(t['pnl'] for t in closed_trades)
        roi = ((self.balance - self.initial_balance) / self.initial_balance) * 100
        
        # Profit factor
        gross_profit = sum(t['pnl'] for t in winning_trades) if winning_trades else 0
        gross_loss = abs(sum(t['pnl'] for t in losing_trades)) if losing_trades else 0
        profit_factor = gross_profit / gross_loss if gross_loss > 0 else float('inf')
        
        # Drawdown
        equity_curve = [self.initial_balance]
        for trade in closed_trades:
            equity_curve.append(equity_curve[-1] + trade['pnl'])
        
        peak = equity_curve[0]
        max_drawdown = 0
        for value in equity_curve:
            if value > peak:
                peak = value
            drawdown = ((peak - value) / peak) * 100
            if drawdown > max_drawdown:
                max_drawdown = drawdown
        
        # Sharpe Ratio (simplificado)
        returns = [t['pnl_pct'] for t in closed_trades]
        sharpe_ratio = (np.mean(returns) / np.std(returns)) if np.std(returns) > 0 else 0
        
        metrics = {
            'initial_balance': self.initial_balance,
            'final_balance': self.balance,
            'total_pnl': total_pnl,
            'roi': roi,
            'total_trades': total_trades,
            'winning_trades': len(winning_trades),
            'losing_trades': len(losing_trades),
            'win_rate': win_rate,
            'profit_factor': profit_factor,
            'max_drawdown': max_drawdown,
            'sharpe_ratio': sharpe_ratio,
            'avg_win': np.mean([t['pnl'] for t in winning_trades]) if winning_trades else 0,
            'avg_loss': np.mean([t['pnl'] for t in losing_trades]) if losing_trades else 0,
            'trades': closed_trades
        }
        
        return metrics
    
    def print_results(self, metrics):
        """Imprime resultados do backtest"""
        print(f"\n{'='*60}")
        print("RESULTADOS DO BACKTEST")
        print(f"{'='*60}")
        print(f"Saldo Inicial:     ${metrics['initial_balance']:.2f}")
        print(f"Saldo Final:       ${metrics['final_balance']:.2f}")
        print(f"Lucro/Prejuízo:    ${metrics['total_pnl']:.2f}")
        print(f"ROI:               {metrics['roi']:.2f}%")
        print(f"\nTotal de Trades:   {metrics['total_trades']}")
        print(f"Trades Vencedores: {metrics['winning_trades']}")
        print(f"Trades Perdedores: {metrics['losing_trades']}")
        print(f"Taxa de Acerto:    {metrics['win_rate']:.2f}%")
        print(f"\nProfit Factor:     {metrics['profit_factor']:.2f}")
        print(f"Max Drawdown:      {metrics['max_drawdown']:.2f}%")
        print(f"Sharpe Ratio:      {metrics['sharpe_ratio']:.2f}")
        print(f"\nLucro Médio:       ${metrics['avg_win']:.2f}")
        print(f"Perda Média:       ${metrics['avg_loss']:.2f}")
        print(f"{'='*60}\n")


def main():
    if len(sys.argv) < 3:
        print("Usage: python3 backtest.py <symbol> <interval> [confidence_threshold]")
        print("Example: python3 backtest.py ETHUSDT 1h 80")
        sys.exit(1)
    
    symbol = sys.argv[1]
    interval = sys.argv[2]
    confidence_threshold = int(sys.argv[3]) if len(sys.argv) > 3 else 80
    
    backtester = Backtester(symbol, interval, initial_balance=10000)
    metrics = backtester.run(confidence_threshold=confidence_threshold)
    
    if 'error' in metrics:
        print(f"Error: {metrics['error']}")
    else:
        backtester.print_results(metrics)
        
        # Salvar resultados
        output_file = os.path.join(PROJECT_DIR, 'backtest_results.json')
        with open(output_file, 'w') as f:
            # Converter timestamps para strings
            for trade in metrics['trades']:
                if 'entry_time' in trade:
                    trade['entry_time'] = str(trade['entry_time'])
                if 'exit_time' in trade:
                    trade['exit_time'] = str(trade['exit_time'])
            
            json.dump(metrics, f, indent=2)
        
        print(f"✓ Resultados salvos em: {output_file}")


if __name__ == "__main__":
    main()
