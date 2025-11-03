import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { Play, Pause, TrendingUp, TrendingDown, Activity, DollarSign } from "lucide-react";
import { toast } from "sonner";

export default function Dashboard() {
  const { user, loading } = useAuth();
  const utils = trpc.useUtils();
  
  const { data: config, isLoading: configLoading } = trpc.bot.getConfig.useQuery();
  const { data: statistics } = trpc.trades.statistics.useQuery();
  const { data: marketData } = trpc.market.latest.useQuery(undefined, {
    refetchInterval: 30000, // Atualizar a cada 30 segundos
  });
  const { data: openTrades } = trpc.trades.openTrades.useQuery(undefined, {
    refetchInterval: 10000, // Atualizar a cada 10 segundos
  });

  const startBot = trpc.bot.start.useMutation({
    onSuccess: () => {
      toast.success("Bot iniciado com sucesso!");
      utils.bot.getConfig.invalidate();
    },
    onError: (error) => {
      toast.error(`Erro ao iniciar bot: ${error.message}`);
    },
  });

  const stopBot = trpc.bot.stop.useMutation({
    onSuccess: () => {
      toast.success("Bot parado com sucesso!");
      utils.bot.getConfig.invalidate();
    },
    onError: (error) => {
      toast.error(`Erro ao parar bot: ${error.message}`);
    },
  });

  if (loading || configLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-full">
          <div className="text-muted-foreground">Carregando...</div>
        </div>
      </DashboardLayout>
    );
  }

  const isActive = config?.isActive || false;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Crypto Trading Bot</h1>
            <p className="text-muted-foreground">
              Monitoramento e controle do bot de trading com IA
            </p>
          </div>
          <div className="flex items-center gap-4">
            <Badge variant={isActive ? "default" : "secondary"} className="text-sm px-3 py-1">
              {isActive ? "Ativo" : "Inativo"}
            </Badge>
            <Button
              onClick={() => isActive ? stopBot.mutate() : startBot.mutate()}
              variant={isActive ? "destructive" : "default"}
              disabled={startBot.isPending || stopBot.isPending}
            >
              {isActive ? (
                <>
                  <Pause className="mr-2 h-4 w-4" />
                  Parar Bot
                </>
              ) : (
                <>
                  <Play className="mr-2 h-4 w-4" />
                  Iniciar Bot
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total de Trades</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{statistics?.totalTrades || 0}</div>
              <p className="text-xs text-muted-foreground">
                {statistics?.openTrades || 0} trades abertos
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Taxa de Acerto</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{statistics?.winRate || 0}%</div>
              <p className="text-xs text-muted-foreground">
                {statistics?.winningTrades || 0} trades vencedores
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Lucro Total</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ${parseFloat(statistics?.totalProfit || '0').toFixed(2)}
              </div>
              <p className="text-xs text-muted-foreground">
                Lucro acumulado
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Trades Perdedores</CardTitle>
              <TrendingDown className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{statistics?.losingTrades || 0}</div>
              <p className="text-xs text-muted-foreground">
                Total de perdas
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Market Analysis */}
        <Card>
          <CardHeader>
            <CardTitle>Análise de Mercado em Tempo Real</CardTitle>
            <CardDescription>
              Condições atuais do mercado e predições do modelo de IA
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {marketData && marketData.length > 0 ? (
                marketData.map((analysis, idx) => (
                  <div key={idx} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-4">
                      <div>
                        <div className="font-semibold">{analysis.symbol}</div>
                        <div className="text-sm text-muted-foreground">{analysis.interval}</div>
                      </div>
                      <div className="text-2xl font-mono">
                        ${parseFloat(analysis.currentPrice).toFixed(2)}
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <Badge
                        variant={
                          analysis.prediction === 'buy' ? 'default' :
                          analysis.prediction === 'sell' ? 'destructive' :
                          'secondary'
                        }
                      >
                        {analysis.prediction.toUpperCase()}
                      </Badge>
                      <div className="text-right">
                        <div className="text-sm font-medium">{analysis.confidence}%</div>
                        <div className="text-xs text-muted-foreground">Confiança</div>
                      </div>
                      {analysis.inTrade && (
                        <Badge variant="outline">Em Trade</Badge>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center text-muted-foreground py-8">
                  Nenhuma análise disponível. Inicie o bot para começar.
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Open Trades */}
        {openTrades && openTrades.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Trades Abertos</CardTitle>
              <CardDescription>
                Trades atualmente em execução
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {openTrades.map((trade) => (
                  <div key={trade.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-4">
                      <div>
                        <div className="font-semibold">{trade.symbol}</div>
                        <div className="text-sm text-muted-foreground">
                          {new Date(trade.entryTime).toLocaleString('pt-BR')}
                        </div>
                      </div>
                      <Badge variant={trade.type === 'buy' ? 'default' : 'destructive'}>
                        {trade.type.toUpperCase()}
                      </Badge>
                    </div>
                    <div className="text-right">
                      <div className="font-mono">${parseFloat(trade.entryPrice).toFixed(2)}</div>
                      <div className="text-sm text-muted-foreground">
                        Confiança: {trade.confidence}%
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
