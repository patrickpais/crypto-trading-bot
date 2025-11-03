import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { useState } from "react";
import { TrendingUp, TrendingDown, Activity, DollarSign } from "lucide-react";

export default function Backtesting() {
  const [symbol, setSymbol] = useState("ETHUSDT");
  const [interval, setInterval] = useState("1h");
  const [confidenceThreshold, setConfidenceThreshold] = useState(80);
  const [results, setResults] = useState<any>(null);

  const runBacktest = trpc.backtest.run.useMutation({
    onSuccess: (data) => {
      setResults(data);
      toast.success("Backtesting concluído!");
    },
    onError: (error) => {
      toast.error(`Erro no backtesting: ${error.message}`);
    },
  });

  const handleRunBacktest = () => {
    setResults(null);
    runBacktest.mutate({
      symbol,
      interval,
      confidenceThreshold,
    });
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Backtesting</h1>
          <p className="text-muted-foreground">
            Simule estratégias de trading com dados históricos
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Configuração do Backtest</CardTitle>
            <CardDescription>
              Configure os parâmetros para simular a estratégia
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-6 md:grid-cols-3">
              <div className="space-y-2">
                <Label>Símbolo</Label>
                <Select value={symbol} onValueChange={setSymbol}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ETHUSDT">ETHUSDT</SelectItem>
                    <SelectItem value="SOLUSDT">SOLUSDT</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Intervalo</Label>
                <Select value={interval} onValueChange={setInterval}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1h">1 Hora</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Confiança Mínima (%)</Label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  value={confidenceThreshold}
                  onChange={(e) => setConfidenceThreshold(parseInt(e.target.value))}
                />
              </div>
            </div>

            <Button
              onClick={handleRunBacktest}
              disabled={runBacktest.isPending}
              className="w-full"
            >
              {runBacktest.isPending ? "Executando Backtest..." : "Executar Backtest"}
            </Button>
          </CardContent>
        </Card>

        {results && (
          <>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">ROI</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className={`text-2xl font-bold ${results.roi >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                    {results.roi.toFixed(2)}%
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Retorno sobre investimento
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Taxa de Acerto</CardTitle>
                  <Activity className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{results.win_rate.toFixed(2)}%</div>
                  <p className="text-xs text-muted-foreground">
                    {results.winning_trades}/{results.total_trades} trades
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Lucro Total</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className={`text-2xl font-bold ${results.total_pnl >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                    ${results.total_pnl.toFixed(2)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    De ${results.initial_balance.toFixed(2)}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Max Drawdown</CardTitle>
                  <TrendingDown className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-red-500">
                    {results.max_drawdown.toFixed(2)}%
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Maior perda acumulada
                  </p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Métricas Detalhadas</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <div className="text-sm font-medium text-muted-foreground">Profit Factor</div>
                    <div className="text-2xl font-bold">
                      {results.profit_factor === Infinity ? '∞' : results.profit_factor.toFixed(2)}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-muted-foreground">Sharpe Ratio</div>
                    <div className="text-2xl font-bold">{results.sharpe_ratio.toFixed(2)}</div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-muted-foreground">Lucro Médio</div>
                    <div className="text-2xl font-bold text-green-500">
                      ${results.avg_win.toFixed(2)}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-muted-foreground">Perda Média</div>
                    <div className="text-2xl font-bold text-red-500">
                      ${results.avg_loss.toFixed(2)}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
