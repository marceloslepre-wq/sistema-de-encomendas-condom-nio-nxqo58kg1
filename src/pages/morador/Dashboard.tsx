import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Package, CalendarClock, Button as ButtonIcon } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { HorizontalTimeline } from '@/components/Timeline'
import { useAuth } from '@/hooks/use-auth'
import { RecebimentoAuditoria } from '@/services/api'
import useRealtime from '@/hooks/use-realtime'
import { format } from 'date-fns'
import pb from '@/lib/pocketbase/client'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'

interface HistoricoAndamento {
  id: string
  recebimento_id: string
  status: string
  observacoes: string
  created: string
}

export default function MoradorDashboard() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [recebimentos, setRecebimentos] = useState<RecebimentoAuditoria[]>([])
  const [historico, setHistorico] = useState<HistoricoAndamento[]>([])
  const [privacy, setPrivacy] = useState(user?.autoriza_retirada_terceiros ?? true)
  const [activeTab, setActiveTab] = useState('ativas')

  const [detailsOpen, setDetailsOpen] = useState<string | null>(null)
  const detailsPkg = recebimentos.find((r) => r.id === detailsOpen)

  const loadData = async () => {
    if (!user?.email) return

    try {
      const conditions = [`morador_id = "${user.id}"`, `morador_id.email = "${user.email}"`]

      const moradorRecord = await pb
        .collection('moradores')
        .getFirstListItem(`email="${user.email}"`)
        .catch(() => null)

      if (moradorRecord) {
        const unitFilter = []
        if (moradorRecord.torre) unitFilter.push(`unidade ~ "${moradorRecord.torre}"`)
        if (moradorRecord.apartamento) unitFilter.push(`unidade ~ "${moradorRecord.apartamento}"`)

        if (unitFilter.length > 0) {
          conditions.push(`(${unitFilter.join(' && ')})`)
        }
      }

      const res = await pb
        .collection('recebimentos_auditoria')
        .getList<RecebimentoAuditoria>(1, 50, {
          filter: `(${conditions.join(' || ')})`,
          sort: '-created',
        })

      setRecebimentos(res.items)

      if (res.items.length > 0) {
        const idsFilter = res.items.map((r) => `recebimento_id = "${r.id}"`).join(' || ')
        const historyRes = await pb
          .collection('historico_andamento')
          .getFullList<HistoricoAndamento>({
            filter: idsFilter,
            sort: 'created',
          })
        setHistorico(historyRes || [])
      } else {
        setHistorico([])
      }
    } catch (erro) {
      console.error('Erro ao buscar encomendas', erro)
    }
  }

  useEffect(() => {
    loadData()
    if (user) setPrivacy(user.autoriza_retirada_terceiros ?? true)
  }, [user])

  useRealtime('recebimentos_auditoria', () => loadData())
  useRealtime('historico_andamento', () => loadData())

  const handlePrivacyToggle = async (checked: boolean) => {
    setPrivacy(checked)
    try {
      await pb.collection('users').update(user.id, { autoriza_retirada_terceiros: checked })
      toast({ title: 'Privacidade atualizada' })
    } catch (erro) {
      setPrivacy(!checked)
      toast({ title: 'Erro', description: 'Não foi possível atualizar.', variant: 'destructive' })
    }
  }

  const getPackageHistory = (pkgId: string) => {
    return historico
      .filter((h) => h.recebimento_id === pkgId)
      .sort((a, b) => new Date(a.created).getTime() - new Date(b.created).getTime())
  }

  const getCurrentStep = (pkg: RecebimentoAuditoria) => {
    if (pkg.status === 'RETIRADO') return 4
    if (pkg.status === 'LIBERADO_RETIRADA') return 2
    if (pkg.status === 'EM_TRIAGEM') return 1
    return 0
  }

  const handleOpenDetails = (pkg: RecebimentoAuditoria) => {
    const pkgHistory = getPackageHistory(pkg.id)
    console.log(
      `Abrindo detalhes: { unidade: '${pkg.unidade}', timeline: [${pkgHistory.map((h) => `'${h.status}'`).join(', ')}] }`,
    )
    setDetailsOpen(pkg.id)
  }

  const recebimentosAtivos = recebimentos.filter((r) => r.status !== 'RETIRADO')
  const recebimentosRetirados = recebimentos.filter((r) => r.status === 'RETIRADO')

  const onTabChange = (val: string) => {
    setActiveTab(val)
    if (val === 'ativas') {
      console.log(
        `Encomendas ativas: { filtro: 'status ≠ Retirado', total: ${recebimentosAtivos.length} }`,
      )
    } else if (val === 'historico') {
      console.log(
        `Encomendas retiradas: { filtro: 'status = Retirado', total: ${recebimentosRetirados.length} }`,
      )
    }
  }

  // Initial log
  useEffect(() => {
    if (activeTab === 'ativas' && recebimentos.length > 0) {
      console.log(
        `Encomendas ativas: { filtro: 'status ≠ Retirado', total: ${recebimentosAtivos.length} }`,
      )
    }
  }, [recebimentos.length])

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-20 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">
            Olá, {user?.name?.split(' ')[0] || 'Morador'}!
          </h2>
          <p className="text-muted-foreground">Acompanhe suas encomendas em tempo real.</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={onTabChange} className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="ativas">Minhas Encomendas</TabsTrigger>
          <TabsTrigger value="historico">Histórico</TabsTrigger>
          <TabsTrigger value="privacidade">Configurações</TabsTrigger>
        </TabsList>

        <TabsContent value="ativas" className="space-y-4">
          {recebimentosAtivos.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                <CalendarClock className="w-16 h-16 mb-4 opacity-20" />
                <p className="text-lg">Nenhuma encomenda ativa no momento.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {recebimentosAtivos.map((pkg) => (
                <Card key={pkg.id} className="overflow-hidden border-primary/10 shadow-sm">
                  <CardHeader className="bg-muted/30 pb-4 border-b">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Package className="h-5 w-5 text-primary" />
                        <CardTitle className="text-lg">{pkg.transportadora || 'Pacote'}</CardTitle>
                      </div>
                      <Badge
                        variant={pkg.status === 'LIBERADO_RETIRADA' ? 'default' : 'secondary'}
                        className={cn(
                          pkg.status === 'LIBERADO_RETIRADA'
                            ? 'bg-success hover:bg-success text-white'
                            : '',
                        )}
                      >
                        {pkg.status?.replace(/_/g, ' ')}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 text-sm mb-6">
                      <div>
                        <p className="text-muted-foreground mb-1">Unidade</p>
                        <p className="font-medium text-base">{pkg.unidade || '-'}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground mb-1">Volume</p>
                        <p className="font-medium text-base">{pkg.volume || '1'}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground mb-1">Data de Entrada</p>
                        <p className="font-medium text-base">
                          {pkg.data_criacao || pkg.created
                            ? format(new Date(pkg.data_criacao || pkg.created), 'dd/MM/yyyy HH:mm')
                            : '-'}
                        </p>
                      </div>
                      <div className="md:border-l md:pl-6">
                        <p className="text-muted-foreground mb-1">Código de Validação</p>
                        <p className="font-mono font-bold text-lg text-primary tracking-wider">
                          {pkg.codigo_validacao || '-'}
                        </p>
                      </div>
                    </div>

                    {((pkg as any).codigo_rastreio || (pkg as any).photo) && (
                      <div className="mb-6 grid grid-cols-1 sm:grid-cols-2 gap-6 pt-4 border-t border-border/50">
                        {(pkg as any).codigo_rastreio && (
                          <div>
                            <p className="text-sm font-semibold mb-2 text-muted-foreground flex items-center gap-2">
                              <Package className="w-4 h-4" /> Código de Rastreio
                            </p>
                            <div className="p-3 bg-muted/30 border rounded-md inline-block">
                              <p className="font-mono font-medium text-base text-foreground">
                                {(pkg as any).codigo_rastreio}
                              </p>
                            </div>
                          </div>
                        )}

                        {(pkg as any).photo && (
                          <div>
                            <p className="text-sm font-semibold mb-2 text-muted-foreground flex items-center gap-2">
                              <Package className="w-4 h-4" /> Foto da Encomenda
                            </p>
                            <div className="border rounded-md overflow-hidden w-40 h-40 bg-muted/50">
                              <img
                                src={pb.files.getURL(pkg as any, (pkg as any).photo)}
                                alt="Foto da Encomenda"
                                className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                                onError={(e) => {
                                  ;(e.target as HTMLImageElement).style.display = 'none'
                                }}
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    <div className="pt-2">
                      <Button variant="outline" onClick={() => handleOpenDetails(pkg)}>
                        Detalhes
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="historico" className="space-y-4">
          {recebimentosRetirados.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                <CalendarClock className="w-16 h-16 mb-4 opacity-20" />
                <p className="text-lg">Nenhum histórico de retiradas.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {recebimentosRetirados.map((pkg) => (
                <Card key={pkg.id} className="overflow-hidden hover:shadow-md transition-shadow">
                  <CardContent className="p-5 flex flex-col md:flex-row justify-between md:items-center gap-4">
                    <div>
                      <p className="font-semibold text-base mb-1">
                        Unidade {pkg.unidade} | Volume {pkg.volume} | Retirado em{' '}
                        {pkg.updated ? format(new Date(pkg.updated), 'dd/MM/yyyy') : '-'}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {pkg.transportadora || 'Pacote'}
                      </p>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => handleOpenDetails(pkg)}>
                      Detalhes
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="privacidade">
          <div className="flex items-center justify-between bg-muted/30 p-4 rounded-lg border shadow-sm max-w-2xl">
            <div className="space-y-0.5">
              <Label className="text-base font-semibold">Permitir retirada por vizinhos</Label>
              <p className="text-sm text-muted-foreground">
                Autoriza outros moradores da sua unidade a visualizarem e retirarem suas encomendas.
              </p>
            </div>
            <Switch checked={privacy} onCheckedChange={handlePrivacyToggle} />
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={!!detailsOpen} onOpenChange={(o) => !o && setDetailsOpen(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Acompanhamento da Encomenda</DialogTitle>
          </DialogHeader>
          {detailsPkg && (
            <div className="py-4">
              <HorizontalTimeline currentStep={getCurrentStep(detailsPkg)} />

              <div className="mt-10 flex flex-col space-y-4 relative ml-2">
                <div className="absolute left-[7px] top-2 bottom-2 w-[2px] bg-border" />
                {getPackageHistory(detailsPkg.id).map((hist, idx) => {
                  const isLast = idx === getPackageHistory(detailsPkg.id).length - 1
                  return (
                    <div key={hist.id} className="flex items-start gap-4 relative z-10">
                      <div
                        className={cn(
                          'w-4 h-4 rounded-full mt-1 shrink-0 ring-4 ring-background',
                          isLast ? 'bg-primary' : 'bg-muted-foreground',
                        )}
                      />
                      <div>
                        <p
                          className={cn(
                            'text-sm font-medium',
                            isLast ? 'text-foreground' : 'text-muted-foreground',
                          )}
                        >
                          {hist.status.replace(/_/g, ' ')}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(hist.created), "dd/MM/yyyy 'às' HH:mm")}
                          </span>
                          {hist.observacoes && (
                            <span className="text-xs text-muted-foreground">
                              - {hist.observacoes}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
