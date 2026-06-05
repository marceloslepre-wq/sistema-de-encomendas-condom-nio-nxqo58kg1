import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Package, CalendarClock } from 'lucide-react'
import { useAuth } from '@/hooks/use-auth'
import { RecebimentoAuditoria } from '@/services/api'
import useRealtime from '@/hooks/use-realtime'
import { format } from 'date-fns'
import pb from '@/lib/pocketbase/client'
import { useToast } from '@/hooks/use-toast'

export default function MoradorDashboard() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [recebimentos, setRecebimentos] = useState<RecebimentoAuditoria[]>([])
  const [privacy, setPrivacy] = useState(user?.autoriza_retirada_terceiros ?? true)

  const loadData = async () => {
    if (!user?.email) return
    console.log('Morador logado:', user.email)
    console.log('Buscando encomendas para:', user.email)

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
          filter: `(${conditions.join(' || ')}) && status != 'RETIRADO' && status != 'CANCELADO'`,
          sort: '-created',
        })

      console.log('Encomendas encontradas:', res.items)
      setRecebimentos(res.items)
    } catch (e) {
      console.error('Erro ao buscar encomendas', e)
    }
  }

  useEffect(() => {
    loadData()
    if (user) setPrivacy(user.autoriza_retirada_terceiros ?? true)
  }, [user])

  useRealtime('recebimentos_auditoria', () => loadData())

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
                <p className="text-lg">Nenhuma encomenda a caminho no momento.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {recebimentos.map((pkg) => (
                <Card key={pkg.id} className="overflow-hidden border-primary/10 shadow-sm">
                  <CardHeader className="bg-muted/30 pb-4 border-b">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Package className="h-5 w-5 text-primary" />
                        <CardTitle className="text-lg">{pkg.transportadora || 'Pacote'}</CardTitle>
                      </div>
                      <Badge
                        variant={pkg.status === 'LIBERADO_RETIRADA' ? 'default' : 'secondary'}
                        className={
                          pkg.status === 'LIBERADO_RETIRADA'
                            ? 'bg-success hover:bg-success text-white'
                            : ''
                        }
                      >
                        {pkg.status?.replace(/_/g, ' ')}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="p-6">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-sm">
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
    </div>
  )
}
