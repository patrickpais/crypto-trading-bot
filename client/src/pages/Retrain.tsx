import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { useState } from "react";
import { RefreshCw, CheckCircle, XCircle } from "lucide-react";

export default function Retrain() {
  const [symbol, setSymbol] = useState("BTCUSDT");
  const [interval, setInterval] = useState("1h");
  const [period, setPeriod] = useState(365);
  const utils = trpc.useUtils();

  const { data: retrainLogs } = trpc.retrain.logs.useQuery();

  const startRetrain = trpc.retrain.start.useMutation({
    onSuccess: (data) => {
      toast.success(data.message || "Retreinamento iniciado com sucesso!");
      utils.retrain.logs.invalidate();
      utils.retrain.status.invalidate();
    },
    onError: (error: any) => {
      const errorMessage = error.data?.zodError 
        ? JSON.stringify(error.data.zodError, null, 2)
        : error.message;
      toast.error(`Erro no retreinamento: ${errorMessage}`);
    },
  });

  const handleRetrain = () => {
    if (!symbol || !interval) {
      toast.error("Por favor, selecione o símbolo e intervalo");
      return;
    }
    startRetrain.mutate({ 
      symbol, 
      interval, 
      period 
    });
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Retreinamento de Modelos</h1>
          <p className="text-muted-foreground">
            Atualize os modelos de IA com novos dados
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Iniciar Retreinamento</CardTitle>
            <CardDescription>
              Retreine os modelos para melhorar a precisão das predições
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="symbol">Símbolo</Label>
                <Select value={symbol} onValueChange={setSymbol}>
                  <SelectTrigger id="symbol">
                    <SelectValue placeholder="Selecione o símbolo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="BTCUSDT">BTC/USDT</SelectItem>
                    <SelectItem value="ETHUSDT">ETH/USDT</SelectItem>
                    <SelectItem value="SOLUSDT">SOL/USDT</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="interval">Intervalo</Label>
                <Select value={interval} onValueChange={setInterval}>
                  <SelectTrigger id="interval">
                    <SelectValue placeholder="Selecione o intervalo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5m">5 minutos</SelectItem>
                    <SelectItem value="15m">15 minutos</SelectItem>
                    <SelectItem value="30m">30 minutos</SelectItem>
                    <SelectItem value="1h">1 hora</SelectItem>
                    <SelectItem value="4h">4 horas</SelectItem>
                    <SelectItem value="1d">1 dia</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="period">Período (dias)</Label>
                <Select value={period.toString()} onValueChange={(v) => setPeriod(parseInt(v))}>
                  <SelectTrigger id="period">
                    <SelectValue placeholder="Selecione o período" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="30">30 dias</SelectItem>
                    <SelectItem value="90">90 dias</SelectItem>
                    <SelectItem value="180">180 dias</SelectItem>
                    <SelectItem value="365">1 ano</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Button
              onClick={handleRetrain}
              disabled={startRetrain.isPending}
              className="w-full"
            >
              {startRetrain.isPending ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Retreinando...
                </>
              ) : (
                <>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Iniciar Retreinamento
                </>
              )}
            </Button>

            <div className="text-sm text-muted-foreground space-y-2">
              <p><strong>O que acontece durante o retreinamento:</strong></p>
              <ul className="list-disc list-inside space-y-1">
                <li>Coleta dados históricos de {symbol} em intervalo de {interval}</li>
                <li>Recalcula indicadores técnicos (RSI, MACD, Bollinger Bands, EMA)</li>
                <li>Prepara novos dados de treinamento</li>
                <li>Treina modelos com dados atualizados</li>
                <li>Salva novos modelos (versões anteriores são preservadas)</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Histórico de Retreinamentos</CardTitle>
            <CardDescription>
              Últimos retreinamentos executados
            </CardDescription>
          </CardHeader>
          <CardContent>
            {retrainLogs && retrainLogs.length > 0 ? (
              <div className="space-y-4">
                {retrainLogs.map((log: any, idx: number) => (
                  <div key={idx} className="flex items-start gap-4 p-4 border rounded-lg">
                    {log.success ? (
                      <CheckCircle className="h-5 w-5 text-green-500 mt-1" />
                    ) : (
                      <XCircle className="h-5 w-5 text-red-500 mt-1" />
                    )}
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <Badge variant={log.success ? "default" : "destructive"}>
                          {log.success ? "Sucesso" : "Falhou"}
                        </Badge>
                      </div>
                      <div className="text-sm text-muted-foreground mt-2">
                        {new Date(log.timestamp).toLocaleString('pt-BR')}
                      </div>
                      {log.message && (
                        <div className="text-sm mt-2">
                          {log.message}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                Nenhum retreinamento registrado
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Retreinamento Automático</CardTitle>
            <CardDescription>
              Configuração de atualização automática
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <div className="font-medium">Atualização Diária</div>
                  <div className="text-sm text-muted-foreground">
                    Retreinamento automático a cada 24 horas
                  </div>
                </div>
                <Badge variant="outline">Em Desenvolvimento</Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                O sistema de retreinamento automático será ativado quando o bot estiver em produção.
                Por enquanto, use o retreinamento manual quando necessário.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
