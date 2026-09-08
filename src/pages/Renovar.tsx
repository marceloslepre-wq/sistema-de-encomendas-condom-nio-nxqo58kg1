import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '@/hooks/use-auth'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import {
  AlertTriangle,
  Building2,
  Calendar,
  CreditCard,
  CheckCircle2,
  Clock,
  ExternalLink,
  Loader2,
  LogOut,
  RefreshCw,
  ShieldAlert,
  Sparkles,
} from 'lucide-react'
import { getLicencaStatus, iniciarRenovacao, LicencaStatusResponse } from '@/services/pagamentos'

export default function Renovar() {
  const { user, signOut, checkLicenseStatus } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { toast } = useToast()

  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [licencaInfo, setLicencaInfo] = useState<LicencaStatusResponse | null>(null)
  const [mercadoPagoNotConfigured, setMercadoPagoNotConfigured] = useState<string | null>(null)

  const paymentStatus = searchParams.get('status') // aprovado, pendente, falha

  const loadStatus = async () => {
    setLoading(true)
    try {
      const data = await getLicencaStatus()
      setLicencaInfo(data)
      if (!data.bloqueado && data.status === 'ativa') {
        // Se a licença já está ativa, pode voltar para a área inicial
        if (data.role === 'gestor') navigate('/gestor/dashboard')
        else if (data.role === 'master') navigate('/master')
        else if (data.role === 'portaria' || data.role === 'porteiro')
          navigate('/portaria/registro')
        else if (data.role === 'triagem') navigate('/sala/triagem')
        else if (data.role === 'morador') navigate('/morador/dashboard')
      }
    } catch (err: any) {
      console.error('Erro ao verificar licença:', err)
      toast({
        variant: 'destructive',
        title: 'Erro ao verificar licença',
        description: err.message || 'Não foi possível consultar os dados da assinatura.',
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadStatus()
  }, [])

  useEffect(() => {
    if (paymentStatus === 'aprovado') {
      toast({
        title: 'Pagamento recebido com sucesso!',
        description: 'Sua licença foi renovada por mais 30 dias. Atualizando acesso...',
      })
      setTimeout(() => {
        checkLicenseStatus().then(() => {
          loadStatus()
        })
      }, 2000)
    } else if (paymentStatus === 'pendente') {
      toast({
        title: 'Pagamento pendente / em análise',
        description:
          'Assim que o Mercado Pago confirmar a compensação via Pix ou Cartão, sua licença será ativada automaticamente.',
      })
    } else if (paymentStatus === 'falha') {
      toast({
        variant: 'destructive',
        title: 'Pagamento não concluído',
        description: 'Houve uma falha ao processar o pagamento no Mercado Pago. Tente novamente.',
      })
    }
  }, [paymentStatus])

  const handleRenovar = async () => {
    setSubmitting(true)
    setMercadoPagoNotConfigured(null)
    try {
      const res = await iniciarRenovacao()
      if (!res.configured) {
        setMercadoPagoNotConfigured(
          res.message ||
            'Gateway Mercado Pago em fase de configuração. Entre em contato com a administração master.',
        )
        return
      }

      if (res.init_point) {
        // Redirecionar para o Checkout Pro do Mercado Pago
        window.location.href = res.init_point
      } else {
        toast({
          variant: 'destructive',
          title: 'Erro ao gerar pagamento',
          description: 'Link do Mercado Pago não retornado.',
        })
      }
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Falha na renovação',
        description: err.message || 'Erro ao comunicar com o servidor de pagamento.',
      })
    } finally {
      setSubmitting(false)
    }
  }

  const formatCurrency = (val?: number) => {
    if (val === undefined || val === null) return 'R$ 0,00'
    return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
  }

  const formatExpirationDate = (isoString?: string | null) => {
    if (!isoString) return 'Expirada'
    try {
      const date = new Date(isoString)
      return date.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      })
    } catch {
      return isoString
    }
  }

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans">
      {/* Top Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-20 shadow-xs">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold shadow-sm">
              <Building2 className="w-5 h-5" />
            </div>
            <div className="leading-tight">
              <span className="font-bold text-lg text-slate-900 tracking-tight">CondoPack</span>
              <span className="text-xs text-blue-600 font-semibold block">
                Renovação de Assinatura
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-500 hidden sm:inline">{user?.email}</span>
            <Button
              variant="outline"
              size="sm"
              onClick={signOut}
              className="text-slate-700 hover:text-slate-900 border-slate-300 gap-1.5"
            >
              <LogOut className="w-4 h-4" />
              Sair
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-3xl mx-auto w-full px-4 sm:px-6 py-10 flex items-center justify-center">
        {loading ? (
          <div className="flex flex-col items-center justify-center p-12 text-slate-500">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600 mb-3" />
            <p className="text-sm">Consultando situação da licença do condomínio...</p>
          </div>
        ) : (
          <div className="w-full space-y-6">
            {/* Header da Notificação de Expiração */}
            <div className="text-center space-y-2">
              <div className="w-16 h-16 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center mx-auto shadow-sm">
                <AlertTriangle className="w-9 h-9" />
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                Sua Licença Expirou
              </h1>
              <p className="text-slate-600 text-sm sm:text-base max-w-lg mx-auto">
                O período de teste grátis ou a vigência da assinatura do condomínio{' '}
                <strong className="text-slate-800">
                  {licencaInfo?.condo_name || 'cadastrado'}
                </strong>{' '}
                chegou ao fim.
              </p>
            </div>

            {/* Card com Detalhes do Plano e Cobrança */}
            <Card className="border border-slate-200 shadow-md bg-white overflow-hidden">
              <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white p-6">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                  <div>
                    <span className="text-xs uppercase tracking-wider font-semibold text-slate-300">
                      Plano Contratado
                    </span>
                    <h3 className="text-2xl font-black text-white">
                      {licencaInfo?.plano?.nome || 'Plano CondoPack'}
                    </h3>
                    <p className="text-xs text-slate-300 mt-0.5">
                      {licencaInfo?.plano?.descricao ||
                        'Acesso completo a encomendas, notificações WhatsApp e gestão.'}
                    </p>
                  </div>
                  <Badge
                    variant="destructive"
                    className="bg-rose-500/90 text-white gap-1 px-2.5 py-1 text-xs"
                  >
                    <Clock className="w-3.5 h-3.5" /> Expirada em{' '}
                    {formatExpirationDate(licencaInfo?.data_expiracao)}
                  </Badge>
                </div>
              </div>

              <CardContent className="p-6 space-y-6">
                {/* Oferta do Próximo Período: 30 dias */}
                <div className="bg-blue-50/70 border border-blue-200 rounded-xl p-5 space-y-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1">
                      <span className="text-xs font-bold uppercase tracking-wider text-blue-700">
                        Próximo Período Ofertado
                      </span>
                      <h4 className="text-lg font-bold text-slate-900">Renovação por 30 Dias</h4>
                      <p className="text-xs text-slate-600 leading-relaxed">
                        Ao efetuar a renovação, sua licença será reativada imediatamente por mais{' '}
                        <strong>30 dias corridos</strong> a contar da confirmação do pagamento.
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-2xl font-black text-blue-700 block">
                        {formatCurrency(licencaInfo?.plano?.preco_mensal)}
                      </span>
                      <span className="text-xs text-slate-500 font-medium">por 30 dias</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-xs text-slate-700 border-t border-blue-200/80">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>Liberação automática via Pix ou Cartão</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>Todos os dados e encomendas preservados</span>
                    </div>
                  </div>
                </div>

                {/* Aviso quando o Mercado Pago não estiver configurado */}
                {mercadoPagoNotConfigured && (
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-xs text-amber-800 space-y-2">
                    <div className="flex items-center gap-2 font-semibold">
                      <ShieldAlert className="w-4 h-4 text-amber-600" />
                      <span>Pagamento Online em Configuração</span>
                    </div>
                    <p>{mercadoPagoNotConfigured}</p>
                    <p className="text-slate-600">
                      O administrador master da plataforma também pode reativar manualmente a sua
                      licença pelo painel master.
                    </p>
                  </div>
                )}

                {/* Botões de Ação */}
                <div className="space-y-3 pt-2">
                  <Button
                    onClick={handleRenovar}
                    disabled={submitting}
                    className="w-full h-12 text-base font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-md gap-2"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="w-5 h-5 mr-1.5 animate-spin" />
                        <span>Gerando pagamento no Mercado Pago...</span>
                      </>
                    ) : (
                      <>
                        <CreditCard className="w-5 h-5" />
                        <span>
                          Renovar por 30 dias ({formatCurrency(licencaInfo?.plano?.preco_mensal)})
                        </span>
                        <ExternalLink className="w-4 h-4 ml-1 opacity-75" />
                      </>
                    )}
                  </Button>

                  <div className="flex items-center justify-between pt-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={loadStatus}
                      className="text-xs text-slate-600 hover:text-slate-900 gap-1.5"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      Já paguei, verificar ativação
                    </Button>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigate('/')}
                      className="text-xs text-slate-600 border-slate-300"
                    >
                      Voltar ao Login
                    </Button>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100 flex items-center justify-center gap-2 text-xs text-slate-400">
                  <Sparkles className="w-4 h-4 text-blue-500" />
                  <span>Gateway Seguro integrado via Mercado Pago Checkout Pro</span>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 mt-auto py-5">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
          <div>© {new Date().getFullYear()} Sholver Soluções / CondoPack.</div>
          <div>Em caso de dúvidas sobre pagamentos, contate seu suporte técnico.</div>
        </div>
      </footer>
    </div>
  )
}
