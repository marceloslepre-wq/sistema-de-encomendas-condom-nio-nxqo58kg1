import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { HorizontalTimeline } from '@/components/Timeline'
import { Package, ArrowRight, Box } from 'lucide-react'
import { useAuth } from '@/hooks/use-auth'
import { getUnitParcels, Parcel } from '@/services/api'
import useRealtime from '@/hooks/use-realtime'
import { format } from 'date-fns'

const STATUS_STEPS = ['RECEBIDO_PORTARIA', 'EM_SALA', 'CATALOGADO', 'DISPONIVEL_RETIRADA']

export default function MoradorDashboard() {
  const { user } = useAuth()
  const [parcels, setParcels] = useState<Parcel[]>([])

  const loadData = async () => {
    if (!user?.unit_id) return
    const res = await getUnitParcels(
      user.unit_id,
      1,
      'status != "RETIRADO" && status != "CANCELADO"',
    )
    setParcels(res.items)
  }

  useEffect(() => {
    loadData()
  }, [user])
  useRealtime('parcels', () => loadData())

  const activePackage = parcels[0]
  const pendingPackages = parcels.slice(1)

  const getStep = (status: string) => Math.max(0, STATUS_STEPS.indexOf(status))

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">
          Olá, {user?.name?.split(' ')[0] || 'Morador'}!
        </h2>
        <p className="text-muted-foreground">Acompanhe suas encomendas em tempo real.</p>
      </div>

      <div className="grid gap-6">
        {activePackage ? (
          <Card className="border-primary/20 shadow-md">
            <CardHeader className="pb-4 bg-primary/5 border-b">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Package className="h-5 w-5 text-primary" />
                  Encomenda Principal
                </CardTitle>
                <Badge
                  className={
                    activePackage.status === 'DISPONIVEL_RETIRADA' ? 'bg-success' : 'bg-primary'
                  }
                >
                  {activePackage.status.replace(/_/g, ' ')}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="pt-6 space-y-8">
              <HorizontalTimeline currentStep={getStep(activePackage.status)} />

              <div className="flex flex-col md:flex-row justify-between items-center bg-muted/50 p-4 rounded-lg border">
                <div className="text-center md:text-left mb-4 md:mb-0">
                  <p className="text-sm text-muted-foreground">Transportadora</p>
                  <p className="font-semibold">{activePackage.carrier || 'Não informada'}</p>
                </div>
                <div className="text-center md:text-left mb-4 md:mb-0">
                  <p className="text-sm text-muted-foreground">Chegou em</p>
                  <p className="font-semibold">
                    {activePackage.entry_date
                      ? format(new Date(activePackage.entry_date), 'dd/MM/yyyy HH:mm')
                      : '-'}
                  </p>
                </div>
                <Button asChild>
                  <Link to={`/morador/encomenda/${activePackage.id}`}>
                    Ver Detalhes <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Box className="w-12 h-12 mb-4 opacity-50" />
              <p>Nenhuma encomenda no momento.</p>
            </CardContent>
          </Card>
        )}

        {pendingPackages.length > 0 && (
          <>
            <h3 className="font-semibold mt-4">Outras Pendentes</h3>
            <Card>
              <CardContent className="p-0">
                {pendingPackages.map((pkg) => (
                  <div
                    key={pkg.id}
                    className="flex items-center justify-between p-4 border-b last:border-0"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-muted rounded-full flex items-center justify-center">
                        <Package className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="font-medium">{pkg.carrier || 'Pacote'}</p>
                        <p className="text-sm text-muted-foreground">
                          {pkg.entry_date ? format(new Date(pkg.entry_date), 'dd/MM HH:mm') : ''}
                        </p>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm" asChild>
                      <Link to={`/morador/encomenda/${pkg.id}`}>Ver</Link>
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  )
}
