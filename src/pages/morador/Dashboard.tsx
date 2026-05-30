import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { VerticalTimeline } from '@/components/Timeline'
import { Package, ArrowRight, Box, CalendarClock, ListChecks } from 'lucide-react'
import { useAuth } from '@/hooks/use-auth'
import { getUnitParcels, getFileUrl, Parcel } from '@/services/api'
import useRealtime from '@/hooks/use-realtime'
import { format } from 'date-fns'
import pb from '@/lib/pocketbase/client'
import { useToast } from '@/hooks/use-toast'

const STATUS_STEPS = ['ENTRADA_PORTARIA', 'EM_TRIAGEM', 'LIBERADO_RETIRADA', 'RETIRADO']

export default function MoradorDashboard() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [parcels, setParcels] = useState<Parcel[]>([])
  const [privacy, setPrivacy] = useState(user?.autoriza_retirada_terceiros ?? true)

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
    if (user) setPrivacy(user.autoriza_retirada_terceiros ?? true)
  }, [user])
  useRealtime('parcels', () => loadData())

  const handlePrivacyToggle = async (checked: boolean) => {
    setPrivacy(checked)
    try {
      await pb.collection('users').update(user.id, { autoriza_retirada_terceiros: checked })
      toast({ title: 'Privacidade atualizada' })
    } catch {
      setPrivacy(!checked)
      toast({ title: 'Erro', description: 'Não foi possível atualizar.', variant: 'destructive' })
    }
  }

  const activePackage = parcels[0]
  const pendingPackages = parcels.slice(1)

  const getStep = (status: string) => Math.max(0, STATUS_STEPS.indexOf(status))

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">
            Olá, {user?.name?.split(' ')[0] || 'Morador'}!
          </h2>
          <p className="text-muted-foreground">Acompanhe suas encomendas em tempo real.</p>
        </div>
        <Button asChild className="gap-2" variant="outline">
          <Link to="/morador/retirada">
            <ListChecks className="w-4 h-4" />
            Retirada em Massa
          </Link>
        </Button>
      </div>

      <div className="flex items-center justify-between bg-muted/30 p-4 rounded-lg border shadow-sm">
        <div className="space-y-0.5">
          <Label className="text-base font-semibold">Permitir retirada por vizinhos</Label>
          <p className="text-sm text-muted-foreground">
            Autoriza outros moradores da sua unidade a visualizarem e retirarem suas encomendas.
          </p>
        </div>
        <Switch checked={privacy} onCheckedChange={handlePrivacyToggle} />
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
                    activePackage.status === 'LIBERADO_RETIRADA'
                      ? 'bg-success hover:bg-success'
                      : 'bg-primary'
                  }
                >
                  {activePackage.status.replace(/_/g, ' ')}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="pt-6 grid md:grid-cols-2 gap-8">
              <div>
                <VerticalTimeline currentStep={getStep(activePackage.status)} />

                <div className="mt-8 space-y-4 text-sm bg-muted/50 p-4 rounded-lg border">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Transportadora</span>
                    <span className="font-semibold">{activePackage.carrier || '-'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Chegou em</span>
                    <span className="font-semibold">
                      {activePackage.entry_date
                        ? format(new Date(activePackage.entry_date), 'dd/MM/yyyy HH:mm')
                        : '-'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex flex-col items-center justify-center gap-6">
                {activePackage.photo ? (
                  <div className="w-full flex flex-col items-center">
                    <p className="text-sm text-muted-foreground mb-2 font-medium">Foto do Pacote</p>
                    <img
                      src={getFileUrl(activePackage, activePackage.photo)}
                      alt="Pacote"
                      className="rounded-lg shadow-sm w-full max-w-[240px] h-48 object-cover border"
                    />
                  </div>
                ) : (
                  <div className="w-full max-w-[240px] h-48 bg-muted rounded-lg flex items-center justify-center border border-dashed">
                    <Box className="w-10 h-10 text-muted-foreground/30" />
                  </div>
                )}

                {activePackage.status === 'LIBERADO_RETIRADA' && activePackage.withdrawal_code && (
                  <div className="w-full p-6 bg-success/10 rounded-xl border-2 border-success/30 text-center animate-fade-in-up">
                    <p className="text-sm font-bold text-success mb-2 uppercase tracking-wider">
                      Código de Retirada
                    </p>
                    <p className="text-4xl font-black tracking-[0.2em] text-success">
                      {activePackage.withdrawal_code}
                    </p>
                    <p className="text-xs text-muted-foreground mt-3">
                      Apresente este código na sala de encomendas
                    </p>
                  </div>
                )}

                <Button variant="outline" className="w-full" asChild>
                  <Link to={`/morador/encomenda/${activePackage.id}`}>
                    Ver Histórico Completo <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <CalendarClock className="w-16 h-16 mb-4 opacity-20" />
              <p className="text-lg">Nenhuma encomenda a caminho no momento.</p>
            </CardContent>
          </Card>
        )}

        {pendingPackages.length > 0 && (
          <div className="animate-fade-in">
            <h3 className="font-semibold mt-4 mb-2">Outras Encomendas</h3>
            <Card>
              <CardContent className="p-0 divide-y">
                {pendingPackages.map((pkg) => (
                  <div key={pkg.id} className="flex items-center justify-between p-4">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-muted rounded-full flex items-center justify-center">
                        <Package className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="font-medium">{pkg.carrier || 'Pacote'}</p>
                        <p className="text-xs text-muted-foreground">
                          {pkg.status.replace(/_/g, ' ')}
                        </p>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm" asChild>
                      <Link to={`/morador/encomenda/${pkg.id}`}>Detalhes</Link>
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}
