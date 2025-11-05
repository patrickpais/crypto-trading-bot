import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { User, Mail, Calendar, Activity, TrendingUp, Award, Lock } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export default function Profile() {
  const { user } = useAuth();
  const { data: trades } = trpc.trades.list.useQuery({ limit: 1000 });
  const { data: botConfig } = trpc.bot.getConfig.useQuery();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const changePasswordMutation = trpc.auth.changePassword.useMutation();

  // Calcular estatísticas do usuário
  const totalTrades = trades?.length || 0;
  const closedTrades = trades?.filter(t => t.status === "closed") || [];
  const winningTrades = closedTrades.filter(t => t.profitPercent && parseFloat(t.profitPercent) > 0);
  const losingTrades = closedTrades.filter(t => t.profitPercent && parseFloat(t.profitPercent) < 0);
  
  const winRate = closedTrades.length > 0 ? (winningTrades.length / closedTrades.length) * 100 : 0;
  
  const totalProfit = closedTrades.reduce((sum, t) => {
    if (t.profitPercent && t.quantity && t.entryPrice) {
      return sum + (parseFloat(t.profitPercent) / 100) * parseFloat(t.entryPrice) * parseFloat(t.quantity);
    }
    return sum;
  }, 0);

  const avgProfit = winningTrades.length > 0 
    ? winningTrades.reduce((sum, t) => sum + (parseFloat(t.profitPercent!) || 0), 0) / winningTrades.length 
    : 0;

  const avgLoss = losingTrades.length > 0 
    ? losingTrades.reduce((sum, t) => sum + (parseFloat(t.profitPercent!) || 0), 0) / losingTrades.length 
    : 0;

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error("Por favor, preencha todos os campos");
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error("As senhas não coincidem");
      return;
    }

    if (newPassword.length < 6) {
      toast.error("A nova senha deve ter no mínimo 6 caracteres");
      return;
    }

    setIsChangingPassword(true);
    try {
      await changePasswordMutation.mutateAsync({
        currentPassword,
        newPassword,
      });
      toast.success("Senha alterada com sucesso!");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error: any) {
      toast.error(error.message || "Erro ao alterar senha");
    } finally {
      setIsChangingPassword(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Perfil do Usuário</h1>
          <p className="text-muted-foreground">
            Suas informações e estatísticas de trading
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Informações Pessoais</CardTitle>
              <CardDescription>Seus dados de conta</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="h-8 w-8 text-primary" />
                </div>
                <div>
                  <div className="font-medium text-lg">{user?.name || "Usuário"}</div>
                  <div className="text-sm text-muted-foreground">{user?.email || "email@exemplo.com"}</div>
                </div>
              </div>

              <div className="space-y-3 pt-4">
                <div className="flex items-center gap-3">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <div className="text-sm font-medium">Email</div>
                    <div className="text-sm text-muted-foreground">{user?.email || "Não informado"}</div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <div className="text-sm font-medium">Membro desde</div>
                    <div className="text-sm text-muted-foreground">
                      {user?.createdAt ? new Date(user.createdAt).toLocaleDateString("pt-BR") : "N/A"}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Activity className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <div className="text-sm font-medium">Último acesso</div>
                    <div className="text-sm text-muted-foreground">
                      {user?.lastSignedIn ? new Date(user.lastSignedIn).toLocaleDateString("pt-BR") : "N/A"}
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Estatísticas de Trading</CardTitle>
              <CardDescription>Seu desempenho geral</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <div className="text-sm text-muted-foreground">Total de Trades</div>
                  <div className="text-2xl font-bold">{totalTrades}</div>
                </div>
                <div className="space-y-1">
                  <div className="text-sm text-muted-foreground">Taxa de Acerto</div>
                  <div className="text-2xl font-bold text-green-500">{winRate.toFixed(1)}%</div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <div className="text-sm text-muted-foreground">Lucro Total</div>
                  <div className={`text-2xl font-bold ${totalProfit >= 0 ? "text-green-500" : "text-red-500"}`}>
                    ${totalProfit.toFixed(2)}
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="text-sm text-muted-foreground">Trades Ativos</div>
                  <div className="text-2xl font-bold">
                    {trades?.filter(t => t.status === "open").length || 0}
                  </div>
                </div>
              </div>

              <div className="pt-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Lucro Médio</span>
                  <span className="font-medium text-green-500">+{avgProfit.toFixed(2)}%</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Perda Média</span>
                  <span className="font-medium text-red-500">{avgLoss.toFixed(2)}%</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Conquistas</CardTitle>
            <CardDescription>Marcos alcançados no trading</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              {totalTrades >= 10 && (
                <div className="flex items-center gap-3 p-4 border rounded-lg bg-yellow-500/10 border-yellow-500/20">
                  <Award className="h-8 w-8 text-yellow-500" />
                  <div>
                    <div className="font-medium">Primeiro Passo</div>
                    <div className="text-sm text-muted-foreground">10+ trades executados</div>
                  </div>
                </div>
              )}

              {winRate >= 60 && closedTrades.length >= 10 && (
                <div className="flex items-center gap-3 p-4 border rounded-lg bg-green-500/10 border-green-500/20">
                  <TrendingUp className="h-8 w-8 text-green-500" />
                  <div>
                    <div className="font-medium">Trader Consistente</div>
                    <div className="text-sm text-muted-foreground">60%+ de acerto</div>
                  </div>
                </div>
              )}

              {totalTrades >= 100 && (
                <div className="flex items-center gap-3 p-4 border rounded-lg bg-blue-500/10 border-blue-500/20">
                  <Activity className="h-8 w-8 text-blue-500" />
                  <div>
                    <div className="font-medium">Trader Experiente</div>
                    <div className="text-sm text-muted-foreground">100+ trades</div>
                  </div>
                </div>
              )}

              {totalTrades < 10 && (
                <div className="col-span-3 text-center py-8 text-muted-foreground">
                  Execute mais trades para desbloquear conquistas!
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Configurações da Conta</CardTitle>
            <CardDescription>Gerencie suas preferências</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Saldo Inicial</Label>
                <Input 
                  type="number" 
                  value={10000}
                  disabled
                  className="font-mono"
                />
                <p className="text-xs text-muted-foreground">
                  Saldo configurado para simulação de trades
                </p>
              </div>

              <div className="space-y-2">
                <Label>Confiança Mínima</Label>
                <div className="flex items-center gap-2">
                  <Input 
                    type="number" 
                    value={botConfig?.confidenceThreshold || 80}
                    disabled
                    className="font-mono"
                  />
                  <span className="text-sm text-muted-foreground">%</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Altere na página de Configurações
                </p>
              </div>

              <div className="pt-4">
                <Button variant="outline" className="w-full" disabled>
                  Editar Preferências (Em breve)
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5" />
              Alterar Senha
            </CardTitle>
            <CardDescription>Atualize sua senha de acesso</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="current-password">Senha Atual</Label>
              <Input
                id="current-password"
                type="password"
                placeholder="Digite sua senha atual"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                disabled={isChangingPassword}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="new-password">Nova Senha</Label>
              <Input
                id="new-password"
                type="password"
                placeholder="Digite sua nova senha (mínimo 6 caracteres)"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                disabled={isChangingPassword}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirmar Nova Senha</Label>
              <Input
                id="confirm-password"
                type="password"
                placeholder="Confirme sua nova senha"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={isChangingPassword}
              />
            </div>

            <Button
              onClick={handleChangePassword}
              className="w-full"
              disabled={isChangingPassword}
            >
              {isChangingPassword ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Alterando...
                </>
              ) : (
                "Alterar Senha"
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
