# Notas de Pesquisa - Bibliotecas e APIs

## Bybit API

### Endpoint de Klines (Dados Históricos)
- **URL**: `GET /v5/market/kline`
- **Parâmetros principais**:
  - `category`: `spot`, `linear`, `inverse` (padrão: `linear`)
  - `symbol`: Nome do símbolo (ex: `BTCUSDT`, `ETHUSDT`, `SOLUSDT`)
  - `interval`: Intervalo das velas - `1`, `3`, `5`, `15`, `30`, `60`, `120`, `240`, `360`, `720`, `D`, `W`, `M`
  - `start`: Timestamp de início (ms)
  - `end`: Timestamp de fim (ms)
  - `limit`: Limite de dados por página [1, 1000], padrão: 200

### Biblioteca Python: pybit
- **Repositório**: https://github.com/bybit-exchange/pybit
- **Descrição**: SDK oficial Python3 para APIs HTTP e WebSocket da Bybit
- **Instalação**: `pip install pybit`

## Bibliotecas de Indicadores Técnicos

### 1. pandas-ta
- **URL**: https://github.com/twopirllc/pandas-ta
- **Descrição**: Biblioteca com mais de 150 indicadores técnicos
- **Instalação**: `pip install pandas-ta`
- **Indicadores necessários**: EMA, RSI, MACD, SMA (Moving Average)
- **Vantagens**: Integração nativa com Pandas DataFrames

### 2. TA-Lib (Alternative)
- **URL**: https://ta-lib.org/
- **Descrição**: Biblioteca clássica com 200+ indicadores
- **Instalação**: Requer compilação C (mais complexo)
- **Vantagens**: Muito estável e amplamente usada

### 3. ta (Technical Analysis Library)
- **URL**: https://github.com/bukosabino/ta
- **Instalação**: `pip install ta`
- **Vantagens**: Simples e focada em análise técnica financeira

## Bibliotecas de Machine Learning

### scikit-learn
- **Descrição**: Biblioteca padrão para ML em Python
- **Instalação**: `pip install scikit-learn`
- **Uso**: Classificação (buy/sell), regressão, validação de modelos

### TensorFlow/Keras (Opcional para modelos mais avançados)
- **Descrição**: Deep Learning para padrões complexos
- **Instalação**: `pip install tensorflow`

## Decisão de Implementação

**Stack escolhida**:
1. **pybit**: Para coleta de dados da Bybit
2. **pandas**: Para manipulação de dados
3. **pandas-ta**: Para cálculo de indicadores técnicos (EMA, RSI, MACD, SMA)
4. **scikit-learn**: Para treinamento do modelo de IA
5. **numpy**: Para operações numéricas

**Justificativa**: Esta stack oferece integração nativa entre as bibliotecas, facilidade de uso e é amplamente testada na comunidade de trading algorítmico.
