import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import PerformanceChart from "@/components/PerformanceChart";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default function Trades() {
  const { data: trades, isLoading } = trpc.trades.list.useQuery({ limit: 100 });

  // Preparar dados para o gráfico de performance
  const closedTrades = trades?.filter(t => t.status === 'closed' && t.exitPrice && t.profitPercent && t.quantity).map(t => ({
    exit_time: (t.exitTime || t.entryTime).toString(),
    pnl: (parseFloat(t.profitPercent!) / 100) * parseFloat(t.entryPrice) * parseFloat(t.quantity!),
    pnl_pct: parseFloat(t.profitPercent!)
  })) || [];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Histórico de Trades</h1>
          <p className="text-muted-foreground">
            Visualize todos os trades executados pelo bot
          </p>
        </div>

        {closedTrades.length > 0 && (
          <PerformanceChart trades={closedTrades} initialBalance={10000} />
        )}

        <Card>
          <CardHeader>
            <CardTitle>Todos os Trades</CardTitle>
            <CardDescription>
              Histórico completo de trades executados
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">Carregando...</div>
            ) : trades && trades.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Símbolo</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Entrada</TableHead>
                    <TableHead>Saída</TableHead>
                    <TableHead>Lucro</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Confiança</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {trades.map((trade) => (
                    <TableRow key={trade.id}>
                      <TableCell className="text-sm">
                        {new Date(trade.entryTime).toLocaleString('pt-BR')}
                      </TableCell>
                      <TableCell className="font-medium">{trade.symbol}</TableCell>
                      <TableCell>
                        <Badge variant={trade.type === 'buy' ? 'default' : 'destructive'}>
                          {trade.type.toUpperCase()}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono">
                        ${parseFloat(trade.entryPrice).toFixed(2)}
                      </TableCell>
                      <TableCell className="font-mono">
                        {trade.exitPrice ? `$${parseFloat(trade.exitPrice).toFixed(2)}` : '-'}
                      </TableCell>
                      <TableCell>
                        {trade.profitPercent ? (
                          <span className={parseFloat(trade.profitPercent) >= 0 ? 'text-green-500' : 'text-red-500'}>
                            {parseFloat(trade.profitPercent).toFixed(2)}%
                          </span>
                        ) : '-'}
                      </TableCell>
                      <TableCell>
                        <Badge variant={
                          trade.status === 'open' ? 'default' :
                          trade.status === 'closed' ? 'secondary' :
                          'outline'
                        }>
                          {trade.status}
                        </Badge>
                      </TableCell>
                      <TableCell>-</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                Nenhum trade encontrado
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
