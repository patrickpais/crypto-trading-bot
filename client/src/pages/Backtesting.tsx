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
      toast.success("Backtesting iniciado! Aguarde os resultados...");
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
                    <SelectItem value="BTCUSDT">BTCUSDT</SelectItem>
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
                    <SelectItem value="5m">5 Minutos</SelectItem>
                    <SelectItem value="15m">15 Minutos</SelectItem>
                    <SelectItem value="30m">30 Minutos</SelectItem>
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
                  onChange={(e) => setConfidenceThreshold(parseInt(e.target.value) || 0)}
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
                  <CardTitle className="text-sm font-medium">Status</CardTitle>
                  <Activity className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-500">
                    {results.success ? "✓ Sucesso" : "✗ Erro"}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {results.message || "Backtesting em andamento"}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Símbolo</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{symbol}</div>
                  <p className="text-xs text-muted-foreground">
                    Intervalo: {interval}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Confiança</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{confidenceThreshold}%</div>
                  <p className="text-xs text-muted-foreground">
                    Mínima para trade
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Timestamp</CardTitle>
                  <Activity className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-xs font-mono text-muted-foreground">
                    {new Date().toLocaleString("pt-BR")}
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Informações do Backtest</CardTitle>
                <CardDescription>
                  Detalhes da simulação executada
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Símbolo</p>
                      <p className="text-lg font-semibold">{symbol}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Intervalo</p>
                      <p className="text-lg font-semibold">{interval}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Confiança Mínima</p>
                      <p className="text-lg font-semibold">{confidenceThreshold}%</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Status</p>
                      <p className={`text-lg font-semibold ${results.success ? 'text-green-500' : 'text-red-500'}`}>
                        {results.success ? "Sucesso" : "Erro"}
                      </p>
                    </div>
                  </div>
                  <div className="border-t pt-4">
                    <p className="text-sm font-medium text-muted-foreground">Mensagem</p>
                    <p className="text-sm mt-2">{results.message}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        )}

        {runBacktest.isPending && (
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-center space-x-2">
                <div className="animate-spin">⚙️</div>
                <p className="text-muted-foreground">Backtesting em andamento...</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
