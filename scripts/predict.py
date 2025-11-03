#!/usr/bin/env python3
"""
Script para fazer predições usando modelos treinados
Uso: python3 predict.py <symbol> <interval>
Exemplo: python3 predict.py ETHUSDT 1h
"""

import sys
import os
import json
import numpy as np
import pandas as pd
import joblib
from datetime import datetime, timedelta

# Adicionar path do projeto
PROJECT_DIR = os.path.dirname(os.path.dirname(__file__))
MODELS_DIR = os.path.join(PROJECT_DIR, 'models')
DATA_DIR = os.path.join(PROJECT_DIR, 'data', 'processed')

def load_model(symbol, interval):
    """Carrega modelo e scaler treinados"""
    model_path = os.path.join(MODELS_DIR, f"{symbol}_{interval}_model.pkl")
    scaler_path = os.path.join(MODELS_DIR, f"{symbol}_{interval}_scaler.pkl")
    features_path = os.path.join(MODELS_DIR, f"{symbol}_{interval}_features.txt")
    
    if not os.path.exists(model_path):
        raise FileNotFoundError(f"Model not found: {model_path}")
    
    model = joblib.load(model_path)
    scaler = joblib.load(scaler_path)
    
    with open(features_path, 'r') as f:
        feature_names = [line.strip() for line in f.readlines()]
    
    return model, scaler, feature_names

def get_latest_data(symbol, interval):
    """Busca dados mais recentes do arquivo processado"""
    data_path = os.path.join(DATA_DIR, f"{symbol}_{interval}.csv")
    
    if not os.path.exists(data_path):
        raise FileNotFoundError(f"Data file not found: {data_path}")
    
    df = pd.read_csv(data_path)
    df['timestamp'] = pd.to_datetime(df['timestamp'])
    
    # Pegar última linha (dados mais recentes)
    latest = df.iloc[-1]
    
    return latest

def make_prediction(symbol, interval):
    """Faz predição para um símbolo e intervalo"""
    try:
        # Carregar modelo
        model, scaler, feature_names = load_model(symbol, interval)
        
        # Buscar dados mais recentes
        latest_data = get_latest_data(symbol, interval)
        
        # Preparar features
        features = []
        for feature_name in feature_names:
            if feature_name in latest_data:
                features.append(latest_data[feature_name])
            else:
                features.append(0)  # Default value if feature missing
        
        X = np.array([features])
        
        # Normalizar
        X_scaled = scaler.transform(X)
        
        # Fazer predição
        prediction = model.predict(X_scaled)[0]
        
        # Obter probabilidades
        if hasattr(model, 'predict_proba'):
            probabilities = model.predict_proba(X_scaled)[0]
            confidence = int(max(probabilities) * 100)
        else:
            confidence = 75  # Default confidence if model doesn't support probabilities
        
        # Mapear predição para ação
        action_map = {-1: 'sell', 0: 'hold', 1: 'buy'}
        action = action_map.get(prediction, 'hold')
        
        # Preparar indicadores para retorno
        indicators = {
            'ema_9': float(latest_data.get('ema_9', 0)),
            'ema_21': float(latest_data.get('ema_21', 0)),
            'rsi': float(latest_data.get('rsi', 0)),
            'macd': float(latest_data.get('macd', 0)),
            'macd_signal': float(latest_data.get('macd_signal', 0)),
        }
        
        result = {
            'symbol': symbol,
            'interval': interval,
            'prediction': action,
            'confidence': confidence,
            'currentPrice': float(latest_data['close']),
            'indicators': indicators,
            'timestamp': latest_data['timestamp'].isoformat() if hasattr(latest_data['timestamp'], 'isoformat') else str(latest_data['timestamp'])
        }
        
        return result
        
    except Exception as e:
        return {
            'error': str(e),
            'symbol': symbol,
            'interval': interval
        }

def main():
    if len(sys.argv) != 3:
        print(json.dumps({'error': 'Usage: python3 predict.py <symbol> <interval>'}))
        sys.exit(1)
    
    symbol = sys.argv[1]
    interval = sys.argv[2]
    
    result = make_prediction(symbol, interval)
    
    # Retornar resultado como JSON
    print(json.dumps(result))

if __name__ == "__main__":
    main()
