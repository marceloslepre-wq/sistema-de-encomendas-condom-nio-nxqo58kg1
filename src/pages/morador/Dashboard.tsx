import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Package, CalendarClock, Clock, CheckCircle2 } from 'lucide-react'
import { HorizontalTimeline, VerticalTimeline } from '@/components/Timeline'
import { useAuth } from '@/hooks/use-auth'
import { RecebimentoAuditoria } from '@/services/api'
import useRealtime from '@/hooks/use-realtime'
import { format } from 'date-fns'
import pb from '@/lib/pocketbase/client'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

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

  const [recebimentosAtivos, setRecebimentosAtivos] = useState<RecebimentoAuditoria[]>([])
  const [recebimentosHistorico, setRecebimentosHistorico] = useState<RecebimentoAuditoria[]>([])
  const [historico, setHistorico] = useState<HistoricoAndamento[]>([])
  const [privacy, setPrivacy] = useState(user?.autoriza_retirada_terceiros ?? true)

  const [selectedHistoryPkg, setSelectedHistoryPkg] = useState<RecebimentoAuditoria | null>(null)

  const loadData = async () => {
    if (!user?.id) return

    try {
      let unitId = ''
      if (user.torre && user.unidade) {
        const unit = await pb
          .collection('units')
          .getFirstListItem(`tower="${user.torre}" && apartment="${user.unidade}"`)
          .catch(() => null)
        unitId = unit?.id || ''
      }

      console.log('Dashboard carregando:', { morador_id: user.id, unidade_id: unitId })

      const yesterday = new Date()
      yesterday.setHours(yesterday.getHours() - 24)
      const yesterdayStr = yesterday.toISOString().replace('T', ' ').substring(0, 19) + 'Z'

      const filterAtivos = `morador_id = "${user.id}" && unidade_id = "${unitId}" && (status != 'RETIRADO' && status != 'ENTREGUE' || ((status = 'RETIRADO' || status = 'ENTREGUE') && updated >= "${yesterdayStr}"))`

      const activeRes = await pb
        .collection('recebimentos_auditoria')
        .getList<RecebimentoAuditoria>(1, 50, {
          filter: filterAtivos,
          sort: '-created',
        })

      console.log('Buscando encomendas:', {
        filtro: filterAtivos,
        registros_encontrados: activeRes.items.length,
      })
      setRecebimentosAtivos(activeRes.items)

      const filterHistorico = `morador_id = "${user.id}" && unidade_id = "${unitId}" && (status = 'RETIRADO' || status = 'ENTREGUE') && updated < "${yesterdayStr}"`

      const historyRes = await pb
        .collection('recebimentos_auditoria')
        .getList<RecebimentoAuditoria>(1, 50, {
          filter: filterHistorico,
          sort: '-updated',
        })

      console.log('Buscando encomendas:', {
        filtro: filterHistorico,
        registros_encontrados: historyRes.items.length,
      })
      setRecebimentosHistorico(historyRes.items)

      const allItems = [...activeRes.items, ...historyRes.items]

      if (allItems.length > 0) {
        const idsFilter = allItems.map((r) => `recebimento_id = "${r.id}"`).join(' || ')
        const andamentoRes = await pb
          .collection('historico_andamento')
          .getFullList<HistoricoAndamento>({
            filter: idsFilter,
            sort: 'created',
          })
        setHistorico(andamentoRes || [])
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

  useEffect(() => {
    recebimentosAtivos.forEach((pkg) => {
      if (pkg.status === 'LIBERADO_RETIRADA') {
        console.log('Código exibido:', {
          codigo_retirada: (pkg as any).codigo_retirada,
          status: pkg.status,
        })
      }
    })
  }, [recebimentosAtivos])

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

  const getCurrentStep = (pkg: RecebimentoAuditoria, history: HistoricoAndamento[]) => {
    if (pkg.status === 'RETIRADO' || pkg.status === 'ENTREGUE') return 4
    if (pkg.status === 'LIBERADO_RETIRADA') return 3
    const hasTriagem = history.some(
      (h) =>
        h.status === 'EM_TRIAGEM' ||
        h.status === 'EM_SALA' ||
        h.status === 'SALA_ENCOMENDA' ||
        h.status === 'EM_SALA_DE_ENCOMENDAS',
    )
    if (
      pkg.status === 'EM_TRIAGEM' ||
      pkg.status === 'EM_SALA' ||
      pkg.status === 'SALA_ENCOMENDA' ||
      hasTriagem
    )
      return 2
    return 1
  }

  const handleOpenDetails = (pkg: RecebimentoAuditoria) => {
    const pkgHistory = getPackageHistory(pkg.id)
    console.log('Abrindo detalhes:', { unidade: pkg.unidade, timeline: pkgHistory })
    setSelectedHistoryPkg(pkg)
  }

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

      <Tabs defaultValue="encomendas" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="encomendas">Minhas Encomendas</TabsTrigger>
          <TabsTrigger value="historico">Histórico</TabsTrigger>
          <TabsTrigger value="privacidade">Configurações</TabsTrigger>
        </TabsList>

        <TabsContent value="encomendas" className="space-y-4">
          {recebimentosAtivos.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                <CalendarClock className="w-16 h-16 mb-4 opacity-20" />
                <p className="text-lg">Nenhuma encomenda ativa no momento.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {recebimentosAtivos.map((pkg) => {
                const pkgHistory = getPackageHistory(pkg.id)
                return (
                  <Card key={pkg.id} className="overflow-hidden border-primary/10 shadow-sm">
                    <CardHeader className="bg-muted/30 pb-4 border-b">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Package className="h-5 w-5 text-primary" />
                          <CardTitle className="text-lg">
                            {pkg.transportadora || 'Pacote'}
                          </CardTitle>
                        </div>
                        <Badge
                          variant={
                            pkg.status === 'LIBERADO_RETIRADA' ||
                            pkg.status === 'RETIRADO' ||
                            pkg.status === 'ENTREGUE'
                              ? 'default'
                              : 'secondary'
                          }
                          className={cn(
                            pkg.status === 'LIBERADO_RETIRADA'
                              ? 'bg-success hover:bg-success text-white'
                              : pkg.status === 'RETIRADO' || pkg.status === 'ENTREGUE'
                                ? 'bg-primary/20 text-primary hover:bg-primary/30'
                                : '',
                          )}
                        >
                          {pkg.status === 'RETIRADO' || pkg.status === 'ENTREGUE'
                            ? 'Encomenda Retirada'
                            : pkg.status?.replace(/_/g, ' ')}
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
                              ? format(
                                  new Date(pkg.data_criacao || pkg.created),
                                  'dd/MM/yyyy HH:mm',
                                )
                              : '-'}
                          </p>
                        </div>
                        {pkg.status === 'LIBERADO_RETIRADA' ? (
                          <div className="md:border-l md:pl-6">
                            <p className="text-muted-foreground mb-1">Código de Retirada</p>
                            <p className="font-mono font-bold text-lg text-primary tracking-wider">
                              {(pkg as any).codigo_retirada || '-'}
                            </p>
                          </div>
                        ) : (
                          <div className="md:border-l md:pl-6">
                            <p className="text-muted-foreground mb-1">Status Atual</p>
                            <p className="font-mono font-bold text-sm text-muted-foreground tracking-wider">
                              {pkg.status === 'RETIRADO' || pkg.status === 'ENTREGUE'
                                ? 'Retirado com sucesso'
                                : 'Aguardando liberação'}
                            </p>
                          </div>
                        )}
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

                      <div className="mt-6 pt-6 border-t border-border/50">
                        <h4 className="text-sm font-semibold mb-6 flex items-center gap-2 text-muted-foreground">
                          <Clock className="w-4 h-4" />
                          Acompanhamento
                        </h4>
                        <div className="px-2 sm:px-4">
                          <HorizontalTimeline
                            currentStep={getCurrentStep(pkg, pkgHistory)}
                            pkg={pkg}
                            history={pkgHistory}
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="historico" className="space-y-4">
          {recebimentosHistorico.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                <Package className="w-16 h-16 mb-4 opacity-20" />
                <p className="text-lg">Nenhum histórico de encomendas.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {recebimentosHistorico.map((pkg) => (
                <Card
                  key={pkg.id}
                  className="overflow-hidden border-border shadow-sm hover:shadow transition-all"
                >
                  <CardContent className="p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div>
                      <p className="font-semibold text-lg">
                        Unidade {pkg.unidade} | Volume {pkg.volume}
                      </p>
                      <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-muted-foreground" />
                        Retirado em {format(new Date(pkg.updated), 'dd/MM/yyyy HH:mm')}
                      </p>
                    </div>
                    <Button variant="outline" onClick={() => handleOpenDetails(pkg)}>
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

      <Dialog
        open={!!selectedHistoryPkg}
        onOpenChange={(open) => !open && setSelectedHistoryPkg(null)}
      >
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Detalhes da Encomenda</DialogTitle>
          </DialogHeader>
          {selectedHistoryPkg && (
            <div className="mt-4">
              <div className="mb-4">
                <VerticalTimeline
                  currentStep={4}
                  pkg={selectedHistoryPkg}
                  history={getPackageHistory(selectedHistoryPkg.id)}
                />
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
