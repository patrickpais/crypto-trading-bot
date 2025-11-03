#!/usr/bin/env python3
"""
Script para treinar modelo de IA para trading de criptomoedas
Usa Random Forest e Gradient Boosting para classificação
"""

import os
import numpy as np
import joblib
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import classification_report, confusion_matrix, accuracy_score
from datetime import datetime

# Diretórios
TRAINING_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'data', 'training')
MODELS_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'models')

os.makedirs(MODELS_DIR, exist_ok=True)

def load_training_data(symbol, interval):
    """Carrega dados de treinamento para um símbolo e intervalo"""
    base_name = f"{symbol}_{interval}"
    
    X_train = np.load(os.path.join(TRAINING_DIR, f'{base_name}_X_train.npy'))
    X_test = np.load(os.path.join(TRAINING_DIR, f'{base_name}_X_test.npy'))
    y_train = np.load(os.path.join(TRAINING_DIR, f'{base_name}_y_train.npy'))
    y_test = np.load(os.path.join(TRAINING_DIR, f'{base_name}_y_test.npy'))
    
    # Carregar nomes das features
    with open(os.path.join(TRAINING_DIR, f'{base_name}_features.txt'), 'r') as f:
        feature_names = [line.strip() for line in f.readlines()]
    
    return X_train, X_test, y_train, y_test, feature_names

def train_random_forest(X_train, y_train, X_test, y_test):
    """Treina modelo Random Forest"""
    print("\n  Treinando Random Forest...")
    
    model = RandomForestClassifier(
        n_estimators=100,
        max_depth=15,
        min_samples_split=10,
        min_samples_leaf=5,
        random_state=42,
        n_jobs=-1,
        class_weight='balanced'  # Lidar com desbalanceamento de classes
    )
    
    model.fit(X_train, y_train)
    
    # Avaliar
    y_pred = model.predict(X_test)
    accuracy = accuracy_score(y_test, y_pred)
    
    print(f"    Acurácia: {accuracy*100:.2f}%")
    
    return model, accuracy

def train_gradient_boosting(X_train, y_train, X_test, y_test):
    """Treina modelo Gradient Boosting"""
    print("\n  Treinando Gradient Boosting...")
    
    model = GradientBoostingClassifier(
        n_estimators=100,
        learning_rate=0.1,
        max_depth=5,
        random_state=42
    )
    
    model.fit(X_train, y_train)
    
    # Avaliar
    y_pred = model.predict(X_test)
    accuracy = accuracy_score(y_test, y_pred)
    
    print(f"    Acurácia: {accuracy*100:.2f}%")
    
    return model, accuracy

def evaluate_model(model, X_test, y_test, model_name):
    """Avalia modelo em detalhes"""
    print(f"\n  Avaliação detalhada - {model_name}:")
    
    y_pred = model.predict(X_test)
    
    # Acurácia
    accuracy = accuracy_score(y_test, y_pred)
    print(f"    Acurácia geral: {accuracy*100:.2f}%")
    
    # Relatório de classificação
    print("\n    Relatório de classificação:")
    # Identificar classes presentes
    unique_classes = sorted(np.unique(np.concatenate([y_test, y_pred])))
    class_names = {-1: 'SELL', 0: 'HOLD', 1: 'BUY'}
    target_names = [class_names[c] for c in unique_classes]
    
    report = classification_report(y_test, y_pred, 
                                   labels=unique_classes,
                                   target_names=target_names,
                                   zero_division=0)
    for line in report.split('\n'):
        if line.strip():
            print(f"      {line}")
    
    # Matriz de confusão
    cm = confusion_matrix(y_test, y_pred)
    print(f"\n    Matriz de confusão:")
    print(f"      {cm}")
    
    # Probabilidades de predição
    if hasattr(model, 'predict_proba'):
        y_proba = model.predict_proba(X_test)
        
        # Confiança média das predições
        confidence = np.max(y_proba, axis=1).mean()
        print(f"\n    Confiança média: {confidence*100:.2f}%")
        
        # Predições com alta confiança (>80%)
        high_conf_mask = np.max(y_proba, axis=1) > 0.8
        high_conf_accuracy = accuracy_score(y_test[high_conf_mask], y_pred[high_conf_mask])
        print(f"    Acurácia com confiança >80%: {high_conf_accuracy*100:.2f}%")
        print(f"    Amostras com confiança >80%: {high_conf_mask.sum()} ({high_conf_mask.sum()/len(y_test)*100:.1f}%)")
    
    return accuracy

