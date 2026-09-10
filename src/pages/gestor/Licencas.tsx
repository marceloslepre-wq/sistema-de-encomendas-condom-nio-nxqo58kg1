import { useState, useEffect } from 'react'
import {
  ShieldCheck,
  CreditCard,
  Calendar,
  Users,
  Building,
  ArrowUpRight,
  Clock,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  RefreshCw,
  Sparkles,
  Info,
  Check,
} from 'lucide-react'
import { useAuth } from '@/hooks/use-auth'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useToast } from '@/hooks/use-toast'
import { QrCode, Copy, CheckCircle, ExternalLink, ShieldAlert, Loader2 } from 'lucide-react'
import {
  getLicencaStatus,
  LicencaStatusResponse,
  criarPixRenovacao,
  consultarPixStatus,
  CriarPixResponse,
} from '@/services/pagamentos'
import {
  Plano,
  HistoricoLicenca,
  getPlanosDisponiveisCliente,
  getHistoricoLicencas,
  trocarPlanoGestor,
} from '@/services/master'
import { getUnits } from '@/services/api'
import { useRealtime } from '@/hooks/use-realtime'
import pb from '@/lib/pocketbase/client'

export default function GestorLicencas() {
  const { user } = useAuth()
  const { toast } = useToast()

  const [loading, setLoading] = useState(true)
  const [licencaData, setLicencaData] = useState<LicencaStatusResponse | null>(null)
  const [totalUsuarios, setTotalUsuarios] = useState(0)
  const [totalUnidades, setTotalUnidades] = useState(0)
  const [historico, setHistorico] = useState<HistoricoLicenca[]>([])

  // Modal de Mudança de Plano
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [planosDisponiveis, setPlanosDisponiveis] = useState<Plano[]>([])
  const [loadingPlanos, setLoadingPlanos] = useState(false)
  const [selectedPlanoId, setSelectedPlanoId] = useState<string | null>(null)
  const [savingTroca, setSavingTroca] = useState(false)

  // Modal de Pagamento PIX de Renovação
  const [isPixModalOpen, setIsPixModalOpen] = useState(false)
  const [gerandoPix, setGerandoPix] = useState(false)
  const [pixData, setPixData] = useState<CriarPixResponse | null>(null)
  const [pixStatus, setPixStatus] = useState<'pending' | 'approved' | 'rejected'>('pending')
  const [novaLicencaInfo, setNovaLicencaInfo] = useState<{
    licenca_id?: string
    data_expiracao?: string | null
  } | null>(null)
  const [verificandoPix, setVerificandoPix] = useState(false)
  const [copiadoPix, setCopiadoPix] = useState(false)

  const loadData = async () => {
    setLoading(true)
    try {
      const statusRes = await getLicencaStatus()
      setLicencaData(statusRes)

      const condoId = user?.condo_id || statusRes.condo_id

      const usersFilter = condoId ? `condo_id = "${condoId}"` : ''
      const [usersList, unitsList, histList] = await Promise.all([
        pb.collection('users').getFullList({ filter: usersFilter, requestKey: null }),
        getUnits(),
        getHistoricoLicencas(condoId),
      ])

      setTotalUsuarios(usersList.length)
      setTotalUnidades(unitsList.length)
      setHistorico(histList)
    } catch (err: any) {
      toast({
        title: 'Erro ao carregar dados da licença',
        description: err.message || 'Falha ao consultar informações.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  // Atualização em tempo real quando usuário ou licença mudar
  useRealtime('users', () => {
    loadData()
  })
  useRealtime('units', () => {
    loadData()
  })
  useRealtime('licencas', () => {
    loadData()
  })

  // Iniciar fluxo de pagamento PIX
  const handleOpenPixRenovacao = async () => {
    setIsPixModalOpen(true)
    setGerandoPix(true)
    setPixData(null)
    setPixStatus('pending')
    setNovaLicencaInfo(null)
    setCopiadoPix(false)

    try {
      const res = await criarPixRenovacao()
      if (!res.configured) {
        toast({
          title: 'Configuração do Gateway',
          description:
            res.message ||
            'O Mercado Pago está em fase de configuração. Contate o suporte ou o master.',
          variant: 'destructive',
        })
        setIsPixModalOpen(false)
        return
      }

      setPixData(res)
      setPixStatus(res.status === 'approved' ? 'approved' : 'pending')
    } catch (err: any) {
      toast({
        title: 'Erro ao gerar cobrança PIX',
        description: err.message || 'Falha ao comunicar com o servidor.',
        variant: 'destructive',
      })
      setIsPixModalOpen(false)
    } finally {
      setGerandoPix(false)
    }
  }

  // Polling automático enquanto modal PIX estiver aberto e pendente
  useEffect(() => {
    if (!isPixModalOpen || !pixData?.payment_id || pixStatus === 'approved') {
      return
    }

    const interval = setInterval(async () => {
      try {
        const check = await consultarPixStatus(pixData.payment_id!)
        if (check.status === 'approved') {
          setPixStatus('approved')
          setNovaLicencaInfo({
            licenca_id: check.licenca_id,
            data_expiracao: check.data_expiracao,
          })
          toast({
            title: 'Pagamento Aprovado via PIX!',
            description: 'Sua licença foi renovada por mais 30 dias com sucesso!',
          })
          // Atualiza dados de tela automaticamente
          loadData()
        }
      } catch (e) {
        // Silencioso no polling
      }
    }, 5000)

    return () => clearInterval(interval)
  }, [isPixModalOpen, pixData?.payment_id, pixStatus])

  // Checagem manual de redundância
  const handleManualCheckPix = async () => {
    if (!pixData?.payment_id) return
    setVerificandoPix(true)
    try {
      const check = await consultarPixStatus(pixData.payment_id)
      if (check.status === 'approved') {
        setPixStatus('approved')
        setNovaLicencaInfo({
          licenca_id: check.licenca_id,
          data_expiracao: check.data_expiracao,
        })
        toast({
          title: 'Pagamento Aprovado via PIX!',
          description: 'Sua licença foi renovada por mais 30 dias com sucesso!',
        })
        await loadData()
      } else {
        toast({
          title: 'Pagamento ainda não identificado',
          description:
            'Aguardando compensação do PIX pelo Mercado Pago. O status atualizará automaticamente assim que confirmado.',
        })
      }
    } catch (err: any) {
      toast({
        title: 'Erro na verificação',
        description: err.message || 'Não foi possível consultar o status agora.',
        variant: 'destructive',
      })
    } finally {
      setVerificandoPix(false)
    }
  }

  // Copiar código PIX copia e cola
  const handleCopyPix = () => {
    if (!pixData?.qr_code) return
    navigator.clipboard.writeText(pixData.qr_code)
    setCopiadoPix(true)
    toast({
      title: 'Chave PIX copiada!',
      description: 'Cole o código no app do seu banco para pagar.',
    })
    setTimeout(() => setCopiadoPix(false), 4000)
  }

  const handleOpenTrocaPlano = async () => {
    setIsModalOpen(true)
    setLoadingPlanos(true)
    try {
      const planos = await getPlanosDisponiveisCliente()
      setPlanosDisponiveis(planos)
      // Pré-selecionar o plano atual se disponível
      if (licencaData?.plano?.id) {
        setSelectedPlanoId(licencaData.plano.id)
      } else if (planos.length > 0) {
        setSelectedPlanoId(planos[0].id)
      }
    } catch (err: any) {
      toast({
        title: 'Erro ao carregar planos disponíveis',
        description: err.message || 'Não foi possível carregar os planos.',
        variant: 'destructive',
      })
    } finally {
      setLoadingPlanos(false)
    }
  }

  const handleConfirmTrocaPlano = async () => {
    if (!selectedPlanoId) {
      toast({
        title: 'Selecione um plano',
        description: 'Por favor, selecione o plano para o qual deseja alterar.',
        variant: 'destructive',
      })
      return
    }

    if (selectedPlanoId === licencaData?.plano?.id) {
      toast({
        title: 'Plano atual selecionado',
        description: 'O condomínio já está utilizando este plano.',
      })
      setIsModalOpen(false)
      return
    }

    setSavingTroca(true)
    try {
      const res: any = await trocarPlanoGestor(selectedPlanoId)
      toast({
        title: 'Plano alterado com sucesso!',
        description:
          res.message ||
          'A licença do condomínio foi atualizada. Novos limites já estão disponíveis.',
      })
      setIsModalOpen(false)
      await loadData()
    } catch (err: any) {
      toast({
        title: 'Erro ao alterar plano',
        description:
          err?.response?.data?.message || err.message || 'Falha na comunicação com o servidor.',
        variant: 'destructive',
      })
    } finally {
      setSavingTroca(false)
    }
  }

  // Definições visuais de status da licença
  const getStatusBadge = (status?: string) => {
    switch (status) {
      case 'ativa':
        return (
          <Badge className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 py-1 px-3">
            <CheckCircle2 className="w-3.5 h-3.5" /> Ativa
          </Badge>
        )
      case 'pausada':
        return (
          <Badge variant="outline" className="text-amber-600 border-amber-600 gap-1.5 py-1 px-3">
            <Clock className="w-3.5 h-3.5" /> Pausada
          </Badge>
        )
      case 'expirada':
        return (
          <Badge variant="destructive" className="gap-1.5 py-1 px-3">
            <AlertTriangle className="w-3.5 h-3.5" /> Expirada
          </Badge>
        )
      case 'cancelada':
        return (
          <Badge variant="secondary" className="gap-1.5 py-1 px-3">
            <XCircle className="w-3.5 h-3.5" /> Cancelada
          </Badge>
        )
      default:
        return (
          <Badge variant="outline" className="gap-1.5 py-1 px-3">
            {status || 'Pendente'}
          </Badge>
        )
    }
  }

  const plano = licencaData?.plano
  const isMasterPlan =
    licencaData?.sem_expiracao ||
    plano?.exclusivo_master ||
    plano?.nome === 'Plano no Master' ||
    licencaData?.master

  const diasRestantes = licencaData?.dias_restantes ?? null

  // Cálculo da barra regressiva visual de expiração (verde -> amarela -> vermelha nos últimos 5 dias)
  const getExpirationBar = () => {
    if (isMasterPlan) {
      return (
        <div className="space-y-1.5">
          <div className="flex justify-between items-center text-sm font-medium">
            <span className="flex items-center gap-1.5 text-indigo-700">
              <Sparkles className="w-4 h-4 text-indigo-600" />
              Sem prazo de término (Vitalício / Exclusivo)
            </span>
            <span className="text-xs bg-indigo-100 text-indigo-800 font-semibold px-2 py-0.5 rounded-full">
              Ilimitado
            </span>
          </div>
          <div className="w-full h-2.5 bg-indigo-100 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-indigo-500 to-indigo-600 w-full" />
          </div>
        </div>
      )
    }

    if (diasRestantes === null || diasRestantes === undefined) {
      return (
        <div className="text-sm text-muted-foreground flex items-center gap-2">
          <Calendar className="w-4 h-4" /> Data de validade indeterminada
        </div>
      )
    }

    if (diasRestantes <= 0) {
      return (
        <div className="space-y-1.5">
          <div className="flex justify-between items-center text-sm font-medium text-rose-600">
            <span className="flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4" /> Licença Expirada
            </span>
            <span className="text-xs font-bold">0 dias restantes</span>
          </div>
          <div className="w-full h-2.5 bg-rose-100 rounded-full overflow-hidden">
            <div className="h-full bg-rose-600 w-full" />
          </div>
        </div>
      )
    }

    // Cor da barra conforme os dias restantes:
    // <= 5 dias: Vermelha
    // 6 a 15 dias: Amarela / Âmbar
    // > 15 dias: Verde
    let barColor = 'bg-emerald-500'
    let textColor = 'text-emerald-700'
    let statusLabel = `Vence em ${diasRestantes} ${diasRestantes === 1 ? 'dia' : 'dias'}`

    if (diasRestantes <= 5) {
      barColor = 'bg-rose-500'
      textColor = 'text-rose-600'
    } else if (diasRestantes <= 15) {
      barColor = 'bg-amber-500'
      textColor = 'text-amber-700'
    }

    // Progresso baseado em ciclo de 30 dias (ou dias restantes)
    const pct = Math.min(100, Math.max(5, (diasRestantes / 30) * 100))

    return (
      <div className="space-y-1.5">
        <div className="flex justify-between items-center text-sm font-medium">
          <span className={`flex items-center gap-1.5 font-semibold ${textColor}`}>
            <Clock className="w-4 h-4" /> {statusLabel}
          </span>
          <span className="text-xs text-muted-foreground">
            {licencaData?.data_expiracao
              ? new Date(licencaData.data_expiracao).toLocaleDateString('pt-BR')
              : ''}
          </span>
        </div>
        <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
          <div
            className={`h-full ${barColor} transition-all duration-500 rounded-full`}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
    )
  }

  // Limites do plano
  const maxUsuarios = isMasterPlan ? 0 : (plano?.max_moradores ?? 0)
  const maxUnits = isMasterPlan ? 0 : (plano?.max_units ?? 0)

  const usuarioPct = maxUsuarios > 0 ? Math.min(100, (totalUsuarios / maxUsuarios) * 100) : 0
  const unitPct = maxUnits > 0 ? Math.min(100, (totalUnidades / maxUnits) * 100) : 0

  return (
    <div className="space-y-6 pb-12 animate-fade-in max-w-6xl mx-auto">
      {/* Top Header da Tela */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 border-b pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-3xl font-bold tracking-tight">Licenças e Planos</h2>
            {isMasterPlan && (
              <Badge className="bg-indigo-600 text-white font-medium">VIP Master</Badge>
            )}
          </div>
          <p className="text-muted-foreground text-sm">
            Informações sobre o plano contratado, vigência, limites de capacidade e histórico de
            renovações.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={loadData}
            disabled={loading}
            className="gap-1.5"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>

          {!isMasterPlan && (
            <Button
              onClick={handleOpenPixRenovacao}
              className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2 shadow-sm font-semibold"
            >
              <QrCode className="w-4 h-4" />
              Renovar por 30 dias (PIX)
            </Button>
          )}

          <Button
            onClick={handleOpenTrocaPlano}
            variant={isMasterPlan ? 'default' : 'outline'}
            className={
              isMasterPlan
                ? 'bg-indigo-600 hover:bg-indigo-700 text-white gap-2 shadow-sm font-semibold'
                : 'gap-2 shadow-sm font-semibold border-indigo-200 text-indigo-700 hover:bg-indigo-50'
            }
          >
            <ArrowUpRight className="w-4 h-4" />
            Mudar de Plano
          </Button>
        </div>
      </div>

      {/* Destaque Principal: Dados do Plano e Licença */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Card 1: Licença & Status */}
        <Card className="lg:col-span-2 shadow-sm border">
          <CardHeader className="pb-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Número da Licença
                </span>
                <CardTitle className="text-2xl font-mono font-bold tracking-tight text-primary">
                  {licencaData?.licenca_id || '---'}
                </CardTitle>
              </div>
              <div className="flex items-center gap-2">{getStatusBadge(licencaData?.status)}</div>
            </div>
            <CardDescription className="text-xs pt-1">
              Condomínio:{' '}
              <span className="font-semibold text-foreground">
                {licencaData?.condo_name || user?.condo_id}
              </span>
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Barra de Expiração */}
            <div className="p-4 rounded-xl bg-slate-50/80 border space-y-2">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Vigência & Expiração
              </span>
              {getExpirationBar()}
            </div>

            {/* Dados do Plano Contratado */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl border bg-white space-y-1">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Plano Atual
                </span>
                <h4 className="text-xl font-bold text-foreground">
                  {plano?.nome || 'Plano Padrão'}
                </h4>
                <p className="text-xs text-muted-foreground line-clamp-2">
                  {plano?.descricao || 'Plano contratado para gerenciamento do condomínio.'}
                </p>
              </div>

              <div className="p-4 rounded-xl border bg-white space-y-1">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Valor da Assinatura
                </span>
                <div className="text-2xl font-bold text-indigo-600">
                  {plano?.preco_mensal === 0 ? (
                    'Isento (Master)'
                  ) : (
                    <>
                      R${' '}
                      {Number(plano?.preco_mensal || 0)
                        .toFixed(2)
                        .replace('.', ',')}
                      <span className="text-xs text-muted-foreground font-normal"> /mês</span>
                    </>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  Cobrança e renovação mensal recorrente
                </p>
              </div>
            </div>

            {/* Recursos incluídos */}
            <div className="space-y-2">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Recursos Incluídos
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                <div className="flex items-center gap-2 p-2 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-100">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Notificações via WhatsApp automáticas</span>
                </div>
                <div className="flex items-center gap-2 p-2 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-100">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Triagem e recebimentos na portaria</span>
                </div>
                <div className="flex items-center gap-2 p-2 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-100">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Liberação segura por QR Code / Token</span>
                </div>
                <div className="flex items-center gap-2 p-2 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-100">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Gestão completa de unidades e moradores</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Card 2: Uso Atual vs Limite do Plano */}
        <Card className="shadow-sm border flex flex-col justify-between">
          <div>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <Users className="w-5 h-5 text-indigo-600" />
                Uso Atual vs. Limite
              </CardTitle>
              <CardDescription className="text-xs">
                Capacidade utilizada pelo condomínio em relação ao plano contratado.
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-6">
              {/* Usuários */}
              <div className="space-y-2 p-4 rounded-xl border bg-slate-50/60">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-semibold flex items-center gap-1.5">
                    <Users className="w-4 h-4 text-muted-foreground" />
                    Usuários Cadastrados
                  </span>
                  <span className="font-mono font-bold text-foreground">
                    {maxUsuarios <= 0
                      ? `${totalUsuarios} / Ilimitado`
                      : `${totalUsuarios} / ${maxUsuarios}`}
                  </span>
                </div>
                {maxUsuarios <= 0 ? (
                  <div className="w-full h-2.5 bg-emerald-100 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 w-full" />
                  </div>
                ) : (
                  <Progress
                    value={usuarioPct}
                    className={`h-2.5 ${usuarioPct >= 100 ? '[&>div]:bg-rose-600' : usuarioPct >= 80 ? '[&>div]:bg-amber-500' : '[&>div]:bg-indigo-600'}`}
                  />
                )}
                <div className="flex justify-between items-center text-[11px] text-muted-foreground pt-1">
                  <span>
                    {maxUsuarios <= 0
                      ? 'Sem restrição de cadastros'
                      : `${Math.max(0, maxUsuarios - totalUsuarios)} vagas restantes`}
                  </span>
                  {maxUsuarios > 0 && <span>{usuarioPct.toFixed(0)}% ocupado</span>}
                </div>
              </div>

              {/* Unidades */}
              <div className="space-y-2 p-4 rounded-xl border bg-slate-50/60">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-semibold flex items-center gap-1.5">
                    <Building className="w-4 h-4 text-muted-foreground" />
                    Unidades / Apartamentos
                  </span>
                  <span className="font-mono font-bold text-foreground">
                    {maxUnits <= 0
                      ? `${totalUnidades} / Ilimitado`
                      : `${totalUnidades} / ${maxUnits}`}
                  </span>
                </div>
                {maxUnits <= 0 ? (
                  <div className="w-full h-2.5 bg-emerald-100 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 w-full" />
                  </div>
                ) : (
                  <Progress
                    value={unitPct}
                    className={`h-2.5 ${unitPct >= 100 ? '[&>div]:bg-rose-600' : unitPct >= 80 ? '[&>div]:bg-amber-500' : '[&>div]:bg-indigo-600'}`}
                  />
                )}
                <div className="flex justify-between items-center text-[11px] text-muted-foreground pt-1">
                  <span>
                    {maxUnits <= 0
                      ? 'Sem restrição de apartamentos'
                      : `${Math.max(0, maxUnits - totalUnidades)} apartamentos restantes`}
                  </span>
                  {maxUnits > 0 && <span>{unitPct.toFixed(0)}% ocupado</span>}
                </div>
              </div>

              {/* Dica Informativa */}
              <div className="p-3 bg-blue-50/80 border border-blue-100 rounded-lg flex items-start gap-2.5 text-xs text-blue-800">
                <Info className="w-4 h-4 shrink-0 mt-0.5 text-blue-600" />
                <p>
                  Precisa de mais capacidade para cadastrar novos usuários ou apartamentos? Você
                  pode mudar para um plano superior a qualquer momento.
                </p>
              </div>
            </CardContent>
          </div>

          <div className="p-4 pt-0 space-y-2">
            {!isMasterPlan && (
              <Button
                onClick={handleOpenPixRenovacao}
                className="w-full gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-sm"
              >
                <QrCode className="w-4 h-4" /> Renovar por 30 dias (PIX)
              </Button>
            )}

            <Button
              variant="outline"
              onClick={handleOpenTrocaPlano}
              className="w-full gap-2 border-indigo-200 text-indigo-700 hover:bg-indigo-50"
            >
              <ArrowUpRight className="w-4 h-4" /> Mudar de Plano
            </Button>
          </div>
        </Card>
      </div>

      {/* Tabela de Histórico de Renovações e Períodos */}
      <Card className="shadow-sm border">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-indigo-600" />
                Histórico de Renovações e Períodos
              </CardTitle>
              <CardDescription className="text-xs">
                Registros de vigência, reativações e alterações de planos contratados.
              </CardDescription>
            </div>
            <span className="text-xs text-muted-foreground">
              Total de registros: {historico.length}
            </span>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border overflow-hidden">
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead className="font-semibold text-xs">Licença</TableHead>
                  <TableHead className="font-semibold text-xs">Tipo de Evento</TableHead>
                  <TableHead className="font-semibold text-xs">Plano</TableHead>
                  <TableHead className="font-semibold text-xs">Período / Validade</TableHead>
                  <TableHead className="font-semibold text-xs">Descrição</TableHead>
                  <TableHead className="font-semibold text-xs">Data do Registro</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {historico.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="text-center h-24 text-muted-foreground text-sm"
                    >
                      Nenhum histórico registrado até o momento.
                    </TableCell>
                  </TableRow>
                ) : (
                  historico.map((item) => (
                    <TableRow key={item.id} className="text-xs">
                      <TableCell className="font-mono text-[11px] font-semibold text-primary">
                        {item.licenca_id || licencaData?.licenca_id || '---'}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={
                            item.tipo_evento === 'troca_plano'
                              ? 'bg-blue-50 text-blue-700 border-blue-200'
                              : item.tipo_evento === 'renovacao' ||
                                  item.tipo_evento === 'reativacao_30d'
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : 'bg-slate-50 text-slate-700'
                          }
                        >
                          {item.tipo_evento === 'troca_plano'
                            ? 'Troca de Plano'
                            : item.tipo_evento === 'renovacao'
                              ? 'Renovação'
                              : item.tipo_evento === 'reativacao_30d'
                                ? 'Reativação +30d'
                                : 'Início da Licença'}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-semibold">
                        {item.plano_nome || plano?.nome || 'Plano Padrão'}
                      </TableCell>
                      <TableCell>
                        {item.data_expiracao
                          ? new Date(item.data_expiracao).toLocaleDateString('pt-BR')
                          : isMasterPlan
                            ? 'Sem término'
                            : 'Indeterminado'}
                      </TableCell>
                      <TableCell className="text-muted-foreground max-w-xs truncate">
                        {item.descricao || 'Atualização da licença'}
                      </TableCell>
                      <TableCell className="text-muted-foreground whitespace-nowrap">
                        {new Date(item.created).toLocaleDateString('pt-BR', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* MODAL: MUDAR DE PLANO */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-indigo-600" />
              Mudar de Plano
            </DialogTitle>
            <DialogDescription>
              Selecione o plano desejado para o seu condomínio. O upgrade ou downgrade tem efeito
              imediato sobre a capacidade de novos usuários e unidades.
            </DialogDescription>
          </DialogHeader>

          {loadingPlanos ? (
            <div className="py-12 flex flex-col items-center justify-center gap-2 text-muted-foreground">
              <RefreshCw className="w-6 h-6 animate-spin text-indigo-600" />
              <span className="text-xs">Carregando planos disponíveis...</span>
            </div>
          ) : (
            <div className="space-y-4 py-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {planosDisponiveis.map((p) => {
                  const isCurrent = licencaData?.plano?.id === p.id
                  const isSelected = selectedPlanoId === p.id

                  return (
                    <div
                      key={p.id}
                      onClick={() => setSelectedPlanoId(p.id)}
                      className={`relative rounded-xl border-2 p-4 cursor-pointer transition-all ${
                        isSelected
                          ? 'border-indigo-600 bg-indigo-50/40 shadow-sm'
                          : 'border-slate-200 hover:border-slate-300 bg-white'
                      }`}
                    >
                      {isCurrent && (
                        <div className="absolute top-3 right-3">
                          <Badge className="bg-slate-700 text-white text-[10px]">Plano Atual</Badge>
                        </div>
                      )}

                      <div className="space-y-2">
                        <div className="pr-16">
                          <h4 className="font-bold text-base text-foreground">{p.nome}</h4>
                          <p className="text-xs text-muted-foreground line-clamp-2">
                            {p.descricao || 'Plano completo para o condomínio'}
                          </p>
                        </div>

                        <div className="pt-2">
                          <span className="text-2xl font-bold text-indigo-600">
                            R${' '}
                            {Number(p.preco_mensal || 0)
                              .toFixed(2)
                              .replace('.', ',')}
                          </span>
                          <span className="text-xs text-muted-foreground"> /mês</span>
                        </div>

                        <div className="pt-2 border-t space-y-1 text-xs">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Usuários:</span>
                            <span className="font-semibold text-foreground">
                              {p.max_moradores ? `Até ${p.max_moradores}` : 'Ilimitado'}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Unidades:</span>
                            <span className="font-semibold text-foreground">
                              {p.max_units ? `Até ${p.max_units}` : 'Ilimitado'}
                            </span>
                          </div>
                        </div>

                        <div className="pt-2 flex items-center justify-between">
                          <span className="text-xs font-medium text-indigo-600">
                            {isSelected ? '✓ Selecionado' : 'Clique para selecionar'}
                          </span>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>

              <div className="p-3 bg-slate-50 border rounded-lg text-xs text-muted-foreground flex items-center gap-2">
                <Info className="w-4 h-4 shrink-0 text-slate-500" />
                <span>
                  O número da sua licença e a data de expiração atual serão preservados na troca.
                </span>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsModalOpen(false)}
              disabled={savingTroca}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={handleConfirmTrocaPlano}
              disabled={savingTroca || !selectedPlanoId || loadingPlanos}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold"
            >
              {savingTroca ? 'Alterando plano...' : 'Confirmar Mudança'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL: PAGAMENTO DE RENOVAÇÃO EXCLUSIVO VIA PIX */}
      <Dialog open={isPixModalOpen} onOpenChange={setIsPixModalOpen}>
        <DialogContent className="sm:max-w-lg max-h-[92vh] overflow-y-auto">
          <DialogHeader className="text-center sm:text-left">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                <QrCode className="w-5 h-5" />
              </div>
              <DialogTitle className="text-xl font-bold">Renovação via PIX (30 dias)</DialogTitle>
            </div>
            <DialogDescription>
              Pagamento instantâneo via Mercado Pago. Sua licença é reativada automaticamente assim
              que o PIX for concluído.
            </DialogDescription>
          </DialogHeader>

          {gerandoPix ? (
            <div className="py-14 flex flex-col items-center justify-center gap-3 text-center">
              <Loader2 className="w-9 h-9 animate-spin text-emerald-600" />
              <div className="space-y-1">
                <p className="font-semibold text-slate-800 text-sm">
                  Gerando cobrança PIX no Mercado Pago...
                </p>
                <p className="text-xs text-muted-foreground">
                  Aguarde um instante enquanto conectamos ao gateway.
                </p>
              </div>
            </div>
          ) : pixStatus === 'approved' ? (
            /* TELA DE SUCESSO / APROVADO */
            <div className="py-6 space-y-6 text-center animate-fade-in">
              <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-sm">
                <CheckCircle className="w-10 h-10" />
              </div>

              <div className="space-y-1">
                <Badge className="bg-emerald-600 text-white px-3 py-1 text-xs">
                  Pagamento Aprovado
                </Badge>
                <h3 className="text-2xl font-bold text-slate-900 pt-2">
                  Licença Renovada com Sucesso!
                </h3>
                <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                  Seu pagamento PIX foi compensado pelo Mercado Pago e a vigência do condomínio foi
                  estendida por mais 30 dias.
                </p>
              </div>

              {/* Informações da Nova Licença */}
              <div className="p-4 rounded-xl border bg-emerald-50/60 border-emerald-200 text-left space-y-3">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-muted-foreground font-medium">Novo Número de Licença:</span>
                  <span className="font-mono font-bold text-emerald-800 text-sm">
                    {novaLicencaInfo?.licenca_id || pixData?.licenca_id || licencaData?.licenca_id}
                  </span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-muted-foreground font-medium">Nova Validade:</span>
                  <span className="font-bold text-emerald-800">
                    {novaLicencaInfo?.data_expiracao
                      ? new Date(novaLicencaInfo.data_expiracao).toLocaleDateString('pt-BR')
                      : 'Renovada por +30 dias'}
                  </span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-muted-foreground font-medium">Status do Sistema:</span>
                  <span className="font-semibold text-emerald-700 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Ativa e Liberada
                  </span>
                </div>
              </div>

              <Button
                onClick={() => setIsPixModalOpen(false)}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
              >
                Concluir e Voltar
              </Button>
            </div>
          ) : (
            /* TELA DE PAGAMENTO PENDENTE COM QR CODE E COPIA E COLA */
            <div className="space-y-5 py-2">
              {/* Badge de Status Pendente */}
              <div className="flex items-center justify-between p-3 rounded-lg bg-amber-50 border border-amber-200">
                <div className="flex items-center gap-2 text-xs font-semibold text-amber-800">
                  <Loader2 className="w-4 h-4 animate-spin text-amber-600" />
                  <span>Aguardando Pagamento do PIX...</span>
                </div>
                <Badge variant="outline" className="border-amber-400 text-amber-800 text-[11px]">
                  Pendente
                </Badge>
              </div>

              {/* Valor e Resumo do Plano */}
              <div className="flex items-center justify-between p-3 rounded-xl border bg-slate-50/80">
                <div>
                  <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold block">
                    Plano Selecionado
                  </span>
                  <span className="font-bold text-sm text-foreground">
                    {pixData?.plano_nome || licencaData?.plano?.nome || 'Plano Mensal'}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold block">
                    Valor a Pagar
                  </span>
                  <span className="text-xl font-black text-emerald-600">
                    R${' '}
                    {Number(pixData?.valor || licencaData?.plano?.preco_mensal || 0)
                      .toFixed(2)
                      .replace('.', ',')}
                  </span>
                </div>
              </div>

              {/* QR Code Renderizado */}
              <div className="flex flex-col items-center justify-center p-4 bg-white border rounded-xl shadow-xs space-y-2">
                {pixData?.qr_code_base64 ? (
                  <img
                    src={`data:image/png;base64,${pixData.qr_code_base64}`}
                    alt="QR Code PIX Mercado Pago"
                    className="w-48 h-48 object-contain rounded-md border border-slate-200 p-1 bg-white"
                  />
                ) : pixData?.qr_code ? (
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(
                      pixData.qr_code,
                    )}`}
                    alt="QR Code PIX Mercado Pago"
                    className="w-48 h-48 object-contain rounded-md border border-slate-200 p-1 bg-white"
                  />
                ) : (
                  <div className="w-48 h-48 bg-slate-100 flex items-center justify-center text-xs text-muted-foreground text-center p-3 rounded-md">
                    Chave PIX gerada abaixo.
                  </div>
                )}
                <span className="text-xs text-muted-foreground font-medium">
                  Abra o app do seu banco e escaneie o código acima
                </span>
              </div>

              {/* Chave PIX Copia e Cola */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground flex items-center justify-between">
                  <span>Código PIX Copia e Cola:</span>
                  {copiadoPix && (
                    <span className="text-emerald-600 font-bold text-xs flex items-center gap-1">
                      <Check className="w-3.5 h-3.5" /> Copiado!
                    </span>
                  )}
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={pixData?.qr_code || ''}
                    className="flex-1 text-xs font-mono bg-slate-50 border rounded-lg px-3 py-2 text-slate-700 select-all truncate focus:outline-none"
                  />
                  <Button
                    type="button"
                    onClick={handleCopyPix}
                    className={
                      copiadoPix
                        ? 'bg-emerald-600 hover:bg-emerald-700 text-white text-xs gap-1.5 shrink-0'
                        : 'bg-slate-900 hover:bg-slate-800 text-white text-xs gap-1.5 shrink-0'
                    }
                  >
                    {copiadoPix ? (
                      <Check className="w-3.5 h-3.5" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                    {copiadoPix ? 'Copiado!' : 'Copiar Código'}
                  </Button>
                </div>
              </div>

              {/* Instruções de Pagamento */}
              <div className="p-3 bg-blue-50/70 border border-blue-100 rounded-lg text-xs text-blue-900 space-y-1">
                <p className="font-semibold flex items-center gap-1.5">
                  <Info className="w-4 h-4 text-blue-600 shrink-0" />
                  Como concluir seu pagamento:
                </p>
                <ol className="list-decimal pl-5 space-y-0.5 text-blue-800 text-[11px]">
                  <li>Abra o app do seu banco ou internet banking.</li>
                  <li>
                    Escolha a opção <strong>Pagar via Pix com QR Code</strong> ou{' '}
                    <strong>Pix Copia e Cola</strong>.
                  </li>
                  <li>Cole o código copiado ou aponte a câmera para o QR Code.</li>
                  <li>
                    Confirme o pagamento. Esta página identificará a compensação automaticamente.
                  </li>
                </ol>
              </div>

              {/* Botões do Rodapé: Checar Novamente e Fechar */}
              <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-2 border-t">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleManualCheckPix}
                  disabled={verificandoPix}
                  className="w-full sm:w-auto text-xs gap-1.5"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${verificandoPix ? 'animate-spin' : ''}`} />
                  {verificandoPix ? 'Verificando...' : 'Verificar novamente'}
                </Button>

                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsPixModalOpen(false)}
                  className="w-full sm:w-auto text-xs text-muted-foreground"
                >
                  Fechar janela
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
