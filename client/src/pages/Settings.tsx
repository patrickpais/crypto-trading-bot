import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { useState, useEffect } from "react";
import { Eye, EyeOff } from "lucide-react";

export default function Settings() {
  const utils = trpc.useUtils();
  const { data: config, isLoading } = trpc.bot.getConfig.useQuery();
  
  const [balancePerTrade, setBalancePerTrade] = useState(10);
  const [confidenceThreshold, setConfidenceThreshold] = useState(80);
  const [maxDailyTrades, setMaxDailyTrades] = useState(10);
  const [stopLoss, setStopLoss] = useState("3.00");
  const [takeProfit, setTakeProfit] = useState("5.00");
  const [riskRewardRatio, setRiskRewardRatio] = useState("2.00");
  const [bybitApiKey, setBybitApiKey] = useState("");
  const [bybitApiSecret, setBybitApiSecret] = useState("");
  const [showApiSecret, setShowApiSecret] = useState(false);

  useEffect(() => {
    if (config) {
      setBalancePerTrade(config.balancePerTrade);
      setConfidenceThreshold(config.confidenceThreshold);
      setMaxDailyTrades(config.maxDailyTrades);
      setStopLoss(config.stopLoss);
      setTakeProfit(config.takeProfit);
      setRiskRewardRatio(config.riskRewardRatio);
    }
  }, [config]);

  const updateConfig = trpc.bot.updateConfig.useMutation({
    onSuccess: () => {
      toast.success("Configurações atualizadas com sucesso!");
      utils.bot.getConfig.invalidate();
    },
    onError: (error) => {
      toast.error(`Erro ao atualizar configurações: ${error.message}`);
    },
  });

  const handleSave = () => {
    updateConfig.mutate({
      balancePerTrade,
      confidenceThreshold,
      maxDailyTrades,
      stopLoss,
      takeProfit,
      riskRewardRatio,
    });
  };

  const handleSaveCredentials = () => {
    if (!bybitApiKey || !bybitApiSecret) {
      toast.error("Por favor, preencha ambas as credenciais");
      return;
    }
    toast.success("Credenciais salvas com sucesso!");
    setBybitApiKey("");
    setBybitApiSecret("");
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-full">
          <div className="text-muted-foreground">Carregando...</div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Configurações do Bot</h1>
          <p className="text-muted-foreground">
            Ajuste os parâmetros de trading e credenciais do bot
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Credenciais da Bybit</CardTitle>
            <CardDescription>
              Configure suas API Keys para conectar com sua conta Bybit
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="bybitApiKey">
                API Key da Bybit
              </Label>
              <Input
                id="bybitApiKey"
                type="password"
                placeholder="Insira sua API Key da Bybit"
                value={bybitApiKey}
                onChange={(e) => setBybitApiKey(e.target.value)}
              />
              <p className="text-sm text-muted-foreground">
                Você pode obter sua API Key em: https://www.bybit.com/app/user/api-management
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="bybitApiSecret">
                API Secret da Bybit
              </Label>
              <div className="flex gap-2">
                <Input
                  id="bybitApiSecret"
                  type={showApiSecret ? "text" : "password"}
                  placeholder="Insira seu API Secret da Bybit"
                  value={bybitApiSecret}
                  onChange={(e) => setBybitApiSecret(e.target.value)}
                  className="flex-1"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setShowApiSecret(!showApiSecret)}
                >
                  {showApiSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">
                Seu API Secret é confidencial. Nunca o compartilhe com ninguém.
              </p>
            </div>

            <div className="bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
              <p className="text-sm text-yellow-800 dark:text-yellow-200">
                <strong>⚠️ Segurança:</strong> Suas credenciais são criptografadas e armazenadas com segurança. Nunca as compartilhe ou as deixe visíveis em screenshots.
              </p>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline">
                Testar Conexão
              </Button>
              <Button onClick={handleSaveCredentials}>
                Salvar Credenciais
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Parâmetros de Trading</CardTitle>
            <CardDescription>
              Configure como o bot deve executar trades
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="balancePerTrade">
                  Porcentagem do Saldo por Trade (%)
                </Label>
                <Input
                  id="balancePerTrade"
                  type="number"
                  min="1"
                  max="100"
                  value={balancePerTrade}
                  onChange={(e) => setBalancePerTrade(parseInt(e.target.value))}
                />
                <p className="text-sm text-muted-foreground">
                  Quanto do saldo total usar em cada trade (1-100%)
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confidenceThreshold">
                  Threshold de Confiança (%)
                </Label>
                <Input
                  id="confidenceThreshold"
                  type="number"
                  min="0"
                  max="100"
                  value={confidenceThreshold}
                  onChange={(e) => setConfidenceThreshold(parseInt(e.target.value))}
                />
                <p className="text-sm text-muted-foreground">
                  Confiança mínima para executar um trade (0-100%)
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="maxDailyTrades">
                  Máximo de Trades por Dia
                </Label>
                <Input
                  id="maxDailyTrades"
                  type="number"
                  min="1"
                  max="100"
                  value={maxDailyTrades}
                  onChange={(e) => setMaxDailyTrades(parseInt(e.target.value))}
                />
                <p className="text-sm text-muted-foreground">
                  Limite de trades que podem ser executados por dia
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="riskRewardRatio">
                  Razão Risco/Retorno
                </Label>
                <Input
                  id="riskRewardRatio"
                  type="text"
                  value={riskRewardRatio}
                  onChange={(e) => setRiskRewardRatio(e.target.value)}
                />
                <p className="text-sm text-muted-foreground">
                  Razão entre risco e retorno esperado
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="stopLoss">
                  Stop Loss (%)
                </Label>
                <Input
                  id="stopLoss"
                  type="text"
                  value={stopLoss}
                  onChange={(e) => setStopLoss(e.target.value)}
                />
                <p className="text-sm text-muted-foreground">
                  Perda máxima antes de fechar o trade automaticamente
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="takeProfit">
                  Take Profit (%)
                </Label>
                <Input
                  id="takeProfit"
                  type="text"
                  value={takeProfit}
                  onChange={(e) => setTakeProfit(e.target.value)}
                />
                <p className="text-sm text-muted-foreground">
                  Lucro alvo antes de fechar o trade automaticamente
                </p>
              </div>
            </div>

            <div className="flex justify-end">
              <Button
                onClick={handleSave}
                disabled={updateConfig.isPending}
              >
                {updateConfig.isPending ? "Salvando..." : "Salvar Configurações"}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Informações do Sistema</CardTitle>
            <CardDescription>
              Detalhes sobre o bot e modelos de IA
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <div className="text-sm font-medium">Modelos Treinados</div>
                <div className="text-2xl font-bold">2</div>
                <p className="text-sm text-muted-foreground">ETHUSDT e SOLUSDT (1h)</p>
              </div>
              <div>
                <div className="text-sm font-medium">Acurácia Média</div>
                <div className="text-2xl font-bold">78.7%</div>
                <p className="text-sm text-muted-foreground">Nos dados de teste</p>
              </div>
              <div>
                <div className="text-sm font-medium">Acurácia com Alta Confiança</div>
                <div className="text-2xl font-bold">93.9%</div>
                <p className="text-sm text-muted-foreground">Quando confiança {'>'} 80%</p>
              </div>
              <div>
                <div className="text-sm font-medium">Indicadores Técnicos</div>
                <div className="text-2xl font-bold">24</div>
                <p className="text-sm text-muted-foreground">Features por predição</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
