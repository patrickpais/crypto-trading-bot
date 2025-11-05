import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";

export default function Logs() {
  const { data: logs, isLoading } = trpc.logs.list.useQuery({ limit: 100 });

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Logs do Bot</h1>
          <p className="text-muted-foreground">
            Acompanhe todas as atividades e eventos do bot
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Atividades Recentes</CardTitle>
            <CardDescription>
              Últimos 100 eventos registrados
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">Carregando...</div>
            ) : logs && logs.length > 0 ? (
              <div className="space-y-3">
                {logs.map((log) => (
                  <div key={log.id} className="flex items-start gap-4 p-3 border rounded-lg">
                    <Badge
                      variant={
                        log.level === 'error' ? 'destructive' :
                        log.level === 'warning' ? 'secondary' :
                        'default'
                      }
                      className="mt-1"
                    >
                      {log.level}
                    </Badge>
                    <div className="flex-1">
                      <div className="font-medium">{log.message}</div>
                      {log.metadata ? (
                        <div className="text-sm text-muted-foreground mt-1 font-mono">
                          {typeof log.metadata === 'string' ? log.metadata : JSON.stringify(log.metadata as any, null, 2)}
                        </div>
                      ) : null}
                      <div className="text-xs text-muted-foreground mt-2">
                        {new Date(log.createdAt).toLocaleString('pt-BR')}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                Nenhum log encontrado
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
