import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { useState } from "react";
import { RefreshCw, CheckCircle, XCircle } from "lucide-react";

export default function Retrain() {
  const [updateData, setUpdateData] = useState(true);
  const utils = trpc.useUtils();

  const { data: retrainLogs } = trpc.retrain.logs.useQuery();

  const startRetrain = trpc.retrain.start.useMutation({
    onSuccess: () => {
      toast.success("Retreinamento concluído com sucesso!");
      utils.retrain.logs.invalidate();
    },
    onError: (error) => {
      toast.error(`Erro no retreinamento: ${error.message}`);
    },
  });

  const handleRetrain = () => {
    startRetrain.mutate({ updateData });
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
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="update-data">Atualizar Dados</Label>
                <p className="text-sm text-muted-foreground">
                  Buscar dados das últimas 24h antes de retreinar
                </p>
              </div>
              <Switch
                id="update-data"
                checked={updateData}
                onCheckedChange={setUpdateData}
              />
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
                {updateData && <li>Busca dados das últimas 24h da Bybit</li>}
                <li>Recalcula indicadores técnicos</li>
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
                        {log.update_data && (
                          <Badge variant="outline">Dados Atualizados</Badge>
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground mt-2">
                        {new Date(log.timestamp).toLocaleString('pt-BR')}
                      </div>
                      {log.steps && (
                        <div className="mt-2 space-y-1">
                          {log.steps.map((step: any, stepIdx: number) => (
                            <div key={stepIdx} className="text-sm flex items-center gap-2">
                              {step.success ? (
                                <CheckCircle className="h-3 w-3 text-green-500" />
                              ) : (
                                <XCircle className="h-3 w-3 text-red-500" />
                              )}
                              <span className="text-muted-foreground">{step.step}</span>
                            </div>
                          ))}
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
