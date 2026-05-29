import { Link } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { HorizontalTimeline } from '@/components/Timeline'
import { Package, ArrowRight } from 'lucide-react'
import { MOCK_PACKAGES } from '@/lib/mock'

export default function MoradorDashboard() {
  const activePackage = MOCK_PACKAGES[0] // Mock current active

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Olá, João!</h2>
        <p className="text-muted-foreground">Acompanhe suas encomendas em tempo real.</p>
      </div>

      <div className="grid gap-6">
        <Card className="border-primary/20 shadow-md">
          <CardHeader className="pb-4 bg-primary/5 border-b">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <Package className="h-5 w-5 text-primary" />
                Encomenda Ativa
              </CardTitle>
              <Badge className="bg-success">Pronta para Retirada</Badge>
            </div>
          </CardHeader>
          <CardContent className="pt-6 space-y-8">
            <HorizontalTimeline currentStep={3} />

            <div className="flex flex-col md:flex-row justify-between items-center bg-muted/50 p-4 rounded-lg border">
              <div className="text-center md:text-left mb-4 md:mb-0">
                <p className="text-sm text-muted-foreground">Transportadora</p>
                <p className="font-semibold">{activePackage.courier}</p>
              </div>
              <div className="text-center md:text-left mb-4 md:mb-0">
                <p className="text-sm text-muted-foreground">Chegou em</p>
                <p className="font-semibold">{activePackage.date}</p>
              </div>
              <Button asChild>
                <Link to={`/morador/encomenda/${activePackage.id}`}>
                  Ver Detalhes <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        <h3 className="font-semibold mt-4">Outras Pendentes</h3>
        <Card>
          <CardContent className="p-0">
            <div className="flex items-center justify-between p-4 border-b last:border-0">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-muted rounded-full flex items-center justify-center">
                  <Package className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="font-medium">Mercado Livre (Envelope)</p>
                  <p className="text-sm text-muted-foreground">Chegou Hoje, 10:15</p>
                </div>
              </div>
              <Badge variant="outline" className="text-warning border-warning">
                Em Armazenamento
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
