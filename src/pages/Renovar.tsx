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
import { QrCode, Copy, Check, CheckCircle, Info } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  getLicencaStatus,
  iniciarRenovacao,
  criarPixRenovacao,
  consultarPixStatus,
  LicencaStatusResponse,
  CriarPixResponse,
} from '@/services/pagamentos'

export default function Renovar() {
  const { user, signOut, checkLicenseStatus } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { toast } = useToast()

  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [licencaInfo, setLicencaInfo] = useState<LicencaStatusResponse | null>(null)
  const [mercadoPagoNotConfigured, setMercadoPagoNotConfigured] = useState<string | null>(null)

  // Estado do Modal PIX
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

  // Abertura do modal de pagamento via PIX (exclusivo dentro do sistema)
  const handleRenovarPix = async () => {
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
            'O Mercado Pago está em fase de configuração. Contate a administração master.',
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

  // Polling automático no modal PIX
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
          // Atualiza status e redireciona
          await checkLicenseStatus()
          await loadStatus()
        }
      } catch (e) {
        // Silencioso no polling
      }
    }, 5000)

    return () => clearInterval(interval)
  }, [isPixModalOpen, pixData?.payment_id, pixStatus])

  // Verificação manual redundante
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
        await checkLicenseStatus()
        await loadStatus()
      } else {
        toast({
          title: 'Pagamento ainda não identificado',
          description: 'Aguardando compensação do PIX pelo Mercado Pago.',
        })
      }
    } catch (err: any) {
      toast({
        title: 'Erro na verificação',
        description: err.message || 'Não foi possível consultar agora.',
        variant: 'destructive',
      })
    } finally {
      setVerificandoPix(false)
    }
  }

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
                      <span>Liberação automática instantânea via PIX</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>Todos os dados e encomendas preservados</span>
                    </div>
                  </div>
                </div>

                {/* Botões de Ação */}
                <div className="space-y-3 pt-2">
                  <Button
                    onClick={handleRenovarPix}
                    disabled={submitting}
                    className="w-full h-12 text-base font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-md gap-2"
                  >
                    <QrCode className="w-5 h-5" />
                    <span>
                      Pagar com PIX — 30 dias ({formatCurrency(licencaInfo?.plano?.preco_mensal)})
                    </span>
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

      {/* MODAL PIX DE RENOVAÇÃO NA TELA PÚBLICA /RENOVAR */}
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

              <div className="p-4 rounded-xl border bg-emerald-50/60 border-emerald-200 text-left space-y-3">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-muted-foreground font-medium">Novo Número de Licença:</span>
                  <span className="font-mono font-bold text-emerald-800 text-sm">
                    {novaLicencaInfo?.licenca_id || pixData?.licenca_id || licencaInfo?.licenca_id}
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
                onClick={() => {
                  setIsPixModalOpen(false)
                  loadStatus()
                }}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
              >
                Acessar o Sistema
              </Button>
            </div>
          ) : (
            <div className="space-y-5 py-2">
              <div className="flex items-center justify-between p-3 rounded-lg bg-amber-50 border border-amber-200">
                <div className="flex items-center gap-2 text-xs font-semibold text-amber-800">
                  <Loader2 className="w-4 h-4 animate-spin text-amber-600" />
                  <span>Aguardando Pagamento do PIX...</span>
                </div>
                <Badge variant="outline" className="border-amber-400 text-amber-800 text-[11px]">
                  Pendente
                </Badge>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl border bg-slate-50/80">
                <div>
                  <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold block">
                    Plano Selecionado
                  </span>
                  <span className="font-bold text-sm text-foreground">
                    {pixData?.plano_nome || licencaInfo?.plano?.nome || 'Plano Mensal'}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold block">
                    Valor a Pagar
                  </span>
                  <span className="text-xl font-black text-emerald-600">
                    R${' '}
                    {Number(pixData?.valor || licencaInfo?.plano?.preco_mensal || 0)
                      .toFixed(2)
                      .replace('.', ',')}
                  </span>
                </div>
              </div>

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
