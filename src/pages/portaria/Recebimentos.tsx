import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { getRecebimentosAuditoria, RecebimentoAuditoria } from '@/services/api'
import { Download, Search, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import pb from '@/lib/pocketbase/client'
import { format } from 'date-fns'

export default function PortariaRecebimentos() {
  const { toast } = useToast()

  const [records, setRecords] = useState<RecebimentoAuditoria[]>([])
  const [loading, setLoading] = useState(false)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('Todos')
  const [dateStart, setDateStart] = useState('')
  const [dateEnd, setDateEnd] = useState('')

  const buildFilter = () => {
    const conditions = []
    if (searchTerm) conditions.push(`morador_nome ~ "${searchTerm}"`)
    if (statusFilter && statusFilter !== 'Todos') conditions.push(`status = "${statusFilter}"`)
    if (dateStart) conditions.push(`data_hora_recebimento >= "${dateStart} 00:00:00.000Z"`)
    if (dateEnd) conditions.push(`data_hora_recebimento <= "${dateEnd} 23:59:59.999Z"`)
    return conditions.join(' && ')
  }

  const loadData = async (currentPage = 1) => {
    setLoading(true)
    try {
      const res = await getRecebimentosAuditoria(currentPage, buildFilter())
      setRecords(res.items as RecebimentoAuditoria[])
      setTotalPages(res.totalPages || 1)
      setPage(res.page)
    } catch (err) {
      toast({ title: 'Erro ao carregar registros', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData(1)
  }, [searchTerm, statusFilter, dateStart, dateEnd])

  const handleExport = async () => {
    try {
      const allRecords = await pb
        .collection('recebimentos_auditoria')
        .getFullList({ filter: buildFilter(), sort: '-data_hora_recebimento' })
      const headers = ['Nome', 'CPF', 'Celular', 'Data/Hora', 'Status']
      const rows = allRecords.map((r: any) => [
        r.morador_nome,
        r.morador_cpf,
        r.morador_celular,
        format(new Date(r.data_hora_recebimento), 'dd/MM/yyyy HH:mm'),
        r.status,
      ])
      const csvContent = [headers.join(','), ...rows.map((e) => e.join(','))].join('\n')
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.setAttribute('href', url)
      link.setAttribute('download', 'recebimentos.csv')
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    } catch (e) {
      toast({ title: 'Erro ao exportar arquivo', variant: 'destructive' })
    }
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-20 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Registro de Recebimento</h2>
          <p className="text-muted-foreground">
            Histórico de validações e recebimentos da portaria.
          </p>
        </div>
        <Button onClick={handleExport} variant="outline" className="gap-2">
          <Download className="w-4 h-4" /> Exportar CSV
        </Button>
      </div>

      <Card>
        <CardHeader className="bg-muted/20 border-b pb-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome..."
                className="pl-9"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Todos">Todos</SelectItem>
                  <SelectItem value="Recebido">Recebido</SelectItem>
                  <SelectItem value="Pendente">Pendente</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Input type="date" value={dateStart} onChange={(e) => setDateStart(e.target.value)} />
            </div>
            <div>
              <Input type="date" value={dateEnd} onChange={(e) => setDateEnd(e.target.value)} />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0 overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>CPF / Celular</TableHead>
                <TableHead>Data/Hora</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-10 text-muted-foreground">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                    Carregando registros...
                  </TableCell>
                </TableRow>
              ) : records.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-10 text-muted-foreground">
                    Nenhum registro encontrado.
                  </TableCell>
                </TableRow>
              ) : (
                records.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.morador_nome}</TableCell>
                    <TableCell>
                      <div className="text-sm">{r.morador_cpf}</div>
                      <div className="text-xs text-muted-foreground">{r.morador_celular}</div>
                    </TableCell>
                    <TableCell className="text-sm whitespace-nowrap">
                      {format(new Date(r.data_hora_recebimento), 'dd/MM/yyyy')}
                      <br />
                      <span className="text-muted-foreground">
                        {format(new Date(r.data_hora_recebimento), 'HH:mm')}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span
                        className={`text-xs px-2 py-1 rounded-md ${r.status === 'Recebido' ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}
                      >
                        {r.status}
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
