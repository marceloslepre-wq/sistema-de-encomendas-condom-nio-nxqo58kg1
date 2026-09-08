import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import {
  Check,
  CheckCircle2,
  Copy,
  ArrowRight,
  Loader2,
  Building2,
  ShieldCheck,
  Sparkles,
  Calendar,
  KeyRound,
  Mail,
} from 'lucide-react'
import {
  getPublicPlans,
  submitOnboarding,
  PublicPlan,
  OnboardingResult,
} from '@/services/onboarding'

export default function Cadastro() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { toast } = useToast()

  const [plans, setPlans] = useState<PublicPlan[]>([])
  const [selectedPlanId, setSelectedPlanId] = useState<string>('')
  const [loadingPlans, setLoadingPlans] = useState(true)

  // Form states
  const [razaoSocial, setRazaoSocial] = useState('')
  const [cnpj, setCnpj] = useState('')
  const [email, setEmail] = useState('')
  const [cidade, setCidade] = useState('')
  const [estado, setEstado] = useState('')
  const [responsavel, setResponsavel] = useState('')
  const [phone, setPhone] = useState('')

  const [submitting, setSubmitting] = useState(false)
  const [copiedPassword, setCopiedPassword] = useState(false)
  const [onboardingResult, setOnboardingResult] = useState<OnboardingResult | null>(null)

  // Mascaras
  const maskCNPJ = (value: string) => {
    return value
      .replace(/\D/g, '')
      .replace(/^(\d{2})(\d)/, '$1.$2')
      .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
      .replace(/\.(\d{3})(\d)/, '.$1/$2')
      .replace(/(\d{4})(\d)/, '$1-$2')
      .substring(0, 18)
  }

  const maskPhone = (value: string) => {
    return value
      .replace(/\D/g, '')
      .replace(/^(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{5})(\d{4})$/, '$1-$2')
      .substring(0, 15)
  }

  // Carregar planos ativos
  useEffect(() => {
    const loadPlans = async () => {
      setLoadingPlans(true)
      try {
        const fetchedPlans = await getPublicPlans()
        setPlans(fetchedPlans)

        // Verificar pré-seleção por query param (?plano=...)
        const paramPlano = searchParams.get('plano')
        if (paramPlano) {
          const matched = fetchedPlans.find(
            (p) =>
              p.id === paramPlano ||
              p.nome.toLowerCase() === paramPlano.toLowerCase() ||
              p.nome.toLowerCase().includes(paramPlano.toLowerCase()),
          )
          if (matched) {
            setSelectedPlanId(matched.id)
            return
          }
        }

        // Padrão: primeiro plano disponível
        if (fetchedPlans.length > 0) {
          setSelectedPlanId(fetchedPlans[0].id)
        }
      } catch (err) {
        console.error('Erro ao carregar planos:', err)
      } finally {
        setLoadingPlans(false)
      }
    }

    loadPlans()
  }, [searchParams])

  const selectedPlan = plans.find((p) => p.id === selectedPlanId)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!razaoSocial.trim()) {
      toast({
        variant: 'destructive',
        title: 'Campo obrigatório',
        description: 'Informe a Razão Social da empresa ou condomínio.',
      })
      return
    }

    if (!cnpj.trim()) {
      toast({
        variant: 'destructive',
        title: 'Campo obrigatório',
        description: 'Informe o CNPJ.',
      })
      return
    }

    if (!email.trim() || !email.includes('@')) {
      toast({
        variant: 'destructive',
        title: 'E-mail inválido',
        description: 'Informe um e-mail corporativo válido.',
      })
      return
    }

    if (!cidade.trim() || !estado.trim()) {
      toast({
        variant: 'destructive',
        title: 'Campos obrigatórios',
        description: 'Informe a Cidade e o Estado.',
      })
      return
    }

    setSubmitting(true)

    try {
      const res = await submitOnboarding({
        razaoSocial,
        cnpj,
        email,
        cidade,
        estado: estado.toUpperCase(),
        responsavel: responsavel.trim() || undefined,
        phone: phone.trim() || undefined,
        planoId: selectedPlanId || undefined,
      })

      setOnboardingResult(res)
      toast({
        title: 'Conta criada com sucesso!',
        description: 'Seu período de teste grátis de 15 dias está ativo.',
      })
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao solicitar teste',
        description: error.message || 'Ocorreu um erro ao processar seu cadastro. Tente novamente.',
      })
    } finally {
      setSubmitting(false)
    }
  }

  const handleCopyPassword = () => {
    if (onboardingResult?.gestor.senha_provisoria) {
      navigator.clipboard.writeText(onboardingResult.gestor.senha_provisoria)
      setCopiedPassword(true)
      toast({
        title: 'Senha copiada!',
        description: 'A senha provisória foi copiada para a área de transferência.',
      })
      setTimeout(() => setCopiedPassword(false), 3000)
    }
  }

  const formatCurrency = (val?: number) => {
    if (val === undefined || val === null) return 'R$ 0,00'
    return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
  }

  const formatExpirationDate = (isoString?: string) => {
    if (!isoString) return ''
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
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* Header público do Onboarding */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold shadow-sm">
              <Building2 className="w-5 h-5" />
            </div>
            <div className="leading-tight">
              <span className="font-bold text-lg text-slate-900 tracking-tight">CondoPack</span>
              <span className="text-xs text-blue-600 font-semibold block">Multi-tenant Cloud</span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <span className="text-sm text-slate-500 hidden sm:inline">Já é cliente?</span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/')}
              className="text-slate-700 hover:text-slate-900 border-slate-300"
            >
              Fazer Login
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-6xl mx-auto w-full px-4 sm:px-6 py-8 sm:py-12">
        {onboardingResult ? (
          /* TELA DE SUCESSO / CONFIRMAÇÃO COM SENHA PROVISÓRIA */
          <div className="max-w-2xl mx-auto space-y-6 animate-in fade-in-50 duration-500">
            <div className="text-center space-y-3">
              <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-sm">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <h1 className="text-3xl font-bold text-slate-900">
                Teste Grátis Ativado com Sucesso!
              </h1>
              <p className="text-slate-600 max-w-lg mx-auto">
                Seu condomínio foi provisionado e sua licença de avaliação de{' '}
                <span className="font-semibold text-slate-800">15 dias</span> já está pronta para
                uso.
              </p>
            </div>

            <Card className="border border-slate-200 shadow-md overflow-hidden bg-white">
              <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-6">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                  <div>
                    <span className="text-xs uppercase tracking-wider font-semibold text-blue-100">
                      Condomínio Cadastrado
                    </span>
                    <h3 className="text-xl font-bold">{onboardingResult.condo.name}</h3>
                    <p className="text-sm text-blue-100">
                      CNPJ: {onboardingResult.condo.cnpj} • {onboardingResult.condo.cidade}/
                      {onboardingResult.condo.estado}
                    </p>
                  </div>
                  <div className="bg-white/10 backdrop-blur-sm rounded-lg px-3 py-1.5 border border-white/20 text-right">
                    <span className="text-xs text-blue-100 block">Plano Selecionado</span>
                    <span className="font-semibold text-sm">{onboardingResult.plano.nome}</span>
                  </div>
                </div>
              </div>

              <CardContent className="p-6 space-y-6">
                {/* Alerta de Senha Provisória */}
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 space-y-3">
                  <div className="flex items-center gap-2 text-amber-800 font-semibold">
                    <KeyRound className="w-5 h-5 text-amber-600" />
                    <span>Credenciais de Primeiro Acesso (Gestor)</span>
                  </div>
                  <p className="text-xs text-amber-700 leading-relaxed">
                    Guarde ou copie sua senha provisória abaixo para realizar seu primeiro login.
                    Você poderá alterá-la para uma senha pessoal quando quiser na plataforma.
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <div className="bg-white p-3 rounded-lg border border-amber-200">
                      <span className="text-xs text-slate-500 flex items-center gap-1 font-medium">
                        <Mail className="w-3.5 h-3.5 text-slate-400" /> E-mail de Login:
                      </span>
                      <p className="text-sm font-semibold text-slate-800 truncate select-all">
                        {onboardingResult.gestor.email}
                      </p>
                    </div>

                    <div className="bg-white p-3 rounded-lg border border-amber-300 relative flex items-center justify-between">
                      <div>
                        <span className="text-xs text-amber-800 font-semibold block">
                          Senha Provisória:
                        </span>
                        <code className="text-base font-bold text-slate-900 tracking-wider">
                          {onboardingResult.gestor.senha_provisoria}
                        </code>
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        onClick={handleCopyPassword}
                        className="h-8 gap-1.5 text-xs bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300"
                      >
                        {copiedPassword ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Copiado!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>Copiar</span>
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Detalhes do Período de Testes */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm text-slate-600">
                  <div className="flex items-start gap-3 p-3 rounded-lg bg-slate-50 border border-slate-200">
                    <Calendar className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-semibold text-slate-800 block">Validade do Trial</span>
                      <span>
                        Ativo até{' '}
                        <strong>
                          {formatExpirationDate(onboardingResult.licenca.data_expiracao)}
                        </strong>{' '}
                        (15 dias)
                      </span>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 rounded-lg bg-slate-50 border border-slate-200">
                    <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-semibold text-slate-800 block">
                        Isolamento Garantido
                      </span>
                      <span>Ambiente privativo e dedicado para o seu condomínio.</span>
                    </div>
                  </div>
                </div>

                {/* Botão de Ação */}
                <div className="pt-2">
                  <Button
                    onClick={() => navigate('/')}
                    className="w-full h-12 text-base font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-md gap-2"
                  >
                    <span>Ir para o Login</span>
                    <ArrowRight className="w-5 h-5" />
                  </Button>
                  <p className="text-center text-xs text-slate-400 mt-2">
                    Utilize o e-mail cadastrado e a senha provisória acima na tela de login.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        ) : (
          /* FORMULÁRIO DE ONBOARDING COM ESTILO SHOLVER SOLUÇÕES */
          <div className="space-y-8">
            <div className="space-y-2">
              <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
                Solicite seu Teste Grátis
              </h1>
              <p className="text-base sm:text-lg text-slate-600">
                Avalie nossa solução por 15 dias sem compromisso.
              </p>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                {/* Coluna Esquerda: Passos 1 e 2 (8 colunas) */}
                <div className="lg:col-span-7 space-y-8">
                  {/* PASSO 1: Selecione o Plano */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-600 font-bold text-sm flex items-center justify-center">
                        1
                      </div>
                      <h2 className="text-xl font-bold text-slate-800">Selecione o Plano</h2>
                    </div>

                    {loadingPlans ? (
                      <div className="p-8 flex items-center justify-center bg-white rounded-xl border border-slate-200">
                        <Loader2 className="w-6 h-6 animate-spin text-blue-600 mr-2" />
                        <span className="text-sm text-slate-600">
                          Carregando planos disponíveis...
                        </span>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {plans.map((plano) => {
                          const isSelected = selectedPlanId === plano.id
                          return (
                            <div
                              key={plano.id}
                              onClick={() => setSelectedPlanId(plano.id)}
                              className={`cursor-pointer rounded-xl p-5 border-2 transition-all relative flex flex-col justify-between ${
                                isSelected
                                  ? 'border-blue-600 bg-blue-50/40 shadow-sm ring-1 ring-blue-600'
                                  : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-xs'
                              }`}
                            >
                              <div className="space-y-3">
                                <div className="flex items-start justify-between">
                                  <span className="text-xs font-semibold text-blue-600 tracking-wider uppercase">
                                    CondoPack
                                  </span>
                                  {isSelected && (
                                    <div className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center">
                                      <Check className="w-3.5 h-3.5" />
                                    </div>
                                  )}
                                </div>

                                <div>
                                  <h3 className="text-lg font-bold text-slate-900">{plano.nome}</h3>
                                  {plano.descricao && (
                                    <p className="text-xs text-slate-500 line-clamp-2 mt-1">
                                      {plano.descricao}
                                    </p>
                                  )}
                                </div>

                                <div className="pt-2">
                                  <div className="flex items-baseline gap-1">
                                    <span className="text-2xl font-black text-slate-900">
                                      {formatCurrency(plano.preco_mensal)}
                                    </span>
                                    <span className="text-xs text-slate-500 font-medium">
                                      / mês
                                    </span>
                                  </div>
                                  <span className="text-[11px] text-slate-500 block mt-0.5">
                                    {plano.max_units
                                      ? `Até ${plano.max_units} unidades`
                                      : 'Unidades ilimitadas'}
                                  </span>
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>

                  {/* PASSO 2: Dados da Empresa / Condomínio */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-600 font-bold text-sm flex items-center justify-center">
                        2
                      </div>
                      <h2 className="text-xl font-bold text-slate-800">
                        Dados da Empresa / Condomínio
                      </h2>
                    </div>

                    <Card className="border border-slate-200 shadow-sm bg-white">
                      <CardContent className="p-6 space-y-4">
                        <div className="space-y-2">
                          <Label
                            htmlFor="razaoSocial"
                            className="text-slate-700 font-medium text-sm"
                          >
                            Razão Social / Nome do Condomínio{' '}
                            <span className="text-rose-500">*</span>
                          </Label>
                          <Input
                            id="razaoSocial"
                            placeholder="Sua Empresa LTDA ou Condomínio Residencial"
                            value={razaoSocial}
                            onChange={(e) => setRazaoSocial(e.target.value)}
                            required
                            className="h-11 bg-slate-50/50 border-slate-300 focus:bg-white"
                          />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="cnpj" className="text-slate-700 font-medium text-sm">
                              CNPJ <span className="text-rose-500">*</span>
                            </Label>
                            <Input
                              id="cnpj"
                              placeholder="00.000.000/0000-00"
                              value={cnpj}
                              onChange={(e) => setCnpj(maskCNPJ(e.target.value))}
                              maxLength={18}
                              required
                              className="h-11 bg-slate-50/50 border-slate-300 focus:bg-white"
                            />
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="email" className="text-slate-700 font-medium text-sm">
                              Email Corporativo <span className="text-rose-500">*</span>
                            </Label>
                            <Input
                              id="email"
                              type="email"
                              placeholder="contato@empresa.com"
                              value={email}
                              onChange={(e) => setEmail(e.target.value)}
                              required
                              className="h-11 bg-slate-50/50 border-slate-300 focus:bg-white"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="cidade" className="text-slate-700 font-medium text-sm">
                              Cidade <span className="text-rose-500">*</span>
                            </Label>
                            <Input
                              id="cidade"
                              placeholder="Ex: São Paulo"
                              value={cidade}
                              onChange={(e) => setCidade(e.target.value)}
                              required
                              className="h-11 bg-slate-50/50 border-slate-300 focus:bg-white"
                            />
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="estado" className="text-slate-700 font-medium text-sm">
                              Estado <span className="text-rose-500">*</span>
                            </Label>
                            <Input
                              id="estado"
                              placeholder="Ex: SP"
                              value={estado}
                              onChange={(e) => setEstado(e.target.value.toUpperCase())}
                              maxLength={2}
                              required
                              className="h-11 bg-slate-50/50 border-slate-300 focus:bg-white uppercase"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                          <div className="space-y-2">
                            <Label
                              htmlFor="responsavel"
                              className="text-slate-700 font-medium text-sm"
                            >
                              Nome do Responsável / Gestor (Opcional)
                            </Label>
                            <Input
                              id="responsavel"
                              placeholder="Ex: Marcelo Silva"
                              value={responsavel}
                              onChange={(e) => setResponsavel(e.target.value)}
                              className="h-11 bg-slate-50/50 border-slate-300 focus:bg-white"
                            />
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="phone" className="text-slate-700 font-medium text-sm">
                              Telefone / WhatsApp (Opcional)
                            </Label>
                            <Input
                              id="phone"
                              placeholder="(00) 00000-0000"
                              value={phone}
                              onChange={(e) => setPhone(maskPhone(e.target.value))}
                              maxLength={15}
                              className="h-11 bg-slate-50/50 border-slate-300 focus:bg-white"
                            />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>

                {/* Coluna Direita: Resumo do Pedido (5 colunas) */}
                <div className="lg:col-span-5 lg:sticky lg:top-24">
                  <Card className="border border-slate-200 shadow-md bg-white overflow-hidden">
                    <div className="p-5 border-b border-slate-100 flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                        <Sparkles className="w-4 h-4" />
                      </div>
                      <h3 className="font-bold text-slate-800 text-lg">Resumo do Pedido</h3>
                    </div>

                    <CardContent className="p-6 space-y-6">
                      <div className="space-y-4">
                        <div className="flex justify-between items-start pb-4 border-b border-slate-100">
                          <div>
                            <span className="text-xs uppercase text-slate-400 font-bold block">
                              Solução
                            </span>
                            <span className="font-semibold text-slate-800">
                              CondoPack Gestão Digital
                            </span>
                            <span className="text-xs text-slate-500 block mt-0.5">
                              Plano: {selectedPlan ? selectedPlan.nome : 'Nenhum selecionado'}
                            </span>
                          </div>
                          <div className="text-right">
                            <span className="font-bold text-slate-900 block">
                              {formatCurrency(selectedPlan?.preco_mensal)}
                            </span>
                            <span className="text-[11px] text-slate-400">base mensal</span>
                          </div>
                        </div>

                        <div className="flex justify-between items-center pb-4 border-b border-slate-100">
                          <div>
                            <span className="font-medium text-slate-700 text-sm">
                              Período de Testes
                            </span>
                            <span className="text-xs text-emerald-600 font-semibold block">
                              15 Dias Grátis
                            </span>
                          </div>
                          <span className="font-bold text-emerald-600 text-sm">R$ 0,00</span>
                        </div>

                        <div className="flex justify-between items-baseline pt-2">
                          <div>
                            <span className="text-base font-black text-slate-900 uppercase tracking-tight block">
                              Total Hoje
                            </span>
                            <span className="text-xs text-slate-500">Sem cobrança imediata</span>
                          </div>
                          <span className="text-2xl font-black text-blue-600">
                            {formatCurrency(0)}
                          </span>
                        </div>
                      </div>

                      <div className="space-y-3 pt-2">
                        <Button
                          type="submit"
                          disabled={submitting}
                          className="w-full h-12 text-base font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-md transition-all"
                        >
                          {submitting ? (
                            <>
                              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                              <span>Configurando seu condomínio...</span>
                            </>
                          ) : (
                            <span>Solicitar Teste Grátis — 15 Dias</span>
                          )}
                        </Button>

                        <p className="text-center text-xs text-slate-500 leading-relaxed px-2">
                          Após 15 dias enviaremos um link de pagamento para seu e-mail. Sem
                          compromisso, cancele quando quiser.
                        </p>
                      </div>

                      <div className="pt-2 border-t border-slate-100 space-y-2">
                        <div className="flex items-center gap-2 text-xs text-slate-600">
                          <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                          <span>Ativação imediata e credenciais de login instantâneas</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-slate-600">
                          <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                          <span>Acesso completo ao painel de gestor e portaria</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-slate-600">
                          <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                          <span>Suporte e treinamento inclusos</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </form>
          </div>
        )}
      </main>

      {/* Footer público */}
      <footer className="bg-white border-t border-slate-200 mt-auto py-6">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div>
            © {new Date().getFullYear()} Sholver Soluções / CondoPack. Todos os direitos reservados.
          </div>
          <div className="flex items-center gap-6">
            <span className="hover:underline cursor-pointer">Termos de Uso</span>
            <span className="hover:underline cursor-pointer">Privacidade</span>
            <span className="hover:underline cursor-pointer">Contato</span>
          </div>
        </div>
      </footer>
    </div>
  )
}
