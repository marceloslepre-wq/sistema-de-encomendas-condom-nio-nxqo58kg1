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
import { getParcels, Parcel } from '@/services/api'
import { format } from 'date-fns'

export default function GestorRelatorios() {
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [tower, setTower] = useState('Todas')
  const [status, setStatus] = useState('Todos')
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<Parcel[] | null>(null)
  const { toast } = useToast()

  const handleFilter = async () => {
    setLoading(true)
    try {
      const all = await getParcels()
      const filtered = (all as Parcel[]).filter((p) => {
        let match = true
        if (startDate && new Date(p.entry_date) < new Date(startDate)) match = false
        if (endDate && new Date(p.entry_date) > new Date(endDate)) match = false
        if (tower !== 'Todas' && p.expand?.unit_id?.tower !== tower) match = false
        if (status !== 'Todos' && p.status !== status) match = false
        return match
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
    const headers = ['Código', 'Torre', 'Apto', 'Status', 'Transportadora', 'Entrada', 'Saída']
    const rows = results.map((p) => [
      p.tracking_code || '-',
      p.expand?.unit_id?.tower || '-',
      p.expand?.unit_id?.apartment || '-',
      p.status,
      p.carrier || '-',
      format(new Date(p.entry_date), 'dd/MM/yyyy HH:mm'),
      p.exit_date ? format(new Date(p.exit_date), 'dd/MM/yyyy HH:mm') : '-',
    ])

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
