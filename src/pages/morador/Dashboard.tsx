import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Package, CalendarClock, Clock } from 'lucide-react'
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

  const loadData = async () => {
    if (!user?.email) return
    console.log('Morador logado:', user.email)

    try {
      const conditions = [`morador_id.email = "${user.email}"`]

      const moradorRecord = await pb
        .collection('moradores')
        .getFirstListItem(`email="${user.email}"`)
        .catch(() => null)

      if (moradorRecord) {
        conditions.push(`unidade ~ "${moradorRecord.apartamento}"`)
        if (moradorRecord.nome) {
          conditions.push(`morador ~ "${moradorRecord.nome}"`)
        }
      }

      const res = await pb
        .collection('recebimentos_auditoria')
        .getList<RecebimentoAuditoria>(1, 50, {
          filter: `(${conditions.join(' || ')})`,
          sort: '-created',
        })

      console.log('Encomendas encontradas:', res.items)
      setRecebimentos(res.items)

      if (res.items.length > 0) {
        const idsFilter = res.items.map((r) => `recebimento_id = "${r.id}"`).join(' || ')
        const historyRes = await pb
          .collection('historico_andamento')
          .getFullList<HistoricoAndamento>({
            filter: idsFilter,
            sort: 'created',
          })

        console.log('Histórico carregado:', historyRes)
        setHistorico(historyRes || [])
      } else {
        console.log('Histórico carregado:', [])
        setHistorico([])
      }
    } catch (erro) {
      console.log('ERRO:', erro)
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
      console.log('ERRO:', erro)
      setPrivacy(!checked)
      toast({ title: 'Erro', description: 'Não foi possível atualizar.', variant: 'destructive' })
    }
  }

  const getPackageHistory = (pkgId: string) => {
    return historico
      .filter((h) => h.recebimento_id === pkgId)
      .sort((a, b) => new Date(a.created).getTime() - new Date(b.created).getTime())
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
          <TabsTrigger value="privacidade">Configurações</TabsTrigger>
        </TabsList>
        <TabsContent value="encomendas" className="space-y-4">
          {recebimentos.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                <CalendarClock className="w-16 h-16 mb-4 opacity-20" />
                <p className="text-lg">Nenhuma encomenda registrada no momento.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {recebimentos.map((pkg) => {
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
                            pkg.status === 'LIBERADO_RETIRADA' || pkg.status === 'RETIRADO'
                              ? 'default'
                              : 'secondary'
                          }
                          className={cn(
                            pkg.status === 'LIBERADO_RETIRADA'
                              ? 'bg-success hover:bg-success text-white'
                              : '',
                            pkg.status === 'RETIRADO'
                              ? 'bg-muted-foreground hover:bg-muted-foreground text-white'
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
                              ? format(
                                  new Date(pkg.data_criacao || pkg.created),
                                  'dd/MM/yyyy HH:mm',
                                )
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

                      {pkgHistory.length > 0 && (
                        <div className="mt-6 pt-6 border-t border-border/50">
                          <h4 className="text-sm font-semibold mb-4 flex items-center gap-2 text-muted-foreground">
                            <Clock className="w-4 h-4" />
                            Histórico de Andamento
                          </h4>
                          <div className="flex flex-col space-y-4 relative ml-2">
                            <div className="absolute left-[7px] top-2 bottom-2 w-[2px] bg-border" />
                            {pkgHistory.map((hist, idx) => {
                              const isLast = idx === pkgHistory.length - 1
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
                    </CardContent>
                  </Card>
                )
              })}
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
    </div>
  )
}
