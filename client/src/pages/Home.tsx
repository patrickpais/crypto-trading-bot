import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { useState, useEffect } from "react";
import { TrendingUp, TrendingDown, Activity, DollarSign, BarChart3, AlertCircle } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from "recharts";

export default function Home() {
  const { user, isAuthenticated } = useAuth();
  const [stats, setStats] = useState({
    totalTrades: 0,
    winRate: "0.00",
    totalProfit: "0.00",
    openTrades: 0,
    winningTrades: 0,
    losingTrades: 0,
  });

  // Dados de exemplo para gráficos
  const equityData = [
    { time: "00:00", equity: 10000 },
    { time: "04:00", equity: 10250 },
    { time: "08:00", equity: 10150 },
    { time: "12:00", equity: 10500 },
    { time: "16:00", equity: 10800 },
    { time: "20:00", equity: 11200 },
    { time: "24:00", equity: 11500 },
  ];

  const tradesData = [
    { symbol: "BTC", wins: 5, losses: 2 },
    { symbol: "ETH", wins: 4, losses: 3 },
    { symbol: "SOL", wins: 3, losses: 1 },
  ];

  // Simular carregamento de dados
  useEffect(() => {
    // Dados de exemplo
    setStats({
      totalTrades: 12,
      winRate: "66.67",
      totalProfit: "1500.00",
      openTrades: 2,
      winningTrades: 8,
      losingTrades: 4,
    });
  }, []);

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Bem-vindo ao Crypto Trading Bot</CardTitle>
            <CardDescription>
              Faça login para acessar o painel de controle
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Por favor, faça login para continuar.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">
            Monitoramento e controle do bot de trading com IA
          </p>
        </div>

        {/* KPIs */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total de Trades</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalTrades}</div>
              <p className="text-xs text-muted-foreground">
                {stats.openTrades} abertos
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Taxa de Acerto</CardTitle>
              <TrendingUp className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-500">{stats.winRate}%</div>
              <p className="text-xs text-muted-foreground">
                {stats.winningTrades}W / {stats.losingTrades}L
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Lucro Total</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${parseFloat(stats.totalProfit) >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                ${stats.totalProfit}
              </div>
              <p className="text-xs text-muted-foreground">
                Lucro acumulado
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Status</CardTitle>
              <AlertCircle className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-500">Aguardando</div>
              <p className="text-xs text-muted-foreground">
                Próximo sinal em 2m
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Gráficos */}
        <div className="grid gap-4 md:grid-cols-2">
          {/* Equity Curve */}
          <Card>
            <CardHeader>
              <CardTitle>Curva de Patrimônio</CardTitle>
              <CardDescription>
                Evolução do capital ao longo do tempo
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={equityData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="time" />
                  <YAxis />
                  <Tooltip />
                  <Line 
                    type="monotone" 
                    dataKey="equity" 
                    stroke="#10b981" 
                    dot={false}
                    strokeWidth={2}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Trades por Símbolo */}
          <Card>
            <CardHeader>
              <CardTitle>Trades por Símbolo</CardTitle>
              <CardDescription>
                Distribuição de ganhos e perdas
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={tradesData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="symbol" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="wins" fill="#10b981" />
                  <Bar dataKey="losses" fill="#ef4444" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Análise de Mercado */}
        <Card>
          <CardHeader>
            <CardTitle>Análise de Mercado em Tempo Real</CardTitle>
            <CardDescription>
              Condições atuais do mercado e previsões do modelo
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-3">
                {/* BTC */}
                <div className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold">BTC/USDT</h3>
                    <span className="text-2xl">₿</span>
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">Preço: $45,230.50</p>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-gray-200 rounded-full h-2">
                      <div className="bg-green-500 h-2 rounded-full" style={{ width: '75%' }}></div>
                    </div>
                    <span className="text-sm font-semibold text-green-500">75%</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">Confiança: Alta</p>
                </div>

                {/* ETH */}
                <div className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold">ETH/USDT</h3>
                    <span className="text-2xl">Ξ</span>
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">Preço: $2,450.75</p>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-gray-200 rounded-full h-2">
                      <div className="bg-yellow-500 h-2 rounded-full" style={{ width: '55%' }}></div>
                    </div>
                    <span className="text-sm font-semibold text-yellow-500">55%</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">Confiança: Média</p>
                </div>

                {/* SOL */}
                <div className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold">SOL/USDT</h3>
                    <span className="text-2xl">◎</span>
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">Preço: $145.30</p>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-gray-200 rounded-full h-2">
                      <div className="bg-red-500 h-2 rounded-full" style={{ width: '35%' }}></div>
                    </div>
                    <span className="text-sm font-semibold text-red-500">35%</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">Confiança: Baixa</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Ações */}
        <div className="flex gap-4">
          <Button size="lg" className="flex-1">
            Iniciar Bot
          </Button>
          <Button size="lg" variant="outline" className="flex-1">
            Parar Bot
          </Button>
          <Button size="lg" variant="outline" className="flex-1">
            Ver Logs
          </Button>
        </div>
      </div>
    </DashboardLayout>
  );
}
