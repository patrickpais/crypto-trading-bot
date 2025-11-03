#!/usr/bin/env python3
"""
Script para preparar dados de treinamento para o modelo de IA
Define estratégia de labeling baseada em lucro futuro
"""

import os
import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split

# Diretórios
PROCESSED_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'data', 'processed')
TRAINING_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'data', 'training')

os.makedirs(TRAINING_DIR, exist_ok=True)

# Configurações de labeling
PROFIT_THRESHOLD = 0.005  # 0.5% de lucro mínimo para considerar trade válido
LOSS_THRESHOLD = -0.003   # -0.3% de perda máxima (stop-loss)
FUTURE_CANDLES = 10       # Número de velas futuras para avaliar resultado

def create_labels(df, profit_threshold=PROFIT_THRESHOLD, loss_threshold=LOSS_THRESHOLD, future_candles=FUTURE_CANDLES):
    """
    Cria labels para o dataset baseado em lucro futuro
    
    Labels:
    - 1 (BUY): Preço sobe mais que profit_threshold nas próximas velas
    - -1 (SELL): Preço cai mais que loss_threshold nas próximas velas
    - 0 (HOLD): Não atende critérios de buy ou sell
    
    Args:
        df: DataFrame com dados processados
        profit_threshold: Percentual mínimo de lucro para BUY
        loss_threshold: Percentual máximo de perda para SELL
        future_candles: Número de velas futuras para avaliar
    
    Returns:
        DataFrame com coluna 'label' adicionada
    """
    df = df.copy()
    labels = []
    
    for i in range(len(df)):
        # Para as últimas velas, não temos dados futuros suficientes
        if i >= len(df) - future_candles:
            labels.append(0)  # HOLD
            continue
        
        current_price = df.iloc[i]['close']
        future_prices = df.iloc[i+1:i+future_candles+1]['close'].values
        
        # Calcular retornos percentuais futuros
        returns = (future_prices - current_price) / current_price
        
        max_return = returns.max()
        min_return = returns.min()
        
        # Estratégia de labeling:
        # BUY se houver oportunidade de lucro significativo
        if max_return >= profit_threshold:
            labels.append(1)  # BUY
        # SELL se houver risco de perda significativa
        elif min_return <= loss_threshold:
            labels.append(-1)  # SELL
        # HOLD caso contrário
        else:
            labels.append(0)  # HOLD
    
    df['label'] = labels
    return df

def create_features(df):
    """
    Cria features adicionais para o modelo
    
    Args:
        df: DataFrame com dados e indicadores
    
    Returns:
        DataFrame com features adicionadas
    """
    df = df.copy()
    
    # 1. Tendência de curto prazo (EMA 9 vs EMA 21)
    df['ema_trend_short'] = (df['ema_9'] - df['ema_21']) / df['ema_21']
    
    # 2. Tendência de médio prazo (EMA 21 vs EMA 50)
    df['ema_trend_medium'] = (df['ema_21'] - df['ema_50']) / df['ema_50']
    
    # 3. Posição do preço em relação às Bollinger Bands
    df['bb_position'] = (df['close'] - df['bb_lower']) / (df['bb_upper'] - df['bb_lower'])
    
    # 4. Momentum do RSI
    df['rsi_momentum'] = df['rsi'].diff()
    
    # 5. Força do MACD
    df['macd_strength'] = df['macd_diff'] / df['close']
    
    # 6. Volume relativo
    df['volume_ratio'] = df['volume'] / df['volume_sma']
    
    # 7. Distância do preço em relação às médias móveis
    df['price_to_sma20'] = (df['close'] - df['sma_20']) / df['sma_20']
    df['price_to_sma50'] = (df['close'] - df['sma_50']) / df['sma_50']
    
    # 8. Volatilidade normalizada
    df['volatility_norm'] = df['volatility'] / df['volatility'].rolling(window=50).mean()
    
    # Remover NaN e infinitos
    df = df.replace([np.inf, -np.inf], np.nan)
    df = df.dropna().reset_index(drop=True)
    
    return df

def prepare_dataset(df):
    """
    Prepara dataset final para treinamento
    
    Args:
        df: DataFrame com dados, indicadores e labels
    
    Returns:
        X (features), y (labels)
    """
    # Selecionar features para o modelo
    feature_columns = [
        # Indicadores técnicos originais
        'ema_9', 'ema_21', 'ema_50',
        'sma_20', 'sma_50', 'sma_200',
        'rsi', 'macd', 'macd_signal', 'macd_diff',
        'bb_upper', 'bb_middle', 'bb_lower',
        'volume_sma', 'volatility',
        
        # Features derivadas
        'ema_trend_short', 'ema_trend_medium',
        'bb_position', 'rsi_momentum', 'macd_strength',
        'volume_ratio', 'price_to_sma20', 'price_to_sma50',
        'volatility_norm'
    ]
    
    X = df[feature_columns].values
    y = df['label'].values
    
    return X, y, feature_columns

