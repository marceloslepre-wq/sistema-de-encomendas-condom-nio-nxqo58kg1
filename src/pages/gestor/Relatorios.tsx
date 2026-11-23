import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { FileText, Download } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { getParcels } from '@/services/api'
import { format, isValid, startOfDay, addDays } from 'date-fns'

/** Converte datas do PocketBase ("2026-11-13 12:20:54.078Z") ou ISO em Date válida, ou null. */
const parseDate = (value?: string | null): Date | null => {
  if (!value) return null
  const d = new Date(value.replace(' ', 'T'))
  return isValid(d) ? d : null
}

/** Linha do relatório, já com os campos reais da coleção recebimentos_auditoria. */
type ReportRow = {
  codigoRetirada: string
  rastreio: string
  torre: string
  apto: string
  morador: string
  status: string
  transportadora: string
  entrada: Date | null
  saida: Date | null
}

const splitUnidade = (unidade: string) => {
  const idx = unidade.lastIndexOf(' - ')
  if (idx === -1) return { torre: unidade, apto: '' }
  return { torre: unidade.slice(0, idx), apto: unidade.slice(idx + 3) }
}

const toReportRow = (rec: any): ReportRow => {
  const unit = rec.expand?.unidade_id
  const resident = rec.expand?.morador_id
  const fromUnidade = splitUnidade(rec.unidade || '')
  const finalizada = rec.status === 'RETIRADO' || rec.status === 'ENTREGUE'
  return {
    codigoRetirada: rec.codigo_retirada || '',
    rastreio: rec.codigo_rastreio || '',
    torre: unit?.tower || fromUnidade.torre,
    apto: unit?.apartment || fromUnidade.apto,
    morador: rec.morador || resident?.name || '',
    status: rec.status || '',
    transportadora: rec.transportadora || '',
    entrada: parseDate(rec.data_criacao),
    // Não há campo de data de saída na coleção: usa a última atualização de encomenda já retirada/entregue.
    saida: finalizada ? parseDate(rec.updated) : null,
  }
}

const fmtDate = (d: Date | null) => (d ? format(d, 'dd/MM/yyyy HH:mm') : '-')
const orDash = (v: string) => v || '-'

const escapeCsv = (v: string) => (/[",\n;]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v)

export default function GestorRelatorios() {
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [tower, setTower] = useState('Todas')
  const [status, setStatus] = useState('Todos')
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<ReportRow[] | null>(null)
  const { toast } = useToast()

  const handleFilter = async () => {
    setLoading(true)
    try {
      const all = await getParcels()
      const rows = (all as any[]).map(toReportRow)

      // Período: início às 00:00 do dia inicial e fim antes da meia-noite do dia final (inclusive).
      const rangeStart = startDate ? startOfDay(new Date(`${startDate}T00:00:00`)) : null
      const rangeEnd = endDate ? addDays(startOfDay(new Date(`${endDate}T00:00:00`)), 1) : null

      const filtered = rows.filter((r) => {
        if (rangeStart || rangeEnd) {
          // Sem data de entrada válida não há como provar que está no período: fica de fora.
          if (!r.entrada) return false
          if (rangeStart && r.entrada < rangeStart) return false
          if (rangeEnd && r.entrada >= rangeEnd) return false
        }
        if (tower !== 'Todas' && r.torre !== tower) return false
        if (status !== 'Todos' && r.status !== status) return false
        return true
      })
      setResults(filtered)
    } catch (e) {
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar os dados.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const exportCSV = () => {
    if (!results) return
    const headers = [
      'Código de Retirada',
      'Rastreio',
      'Torre',
      'Apto',
      'Morador',
      'Status',
      'Transportadora',
      'Entrada',
      'Saída',
    ]
    const rows = results.map((r) =>
      [
        orDash(r.codigoRetirada),
        orDash(r.rastreio),
        orDash(r.torre),
        orDash(r.apto),
        orDash(r.morador),
        r.status,
        orDash(r.transportadora),
        fmtDate(r.entrada),
        fmtDate(r.saida),
      ].map(escapeCsv),
    )

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `relatorio_encomendas_${format(new Date(), 'yyyyMMdd')}.csv`
    link.click()
    toast({ title: 'Exportação concluída', description: 'Download do CSV iniciado.' })
  }

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-primary">Exportação de Dados</h2>
        <p className="text-muted-foreground">Filtre e exporte relatórios operacionais.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filtros do Relatório</CardTitle>
          <CardDescription>
            Selecione os parâmetros para gerar os dados das encomendas.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="space-y-2">
              <Label>Data Inicial</Label>
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Data Final</Label>
              <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Torre</Label>
              <Select value={tower} onValueChange={setTower}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Todas">Todas</SelectItem>
                  <SelectItem value="A">Torre A</SelectItem>
                  <SelectItem value="B">Torre B</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Todos">Todos</SelectItem>
                  <SelectItem value="RECEBIDO_PORTARIA">Recebido</SelectItem>
                  <SelectItem value="DISPONIVEL_RETIRADA">Disponível</SelectItem>
                  <SelectItem value="RETIRADO">Retirado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button onClick={handleFilter} disabled={loading} className="w-full md:w-auto">
            {loading ? 'Buscando...' : 'Aplicar Filtros'}
          </Button>
        </CardContent>
      </Card>

      {results !== null && (
        <Card className="animate-fade-in-up">
          <CardContent className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <p className="font-semibold text-lg">
                Total de registros no período: {results.length}
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() =>
                  toast({ title: 'Aviso', description: 'Exportação PDF em desenvolvimento.' })
                }
              >
                <FileText className="mr-2 h-4 w-4" /> Exportar PDF
              </Button>
              <Button onClick={exportCSV} disabled={results.length === 0}>
                <Download className="mr-2 h-4 w-4" /> Exportar CSV
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
