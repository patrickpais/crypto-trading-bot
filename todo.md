# Crypto Trading Bot - TODO

## Coleta de Dados e Dataset
- [x] Integrar API da Bybit para coleta de dados históricos
- [x] Baixar dados de 1 ano para BTCUSDT, ETHUSDT e SOLUSDT
- [x] Coletar velas de 5m, 15m e 1h para cada cripto
- [x] Criar estrutura de dataset com os dados coletados
- [x] Adicionar indicadores técnicos ao dataset (EMA, RSI, MACD, MM)
- [x] Validar integridade dos dados coletados

## Treinamento do Modelo de IA
- [x] Preparar dados para treinamento (features e labels)
- [x] Definir estratégia de labeling (buy/sell com base em lucro futuro)
- [x] Implementar modelo de machine learning para identificação de padrões
- [x] Treinar modelo com objetivo de 5+ trades por dia
- [x] Validar modelo com dados de teste
- [x] Implementar sistema de confiança (threshold de 80%)

## Sistema de Trading Automatizado
- [ ] Criar lógica de monitoramento em tempo real das criptos
- [ ] Implementar sistema de predição contínua
- [ ] Desenvolver lógica de execução de trades (buy/sell)
- [ ] Integrar com API da Bybit para execução de ordens
- [ ] Implementar gerenciamento de risco (% de saldo por trade)
- [ ] Criar sistema de stop-loss e take-profit

## Atualização Contínua
- [ ] Implementar job diário para coleta de dados das últimas 24h
- [ ] Adicionar novos dados ao dataset existente
- [ ] Recalcular indicadores técnicos com novos dados
- [ ] Retreinar modelo com dados atualizados
- [ ] Agendar execução automática (cron job)

## Backend e Banco de Dados
- [x] Criar schema do banco de dados (trades, configurações, histórico)
- [x] Implementar API para configurações do bot
- [x] Criar endpoints para consulta de trades
- [x] Implementar sistema de logs e auditoria
- [x] Criar API para dados em tempo real

## Frontend - Painel de Controle
- [x] Criar página de login e autenticação
- [x] Desenvolver dashboard principal
- [x] Implementar painel de configurações (% saldo, risco/retorno, % certeza)
- [x] Criar visualização de trades históricos
- [x] Desenvolver painel de monitoramento em tempo real
- [x] Adicionar gráficos de performance
- [x] Implementar atualização automática de dados (WebSocket/polling)
- [x] Criar indicadores visuais de status (em trade, lucro/prejuízo)

## Monitoramento e Relatórios
- [ ] Criar relatório diário de trades
- [ ] Implementar métricas de performance (win rate, lucro total, etc)
- [ ] Adicionar alertas para eventos importantes
- [ ] Criar visualização de análise por cripto
- [ ] Implementar histórico de decisões do modelo

## Deploy e Infraestrutura
- [ ] Configurar ambiente para execução 24/7
- [ ] Implementar sistema de logs persistentes
- [ ] Criar backup automático do banco de dados
- [ ] Configurar monitoramento de saúde do sistema
- [ ] Documentar processo de deploy

## Testes e Validação
- [ ] Testar coleta de dados da Bybit
- [ ] Validar cálculo de indicadores técnicos
- [ ] Testar modelo com dados históricos (backtesting)
- [ ] Validar execução de trades em ambiente de teste
- [ ] Testar sistema de atualização contínua