def process_file(filename):
    """Processa um arquivo individual"""
    print(f"\nProcessando: {filename}")
    
    # Ler dados processados
    input_path = os.path.join(PROCESSED_DIR, filename)
    df = pd.read_csv(input_path)
    df['timestamp'] = pd.to_datetime(df['timestamp'])
    
    print(f"  - Velas originais: {len(df)}")
    
    # Criar labels
    df = create_labels(df)
    
    # Criar features adicionais
    df = create_features(df)
    
    print(f"  - Velas após labeling: {len(df)}")
    
    # Distribuição de labels
    label_counts = df['label'].value_counts()
    print(f"  - Distribuição de labels:")
    print(f"    BUY (1): {label_counts.get(1, 0)} ({label_counts.get(1, 0)/len(df)*100:.1f}%)")
    print(f"    HOLD (0): {label_counts.get(0, 0)} ({label_counts.get(0, 0)/len(df)*100:.1f}%)")
    print(f"    SELL (-1): {label_counts.get(-1, 0)} ({label_counts.get(-1, 0)/len(df)*100:.1f}%)")
    
    # Preparar dataset
    X, y, feature_columns = prepare_dataset(df)
    
    print(f"  - Features: {len(feature_columns)}")
    print(f"  - Amostras: {len(X)}")
    
    # Dividir em treino e teste (80/20)
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )
    
    print(f"  - Treino: {len(X_train)} amostras")
    print(f"  - Teste: {len(X_test)} amostras")
    
    # Salvar datasets
    base_name = filename.replace('.csv', '')
    
    # Salvar em formato numpy
    np.save(os.path.join(TRAINING_DIR, f'{base_name}_X_train.npy'), X_train)
    np.save(os.path.join(TRAINING_DIR, f'{base_name}_X_test.npy'), X_test)
    np.save(os.path.join(TRAINING_DIR, f'{base_name}_y_train.npy'), y_train)
    np.save(os.path.join(TRAINING_DIR, f'{base_name}_y_test.npy'), y_test)
    
    # Salvar nomes das features
    with open(os.path.join(TRAINING_DIR, f'{base_name}_features.txt'), 'w') as f:
        f.write('\n'.join(feature_columns))
    
    print(f"✓ Dados de treinamento salvos para {base_name}")
    
    return {
        'filename': filename,
        'total_samples': len(X),
        'train_samples': len(X_train),
        'test_samples': len(X_test),
        'buy_pct': label_counts.get(1, 0)/len(df)*100,
        'hold_pct': label_counts.get(0, 0)/len(df)*100,
        'sell_pct': label_counts.get(-1, 0)/len(df)*100
    }

def main():
    """Processa todos os arquivos"""
    print("=" * 60)
    print("PREPARAÇÃO DE DADOS DE TREINAMENTO")
    print("=" * 60)
    print(f"Diretório de entrada: {PROCESSED_DIR}")
    print(f"Diretório de saída: {TRAINING_DIR}")
    print(f"\nParâmetros de labeling:")
    print(f"  - Lucro mínimo (BUY): {PROFIT_THRESHOLD*100}%")
    print(f"  - Perda máxima (SELL): {LOSS_THRESHOLD*100}%")
    print(f"  - Velas futuras analisadas: {FUTURE_CANDLES}")
    print("=" * 60)
    
    # Listar arquivos
    csv_files = [f for f in os.listdir(PROCESSED_DIR) if f.endswith('.csv')]
    
    if not csv_files:
        print("✗ Nenhum arquivo encontrado")
        return
    
    results = []
    
    for filename in csv_files:
        result = process_file(filename)
        results.append(result)
    
    print("\n" + "=" * 60)
    print("PREPARAÇÃO CONCLUÍDA!")
    print("=" * 60)
    
    # Resumo geral
    print("\nResumo geral:")
    for result in results:
        print(f"\n{result['filename']}:")
        print(f"  Total: {result['total_samples']} amostras")
        print(f"  Treino: {result['train_samples']} | Teste: {result['test_samples']}")
        print(f"  BUY: {result['buy_pct']:.1f}% | HOLD: {result['hold_pct']:.1f}% | SELL: {result['sell_pct']:.1f}%")

if __name__ == "__main__":
    main()
