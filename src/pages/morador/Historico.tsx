import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Search, PackageCheck, Download } from 'lucide-react'
import { useAuth } from '@/hooks/use-auth'
import { getUnitParcels, Parcel } from '@/services/api'
import { format } from 'date-fns'
import { Link } from 'react-router-dom'

export default function MoradorHistorico() {
  const { user } = useAuth()
  const [history, setHistory] = useState<Parcel[]>([])
  const [search, setSearch] = useState('')

  useEffect(() => {
    if (!user?.unit_id) return
    getUnitParcels(user.unit_id, 1).then((res) => setHistory(res.items))
  }, [user])

  const filtered = history.filter(
    (p) =>
      p.tracking_code?.toLowerCase().includes(search.toLowerCase()) ||
      p.carrier?.toLowerCase().includes(search.toLowerCase()),
  )

  const handleExport = () => {
    const csv =
      'Data,Transportadora,Status\n' +
      filtered.map((p) => `${p.created},${p.carrier || '-'},${p.status}`).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'historico_encomendas.csv'
    a.click()
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Histórico</h2>
          <p className="text-muted-foreground">Registro de todas as suas entregas.</p>
        </div>
        <Button variant="outline" onClick={handleExport}>
          <Download className="h-4 w-4 mr-2" /> Exportar CSV
        </Button>
      </div>

      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por código ou transportadora..."
            className="pl-8 bg-white"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="space-y-4">
        {filtered.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">Nenhum registro encontrado.</p>
        ) : (
          filtered.map((pkg) => (
            <Link to={`/morador/encomenda/${pkg.id}`} key={pkg.id}>
              <Card className="overflow-hidden hover:shadow-md transition-shadow mb-4">
                <CardContent className="p-4 flex flex-col md:flex-row justify-between md:items-center gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center shrink-0">
                      <PackageCheck className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <h4 className="font-semibold">{pkg.carrier || 'Pacote'}</h4>
                      <p className="text-sm text-muted-foreground">
                        {pkg.entry_date
                          ? format(new Date(pkg.entry_date), 'dd/MM/yyyy HH:mm')
                          : '-'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between md:flex-col md:items-end gap-2">
                    <Badge
                      variant={
                        pkg.status === 'RETIRADO' || pkg.status === 'ENTREGUE'
                          ? 'outline'
                          : 'default'
                      }
                      className="uppercase text-xs"
                    >
                      {pkg.status.replace(/_/g, ' ')}
                    </Badge>
                    <span className="text-xs font-mono text-muted-foreground">
                      Cód: {pkg.tracking_code || pkg.id.substring(0, 8)}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))
        )}
      </div>
    </div>
  )
}