def train_for_symbol_interval(symbol, interval):
    """Treina modelos para um símbolo e intervalo específicos"""
    print(f"\n{'='*60}")
    print(f"Treinando modelos para {symbol} - {interval}")
    print(f"{'='*60}")
    
    # Carregar dados
    X_train, X_test, y_train, y_test, feature_names = load_training_data(symbol, interval)
    
    print(f"  Amostras de treino: {len(X_train)}")
    print(f"  Amostras de teste: {len(X_test)}")
    print(f"  Features: {len(feature_names)}")
    
    # Normalizar dados
    print("\n  Normalizando dados...")
    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_test_scaled = scaler.transform(X_test)
    
    # Treinar Random Forest
    rf_model, rf_accuracy = train_random_forest(X_train_scaled, y_train, X_test_scaled, y_test)
    
    # Treinar Gradient Boosting
    gb_model, gb_accuracy = train_gradient_boosting(X_train_scaled, y_train, X_test_scaled, y_test)
    
    # Escolher melhor modelo
    if rf_accuracy >= gb_accuracy:
        best_model = rf_model
        best_model_name = "Random Forest"
        best_accuracy = rf_accuracy
    else:
        best_model = gb_model
        best_model_name = "Gradient Boosting"
        best_accuracy = gb_accuracy
    
    print(f"\n  Melhor modelo: {best_model_name} ({best_accuracy*100:.2f}%)")
    
    # Avaliação detalhada do melhor modelo
    evaluate_model(best_model, X_test_scaled, y_test, best_model_name)
    
    # Salvar modelo e scaler
    model_filename = f"{symbol}_{interval}_model.pkl"
    scaler_filename = f"{symbol}_{interval}_scaler.pkl"
    features_filename = f"{symbol}_{interval}_features.txt"
    
    joblib.dump(best_model, os.path.join(MODELS_DIR, model_filename))
    joblib.dump(scaler, os.path.join(MODELS_DIR, scaler_filename))
    
    with open(os.path.join(MODELS_DIR, features_filename), 'w') as f:
        f.write('\n'.join(feature_names))
    
    # Salvar metadados do modelo
    metadata = {
        'symbol': symbol,
        'interval': interval,
        'model_type': best_model_name,
        'accuracy': best_accuracy,
        'train_samples': len(X_train),
        'test_samples': len(X_test),
        'features': feature_names,
        'trained_at': datetime.now().isoformat()
    }
    
    import json
    metadata_filename = f"{symbol}_{interval}_metadata.json"
    with open(os.path.join(MODELS_DIR, metadata_filename), 'w') as f:
        json.dump(metadata, f, indent=2)
    
    print(f"\n✓ Modelo salvo: {model_filename}")
    print(f"✓ Scaler salvo: {scaler_filename}")
    print(f"✓ Metadados salvos: {metadata_filename}")
    
    return {
        'symbol': symbol,
        'interval': interval,
        'model_type': best_model_name,
        'accuracy': best_accuracy
    }

def main():
    """Treina modelos para todos os símbolos e intervalos"""
    print("=" * 60)
    print("TREINAMENTO DE MODELOS DE IA PARA TRADING")
    print("=" * 60)
    print(f"Diretório de dados: {TRAINING_DIR}")
    print(f"Diretório de modelos: {MODELS_DIR}")
    print("=" * 60)
    
    symbols = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT']
    intervals = ['5m', '15m', '1h']
    
    results = []
    
    for symbol in symbols:
        for interval in intervals:
            try:
                result = train_for_symbol_interval(symbol, interval)
                results.append(result)
            except Exception as e:
                print(f"\n✗ Erro ao treinar {symbol} {interval}: {e}")
    
    print("\n" + "=" * 60)
    print("TREINAMENTO CONCLUÍDO!")
    print("=" * 60)
    
    # Resumo
    print("\nResumo dos modelos treinados:")
    print(f"{'Símbolo':<12} {'Intervalo':<10} {'Modelo':<20} {'Acurácia':<10}")
    print("-" * 60)
    for result in results:
        print(f"{result['symbol']:<12} {result['interval']:<10} {result['model_type']:<20} {result['accuracy']*100:>6.2f}%")
    
    # Acurácia média
    avg_accuracy = np.mean([r['accuracy'] for r in results])
    print(f"\nAcurácia média: {avg_accuracy*100:.2f}%")

if __name__ == "__main__":
    main()
