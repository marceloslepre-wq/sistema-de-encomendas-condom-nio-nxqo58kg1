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
import { getLicencaStatus, LicencaStatusResponse } from '@/services/pagamentos'
import {
  Plano,
  HistoricoLicenca,
  getPlanosDisponiveisCliente,
  getHistoricoLicencas,
  trocarPlanoGestor,
} from '@/services/master'
import { getMoradores, getUnits } from '@/services/api'
import pb from '@/lib/pocketbase/client'

export default function GestorLicencas() {
  const { user } = useAuth()
  const { toast } = useToast()

  const [loading, setLoading] = useState(true)
  const [licencaData, setLicencaData] = useState<LicencaStatusResponse | null>(null)
  const [totalMoradores, setTotalMoradores] = useState(0)
  const [totalUnidades, setTotalUnidades] = useState(0)
  const [historico, setHistorico] = useState<HistoricoLicenca[]>([])

  // Modal de Mudança de Plano
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [planosDisponiveis, setPlanosDisponiveis] = useState<Plano[]>([])
  const [loadingPlanos, setLoadingPlanos] = useState(false)
  const [selectedPlanoId, setSelectedPlanoId] = useState<string | null>(null)
  const [savingTroca, setSavingTroca] = useState(false)

  const loadData = async () => {
    setLoading(true)
    try {
      const statusRes = await getLicencaStatus()
      setLicencaData(statusRes)

      const condoId = user?.condo_id || statusRes.condo_id

      const [moradoresList, unitsList, histList] = await Promise.all([
        getMoradores(),
        getUnits(),
        getHistoricoLicencas(condoId),
      ])

      setTotalMoradores(moradoresList.length)
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
  const maxMoradores = isMasterPlan ? 0 : (plano?.max_moradores ?? 0)
  const maxUnits = isMasterPlan ? 0 : (plano?.max_units ?? 0)

  const moradorPct = maxMoradores > 0 ? Math.min(100, (totalMoradores / maxMoradores) * 100) : 0
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

          <Button
            onClick={handleOpenTrocaPlano}
            className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2 shadow-sm font-semibold"
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
              {/* Moradores */}
              <div className="space-y-2 p-4 rounded-xl border bg-slate-50/60">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-semibold flex items-center gap-1.5">
                    <Users className="w-4 h-4 text-muted-foreground" />
                    Moradores Cadastrados
                  </span>
                  <span className="font-mono font-bold text-foreground">
                    {maxMoradores <= 0
                      ? `${totalMoradores} / Ilimitado`
                      : `${totalMoradores} / ${maxMoradores}`}
                  </span>
                </div>
                {maxMoradores <= 0 ? (
                  <div className="w-full h-2.5 bg-emerald-100 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 w-full" />
                  </div>
                ) : (
                  <Progress
                    value={moradorPct}
                    className={`h-2.5 ${moradorPct >= 100 ? '[&>div]:bg-rose-600' : moradorPct >= 80 ? '[&>div]:bg-amber-500' : '[&>div]:bg-indigo-600'}`}
                  />
                )}
                <div className="flex justify-between items-center text-[11px] text-muted-foreground pt-1">
                  <span>
                    {maxMoradores <= 0
                      ? 'Sem restrição de cadastros'
                      : `${Math.max(0, maxMoradores - totalMoradores)} vagas restantes`}
                  </span>
                  {maxMoradores > 0 && <span>{moradorPct.toFixed(0)}% ocupado</span>}
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
                  Precisa de mais capacidade para cadastrar novos moradores ou apartamentos? Você
                  pode mudar para um plano superior a qualquer momento.
                </p>
              </div>
            </CardContent>
          </div>

          <div className="p-4 pt-0">
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
              imediato sobre a capacidade de novos moradores e unidades.
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
                            <span className="text-muted-foreground">Moradores:</span>
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
    </div>
  )
}
