import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { useState } from "react";

interface Trade {
  exit_time: string;
  pnl: number;
  pnl_pct: number;
}

interface PerformanceChartProps {
  trades: Trade[];
  initialBalance?: number;
}

export default function PerformanceChart({ trades, initialBalance = 10000 }: PerformanceChartProps) {
  const [period, setPeriod] = useState<string>("all");

  // Calcular equity curve
  const equityCurve = trades.reduce((acc, trade, index) => {
    const previousBalance = index === 0 ? initialBalance : acc[index - 1].balance;
    const newBalance = previousBalance + trade.pnl;
    
    acc.push({
      date: new Date(trade.exit_time).toLocaleDateString('pt-BR', { 
        day: '2-digit', 
        month: '2-digit' 
      }),
      balance: newBalance,
      pnl: trade.pnl,
      timestamp: new Date(trade.exit_time).getTime(),
    });
    
    return acc;
  }, [] as Array<{ date: string; balance: number; pnl: number; timestamp: number }>);

  // Filtrar por período
  const filterByPeriod = (data: typeof equityCurve) => {
    if (period === "all") return data;
    
    const now = Date.now();
    const periodMs = {
      "7d": 7 * 24 * 60 * 60 * 1000,
      "30d": 30 * 24 * 60 * 60 * 1000,
      "90d": 90 * 24 * 60 * 60 * 1000,
      "1y": 365 * 24 * 60 * 60 * 1000,
    }[period] || 0;
    
    return data.filter(item => now - item.timestamp <= periodMs);
  };

  const filteredData = filterByPeriod(equityCurve);

  // Calcular estatísticas
  const finalBalance = filteredData.length > 0 ? filteredData[filteredData.length - 1].balance : initialBalance;
  const totalPnL = finalBalance - initialBalance;
  const roi = ((finalBalance - initialBalance) / initialBalance) * 100;
  
  const winningTrades = trades.filter(t => t.pnl > 0).length;
  const losingTrades = trades.filter(t => t.pnl < 0).length;
  const winRate = trades.length > 0 ? (winningTrades / trades.length) * 100 : 0;

  // Dados para gráfico de distribuição
  const distributionData = [
    { name: 'Ganhos', value: winningTrades, fill: '#10b981' },
    { name: 'Perdas', value: losingTrades, fill: '#ef4444' },
  ];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Curva de Equity</CardTitle>
              <CardDescription>Evolução do saldo ao longo do tempo</CardDescription>
            </div>
            <Select value={period} onValueChange={setPeriod}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7d">Últimos 7 dias</SelectItem>
                <SelectItem value="30d">Últimos 30 dias</SelectItem>
                <SelectItem value="90d">Últimos 90 dias</SelectItem>
                <SelectItem value="1y">Último ano</SelectItem>
                <SelectItem value="all">Todo período</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {filteredData.length > 0 ? (
            <ResponsiveContainer width="100%" height={350}>
              <AreaChart data={filteredData}>
                <defs>
                  <linearGradient id="colorBalance" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis 
                  dataKey="date" 
                  stroke="#9ca3af"
                  style={{ fontSize: '12px' }}
                />
                <YAxis 
                  stroke="#9ca3af"
                  style={{ fontSize: '12px' }}
                  tickFormatter={(value) => `$${value.toFixed(0)}`}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1f2937', 
                    border: '1px solid #374151',
                    borderRadius: '8px',
                    color: '#fff'
                  }}
                  formatter={(value: number) => [`$${value.toFixed(2)}`, 'Saldo']}
                />
                <Area 
                  type="monotone" 
                  dataKey="balance" 
                  stroke="#3b82f6" 
                  strokeWidth={2}
                  fill="url(#colorBalance)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[350px] flex items-center justify-center text-muted-foreground">
              Nenhum trade executado ainda
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Estatísticas de Performance</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Saldo Inicial</span>
              <span className="font-bold">${initialBalance.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Saldo Atual</span>
              <span className="font-bold">${finalBalance.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Lucro/Prejuízo</span>
              <span className={`font-bold ${totalPnL >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                ${totalPnL.toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">ROI</span>
              <span className={`font-bold ${roi >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                {roi.toFixed(2)}%
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Taxa de Acerto</span>
              <span className="font-bold">{winRate.toFixed(2)}%</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Total de Trades</span>
              <span className="font-bold">{trades.length}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Distribuição de Trades</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Trades Vencedores</span>
                  <span className="font-medium text-green-500">{winningTrades}</span>
                </div>
                <div className="w-full bg-secondary rounded-full h-2">
                  <div 
                    className="bg-green-500 h-2 rounded-full transition-all"
                    style={{ width: `${winRate}%` }}
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Trades Perdedores</span>
                  <span className="font-medium text-red-500">{losingTrades}</span>
                </div>
                <div className="w-full bg-secondary rounded-full h-2">
                  <div 
                    className="bg-red-500 h-2 rounded-full transition-all"
                    style={{ width: `${100 - winRate}%` }}
                  />
                </div>
              </div>

              <div className="pt-4 grid grid-cols-2 gap-4">
                <div className="text-center p-4 bg-green-500/10 rounded-lg border border-green-500/20">
                  <div className="text-2xl font-bold text-green-500">{winningTrades}</div>
                  <div className="text-xs text-muted-foreground">Ganhos</div>
                </div>
                <div className="text-center p-4 bg-red-500/10 rounded-lg border border-red-500/20">
                  <div className="text-2xl font-bold text-red-500">{losingTrades}</div>
                  <div className="text-xs text-muted-foreground">Perdas</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
