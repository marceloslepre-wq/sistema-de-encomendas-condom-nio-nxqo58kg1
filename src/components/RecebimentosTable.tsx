import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { useRealtime } from '@/hooks/use-realtime'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Search, Loader2, RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import pb from '@/lib/pocketbase/client'
import { format } from 'date-fns'
import type { RecordModel } from 'pocketbase'
import { Label } from '@/components/ui/label'

export function RecebimentosTable({ refreshTrigger = 0 }: { refreshTrigger?: number }) {
  const { toast } = useToast()
  const [records, setRecords] = useState<RecordModel[]>([])
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  const loadData = useCallback(
    async (currentPage = 1) => {
      setLoading(true)
      try {
        let filter = searchTerm ? `morador_nome ~ "${searchTerm}"` : ''

        if (startDate) {
          const startStr = `${startDate} 00:00:00.000Z`
          filter += filter
            ? ` && data_hora_recebimento >= "${startStr}"`
            : `data_hora_recebimento >= "${startStr}"`
        }

        if (endDate) {
          const endStr = `${endDate} 23:59:59.999Z`
          filter += filter
            ? ` && data_hora_recebimento <= "${endStr}"`
            : `data_hora_recebimento <= "${endStr}"`
        }

        const res = await pb.collection('recebimentos_auditoria').getList(currentPage, 30, {
          sort: '-data_hora_recebimento',
          filter,
        })
        setRecords(res.items)
        setTotalPages(res.totalPages || 1)
        setPage(res.page)
      } catch (err) {
        console.error('Erro ao carregar recebimentos:', err)
        toast({ title: 'Erro ao carregar registros', variant: 'destructive' })
      } finally {
        setLoading(false)
      }
    },
    [searchTerm, startDate, endDate, toast],
  )

  useEffect(() => {
    loadData(1)
  }, [loadData])

  useEffect(() => {
    if (refreshTrigger > 0) {
      loadData(1)
    }
  }, [refreshTrigger, loadData])

  useRealtime('recebimentos_auditoria', () => {
    loadData(page)
  })

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h3 className="text-xl font-semibold tracking-tight">Histórico de Validações</h3>
        <Button
          onClick={() => loadData(page)}
          variant="outline"
          className="gap-2"
          disabled={loading}
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Atualizar
        </Button>
      </div>

      <Card>
        <CardHeader className="bg-muted/20 border-b pb-4">
          <div className="flex flex-col sm:flex-row gap-4 w-full">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome..."
                className="pl-9"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <div className="flex items-center gap-2">
                <Label className="text-sm text-muted-foreground whitespace-nowrap">
                  Data Inicial
                </Label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-[140px]"
                />
              </div>
              <div className="flex items-center gap-2">
                <Label className="text-sm text-muted-foreground whitespace-nowrap">
                  Data Final
                </Label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-[140px]"
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0 overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Unidade</TableHead>
                <TableHead>Morador</TableHead>
                <TableHead>Volumes</TableHead>
                <TableHead>Transportadora</TableHead>
                <TableHead>Entregador</TableHead>
                <TableHead>Código</TableHead>
                <TableHead>Data</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-10 text-muted-foreground">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                    Carregando registros...
                  </TableCell>
                </TableRow>
              ) : records.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-10 text-muted-foreground">
                    Nenhum registro encontrado.
                  </TableCell>
                </TableRow>
              ) : (
                records.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.unidade || '-'}</TableCell>
                    <TableCell>{r.morador_nome || '-'}</TableCell>
                    <TableCell>{r.volumes || '-'}</TableCell>
                    <TableCell>{r.carrier || '-'}</TableCell>
                    <TableCell>{r.entregador_nome || '-'}</TableCell>
                    <TableCell className="font-mono">{r.codigo_validado || '-'}</TableCell>
                    <TableCell className="whitespace-nowrap">
                      {r.data_hora_recebimento
                        ? format(new Date(r.data_hora_recebimento), 'dd/MM/yyyy HH:mm')
                        : '-'}
                    </TableCell>
                    <TableCell>
                      <span
                        className={`text-xs px-2 py-1 rounded-md ${
                          [
                            'Validado',
                            'Recebido',
                            'ENTRADA_PORTARIA',
                            'LIBERADO_RETIRADA',
                          ].includes(r.status)
                            ? 'bg-primary/10 text-primary'
                            : r.status === 'EM_TRIAGEM'
                              ? 'bg-amber-100 text-amber-700'
                              : 'bg-muted text-muted-foreground'
                        }`}
                      >
                        {r.status || '-'}
                      </span>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

          {totalPages > 1 && (
            <div className="flex items-center justify-between p-4 border-t">
              <div className="text-sm text-muted-foreground">
                Página {page} de {totalPages}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => loadData(page - 1)}
                  disabled={page === 1 || loading}
                >
                  <ChevronLeft className="w-4 h-4 mr-1" /> Anterior
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => loadData(page + 1)}
                  disabled={page === totalPages || loading}
                >
                  Próxima <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
