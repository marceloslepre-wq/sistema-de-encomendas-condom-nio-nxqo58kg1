import { useState, useEffect } from 'react'
import {
  ShieldAlert,
  Building,
  Layers,
  Plus,
  Edit2,
  Trash2,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Clock,
  LogOut,
  RefreshCw,
} from 'lucide-react'
import { useAuth } from '@/hooks/use-auth'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import {
  Plano,
  Licenca,
  getPlanos,
  createPlano,
  updatePlano,
  deletePlano,
  getLicencas,
  createLicenca,
  updateLicenca,
  reativarLicenca30Dias,
  deleteLicenca,
  getCondosList,
} from '@/services/master'

export default function MasterDashboard() {
  const { user, signOut } = useAuth()
  const { toast } = useToast()

  const [planos, setPlanos] = useState<Plano[]>([])
  const [licencas, setLicencas] = useState<Licenca[]>([])
  const [condos, setCondos] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState<string>('todos')
  const [reactivatingId, setReactivatingId] = useState<string | null>(null)

  // Modais de Plano
  const [isPlanoModalOpen, setIsPlanoModalOpen] = useState(false)
  const [editingPlano, setEditingPlano] = useState<Plano | null>(null)
  const [planoForm, setPlanoForm] = useState({
    nome: '',
    descricao: '',
    preco_mensal: '',
    max_moradores: '',
    max_units: '',
    status: 'ativo' as 'ativo' | 'inativo',
  })

  // Modais de Licença
  const [isLicencaModalOpen, setIsLicencaModalOpen] = useState(false)
  const [editingLicenca, setEditingLicenca] = useState<Licenca | null>(null)
  const [licencaForm, setLicencaForm] = useState({
    condo_id: '',
    plano_id: '',
    status: 'ativa' as 'ativa' | 'pausada' | 'cancelada' | 'expirada',
    data_expiracao: '',
  })

  const [saving, setSaving] = useState(false)

  const loadData = async () => {
    setLoading(true)
    try {
      const [pList, lList, cList] = await Promise.all([getPlanos(), getLicencas(), getCondosList()])
      setPlanos(pList)
      setLicencas(lList)
      setCondos(cList)
    } catch (err: any) {
      toast({
        title: 'Erro ao carregar dados',
        description: err.message || 'Falha na comunicação com o servidor.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  // Ações de Plano
  const handleOpenNewPlano = () => {
    setEditingPlano(null)
    setPlanoForm({
      nome: '',
      descricao: '',
      preco_mensal: '199.90',
      max_moradores: '100',
      max_units: '50',
      status: 'ativo',
    })
    setIsPlanoModalOpen(true)
  }

  const handleEditPlano = (plano: Plano) => {
    setEditingPlano(plano)
    setPlanoForm({
      nome: plano.nome,
      descricao: plano.descricao || '',
      preco_mensal: plano.preco_mensal !== undefined ? String(plano.preco_mensal) : '',
      max_moradores: plano.max_moradores !== undefined ? String(plano.max_moradores) : '',
      max_units: plano.max_units !== undefined ? String(plano.max_units) : '',
      status: plano.status,
    })
    setIsPlanoModalOpen(true)
  }

  const handleSavePlano = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!planoForm.nome) {
      toast({
        title: 'Campo obrigatório',
        description: 'O nome do plano é obrigatório.',
        variant: 'destructive',
      })
      return
    }

    setSaving(true)
    try {
      const payload: Partial<Plano> = {
        nome: planoForm.nome,
        descricao: planoForm.descricao,
        preco_mensal: planoForm.preco_mensal ? parseFloat(planoForm.preco_mensal) : 0,
        max_moradores: planoForm.max_moradores ? parseInt(planoForm.max_moradores, 10) : 0,
        max_units: planoForm.max_units ? parseInt(planoForm.max_units, 10) : 0,
        status: planoForm.status,
      }

      if (editingPlano) {
        await updatePlano(editingPlano.id, payload)
        toast({ title: 'Plano atualizado com sucesso!' })
      } else {
        await createPlano(payload)
        toast({ title: 'Plano criado com sucesso!' })
      }
      setIsPlanoModalOpen(false)
      loadData()
    } catch (err: any) {
      toast({
        title: 'Erro ao salvar plano',
        description: err.message || 'Verifique as informações.',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  const handleDeletePlano = async (plano: Plano) => {
    if (!confirm(`Tem certeza que deseja excluir o plano "${plano.nome}"?`)) return
    try {
      await deletePlano(plano.id)
      toast({ title: 'Plano removido com sucesso' })
      loadData()
    } catch (err: any) {
      toast({
        title: 'Erro ao excluir plano',
        description: err.message || 'Existem dependências vinculadas.',
        variant: 'destructive',
      })
    }
  }

  // Ações de Licença
  const handleOpenNewLicenca = () => {
    setEditingLicenca(null)
    setLicencaForm({
      condo_id: condos[0]?.id || '',
      plano_id: planos[0]?.id || '',
      status: 'ativa' as const,
      data_expiracao: '2027-12-31',
    })
    setIsLicencaModalOpen(true)
  }

  const handleReativar30Dias = async (licenca: Licenca) => {
    setReactivatingId(licenca.id)
    try {
      await reativarLicenca30Dias(licenca.id, licenca.data_expiracao)
      toast({
        title: 'Licença reativada!',
        description: 'A licença foi renovada por mais 30 dias com status ativa.',
      })
      await loadData()
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao reativar licença',
        description: err.message || 'Falha ao processar reativação.',
      })
    } finally {
      setReactivatingId(null)
    }
  }

  const handleEditLicenca = (licenca: Licenca) => {
    setEditingLicenca(licenca)
    const expDate = licenca.data_expiracao ? licenca.data_expiracao.split('T')[0] : ''
    setLicencaForm({
      condo_id: licenca.condo_id,
      plano_id: licenca.plano_id,
      status: licenca.status,
      data_expiracao: expDate,
    })
    setIsLicencaModalOpen(true)
  }

  const handleSaveLicenca = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!licencaForm.condo_id || !licencaForm.plano_id) {
      toast({
        title: 'Campos obrigatórios',
        description: 'Selecione o condomínio e o plano.',
        variant: 'destructive',
      })
      return
    }

    setSaving(true)
    try {
      const payload: Partial<Licenca> = {
        condo_id: licencaForm.condo_id,
        plano_id: licencaForm.plano_id,
        status: licencaForm.status,
        data_expiracao: licencaForm.data_expiracao
          ? new Date(licencaForm.data_expiracao).toISOString()
          : undefined,
      }

      if (editingLicenca) {
        await updateLicenca(editingLicenca.id, payload)
        toast({ title: 'Licença atualizada com sucesso!' })
      } else {
        await createLicenca(payload)
        toast({ title: 'Licença vinculada com sucesso!' })
      }
      setIsLicencaModalOpen(false)
      loadData()
    } catch (err: any) {
      toast({
        title: 'Erro ao salvar licença',
        description: err.message || 'Verifique os dados.',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteLicenca = async (licenca: Licenca) => {
    if (!confirm('Tem certeza que deseja excluir esta licença?')) return
    try {
      await deleteLicenca(licenca.id)
      toast({ title: 'Licença removida com sucesso' })
      loadData()
    } catch (err: any) {
      toast({
        title: 'Erro ao excluir licença',
        description: err.message,
        variant: 'destructive',
      })
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ativa':
      case 'ativo':
        return (
          <Badge className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1">
            <CheckCircle2 className="w-3 h-3" /> Ativo
          </Badge>
        )
      case 'pausada':
        return (
          <Badge variant="outline" className="text-amber-600 border-amber-600 gap-1">
            <Clock className="w-3 h-3" /> Pausada
          </Badge>
        )
      case 'expirada':
        return (
          <Badge variant="destructive" className="gap-1">
            <AlertCircle className="w-3 h-3" /> Expirada
          </Badge>
        )
      case 'cancelada':
      case 'inativo':
        return (
          <Badge variant="secondary" className="gap-1">
            <XCircle className="w-3 h-3" /> Inativo
          </Badge>
        )
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col">
      {/* Top Header Master */}
      <header className="bg-slate-900 text-white border-b border-slate-800 sticky top-0 z-30 shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-indigo-600 flex items-center justify-center text-white shadow">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-lg tracking-tight">CondoPack</span>
                <span className="text-xs bg-indigo-500/20 text-indigo-300 font-semibold px-2 py-0.5 rounded border border-indigo-500/30">
                  MASTER MULTI-TENANT
                </span>
              </div>
              <p className="text-xs text-slate-400">Painel de Administração Global</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <div className="text-sm font-medium">{user?.name || 'Administrador'}</div>
              <div className="text-xs text-slate-400">{user?.email}</div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={loadData}
              disabled={loading}
              className="border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700 hover:text-white"
            >
              <RefreshCw className={`w-4 h-4 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
              Atualizar
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={signOut}
              className="bg-rose-600 hover:bg-rose-700 text-white"
            >
              <LogOut className="w-4 h-4 mr-1.5" />
              Sair
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 w-full space-y-6">
        {/* Banner de Boas-Vindas */}
        <div className="bg-gradient-to-r from-indigo-900 via-slate-900 to-slate-800 text-white rounded-xl p-6 shadow-md border border-slate-700">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <h2 className="text-2xl font-bold tracking-tight">Painel Master de Operações</h2>
              <p className="text-slate-300 text-sm max-w-2xl">
                Área reservada para gestão de planos de assinatura e licenciamento de condomínios.
                As alterações aqui refletem na infraestrutura multi-tenant sem impactar as rotas
                operacionais em produção.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="bg-slate-800/80 border border-slate-700 rounded-lg p-3 text-center min-w-[110px]">
                <span className="text-xs text-slate-400 font-medium">Condomínios</span>
                <p className="text-xl font-bold text-indigo-400">{condos.length}</p>
              </div>
              <div className="bg-slate-800/80 border border-slate-700 rounded-lg p-3 text-center min-w-[110px]">
                <span className="text-xs text-slate-400 font-medium">Licenças Ativas</span>
                <p className="text-xl font-bold text-emerald-400">
                  {
                    licencas.filter(
                      (l) =>
                        l.status === 'ativa' &&
                        (!l.data_expiracao || new Date(l.data_expiracao) > new Date()),
                    ).length
                  }
                </p>
              </div>
              <div className="bg-slate-800/80 border border-slate-700 rounded-lg p-3 text-center min-w-[110px]">
                <span className="text-xs text-slate-400 font-medium">Expiradas</span>
                <p className="text-xl font-bold text-rose-400">
                  {
                    licencas.filter(
                      (l) =>
                        l.status === 'expirada' ||
                        (l.data_expiracao && new Date(l.data_expiracao) <= new Date()),
                    ).length
                  }
                </p>
              </div>
              <div className="bg-slate-800/80 border border-slate-700 rounded-lg p-3 text-center min-w-[110px]">
                <span className="text-xs text-slate-400 font-medium">Planos</span>
                <p className="text-xl font-bold text-amber-400">{planos.length}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs de Controle */}
        <Tabs defaultValue="licencas" className="space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b pb-4">
            <TabsList className="bg-white border">
              <TabsTrigger value="licencas" className="gap-2">
                <Building className="w-4 h-4" /> Licenças de Condomínios ({licencas.length})
              </TabsTrigger>
              <TabsTrigger value="planos" className="gap-2">
                <Layers className="w-4 h-4" /> Catálogo de Planos ({planos.length})
              </TabsTrigger>
            </TabsList>

            <div className="flex items-center gap-2">
              <Button
                onClick={handleOpenNewLicenca}
                className="bg-indigo-600 hover:bg-indigo-700 gap-1.5"
              >
                <Plus className="w-4 h-4" /> Nova Licença
              </Button>
              <Button onClick={handleOpenNewPlano} variant="outline" className="gap-1.5">
                <Plus className="w-4 h-4" /> Novo Plano
              </Button>
            </div>
          </div>

          {/* TAB: LICENÇAS */}
          <TabsContent value="licencas" className="space-y-4">
            {/* Barra de Filtro de Licenças (com destaque para Expiradas) */}
            <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 rounded-lg border">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Filtrar por:
                </span>
                <div className="flex gap-1.5">
                  <Button
                    size="sm"
                    variant={filterStatus === 'todos' ? 'default' : 'outline'}
                    onClick={() => setFilterStatus('todos')}
                    className="h-8 text-xs"
                  >
                    Todos ({licencas.length})
                  </Button>
                  <Button
                    size="sm"
                    variant={filterStatus === 'expirada' ? 'destructive' : 'outline'}
                    onClick={() => setFilterStatus('expirada')}
                    className={`h-8 text-xs gap-1.5 ${filterStatus !== 'expirada' ? 'text-rose-600 border-rose-200 hover:bg-rose-50' : ''}`}
                  >
                    <AlertCircle className="w-3.5 h-3.5" />
                    Expirados (
                    {
                      licencas.filter(
                        (l) =>
                          l.status === 'expirada' ||
                          (l.data_expiracao && new Date(l.data_expiracao) <= new Date()),
                      ).length
                    }
                    )
                  </Button>
                  <Button
                    size="sm"
                    variant={filterStatus === 'ativa' ? 'default' : 'outline'}
                    onClick={() => setFilterStatus('ativa')}
                    className="h-8 text-xs text-emerald-700 hover:text-emerald-800"
                  >
                    Ativas (
                    {
                      licencas.filter(
                        (l) =>
                          l.status === 'ativa' &&
                          (!l.data_expiracao || new Date(l.data_expiracao) > new Date()),
                      ).length
                    }
                    )
                  </Button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {licencas
                .filter((lic) => {
                  const isExpired =
                    lic.status === 'expirada' ||
                    (lic.data_expiracao && new Date(lic.data_expiracao) <= new Date())
                  if (filterStatus === 'expirada') return isExpired
                  if (filterStatus === 'ativa') return lic.status === 'ativa' && !isExpired
                  return true
                })
                .map((licenca) => {
                  const isExpired =
                    licenca.status === 'expirada' ||
                    (licenca.data_expiracao && new Date(licenca.data_expiracao) <= new Date())
                  const condoName =
                    licenca.expand?.condo_id?.name ||
                    condos.find((c) => c.id === licenca.condo_id)?.name ||
                    'Condomínio não identificado'
                  const condoCnpj =
                    licenca.expand?.condo_id?.cnpj ||
                    condos.find((c) => c.id === licenca.condo_id)?.cnpj ||
                    ''
                  const planoName =
                    licenca.expand?.plano_id?.nome ||
                    planos.find((p) => p.id === licenca.plano_id)?.nome ||
                    'Plano Padrão'

                  return (
                    <Card
                      key={licenca.id}
                      className="hover:shadow-md transition-shadow relative overflow-hidden"
                    >
                      <div className="absolute top-0 left-0 right-0 h-1.5 bg-indigo-500" />
                      <CardHeader className="pb-3 pt-5">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <CardTitle className="text-lg font-bold">{condoName}</CardTitle>
                            {condoCnpj && (
                              <CardDescription className="text-xs">
                                CNPJ: {condoCnpj}
                              </CardDescription>
                            )}
                          </div>
                          {getStatusBadge(licenca.status)}
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4 text-sm">
                        <div className="bg-slate-50 p-3 rounded-lg border space-y-2">
                          <div className="flex justify-between items-center text-xs">
                            <span className="text-muted-foreground">Plano Vinculado:</span>
                            <span className="font-semibold text-foreground">{planoName}</span>
                          </div>
                          <div className="flex justify-between items-center text-xs">
                            <span className="text-muted-foreground">Validade / Expiração:</span>
                            <span className="font-medium text-foreground">
                              {licenca.data_expiracao
                                ? new Date(licenca.data_expiracao).toLocaleDateString('pt-BR')
                                : 'Indeterminada'}
                            </span>
                          </div>
                          <div className="flex justify-between items-center text-xs">
                            <span className="text-muted-foreground">ID do Condomínio:</span>
                            <span className="font-mono text-[11px] text-muted-foreground">
                              {licenca.condo_id}
                            </span>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t">
                          {/* Botão de Reativação por 30 dias para fallback ou renovação rápida */}
                          <Button
                            size="sm"
                            onClick={() => handleReativar30Dias(licenca)}
                            disabled={reactivatingId === licenca.id}
                            className={`h-8 text-xs font-semibold gap-1.5 ${
                              isExpired
                                ? 'bg-rose-600 hover:bg-rose-700 text-white'
                                : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                            }`}
                          >
                            {reactivatingId === licenca.id ? (
                              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <RefreshCw className="w-3.5 h-3.5" />
                            )}
                            <span>Reativar +30 dias</span>
                          </Button>

                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditLicenca(licenca)}
                              className="h-8 gap-1 px-2"
                            >
                              <Edit2 className="w-3.5 h-3.5" /> Editar
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteLicenca(licenca)}
                              className="h-8 text-destructive hover:text-destructive gap-1 px-2"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}

              {licencas.length === 0 && !loading && (
                <div className="col-span-full py-12 text-center bg-white rounded-xl border border-dashed">
                  <Building className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-50" />
                  <h3 className="font-semibold text-base">Nenhuma licença registrada</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Cadastre uma licença para vincular um condomínio a um plano.
                  </p>
                  <Button
                    onClick={handleOpenNewLicenca}
                    className="bg-indigo-600 hover:bg-indigo-700"
                  >
                    Criar Primeira Licença
                  </Button>
                </div>
              )}
            </div>
          </TabsContent>

          {/* TAB: PLANOS */}
          <TabsContent value="planos" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {planos.map((plano) => (
                <Card
                  key={plano.id}
                  className="hover:shadow-md transition-shadow flex flex-col justify-between"
                >
                  <div>
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between gap-2">
                        <CardTitle className="text-lg font-bold">{plano.nome}</CardTitle>
                        {getStatusBadge(plano.status)}
                      </div>
                      <CardDescription className="line-clamp-2 text-xs">
                        {plano.descricao || 'Sem descrição cadastrada'}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4 text-sm">
                      <div className="bg-slate-50 p-4 rounded-lg border space-y-2">
                        <div className="flex items-baseline justify-between">
                          <span className="text-xs text-muted-foreground">Valor Mensal</span>
                          <span className="text-xl font-bold text-indigo-600">
                            R${' '}
                            {plano.preco_mensal !== undefined
                              ? Number(plano.preco_mensal).toFixed(2).replace('.', ',')
                              : '0,00'}
                            <span className="text-xs font-normal text-muted-foreground">/mês</span>
                          </span>
                        </div>
                        <div className="pt-2 border-t space-y-1.5 text-xs">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Limite de Unidades:</span>
                            <span className="font-semibold">
                              {plano.max_units ? `${plano.max_units} unidades` : 'Ilimitado'}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Limite de Moradores:</span>
                            <span className="font-semibold">
                              {plano.max_moradores
                                ? `${plano.max_moradores} moradores`
                                : 'Ilimitado'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </div>

                  <div className="p-4 pt-0 border-t flex items-center justify-end gap-2 mt-4">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEditPlano(plano)}
                      className="h-8 gap-1"
                    >
                      <Edit2 className="w-3.5 h-3.5" /> Editar
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeletePlano(plano)}
                      className="h-8 text-destructive hover:text-destructive gap-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Excluir
                    </Button>
                  </div>
                </Card>
              ))}

              {planos.length === 0 && !loading && (
                <div className="col-span-full py-12 text-center bg-white rounded-xl border border-dashed">
                  <Layers className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-50" />
                  <h3 className="font-semibold text-base">Nenhum plano cadastrado</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Crie os pacotes de assinatura para os condomínios clientes.
                  </p>
                  <Button
                    onClick={handleOpenNewPlano}
                    className="bg-indigo-600 hover:bg-indigo-700"
                  >
                    Cadastrar Novo Plano
                  </Button>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </main>

      {/* MODAL PLANO */}
      <Dialog open={isPlanoModalOpen} onOpenChange={setIsPlanoModalOpen}>
        <DialogContent className="sm:max-w-lg">
          <form onSubmit={handleSavePlano}>
            <DialogHeader>
              <DialogTitle>{editingPlano ? 'Editar Plano' : 'Criar Novo Plano'}</DialogTitle>
              <DialogDescription>
                Defina os parâmetros, preços e limites da assinatura deste plano.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="plano-nome">Nome do Plano *</Label>
                <Input
                  id="plano-nome"
                  placeholder="Ex: Básico, Pro, Enterprise"
                  value={planoForm.nome}
                  onChange={(e) => setPlanoForm({ ...planoForm, nome: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="plano-desc">Descrição</Label>
                <Textarea
                  id="plano-desc"
                  placeholder="Descreva o público-alvo e benefícios..."
                  value={planoForm.descricao}
                  onChange={(e) => setPlanoForm({ ...planoForm, descricao: e.target.value })}
                  rows={2}
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="plano-preco">Preço Mensal (R$)</Label>
                  <Input
                    id="plano-preco"
                    type="number"
                    step="0.01"
                    placeholder="299.00"
                    value={planoForm.preco_mensal}
                    onChange={(e) => setPlanoForm({ ...planoForm, preco_mensal: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="plano-unidades">Máx. Unidades</Label>
                  <Input
                    id="plano-unidades"
                    type="number"
                    placeholder="100"
                    value={planoForm.max_units}
                    onChange={(e) => setPlanoForm({ ...planoForm, max_units: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="plano-moradores">Máx. Moradores</Label>
                  <Input
                    id="plano-moradores"
                    type="number"
                    placeholder="250"
                    value={planoForm.max_moradores}
                    onChange={(e) => setPlanoForm({ ...planoForm, max_moradores: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="plano-status">Status</Label>
                <Select
                  value={planoForm.status}
                  onValueChange={(val: any) => setPlanoForm({ ...planoForm, status: val })}
                >
                  <SelectTrigger id="plano-status">
                    <SelectValue placeholder="Selecione o status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ativo">Ativo</SelectItem>
                    <SelectItem value="inativo">Inativo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsPlanoModalOpen(false)}
                disabled={saving}
              >
                Cancelar
              </Button>
              <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700" disabled={saving}>
                {saving ? 'Salvando...' : 'Salvar Plano'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL LICENÇA */}
      <Dialog open={isLicencaModalOpen} onOpenChange={setIsLicencaModalOpen}>
        <DialogContent className="sm:max-w-lg">
          <form onSubmit={handleSaveLicenca}>
            <DialogHeader>
              <DialogTitle>
                {editingLicenca ? 'Editar Licença' : 'Vincular Nova Licença'}
              </DialogTitle>
              <DialogDescription>
                Vincule um condomínio a um plano contratado e defina a vigência.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="licenca-condo">Condomínio *</Label>
                <Select
                  value={licencaForm.condo_id}
                  onValueChange={(val) => setLicencaForm({ ...licencaForm, condo_id: val })}
                >
                  <SelectTrigger id="licenca-condo">
                    <SelectValue placeholder="Selecione o condomínio" />
                  </SelectTrigger>
                  <SelectContent>
                    {condos.map((condo) => (
                      <SelectItem key={condo.id} value={condo.id}>
                        {condo.name} {condo.cnpj ? `(${condo.cnpj})` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="licenca-plano">Plano Contratado *</Label>
                <Select
                  value={licencaForm.plano_id}
                  onValueChange={(val) => setLicencaForm({ ...licencaForm, plano_id: val })}
                >
                  <SelectTrigger id="licenca-plano">
                    <SelectValue placeholder="Selecione o plano" />
                  </SelectTrigger>
                  <SelectContent>
                    {planos.map((plano) => (
                      <SelectItem key={plano.id} value={plano.id}>
                        {plano.nome} (R$ {Number(plano.preco_mensal || 0).toFixed(2)}/mês)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="licenca-status">Status da Licença</Label>
                  <Select
                    value={licencaForm.status}
                    onValueChange={(val: any) => setLicencaForm({ ...licencaForm, status: val })}
                  >
                    <SelectTrigger id="licenca-status">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ativa">Ativa</SelectItem>
                      <SelectItem value="pausada">Pausada</SelectItem>
                      <SelectItem value="cancelada">Cancelada</SelectItem>
                      <SelectItem value="expirada">Expirada</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="licenca-exp">Data de Expiração</Label>
                  <Input
                    id="licenca-exp"
                    type="date"
                    value={licencaForm.data_expiracao}
                    onChange={(e) =>
                      setLicencaForm({ ...licencaForm, data_expiracao: e.target.value })
                    }
                  />
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsLicencaModalOpen(false)}
                disabled={saving}
              >
                Cancelar
              </Button>
              <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700" disabled={saving}>
                {saving ? 'Salvando...' : 'Salvar Licença'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
