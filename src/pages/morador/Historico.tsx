import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Search, Filter, PackageCheck } from 'lucide-react'
import { MOCK_PACKAGES } from '@/lib/mock'

export default function MoradorHistorico() {
  const history = MOCK_PACKAGES.filter((p) => p.status === 'withdrawn')

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Histórico</h2>
        <p className="text-muted-foreground">Registro de todas as suas retiradas.</p>
      </div>

      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar por código ou entregador..." className="pl-8 bg-white" />
        </div>
        <Button variant="outline" size="icon" className="bg-white">
          <Filter className="h-4 w-4" />
        </Button>
      </div>

      <div className="space-y-4">
        {history.map((pkg) => (
          <Card key={pkg.id} className="overflow-hidden hover:shadow-md transition-shadow">
            <CardContent className="p-4 flex flex-col md:flex-row justify-between md:items-center gap-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-success/10 rounded-full flex items-center justify-center shrink-0">
                  <PackageCheck className="h-6 w-6 text-success" />
                </div>
                <div>
                  <h4 className="font-semibold">{pkg.courier}</h4>
                  <p className="text-sm text-muted-foreground">Retirado em: {pkg.date}</p>
                </div>
              </div>
              <div className="flex items-center justify-between md:flex-col md:items-end gap-2">
                <Badge variant="outline" className="bg-success/5 text-success border-success/20">
                  Retirado
                </Badge>
                <span className="text-xs font-mono text-muted-foreground">ID: {pkg.id}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
