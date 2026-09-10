import { useState, useEffect, useMemo, useTransition } from 'react'
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
  Search,
  MoreVertical,
  Sliders,
  Calendar,
  PauseCircle,
  PlayCircle,
  ArrowRightLeft,
  Sparkles,
  ExternalLink,
  ChevronRight,
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
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
import { useRealtime } from '@/hooks/use-realtime'
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
import { LinkGeneratorCadastro } from './LinkGeneratorCadastro'

export default function MasterDashboard() {
  const { user, signOut } = useAuth()
  const { toast } = useToast()

  const [planos, setPlanos] = useState<Plano[]>([])
  const [licencas, setLicencas] = useState<Licenca[]>([])
  const [condos, setCondos] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState<string>('todos')
  const [searchQuery, setSearchQuery] = useState('')
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
    exclusivo_master: false,
    status: 'ativo' as 'ativo' | 'inativo',
  })

  // Modal de Criação / Edição Geral de Licença
  const [isLicencaModalOpen, setIsLicencaModalOpen] = useState(false)
  const [editingLicenca, setEditingLicenca] = useState<Licenca | null>(null)
  const [licencaForm, setLicencaForm] = useState({
    condo_id: '',
    plano_id: '',
    status: 'ativa' as 'ativa' | 'pausada' | 'cancelada' | 'expirada',
    data_expiracao: '',
    override_max_usuarios: '',
    override_max_unidades: '',
  })

  // Modal Especial: Editar Limites Exclusivos da Licença (Overrides)
  const [isLimitesModalOpen, setIsLimitesModalOpen] = useState(false)
  const [targetLicencaLimites, setTargetLicencaLimites] = useState<Licenca | null>(null)
  const [limitesForm, setLimitesForm] = useState({
    override_max_usuarios: '',
    override_max_unidades: '',
    usar_override_usuarios: false,
    usar_override_unidades: false,
  })

  // Modal Especial: Alterar Data de Expiração
  const [isExpiracaoModalOpen, setIsExpiracaoModalOpen] = useState(false)
  const [targetLicencaExp, setTargetLicencaExp] = useState<Licenca | null>(null)
  const [expiracaoForm, setExpiracaoForm] = useState({
    data_expiracao: '',
  })

  // Modal Especial: Alterar Plano da Licença
  const [isTrocarPlanoModalOpen, setIsTrocarPlanoModalOpen] = useState(false)
  const [targetLicencaTroca, setTargetLicencaTroca] = useState<Licenca | null>(null)
  const [novoPlanoId, setNovoPlanoId] = useState<string>('')

  // Modal de Confirmação de Exclusão
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [licencaToDelete, setLicencaToDelete] = useState<Licenca | null>(null)

  const [saving, setSaving] = useState(false)

  const loadData = async (silent = false) => {
    if (!silent) setLoading(true)
    try {
      const [pList, lList, cList] = await Promise.all([getPlanos(), getLicencas(), getCondosList()])
      setPlanos(pList)
      setLicencas(lList)
      setCondos(cList)
    } catch (err: any) {
      if (!silent) {
        toast({
          title: 'Erro ao carregar dados',
          description: err.message || 'Falha na comunicação com o servidor.',
          variant: 'destructive',
        })
      }
    } finally {
      if (!silent) setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  // Atualização em Tempo Real (useRealtime) para licencas, planos e condos
  useRealtime('licencas', () => {
    loadData(true)
  })
  useRealtime('planos', () => {
    loadData(true)
  })
  useRealtime('condos', () => {
    loadData(true)
  })

  // Ações de Plano
  const handleOpenNewPlano = () => {
    setEditingPlano(null)
    setPlanoForm({
      nome: '',
      descricao: '',
      preco_mensal: '199.90',
      max_moradores: '100',
      max_units: '50',
      exclusivo_master: false,
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
      exclusivo_master: !!plano.exclusivo_master,
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
        exclusivo_master: planoForm.exclusivo_master,
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

  // Ações de Licença: Criar Nova
  const handleOpenNewLicenca = () => {
    setEditingLicenca(null)
    setLicencaForm({
      condo_id: condos[0]?.id || '',
      plano_id: planos[0]?.id || '',
      status: 'ativa' as const,
      data_expiracao: '2027-12-31',
      override_max_usuarios: '',
      override_max_unidades: '',
    })
    setIsLicencaModalOpen(true)
  }

  // Ação: Reativar +30 dias
  const handleReativar30Dias = async (licenca: Licenca) => {
    setReactivatingId(licenca.id)
    try {
      await reativarLicenca30Dias(licenca.id, licenca.data_expiracao)
      toast({
        title: 'Licença reativada!',
        description: 'A licença foi renovada por mais 30 dias com status ativa.',
      })
      await loadData(true)
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

  // Ação: Pausar / Despausar Licença
  const handleTogglePausarLicenca = async (licenca: Licenca) => {
    const novoStatus = licenca.status === 'pausada' ? 'ativa' : 'pausada'
    setSaving(true)
    try {
      await updateLicenca(licenca.id, { status: novoStatus })
      toast({
        title: novoStatus === 'pausada' ? 'Licença pausada' : 'Licença reativada',
        description:
          novoStatus === 'pausada'
            ? 'O acesso do condomínio foi temporariamente suspenso.'
            : 'O condomínio voltou a ter status ativo.',
      })
      await loadData(true)
    } catch (err: any) {
      toast({
        title: 'Erro ao alterar status da licença',
        description: err.message || 'Não foi possível alterar o status.',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  // Ação: Modal de Edição Completa da Licença
  const handleEditLicenca = (licenca: Licenca) => {
    setEditingLicenca(licenca)
    const expDate = licenca.data_expiracao ? licenca.data_expiracao.split('T')[0] : ''
    setLicencaForm({
      condo_id: licenca.condo_id,
      plano_id: licenca.plano_id,
      status: licenca.status,
      data_expiracao: expDate,
      override_max_usuarios:
        licenca.override_max_usuarios !== undefined &&
        licenca.override_max_usuarios !== null &&
        licenca.override_max_usuarios > 0
          ? String(licenca.override_max_usuarios)
          : '',
      override_max_unidades:
        licenca.override_max_unidades !== undefined &&
        licenca.override_max_unidades !== null &&
        licenca.override_max_unidades > 0
          ? String(licenca.override_max_unidades)
          : '',
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
      const parsedUsuarios = licencaForm.override_max_usuarios
        ? parseInt(licencaForm.override_max_usuarios, 10)
        : null
      const parsedUnidades = licencaForm.override_max_unidades
        ? parseInt(licencaForm.override_max_unidades, 10)
        : null

      const payload: Partial<Licenca> = {
        condo_id: licencaForm.condo_id,
        plano_id: licencaForm.plano_id,
        status: licencaForm.status,
        data_expiracao: licencaForm.data_expiracao
          ? new Date(licencaForm.data_expiracao + 'T23:59:59.000Z').toISOString()
          : undefined,
        override_max_usuarios: parsedUsuarios && parsedUsuarios > 0 ? parsedUsuarios : 0,
        override_max_unidades: parsedUnidades && parsedUnidades > 0 ? parsedUnidades : 0,
      }

      if (editingLicenca) {
        await updateLicenca(editingLicenca.id, payload)
        toast({ title: 'Licença atualizada com sucesso!' })
      } else {
        await createLicenca(payload)
        toast({ title: 'Licença vinculada com sucesso!' })
      }
      setIsLicencaModalOpen(false)
      loadData(true)
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

  // Ação: Abrir Modal de Limites (Overrides manuais da licença)
  const handleOpenLimitesModal = (licenca: Licenca) => {
    setTargetLicencaLimites(licenca)
    const hasUserOverride =
      licenca.override_max_usuarios !== undefined &&
      licenca.override_max_usuarios !== null &&
      licenca.override_max_usuarios > 0
    const hasUnitOverride =
      licenca.override_max_unidades !== undefined &&
      licenca.override_max_unidades !== null &&
      licenca.override_max_unidades > 0

    const planoAtual = licenca.expand?.plano_id || planos.find((p) => p.id === licenca.plano_id)

    setLimitesForm({
      override_max_usuarios: hasUserOverride
        ? String(licenca.override_max_usuarios)
        : planoAtual?.max_moradores
          ? String(planoAtual.max_moradores)
          : '',
      override_max_unidades: hasUnitOverride
        ? String(licenca.override_max_unidades)
        : planoAtual?.max_units
          ? String(planoAtual.max_units)
          : '',
      usar_override_usuarios: hasUserOverride,
      usar_override_unidades: hasUnitOverride,
    })
    setIsLimitesModalOpen(true)
  }

  const handleSaveLimites = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!targetLicencaLimites) return

    setSaving(true)
    try {
      const overrideUsersVal = limitesForm.usar_override_usuarios
        ? parseInt(limitesForm.override_max_usuarios, 10) || 0
        : 0
      const overrideUnitsVal = limitesForm.usar_override_unidades
        ? parseInt(limitesForm.override_max_unidades, 10) || 0
        : 0

      await updateLicenca(targetLicencaLimites.id, {
        override_max_usuarios: overrideUsersVal,
        override_max_unidades: overrideUnitsVal,
      })

      toast({
        title: 'Limites da licença atualizados!',
        description: 'Os novos limites já estão ativos e vigoram para este condomínio.',
      })
      setIsLimitesModalOpen(false)
      loadData(true)
    } catch (err: any) {
      toast({
        title: 'Erro ao salvar limites',
        description: err.message || 'Falha ao atualizar os limites da licença.',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  // Ação: Abrir Modal de Data de Expiração
  const handleOpenExpiracaoModal = (licenca: Licenca) => {
    setTargetLicencaExp(licenca)
    const expDate = licenca.data_expiracao ? licenca.data_expiracao.split('T')[0] : ''
    setExpiracaoForm({
      data_expiracao: expDate,
    })
    setIsExpiracaoModalOpen(true)
  }

  const handleSaveExpiracao = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!targetLicencaExp) return

    setSaving(true)
    try {
      const isoDate = expiracaoForm.data_expiracao
        ? new Date(expiracaoForm.data_expiracao + 'T23:59:59.000Z').toISOString()
        : null

      // Se definir data no futuro e estiver expirada, reativa automaticamente
      const isFutura = expiracaoForm.data_expiracao
        ? new Date(expiracaoForm.data_expiracao).getTime() > Date.now()
        : false

      const payload: Partial<Licenca> = {
        data_expiracao: isoDate || undefined,
      }

      if (isFutura && targetLicencaExp.status === 'expirada') {
        payload.status = 'ativa'
      }

      await updateLicenca(targetLicencaExp.id, payload)
      toast({
        title: 'Validade atualizada com sucesso!',
        description: isoDate
          ? `Nova data de expiração: ${new Date(isoDate).toLocaleDateString('pt-BR')}`
          : 'Data de expiração removida (vitalício / ilimitado).',
      })
      setIsExpiracaoModalOpen(false)
      loadData(true)
    } catch (err: any) {
      toast({
        title: 'Erro ao alterar validade',
        description: err.message || 'Falha ao salvar a data.',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  // Ação Rápida: Estender +30 / +60 / +90 dias a partir da data atual ou de expiração
  const handleEstenderDias = (dias: number) => {
    let base = new Date()
    if (expiracaoForm.data_expiracao) {
      const cur = new Date(expiracaoForm.data_expiracao)
      if (cur.getTime() > base.getTime()) {
        base = cur
      }
    }
    const novaData = new Date(base.getTime() + dias * 24 * 60 * 60 * 1000)
    setExpiracaoForm({
      data_expiracao: novaData.toISOString().split('T')[0],
    })
  }

  // Ação: Abrir Modal de Troca de Plano
  const handleOpenTrocarPlanoModal = (licenca: Licenca) => {
    setTargetLicencaTroca(licenca)
    setNovoPlanoId(licenca.plano_id)
    setIsTrocarPlanoModalOpen(true)
  }

  const handleSaveTrocaPlano = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!targetLicencaTroca || !novoPlanoId) return

    setSaving(true)
    try {
      await updateLicenca(targetLicencaTroca.id, {
        plano_id: novoPlanoId,
      })
      const planoEscolhido = planos.find((p) => p.id === novoPlanoId)
      toast({
        title: 'Plano alterado!',
        description: `Licença migrada para "${planoEscolhido?.nome || 'Novo Plano'}".`,
      })
      setIsTrocarPlanoModalOpen(false)
      loadData(true)
    } catch (err: any) {
      toast({
        title: 'Erro ao trocar plano',
        description: err.message || 'Falha ao atualizar o plano da licença.',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  // Ação: Confirmar Exclusão
  const handlePromptDeleteLicenca = (licenca: Licenca) => {
    setLicencaToDelete(licenca)
    setIsDeleteModalOpen(true)
  }

  const handleConfirmDeleteLicenca = async () => {
    if (!licencaToDelete) return
    setSaving(true)
    try {
      await deleteLicenca(licencaToDelete.id)
      toast({ title: 'Licença removida com sucesso' })
      setIsDeleteModalOpen(false)
      loadData(true)
    } catch (err: any) {
      toast({
        title: 'Erro ao excluir licença',
        description: err.message || 'Verifique vínculos antes de excluir.',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
      setLicencaToDelete(null)
    }
  }

  // Badges de Status
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ativa':
      case 'ativo':
        return (
          <Badge className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1 font-medium">
            <CheckCircle2 className="w-3 h-3" /> Ativa
          </Badge>
        )
      case 'pausada':
        return (
          <Badge
            variant="outline"
            className="text-amber-600 border-amber-600 bg-amber-50/50 gap-1 font-medium"
          >
            <Clock className="w-3 h-3" /> Pausada
          </Badge>
        )
      case 'expirada':
        return (
          <Badge variant="destructive" className="gap-1 font-medium">
            <AlertCircle className="w-3 h-3" /> Expirada
          </Badge>
        )
      case 'cancelada':
      case 'inativo':
        return (
          <Badge variant="secondary" className="gap-1 font-medium text-slate-600">
            <XCircle className="w-3 h-3" /> Cancelada
          </Badge>
        )
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  // Filtragem e busca de licenças
  const filteredLicencas = useMemo(() => {
    return licencas.filter((lic) => {
      const isExpired =
        lic.status === 'expirada' ||
        (lic.data_expiracao && new Date(lic.data_expiracao) <= new Date())

      // Filtro de status
      if (filterStatus === 'expirada' && !isExpired) return false
      if (filterStatus === 'ativa' && (lic.status !== 'ativa' || isExpired)) return false
      if (filterStatus === 'pausada' && lic.status !== 'pausada') return false
      if (filterStatus === 'cancelada' && lic.status !== 'cancelada') return false

      // Busca por texto
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim()
        const condoName = (
          lic.expand?.condo_id?.name ||
          condos.find((c) => c.id === lic.condo_id)?.name ||
          ''
        ).toLowerCase()
        const condoCnpj = (
          lic.expand?.condo_id?.cnpj ||
          condos.find((c) => c.id === lic.condo_id)?.cnpj ||
          ''
        ).toLowerCase()
        const planoName = (
          lic.expand?.plano_id?.nome ||
          planos.find((p) => p.id === lic.plano_id)?.nome ||
          ''
        ).toLowerCase()
        const licId = lic.id.toLowerCase()

        return (
          condoName.includes(query) ||
          condoCnpj.includes(query) ||
          planoName.includes(query) ||
          licId.includes(query)
        )
      }

      return true
    })
  }, [licencas, filterStatus, searchQuery, condos, planos])

  // Contadores
  const countAtivas = licencas.filter(
    (l) => l.status === 'ativa' && (!l.data_expiracao || new Date(l.data_expiracao) > new Date()),
  ).length
  const countExpiradas = licencas.filter(
    (l) =>
      l.status === 'expirada' || (l.data_expiracao && new Date(l.data_expiracao) <= new Date()),
  ).length
  const countPausadas = licencas.filter((l) => l.status === 'pausada').length

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
              onClick={() => loadData()}
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
        {/* Gerador de Links de Primeiro Cadastro para o Master */}
        <LinkGeneratorCadastro planos={planos} />

        {/* Banner de Boas-Vindas */}
        <div className="bg-gradient-to-r from-indigo-900 via-slate-900 to-slate-800 text-white rounded-xl p-6 shadow-md border border-slate-700">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <h2 className="text-2xl font-bold tracking-tight">Painel Master de Operações</h2>
              <p className="text-slate-300 text-sm max-w-2xl">
                Gestão completa de condomínios, planos e controle total de licenças. Edite limites
                específicos de cada cliente, altere prazos de validade, pause, reative ou substitua
                planos em tempo real.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="bg-slate-800/80 border border-slate-700 rounded-lg p-3 text-center min-w-[105px]">
                <span className="text-xs text-slate-400 font-medium">Condomínios</span>
                <p className="text-xl font-bold text-indigo-400">{condos.length}</p>
              </div>
              <div className="bg-slate-800/80 border border-slate-700 rounded-lg p-3 text-center min-w-[105px]">
                <span className="text-xs text-slate-400 font-medium">Licenças Ativas</span>
                <p className="text-xl font-bold text-emerald-400">{countAtivas}</p>
              </div>
              <div className="bg-slate-800/80 border border-slate-700 rounded-lg p-3 text-center min-w-[105px]">
                <span className="text-xs text-slate-400 font-medium">Expiradas</span>
                <p className="text-xl font-bold text-rose-400">{countExpiradas}</p>
              </div>
              <div className="bg-slate-800/80 border border-slate-700 rounded-lg p-3 text-center min-w-[105px]">
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
                <Building className="w-4 h-4" /> Licenças de Clientes ({licencas.length})
              </TabsTrigger>
              <TabsTrigger value="planos" className="gap-2">
                <Layers className="w-4 h-4" /> Catálogo de Planos ({planos.length})
              </TabsTrigger>
            </TabsList>

            <div className="flex items-center gap-2">
              <Button
                onClick={handleOpenNewLicenca}
                className="bg-indigo-600 hover:bg-indigo-700 text-white gap-1.5 shadow-sm"
              >
                <Plus className="w-4 h-4" /> Nova Licença
              </Button>
              <Button onClick={handleOpenNewPlano} variant="outline" className="gap-1.5">
                <Plus className="w-4 h-4" /> Novo Plano
              </Button>
            </div>
          </div>

          {/* TAB: LICENÇAS EM TABELA (LINHAS POR CLIENTE) */}
          <TabsContent value="licencas" className="space-y-4">
            {/* Barra de Busca e Filtro de Licenças */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3.5 rounded-lg border shadow-xs">
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <Input
                  type="text"
                  placeholder="Buscar por condomínio, CNPJ, plano ou ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 h-9 text-xs"
                />
              </div>

              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider hidden md:inline mr-1">
                  Status:
                </span>
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
                  variant={filterStatus === 'ativa' ? 'default' : 'outline'}
                  onClick={() => setFilterStatus('ativa')}
                  className="h-8 text-xs text-emerald-700 hover:text-emerald-800"
                >
                  Ativas ({countAtivas})
                </Button>
                <Button
                  size="sm"
                  variant={filterStatus === 'expirada' ? 'destructive' : 'outline'}
                  onClick={() => setFilterStatus('expirada')}
                  className={`h-8 text-xs gap-1 ${filterStatus !== 'expirada' ? 'text-rose-600 border-rose-200 hover:bg-rose-50' : ''}`}
                >
                  <AlertCircle className="w-3.5 h-3.5" />
                  Expiradas ({countExpiradas})
                </Button>
                <Button
                  size="sm"
                  variant={filterStatus === 'pausada' ? 'default' : 'outline'}
                  onClick={() => setFilterStatus('pausada')}
                  className="h-8 text-xs text-amber-700 hover:text-amber-800"
                >
                  Pausadas ({countPausadas})
                </Button>
              </div>
            </div>

            {/* TABELA PRINCIPAL DE LICENÇAS */}
            <Card className="shadow-sm border overflow-hidden">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-slate-50/80">
                    <TableRow className="border-b">
                      <TableHead className="font-semibold text-xs text-slate-700 py-3.5">
                        Número / ID
                      </TableHead>
                      <TableHead className="font-semibold text-xs text-slate-700">
                        Cliente (Condomínio)
                      </TableHead>
                      <TableHead className="font-semibold text-xs text-slate-700">
                        Plano Contratado
                      </TableHead>
                      <TableHead className="font-semibold text-xs text-slate-700">
                        Produto
                      </TableHead>
                      <TableHead className="font-semibold text-xs text-slate-700">
                        Limites Efetivos
                      </TableHead>
                      <TableHead className="font-semibold text-xs text-slate-700">Valor</TableHead>
                      <TableHead className="font-semibold text-xs text-slate-700">
                        Expiração / Validade
                      </TableHead>
                      <TableHead className="font-semibold text-xs text-slate-700">Status</TableHead>
                      <TableHead className="font-semibold text-xs text-slate-700 text-right pr-4">
                        Ações
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredLicencas.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={9} className="h-32 text-center text-muted-foreground">
                          {licencas.length === 0 ? (
                            <div className="py-6 space-y-2">
                              <Building className="w-10 h-10 mx-auto text-slate-400 opacity-60" />
                              <p className="font-medium text-sm text-slate-700">
                                Nenhuma licença cadastrada no sistema.
                              </p>
                              <Button
                                size="sm"
                                onClick={handleOpenNewLicenca}
                                className="bg-indigo-600 hover:bg-indigo-700 text-white"
                              >
                                Cadastrar Primeira Licença
                              </Button>
                            </div>
                          ) : (
                            <div className="py-6 space-y-1">
                              <p className="font-medium text-sm text-slate-700">
                                Nenhuma licença encontrada com os filtros atuais.
                              </p>
                              <p className="text-xs text-slate-400">
                                Tente ajustar a busca ou o status selecionado.
                              </p>
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredLicencas.map((licenca) => {
                        const isExpired =
                          licenca.status === 'expirada' ||
                          (licenca.data_expiracao && new Date(licenca.data_expiracao) <= new Date())

                        const condoRecord =
                          licenca.expand?.condo_id || condos.find((c) => c.id === licenca.condo_id)
                        const condoName = condoRecord?.name || 'Condomínio não identificado'
                        const condoCnpj = condoRecord?.cnpj || ''

                        const planoRecord =
                          licenca.expand?.plano_id || planos.find((p) => p.id === licenca.plano_id)
                        const planoName = planoRecord?.nome || 'Plano Padrão'
                        const isMasterPlan = (() => {
                          if (!planoRecord) return false
                          const nome = planoRecord.nome?.trim()
                          if (nome === 'Plano Master' || nome === 'Plano no Master') return true
                          const maxM = planoRecord.max_moradores ?? 0
                          const maxU = planoRecord.max_units ?? 0
                          const preco = Number(planoRecord.preco_mensal || 0)
                          return (
                            !!planoRecord.exclusivo_master && maxM <= 0 && maxU <= 0 && preco === 0
                          )
                        })()

                        // Limites efetivos (considerando overrides)
                        const hasUserOverride =
                          licenca.override_max_usuarios !== undefined &&
                          licenca.override_max_usuarios !== null &&
                          licenca.override_max_usuarios > 0
                        const hasUnitOverride =
                          licenca.override_max_unidades !== undefined &&
                          licenca.override_max_unidades !== null &&
                          licenca.override_max_unidades > 0

                        const effectiveUsers = hasUserOverride
                          ? licenca.override_max_usuarios!
                          : (planoRecord?.max_moradores ?? 0)
                        const effectiveUnits = hasUnitOverride
                          ? licenca.override_max_unidades!
                          : (planoRecord?.max_units ?? 0)

                        // Data de expiração legível
                        const expDateObj = licenca.data_expiracao
                          ? new Date(licenca.data_expiracao)
                          : null
                        const expFormatted = expDateObj
                          ? expDateObj.toLocaleDateString('pt-BR')
                          : isMasterPlan
                            ? 'Vitalícia / Ilimitada'
                            : 'Indeterminada'

                        return (
                          <TableRow
                            key={licenca.id}
                            className={`hover:bg-slate-50/80 transition-colors text-xs ${
                              isExpired
                                ? 'bg-rose-50/30'
                                : licenca.status === 'pausada'
                                  ? 'bg-amber-50/20'
                                  : ''
                            }`}
                          >
                            {/* Número / ID */}
                            <TableCell className="font-mono text-[11px] font-semibold text-slate-700 py-3">
                              <span className="bg-slate-100 px-2 py-1 rounded border border-slate-200">
                                {licenca.id}
                              </span>
                            </TableCell>

                            {/* Cliente (Condomínio) */}
                            <TableCell className="min-w-[190px]">
                              <div className="space-y-0.5">
                                <span className="font-bold text-slate-900 block text-xs">
                                  {condoName}
                                </span>
                                {condoCnpj ? (
                                  <span className="text-[11px] text-slate-500 font-mono block">
                                    CNPJ: {condoCnpj}
                                  </span>
                                ) : (
                                  <span className="text-[10px] text-slate-400 font-mono block">
                                    ID: {licenca.condo_id}
                                  </span>
                                )}
                              </div>
                            </TableCell>

                            {/* Plano */}
                            <TableCell className="min-w-[140px]">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="font-semibold text-slate-800">{planoName}</span>
                                {isMasterPlan && (
                                  <Badge className="bg-indigo-600 text-white text-[9px] py-0 px-1">
                                    Master
                                  </Badge>
                                )}
                              </div>
                            </TableCell>

                            {/* Produto */}
                            <TableCell>
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-slate-100 text-slate-700 border border-slate-200">
                                CondoPack
                              </span>
                            </TableCell>

                            {/* Limites Efetivos (com indicação clara de override) */}
                            <TableCell className="min-w-[170px]">
                              <div className="space-y-1">
                                <div className="flex items-center gap-1.5">
                                  <span className="text-slate-500 text-[11px]">Usuários:</span>
                                  <span className="font-semibold text-slate-900">
                                    {isMasterPlan || effectiveUsers <= 0
                                      ? 'Ilimitado'
                                      : `${effectiveUsers}`}
                                  </span>
                                  {hasUserOverride && (
                                    <Badge
                                      variant="outline"
                                      className="text-[9px] py-0 px-1 border-indigo-400 text-indigo-700 bg-indigo-50 font-bold"
                                      title={`Override customizado para este condomínio (plano original: ${planoRecord?.max_moradores || 'ilimitado'})`}
                                    >
                                      Custom
                                    </Badge>
                                  )}
                                </div>
                                <div className="flex items-center gap-1.5">
                                  <span className="text-slate-500 text-[11px]">Unidades:</span>
                                  <span className="font-semibold text-slate-900">
                                    {isMasterPlan || effectiveUnits <= 0
                                      ? 'Ilimitado'
                                      : `${effectiveUnits}`}
                                  </span>
                                  {hasUnitOverride && (
                                    <Badge
                                      variant="outline"
                                      className="text-[9px] py-0 px-1 border-indigo-400 text-indigo-700 bg-indigo-50 font-bold"
                                      title={`Override customizado para este condomínio (plano original: ${planoRecord?.max_units || 'ilimitado'})`}
                                    >
                                      Custom
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            </TableCell>

                            {/* Valor */}
                            <TableCell className="whitespace-nowrap font-medium text-slate-800">
                              {planoRecord?.preco_mensal === 0 || isMasterPlan ? (
                                <span className="text-emerald-700 font-semibold">Isento</span>
                              ) : (
                                <span>
                                  R${' '}
                                  {Number(planoRecord?.preco_mensal || 0)
                                    .toFixed(2)
                                    .replace('.', ',')}
                                  <span className="text-[10px] text-slate-400">/mês</span>
                                </span>
                              )}
                            </TableCell>

                            {/* Expiração / Validade */}
                            <TableCell className="whitespace-nowrap">
                              <div className="space-y-0.5">
                                <div className="flex items-center gap-1">
                                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                                  <span
                                    className={`font-medium ${
                                      isExpired ? 'text-rose-600 font-bold' : 'text-slate-800'
                                    }`}
                                  >
                                    {expFormatted}
                                  </span>
                                </div>
                                {isExpired && (
                                  <span className="text-[10px] text-rose-500 font-medium block">
                                    Vencida
                                  </span>
                                )}
                              </div>
                            </TableCell>

                            {/* Status */}
                            <TableCell>{getStatusBadge(licenca.status)}</TableCell>

                            {/* Botão de Ações com TODOS os poderes */}
                            <TableCell className="text-right pr-4 whitespace-nowrap">
                              <div className="flex items-center justify-end gap-1">
                                {/* Botão rápido Reativar +30 dias mantido para conveniência */}
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleReativar30Dias(licenca)}
                                  disabled={reactivatingId === licenca.id}
                                  className={`h-7 px-2 text-[11px] font-semibold gap-1 ${
                                    isExpired
                                      ? 'border-rose-300 text-rose-700 bg-rose-50 hover:bg-rose-100'
                                      : 'border-emerald-300 text-emerald-700 bg-emerald-50 hover:bg-emerald-100'
                                  }`}
                                  title="Estender por +30 dias a partir da data de término"
                                >
                                  {reactivatingId === licenca.id ? (
                                    <RefreshCw className="w-3 h-3 animate-spin" />
                                  ) : (
                                    <RefreshCw className="w-3 h-3" />
                                  )}
                                  <span>+30d</span>
                                </Button>

                                {/* Dropdown Menu de Ações com todos os poderes */}
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-7 w-7 p-0 data-[state=open]:bg-slate-100"
                                    >
                                      <MoreVertical className="w-4 h-4 text-slate-700" />
                                      <span className="sr-only">Abrir menu de ações</span>
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end" className="w-56 text-xs">
                                    <DropdownMenuLabel className="text-[11px] text-slate-500 font-semibold uppercase tracking-wider">
                                      Poderes da Licença
                                    </DropdownMenuLabel>
                                    <DropdownMenuSeparator />

                                    {/* 1. Editar Limites Específicos (Overrides) */}
                                    <DropdownMenuItem
                                      onClick={() => handleOpenLimitesModal(licenca)}
                                      className="gap-2 cursor-pointer"
                                    >
                                      <Sliders className="w-3.5 h-3.5 text-indigo-600" />
                                      <span>Editar limites desta licença</span>
                                    </DropdownMenuItem>

                                    {/* 2. Editar Data de Expiração */}
                                    <DropdownMenuItem
                                      onClick={() => handleOpenExpiracaoModal(licenca)}
                                      className="gap-2 cursor-pointer"
                                    >
                                      <Calendar className="w-3.5 h-3.5 text-blue-600" />
                                      <span>Editar data de expiração</span>
                                    </DropdownMenuItem>

                                    {/* 3. Alterar Plano */}
                                    <DropdownMenuItem
                                      onClick={() => handleOpenTrocarPlanoModal(licenca)}
                                      className="gap-2 cursor-pointer"
                                    >
                                      <ArrowRightLeft className="w-3.5 h-3.5 text-amber-600" />
                                      <span>Alterar plano do cliente</span>
                                    </DropdownMenuItem>

                                    {/* 4. Pausar / Despausar */}
                                    <DropdownMenuItem
                                      onClick={() => handleTogglePausarLicenca(licenca)}
                                      className="gap-2 cursor-pointer"
                                    >
                                      {licenca.status === 'pausada' ? (
                                        <>
                                          <PlayCircle className="w-3.5 h-3.5 text-emerald-600" />
                                          <span>Reativar licença</span>
                                        </>
                                      ) : (
                                        <>
                                          <PauseCircle className="w-3.5 h-3.5 text-amber-600" />
                                          <span>Pausar licença</span>
                                        </>
                                      )}
                                    </DropdownMenuItem>

                                    {/* 5. Edição Geral */}
                                    <DropdownMenuItem
                                      onClick={() => handleEditLicenca(licenca)}
                                      className="gap-2 cursor-pointer"
                                    >
                                      <Edit2 className="w-3.5 h-3.5 text-slate-600" />
                                      <span>Editar dados gerais</span>
                                    </DropdownMenuItem>

                                    <DropdownMenuSeparator />

                                    {/* 6. Excluir com confirmação */}
                                    <DropdownMenuItem
                                      onClick={() => handlePromptDeleteLicenca(licenca)}
                                      className="gap-2 cursor-pointer text-rose-600 focus:text-rose-600 focus:bg-rose-50"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                      <span>Excluir licença</span>
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                            </TableCell>
                          </TableRow>
                        )
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            </Card>
          </TabsContent>

          {/* TAB: CATÁLOGO DE PLANOS */}
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
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <CardTitle className="text-lg font-bold">{plano.nome}</CardTitle>
                            {plano.exclusivo_master && (
                              <Badge className="bg-indigo-600 text-white text-[10px] py-0 px-1.5">
                                Exclusivo Master
                              </Badge>
                            )}
                          </div>
                        </div>
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
                            {plano.preco_mensal === 0 ? (
                              'Grátis / Master'
                            ) : (
                              <>
                                R${' '}
                                {plano.preco_mensal !== undefined
                                  ? Number(plano.preco_mensal).toFixed(2).replace('.', ',')
                                  : '0,00'}
                              </>
                            )}
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
                            <span className="text-muted-foreground">Limite de Usuários:</span>
                            <span className="font-semibold">
                              {plano.max_moradores
                                ? `${plano.max_moradores} usuários`
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

      {/* MODAL 1: EDITAR LIMITES ESPECÍFICOS DA LICENÇA (OVERRIDES) */}
      <Dialog open={isLimitesModalOpen} onOpenChange={setIsLimitesModalOpen}>
        <DialogContent className="sm:max-w-lg">
          <form onSubmit={handleSaveLimites}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Sliders className="w-5 h-5 text-indigo-600" />
                Editar Limites Desta Licença
              </DialogTitle>
              <DialogDescription>
                Sobrescreva manualmente a quantidade de usuários e unidades permitidos para este
                cliente específico <strong>sem alterar os planos padrão do catálogo</strong>.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-5 py-4">
              {/* Resumo do condomínio e plano base */}
              <div className="p-3 bg-slate-50 border rounded-lg space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">Condomínio:</span>
                  <span className="font-bold text-slate-800">
                    {targetLicencaLimites?.expand?.condo_id?.name ||
                      condos.find((c) => c.id === targetLicencaLimites?.condo_id)?.name ||
                      '---'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Plano Base Contratado:</span>
                  <span className="font-semibold text-slate-800">
                    {targetLicencaLimites?.expand?.plano_id?.nome ||
                      planos.find((p) => p.id === targetLicencaLimites?.plano_id)?.nome ||
                      '---'}
                  </span>
                </div>
              </div>

              {/* Override de Usuários */}
              <div className="space-y-2 p-3.5 border rounded-lg bg-white">
                <div className="flex items-center justify-between">
                  <Label htmlFor="lim-usuarios" className="font-semibold text-xs cursor-pointer">
                    Limite Personalizado de Usuários
                  </Label>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="checkbox"
                      id="check-override-usuarios"
                      checked={limitesForm.usar_override_usuarios}
                      onChange={(e) =>
                        setLimitesForm({
                          ...limitesForm,
                          usar_override_usuarios: e.target.checked,
                        })
                      }
                      className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-3.5 w-3.5 cursor-pointer"
                    />
                    <label
                      htmlFor="check-override-usuarios"
                      className="text-[11px] text-slate-600 cursor-pointer font-medium"
                    >
                      Ativar override
                    </label>
                  </div>
                </div>

                {limitesForm.usar_override_usuarios ? (
                  <div className="space-y-1 pt-1">
                    <Input
                      id="lim-usuarios"
                      type="number"
                      min="1"
                      placeholder="Ex: 350"
                      value={limitesForm.override_max_usuarios}
                      onChange={(e) =>
                        setLimitesForm({
                          ...limitesForm,
                          override_max_usuarios: e.target.value,
                        })
                      }
                      className="h-9 text-xs"
                      required
                    />
                    <p className="text-[10px] text-indigo-600 font-medium">
                      Este cliente poderá cadastrar até {limitesForm.override_max_usuarios || 0}{' '}
                      usuários (prevalece sobre o plano).
                    </p>
                  </div>
                ) : (
                  <p className="text-[11px] text-slate-500 italic">
                    Usando limite padrão do plano (
                    {targetLicencaLimites?.expand?.plano_id?.max_moradores ||
                      planos.find((p) => p.id === targetLicencaLimites?.plano_id)?.max_moradores ||
                      'ilimitado'}{' '}
                    usuários).
                  </p>
                )}
              </div>

              {/* Override de Unidades */}
              <div className="space-y-2 p-3.5 border rounded-lg bg-white">
                <div className="flex items-center justify-between">
                  <Label htmlFor="lim-unidades" className="font-semibold text-xs cursor-pointer">
                    Limite Personalizado de Unidades / Aptos
                  </Label>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="checkbox"
                      id="check-override-unidades"
                      checked={limitesForm.usar_override_unidades}
                      onChange={(e) =>
                        setLimitesForm({
                          ...limitesForm,
                          usar_override_unidades: e.target.checked,
                        })
                      }
                      className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-3.5 w-3.5 cursor-pointer"
                    />
                    <label
                      htmlFor="check-override-unidades"
                      className="text-[11px] text-slate-600 cursor-pointer font-medium"
                    >
                      Ativar override
                    </label>
                  </div>
                </div>

                {limitesForm.usar_override_unidades ? (
                  <div className="space-y-1 pt-1">
                    <Input
                      id="lim-unidades"
                      type="number"
                      min="1"
                      placeholder="Ex: 120"
                      value={limitesForm.override_max_unidades}
                      onChange={(e) =>
                        setLimitesForm({
                          ...limitesForm,
                          override_max_unidades: e.target.value,
                        })
                      }
                      className="h-9 text-xs"
                      required
                    />
                    <p className="text-[10px] text-indigo-600 font-medium">
                      Este cliente poderá cadastrar até {limitesForm.override_max_unidades || 0}{' '}
                      unidades (prevalece sobre o plano).
                    </p>
                  </div>
                ) : (
                  <p className="text-[11px] text-slate-500 italic">
                    Usando limite padrão do plano (
                    {targetLicencaLimites?.expand?.plano_id?.max_units ||
                      planos.find((p) => p.id === targetLicencaLimites?.plano_id)?.max_units ||
                      'ilimitado'}{' '}
                    unidades).
                  </p>
                )}
              </div>
            </div>

            <DialogFooter className="gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsLimitesModalOpen(false)}
                disabled={saving}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold"
                disabled={saving}
              >
                {saving ? 'Salvando limites...' : 'Salvar Limites da Licença'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL 2: EDITAR DATA DE EXPIRAÇÃO */}
      <Dialog open={isExpiracaoModalOpen} onOpenChange={setIsExpiracaoModalOpen}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={handleSaveExpiracao}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-blue-600" />
                Editar Data de Expiração
              </DialogTitle>
              <DialogDescription>
                Defina manualmente a data de expiração desta licença ou use os atalhos rápidos.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="exp-data" className="text-xs font-semibold">
                  Data de Vencimento
                </Label>
                <Input
                  id="exp-data"
                  type="date"
                  value={expiracaoForm.data_expiracao}
                  onChange={(e) =>
                    setExpiracaoForm({ ...expiracaoForm, data_expiracao: e.target.value })
                  }
                  className="text-xs"
                />
                <p className="text-[11px] text-slate-500">
                  Deixe em branco para licença sem término (vitalícia / ilimitada).
                </p>
              </div>

              {/* Atalhos Rápidos de Adição de Prazo */}
              <div className="space-y-1.5 pt-1">
                <span className="text-[11px] font-semibold text-slate-600 uppercase tracking-wider block">
                  Atalhos Rápidos (Adicionar Prazo):
                </span>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleEstenderDias(30)}
                    className="flex-1 text-xs"
                  >
                    +30 dias
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleEstenderDias(60)}
                    className="flex-1 text-xs"
                  >
                    +60 dias
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleEstenderDias(90)}
                    className="flex-1 text-xs"
                  >
                    +90 dias
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleEstenderDias(365)}
                    className="flex-1 text-xs"
                  >
                    +1 ano
                  </Button>
                </div>
              </div>
            </div>

            <DialogFooter className="gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsExpiracaoModalOpen(false)}
                disabled={saving}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold"
                disabled={saving}
              >
                {saving ? 'Atualizando...' : 'Atualizar Validade'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL 3: ALTERAR PLANO DA LICENÇA */}
      <Dialog open={isTrocarPlanoModalOpen} onOpenChange={setIsTrocarPlanoModalOpen}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={handleSaveTrocaPlano}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <ArrowRightLeft className="w-5 h-5 text-amber-600" />
                Alterar Plano da Licença
              </DialogTitle>
              <DialogDescription>
                Selecione o novo plano do catálogo para vincular a este condomínio.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="p-3 bg-slate-50 border rounded-lg text-xs space-y-1">
                <span className="text-slate-500">Condomínio:</span>
                <p className="font-bold text-slate-800">
                  {targetLicencaTroca?.expand?.condo_id?.name ||
                    condos.find((c) => c.id === targetLicencaTroca?.condo_id)?.name ||
                    '---'}
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="select-novo-plano" className="text-xs font-semibold">
                  Novo Plano Contratado *
                </Label>
                <Select value={novoPlanoId} onValueChange={setNovoPlanoId}>
                  <SelectTrigger id="select-novo-plano" className="text-xs">
                    <SelectValue placeholder="Selecione um plano" />
                  </SelectTrigger>
                  <SelectContent>
                    {planos.map((p) => {
                      const isMasterPlano =
                        p.nome === 'Plano Master' ||
                        p.nome === 'Plano no Master' ||
                        (p.exclusivo_master &&
                          (p.max_moradores ?? 0) <= 0 &&
                          (p.max_units ?? 0) <= 0 &&
                          Number(p.preco_mensal || 0) === 0)
                      return (
                        <SelectItem key={p.id} value={p.id} className="text-xs">
                          {p.nome}{' '}
                          {isMasterPlano
                            ? '(Master - Ilimitado)'
                            : p.exclusivo_master
                              ? `(Exclusivo Master - R$ ${Number(p.preco_mensal || 0).toFixed(2)}/mês)`
                              : `(R$ ${Number(p.preco_mensal || 0).toFixed(2)}/mês)`}
                        </SelectItem>
                      )
                    })}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DialogFooter className="gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsTrocarPlanoModalOpen(false)}
                disabled={saving}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                className="bg-amber-600 hover:bg-amber-700 text-white font-semibold"
                disabled={saving || !novoPlanoId}
              >
                {saving ? 'Alterando plano...' : 'Confirmar Alteração'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL 4: CONFIRMAÇÃO DE EXCLUSÃO DE LICENÇA */}
      <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-rose-600">
              <Trash2 className="w-5 h-5" />
              Excluir Licença Definitivamente
            </DialogTitle>
            <DialogDescription>
              Você está prestes a excluir a licença do condomínio{' '}
              <strong>
                {licencaToDelete?.expand?.condo_id?.name ||
                  condos.find((c) => c.id === licencaToDelete?.condo_id)?.name ||
                  'selecionado'}
              </strong>
              . Esta ação não poderá ser desfeita e interromperá as operações vinculadas a esta
              licença.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsDeleteModalOpen(false)}
              disabled={saving}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={handleConfirmDeleteLicenca}
              disabled={saving}
              className="bg-rose-600 hover:bg-rose-700 text-white font-semibold"
            >
              {saving ? 'Excluindo...' : 'Sim, Excluir Licença'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL GERAL: CRIAR OU EDITAR LICENÇA */}
      <Dialog open={isLicencaModalOpen} onOpenChange={setIsLicencaModalOpen}>
        <DialogContent className="sm:max-w-lg">
          <form onSubmit={handleSaveLicenca}>
            <DialogHeader>
              <DialogTitle>
                {editingLicenca ? 'Editar Licença Completa' : 'Vincular Nova Licença'}
              </DialogTitle>
              <DialogDescription>
                Vincule um condomínio a um plano contratado, defina a vigência e limites opcionais.
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

              {/* Limites Manuais Opcionais */}
              <div className="pt-2 border-t space-y-2">
                <span className="text-xs font-semibold text-slate-700 block">
                  Limites Sobrescritos Manuais (Opcional - prevalecem sobre o plano)
                </span>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label htmlFor="licenca-override-users" className="text-[11px] text-slate-500">
                      Override Máx. Usuários
                    </Label>
                    <Input
                      id="licenca-override-users"
                      type="number"
                      placeholder="Padrão do plano"
                      value={licencaForm.override_max_usuarios}
                      onChange={(e) =>
                        setLicencaForm({
                          ...licencaForm,
                          override_max_usuarios: e.target.value,
                        })
                      }
                      className="text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="licenca-override-units" className="text-[11px] text-slate-500">
                      Override Máx. Unidades
                    </Label>
                    <Input
                      id="licenca-override-units"
                      type="number"
                      placeholder="Padrão do plano"
                      value={licencaForm.override_max_unidades}
                      onChange={(e) =>
                        setLicencaForm({
                          ...licencaForm,
                          override_max_unidades: e.target.value,
                        })
                      }
                      className="text-xs"
                    />
                  </div>
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
              <Button
                type="submit"
                className="bg-indigo-600 hover:bg-indigo-700 text-white"
                disabled={saving}
              >
                {saving ? 'Salvando...' : 'Salvar Licença'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

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
                  <Label htmlFor="plano-moradores">Máx. Usuários</Label>
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

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="plano-exclusivo"
                  checked={planoForm.exclusivo_master}
                  onChange={(e) =>
                    setPlanoForm({ ...planoForm, exclusivo_master: e.target.checked })
                  }
                  className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                />
                <Label htmlFor="plano-exclusivo" className="text-sm font-medium cursor-pointer">
                  Plano exclusivo Master (oculto para clientes e público)
                </Label>
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
              <Button
                type="submit"
                className="bg-indigo-600 hover:bg-indigo-700 text-white"
                disabled={saving}
              >
                {saving ? 'Salvando...' : 'Salvar Plano'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
