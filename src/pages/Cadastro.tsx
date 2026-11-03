import { useState, useEffect, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import {
  Check,
  CheckCircle2,
  ArrowRight,
  Loader2,
  ShieldCheck,
  Sparkles,
  Calendar,
  Lock,
  Mail,
  UserCheck,
  Eye,
  EyeOff,
  ChevronDown,
  ChevronUp,
  Layers,
  Building,
  User,
  Phone,
  HelpCircle,
} from 'lucide-react'
import {
  getPublicPlans,
  submitOnboarding,
  PublicPlan,
  OnboardingResult,
} from '@/services/onboarding'
import { CondPackLogo } from '@/components/CondPackLogo'

// UFs brasileiras
const ESTADOS_BRASIL = [
  { sigla: 'AC', nome: 'Acre' },
  { sigla: 'AL', nome: 'Alagoas' },
  { sigla: 'AP', nome: 'Amapá' },
  { sigla: 'AM', nome: 'Amazonas' },
  { sigla: 'BA', nome: 'Bahia' },
  { sigla: 'CE', nome: 'Ceará' },
  { sigla: 'DF', nome: 'Distrito Federal' },
  { sigla: 'ES', nome: 'Espírito Santo' },
  { sigla: 'GO', nome: 'Goiás' },
  { sigla: 'MA', nome: 'Maranhão' },
  { sigla: 'MT', nome: 'Mato Grosso' },
  { sigla: 'MS', nome: 'Mato Grosso do Sul' },
  { sigla: 'MG', nome: 'Minas Gerais' },
  { sigla: 'PA', nome: 'Pará' },
  { sigla: 'PB', nome: 'Paraíba' },
  { sigla: 'PR', nome: 'Paraná' },
  { sigla: 'PE', nome: 'Pernambuco' },
  { sigla: 'PI', nome: 'Piauí' },
  { sigla: 'RJ', nome: 'Rio de Janeiro' },
  { sigla: 'RN', nome: 'Rio Grande do Norte' },
  { sigla: 'RS', nome: 'Rio Grande do Sul' },
  { sigla: 'RO', nome: 'Rondônia' },
  { sigla: 'RR', nome: 'Roraima' },
  { sigla: 'SC', nome: 'Santa Catarina' },
  { sigla: 'SP', nome: 'São Paulo' },
  { sigla: 'SE', nome: 'Sergipe' },
  { sigla: 'TO', nome: 'Tocantins' },
]

// Utilitários de validação de CPF e CNPJ (apenas se preenchido)
function validarCPF(cpf: string): boolean {
  const clean = cpf.replace(/\D/g, '')
  if (clean.length !== 11) return false
  if (/^(\d)\1{10}$/.test(clean)) return false

  let soma = 0
  for (let i = 0; i < 9; i++) {
    soma += parseInt(clean.charAt(i), 10) * (10 - i)
  }
  let resto = (soma * 10) % 11
  if (resto === 10 || resto === 11) resto = 0
  if (resto !== parseInt(clean.charAt(9), 10)) return false

  soma = 0
  for (let i = 0; i < 10; i++) {
    soma += parseInt(clean.charAt(i), 10) * (11 - i)
  }
  resto = (soma * 10) % 11
  if (resto === 10 || resto === 11) resto = 0
  return resto === parseInt(clean.charAt(10), 10)
}

function validarCNPJ(cnpj: string): boolean {
  const clean = cnpj.replace(/\D/g, '')
  if (clean.length !== 14) return false
  if (/^(\d)\1{13}$/.test(clean)) return false

  const pesos1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
  const pesos2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]

  let soma = 0
  for (let i = 0; i < 12; i++) {
    soma += parseInt(clean.charAt(i), 10) * pesos1[i]
  }
  let resto = soma % 11
  const digito1 = resto < 2 ? 0 : 11 - resto
  if (digito1 !== parseInt(clean.charAt(12), 10)) return false

  soma = 0
  for (let i = 0; i < 13; i++) {
    soma += parseInt(clean.charAt(i), 10) * pesos2[i]
  }
  resto = soma % 11
  const digito2 = resto < 2 ? 0 : 11 - resto
  return digito2 === parseInt(clean.charAt(13), 10)
}

function formatCpfCnpj(value: string): string {
  const clean = value.replace(/\D/g, '')
  if (clean.length <= 11) {
    return clean
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})$/, '$1-$2')
      .substring(0, 14)
  }
  return clean
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2')
    .replace(/(\d{4})(\d)/, '$1-$2')
    .substring(0, 18)
}

function maskWhatsApp(value: string): string {
  const clean = value.replace(/\D/g, '').substring(0, 11)
  if (clean.length <= 2) return clean.length ? `(${clean}` : ''
  if (clean.length <= 6) return `(${clean.substring(0, 2)}) ${clean.substring(2)}`
  if (clean.length <= 10) {
    return `(${clean.substring(0, 2)}) ${clean.substring(2, 6)}-${clean.substring(6)}`
  }
  return `(${clean.substring(0, 2)}) ${clean.substring(2, 7)}-${clean.substring(7, 11)}`
}

// Normaliza o nome do plano corrigindo qualquer menção legada a "Pratinum" para "Platinum"
function sanitizePlanName(name: string): string {
  if (!name) return ''
  return name.replace(/pratinum/gi, 'Platinum')
}

// Inicializa tags de rastreamento Google Ads AW-18513891486 e Meta Pixel 2307497159656039
function initTracking() {
  if (typeof window === 'undefined') return

  // 1. Google Ads Tag
  const gTagId = 'AW-18513891486'
  if (!document.getElementById('google-ads-script')) {
    const script = document.createElement('script')
    script.id = 'google-ads-script'
    script.async = true
    script.src = `https://www.googletagmanager.com/gtag/js?id=${gTagId}`
    document.head.appendChild(script)

    const win = window as any
    win.dataLayer = win.dataLayer || []
    if (!win.gtag) {
      win.gtag = function (...args: any[]) {
        win.dataLayer.push(args)
      }
    }
    win.gtag('js', new Date())
    win.gtag('config', gTagId)
  }

  // 2. Meta Pixel
  const pixelId = '2307497159656039'
  const win = window as any
  if (!win.fbq) {
    const fbq: any = function (...args: any[]) {
      if (fbq.callMethod) {
        fbq.callMethod(...args)
      } else {
        fbq.queue.push(args)
      }
    }
    win.fbq = fbq
    if (!win._fbq) win._fbq = fbq
    fbq.push = fbq
    fbq.loaded = true
    fbq.version = '2.0'
    fbq.queue = []

    const script = document.createElement('script')
    script.id = 'meta-pixel-script'
    script.async = true
    script.src = 'https://connect.facebook.net/en_US/fbevents.js'
    document.head.appendChild(script)

    fbq('init', pixelId)
    fbq('track', 'PageView')
  } else {
    try {
      win.fbq('track', 'PageView')
    } catch {
      /* intentionally ignored */
    }
  }
}

// Dispara conversões de sucesso no Google Ads e Meta Pixel
function triggerSuccessTracking() {
  if (typeof window === 'undefined') return
  const win = window as any

  // Google Ads conversion
  try {
    if (typeof win.gtag === 'function') {
      win.gtag('event', 'conversion', {
        send_to: 'AW-18513891486/iBAaCLO-0qwdEJ6hjvxE',
      })
    }
  } catch (err) {
    console.warn('Erro ao disparar conversão Google Ads:', err)
  }

  // Meta Pixel CompleteRegistration
  try {
    if (typeof win.fbq === 'function') {
      win.fbq('track', 'CompleteRegistration', {
        content_name: 'Teste Grátis 30 Dias',
        status: 'success',
      })
    }
  } catch (err) {
    console.warn('Erro ao disparar Meta Pixel CompleteRegistration:', err)
  }
}

export default function Cadastro() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { toast } = useToast()

  const [plans, setPlans] = useState<PublicPlan[]>([])
  const [selectedPlanId, setSelectedPlanId] = useState<string>('')
  const [loadingPlans, setLoadingPlans] = useState(true)

  // 5 Campos Obrigatórios na ordem pedida:
  // 1. Nome do condomínio ou empresa (razaoSocial)
  // 2. Seu nome (responsavel)
  // 3. E-mail (email - será o login)
  // 4. WhatsApp (phone)
  // 5. Senha (password - senha única, min 8)
  const [nomeCondominio, setNomeCondominio] = useState('')
  const [seuNome, setSeuNome] = useState('')
  const [email, setEmail] = useState('')
  const [whatsapp, setWhatsapp] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  // Seção recolhível "Mais dados (opcional)"
  const [showOptionalFields, setShowOptionalFields] = useState(false)
  const [cpfCnpj, setCpfCnpj] = useState('')
  const [razaoSocialCompleta, setRazaoSocialCompleta] = useState('')
  const [cidade, setCidade] = useState('')
  const [estado, setEstado] = useState('')

  // Erros pontuais embaixo de cada campo
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Modal Comparar Planos
  const [isCompareModalOpen, setIsCompareModalOpen] = useState(false)

  const [submitting, setSubmitting] = useState(false)
  const [onboardingResult, setOnboardingResult] = useState<OnboardingResult | null>(null)

  // Refs para rolagem e foco automático no primeiro campo com erro
  const nomeCondominioRef = useRef<HTMLInputElement>(null)
  const seuNomeRef = useRef<HTMLInputElement>(null)
  const emailRef = useRef<HTMLInputElement>(null)
  const whatsappRef = useRef<HTMLInputElement>(null)
  const passwordRef = useRef<HTMLInputElement>(null)
  const cpfCnpjRef = useRef<HTMLInputElement>(null)

  // Inicializa pixel e Google Ads ao carregar a página
  useEffect(() => {
    initTracking()
  }, [])

  // Limpa estados e storages legados ao montar
  useEffect(() => {
    setNomeCondominio('')
    setSeuNome('')
    setEmail('')
    setWhatsapp('')
    setPassword('')
    setCpfCnpj('')
    setRazaoSocialCompleta('')
    setCidade('')
    setEstado('')
    setErrors({})

    try {
      const draftKeys = [
        'condpack_cadastro_draft',
        'cadastro_draft',
        'onboarding_draft',
        'cadastro_form',
        'condpack_onboarding',
      ]
      draftKeys.forEach((key) => {
        localStorage.removeItem(key)
        sessionStorage.removeItem(key)
      })
    } catch {
      // Ignorar se storage não estiver acessível
    }
  }, [])

  // Carregar planos ativos
  useEffect(() => {
    const loadPlans = async () => {
      setLoadingPlans(true)
      try {
        const fetchedPlans = await getPublicPlans()
        // Higieniza nomes (ex: "Pratinum" -> "Platinum")
        const sanitized = fetchedPlans.map((p) => ({
          ...p,
          nome: sanitizePlanName(p.nome),
        }))
        setPlans(sanitized)

        // Verificar pré-seleção por query param (?plano=...)
        const paramPlano = searchParams.get('plano')
        if (paramPlano) {
          const matched = sanitized.find(
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

        // Pré-selecionar o "Plano Básico" (ou o primeiro disponível)
        const planoBasico = sanitized.find(
          (p) => p.nome.toLowerCase().includes('básico') || p.nome.toLowerCase().includes('basico'),
        )
        if (planoBasico) {
          setSelectedPlanId(planoBasico.id)
        } else if (sanitized.length > 0) {
          setSelectedPlanId(sanitized[0].id)
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

  // Validação dos campos com foco no primeiro elemento com problema
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    // 1. Nome do condomínio ou empresa
    if (!nomeCondominio.trim()) {
      newErrors.nomeCondominio = 'Informe o nome do condomínio ou empresa.'
    }

    // 2. Seu nome
    if (!seuNome.trim()) {
      newErrors.seuNome = 'Informe seu nome completo.'
    }

    // 3. E-mail
    if (!email.trim()) {
      newErrors.email = 'Informe seu e-mail (será seu login).'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      newErrors.email = 'Informe um e-mail válido (ex: contato@condominio.com).'
    }

    // 4. WhatsApp com máscara (27) 99999-9999
    const digitsPhone = whatsapp.replace(/\D/g, '')
    if (!whatsapp.trim()) {
      newErrors.whatsapp = 'Informe seu WhatsApp para envio de mensagens.'
    } else if (digitsPhone.length < 10 || digitsPhone.length > 11) {
      newErrors.whatsapp = 'WhatsApp inválido. Use o formato (27) 99999-9999.'
    }

    // 5. Senha (mínimo 8 caracteres)
    if (!password) {
      newErrors.password = 'Crie uma senha de acesso.'
    } else if (password.length < 8) {
      newErrors.password = 'A senha deve ter no mínimo 8 caracteres.'
    }

    // Validação de CPF ou CNPJ apenas se preenchido
    if (cpfCnpj.trim()) {
      const cleanDoc = cpfCnpj.replace(/\D/g, '')
      if (cleanDoc.length <= 11) {
        if (!validarCPF(cleanDoc)) {
          newErrors.cpfCnpj = 'CPF informado é inválido.'
        }
      } else {
        if (!validarCNPJ(cleanDoc)) {
          newErrors.cpfCnpj = 'CNPJ informado é inválido.'
        }
      }
    }

    setErrors(newErrors)

    // Foco e scroll suave no primeiro campo com erro
    if (newErrors.nomeCondominio && nomeCondominioRef.current) {
      nomeCondominioRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' })
      nomeCondominioRef.current.focus()
      return false
    }
    if (newErrors.seuNome && seuNomeRef.current) {
      seuNomeRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' })
      seuNomeRef.current.focus()
      return false
    }
    if (newErrors.email && emailRef.current) {
      emailRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' })
      emailRef.current.focus()
      return false
    }
    if (newErrors.whatsapp && whatsappRef.current) {
      whatsappRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' })
      whatsappRef.current.focus()
      return false
    }
    if (newErrors.password && passwordRef.current) {
      passwordRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' })
      passwordRef.current.focus()
      return false
    }
    if (newErrors.cpfCnpj && cpfCnpjRef.current) {
      setShowOptionalFields(true)
      setTimeout(() => {
        cpfCnpjRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
        cpfCnpjRef.current?.focus()
      }, 50)
      return false
    }

    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (submitting) return

    if (!validateForm()) {
      toast({
        variant: 'destructive',
        title: 'Verifique os campos destacados',
        description: 'Por favor, corrija as informações apontadas no formulário.',
      })
      return
    }

    setSubmitting(true)

    // Ajusta dados para compatibilidade total com o backend existente
    const finalRazaoSocial = razaoSocialCompleta.trim() || nomeCondominio.trim()
    const cleanDoc = cpfCnpj.replace(/\D/g, '')
    const finalCnpj = cleanDoc || '00.000.000/0001-91'
    const finalCidade = cidade.trim() || 'Não informada'
    const finalEstado = (estado.trim() || 'ES').toUpperCase()

    try {
      const res = await submitOnboarding({
        razaoSocial: finalRazaoSocial,
        cnpj: finalCnpj,
        email: email.trim().toLowerCase(),
        cidade: finalCidade,
        estado: finalEstado,
        responsavel: seuNome.trim() || undefined,
        phone: whatsapp.trim() || undefined,
        planoId: selectedPlanId || undefined,
        password,
      })

      // Corrige nome do plano se veio com 'Pratinum'
      const sanitizedRes: OnboardingResult = {
        ...res,
        plano: {
          ...res.plano,
          nome: sanitizePlanName(res.plano.nome),
        },
      }

      setOnboardingResult(sanitizedRes)

      // Dispara rastreamento no sucesso
      triggerSuccessTracking()

      toast({
        title: 'Conta criada com sucesso!',
        description: 'Seu período de teste grátis de 30 dias está ativo com seu login exclusivo.',
      })
    } catch (error: any) {
      const msg = error.message || 'Ocorreu um erro ao processar seu cadastro. Tente novamente.'
      // Se for e-mail já cadastrado, destaca o campo de e-mail com foco
      if (msg.toLowerCase().includes('e-mail') || msg.toLowerCase().includes('email')) {
        setErrors((prev) => ({
          ...prev,
          email: 'Este e-mail já está cadastrado. Utilize outro e-mail ou faça login.',
        }))
        if (emailRef.current) {
          emailRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' })
          emailRef.current.focus()
        }
      }

      toast({
        variant: 'destructive',
        title: 'Não foi possível criar a conta',
        description: msg,
      })
    } finally {
      setSubmitting(false)
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

  // Componente de Resumo do Pedido (renderizado estritamente uma única vez)
  const renderOrderSummary = (isMobilePosition = false) => (
    <Card
      className={`border border-slate-200 shadow-md bg-white overflow-hidden ${
        isMobilePosition ? 'mt-6 lg:hidden' : 'hidden lg:block lg:sticky lg:top-24'
      }`}
    >
      <div className="p-5 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-bold text-slate-800 text-base sm:text-lg">Resumo do Pedido</h3>
            <span className="text-xs text-slate-500">Sem cobrança hoje</span>
          </div>
        </div>
        <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
          30 dias grátis
        </span>
      </div>

      <CardContent className="p-6 space-y-5">
        <div className="space-y-3.5">
          <div className="flex justify-between items-start pb-3.5 border-b border-slate-100">
            <div>
              <span className="text-xs uppercase text-slate-400 font-bold block">
                Solução Selecionada
              </span>
              <span className="font-semibold text-slate-800 text-sm">
                CondPack Gestão de Encomendas
              </span>
              <span className="text-xs text-slate-500 block mt-0.5">
                Plano: <strong>{selectedPlan ? selectedPlan.nome : 'Nenhum selecionado'}</strong>
              </span>
              {selectedPlan?.max_units ? (
                <span className="text-[11px] text-slate-400 block">
                  Capacidade: até {selectedPlan.max_units} unidades
                </span>
              ) : null}
            </div>
            <div className="text-right">
              <span className="font-bold text-slate-900 block text-sm">
                {formatCurrency(selectedPlan?.preco_mensal)}
              </span>
              <span className="text-[11px] text-slate-400">após o teste</span>
            </div>
          </div>

          <div className="flex justify-between items-center pb-3.5 border-b border-slate-100">
            <div>
              <span className="font-medium text-slate-700 text-sm">Período de Testes</span>
              <span className="text-xs text-emerald-600 font-semibold block">
                30 Dias de Acesso Completo
              </span>
            </div>
            <span className="font-bold text-emerald-600 text-sm">R$ 0,00</span>
          </div>

          <div className="flex justify-between items-baseline pt-1">
            <div>
              <span className="text-sm font-black text-slate-900 uppercase tracking-tight block">
                TOTAL HOJE
              </span>
              <span className="text-xs text-slate-500">Cartão não necessário</span>
            </div>
            <span className="text-2xl font-black text-emerald-600">{formatCurrency(0)}</span>
          </div>
        </div>

        {/* Benefícios inclusos */}
        <div className="pt-3 border-t border-slate-100 space-y-2 text-xs text-slate-600">
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Ativação imediata com seu login de gestor</span>
          </div>
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Módulo de Portaria e Notificações por WhatsApp</span>
          </div>
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Sem fidelidade: cancele ou renove quando quiser</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* Header público do Onboarding */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-20">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate('/')}>
            <div className="flex items-center justify-center w-10 h-10 bg-white rounded-lg border border-slate-200 p-1 shadow-2xs">
              <CondPackLogo variant="icon-only" size="sm" imageClassName="h-8 w-auto max-h-8" />
            </div>
            <div className="leading-tight select-none">
              <span
                className="font-black text-lg text-slate-900 tracking-tight notranslate select-none"
                translate="no"
              >
                <span className="text-[#0d2a58]">Cond</span>
                <span className="text-[#00a896]">Pack</span>
              </span>
              <span className="text-xs text-[#00a896] font-semibold block">Multi-tenant Cloud</span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <span className="text-sm text-slate-500 hidden sm:inline">Já tem uma conta?</span>
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

      {/* Main Content */}
      <main className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 py-6 sm:py-10">
        {onboardingResult ? (
          /* TELA DE SUCESSO / CONFIRMAÇÃO */
          <div className="max-w-2xl mx-auto space-y-6 animate-in fade-in-50 duration-500">
            <div className="text-center space-y-3">
              <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-sm">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">
                Teste Grátis Ativado com Sucesso!
              </h1>
              <p className="text-slate-600 max-w-lg mx-auto text-sm sm:text-base">
                Seu condomínio foi provisionado e sua licença de avaliação de{' '}
                <span className="font-semibold text-slate-800">30 dias</span> já está pronta para
                uso no seu login exclusivo.
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
                      {onboardingResult.condo.cidade &&
                      onboardingResult.condo.cidade !== 'Não informada'
                        ? `${onboardingResult.condo.cidade}/${onboardingResult.condo.estado}`
                        : 'Ambiente CondPack Dedicado'}
                    </p>
                  </div>
                  <div className="bg-white/10 backdrop-blur-sm rounded-lg px-3 py-1.5 border border-white/20 text-right">
                    <span className="text-xs text-blue-100 block">Plano Selecionado</span>
                    <span className="font-semibold text-sm">{onboardingResult.plano.nome}</span>
                  </div>
                </div>
              </div>

              <CardContent className="p-6 space-y-6">
                {/* Confirmação de Credenciais Criadas */}
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-5 space-y-3">
                  <div className="flex items-center gap-2 text-blue-900 font-semibold">
                    <UserCheck className="w-5 h-5 text-blue-600" />
                    <span>Seu Login Exclusivo de Gestor Foi Criado</span>
                  </div>
                  <p className="text-xs text-blue-700 leading-relaxed">
                    Você definiu sua senha pessoal de acesso com segurança. Utilize seu e-mail e a
                    senha cadastrada para acessar o sistema.
                  </p>

                  <div className="bg-white p-3 rounded-lg border border-blue-200">
                    <span className="text-xs text-slate-500 flex items-center gap-1 font-medium">
                      <Mail className="w-3.5 h-3.5 text-slate-400" /> E-mail de Login:
                    </span>
                    <p className="text-sm font-semibold text-slate-800 truncate select-all">
                      {onboardingResult.gestor.email}
                    </p>
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
                        (30 dias)
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
                    Faça login com seu e-mail e a senha que você acabou de definir.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        ) : (
          /* FORMULÁRIO DE CADASTRO OTIMIZADO */
          <div className="space-y-6">
            {/* Título conciso: no mobile, garante que o primeiro campo apareça na primeira dobra de tela */}
            <div className="space-y-1">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                Crie sua conta no CondPack
              </h1>
              <p className="text-sm sm:text-base text-slate-600">
                Teste grátis por 30 dias com acesso completo. Sem cartão de crédito.
              </p>
            </div>

            <form onSubmit={handleSubmit} noValidate>
              {/* Dummy inputs para prevenção de preenchimento automático indevido */}
              <input
                type="text"
                name="condpack_prevent_autofill_username"
                tabIndex={-1}
                aria-hidden="true"
                autoComplete="off"
                className="sr-only opacity-0 h-0 w-0 absolute pointer-events-none -left-[9999px]"
              />
              <input
                type="password"
                name="condpack_prevent_autofill_password"
                tabIndex={-1}
                aria-hidden="true"
                autoComplete="new-password"
                className="sr-only opacity-0 h-0 w-0 absolute pointer-events-none -left-[9999px]"
              />

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                {/* Coluna Principal: Formulário Primeiro e Escolha de Plano Depois (7 colunas) */}
                <div className="lg:col-span-7 space-y-6">
                  {/* CARD DE DADOS DA CONTA */}
                  <Card className="border border-slate-200 shadow-sm bg-white">
                    <CardContent className="p-5 sm:p-6 space-y-4">
                      {/* 1. Nome do condomínio ou empresa */}
                      <div className="space-y-1.5">
                        <Label
                          htmlFor="nomeCondominio"
                          className="text-slate-800 font-semibold text-sm flex items-center gap-1.5"
                        >
                          <Building className="w-4 h-4 text-slate-400" />
                          Nome do condomínio ou empresa <span className="text-rose-500">*</span>
                        </Label>
                        <Input
                          ref={nomeCondominioRef}
                          id="nomeCondominio"
                          name="nome_condominio"
                          autoComplete="organization"
                          placeholder="Ex: Condomínio Edifício Solar ou Empresa LTDA"
                          value={nomeCondominio}
                          onChange={(e) => {
                            setNomeCondominio(e.target.value)
                            if (errors.nomeCondominio) {
                              setErrors((prev) => ({ ...prev, nomeCondominio: '' }))
                            }
                          }}
                          className={`h-11 bg-slate-50/50 border-slate-300 focus:bg-white text-sm ${
                            errors.nomeCondominio ? 'border-rose-500 ring-1 ring-rose-500' : ''
                          }`}
                        />
                        {errors.nomeCondominio && (
                          <p className="text-xs font-medium text-rose-600 mt-1 animate-in fade-in-50">
                            {errors.nomeCondominio}
                          </p>
                        )}
                      </div>

                      {/* 2. Seu nome */}
                      <div className="space-y-1.5">
                        <Label
                          htmlFor="seuNome"
                          className="text-slate-800 font-semibold text-sm flex items-center gap-1.5"
                        >
                          <User className="w-4 h-4 text-slate-400" />
                          Seu nome <span className="text-rose-500">*</span>
                        </Label>
                        <Input
                          ref={seuNomeRef}
                          id="seuNome"
                          name="seu_nome"
                          autoComplete="name"
                          placeholder="Ex: Carlos Oliveira"
                          value={seuNome}
                          onChange={(e) => {
                            setSeuNome(e.target.value)
                            if (errors.seuNome) {
                              setErrors((prev) => ({ ...prev, seuNome: '' }))
                            }
                          }}
                          className={`h-11 bg-slate-50/50 border-slate-300 focus:bg-white text-sm ${
                            errors.seuNome ? 'border-rose-500 ring-1 ring-rose-500' : ''
                          }`}
                        />
                        {errors.seuNome && (
                          <p className="text-xs font-medium text-rose-600 mt-1 animate-in fade-in-50">
                            {errors.seuNome}
                          </p>
                        )}
                      </div>

                      {/* 3. E-mail (será o login) */}
                      <div className="space-y-1.5">
                        <Label
                          htmlFor="email"
                          className="text-slate-800 font-semibold text-sm flex items-center gap-1.5"
                        >
                          <Mail className="w-4 h-4 text-slate-400" />
                          E-mail (será o login) <span className="text-rose-500">*</span>
                        </Label>
                        <Input
                          ref={emailRef}
                          id="email"
                          name="email_login"
                          type="email"
                          autoComplete="email"
                          placeholder="seu.email@exemplo.com"
                          value={email}
                          onChange={(e) => {
                            setEmail(e.target.value)
                            if (errors.email) {
                              setErrors((prev) => ({ ...prev, email: '' }))
                            }
                          }}
                          className={`h-11 bg-slate-50/50 border-slate-300 focus:bg-white text-sm ${
                            errors.email ? 'border-rose-500 ring-1 ring-rose-500' : ''
                          }`}
                        />
                        {errors.email && (
                          <p className="text-xs font-medium text-rose-600 mt-1 animate-in fade-in-50">
                            {errors.email}
                          </p>
                        )}
                      </div>

                      {/* 4. WhatsApp com máscara (27) 99999-9999 */}
                      <div className="space-y-1.5">
                        <Label
                          htmlFor="whatsapp"
                          className="text-slate-800 font-semibold text-sm flex items-center gap-1.5"
                        >
                          <Phone className="w-4 h-4 text-slate-400" />
                          WhatsApp <span className="text-rose-500">*</span>
                        </Label>
                        <Input
                          ref={whatsappRef}
                          id="whatsapp"
                          name="whatsapp_phone"
                          type="tel"
                          autoComplete="tel"
                          placeholder="(27) 99999-9999"
                          value={whatsapp}
                          onChange={(e) => {
                            setWhatsapp(maskWhatsApp(e.target.value))
                            if (errors.whatsapp) {
                              setErrors((prev) => ({ ...prev, whatsapp: '' }))
                            }
                          }}
                          maxLength={15}
                          className={`h-11 bg-slate-50/50 border-slate-300 focus:bg-white text-sm ${
                            errors.whatsapp ? 'border-rose-500 ring-1 ring-rose-500' : ''
                          }`}
                        />
                        {errors.whatsapp && (
                          <p className="text-xs font-medium text-rose-600 mt-1 animate-in fade-in-50">
                            {errors.whatsapp}
                          </p>
                        )}
                      </div>

                      {/* 5. Senha Única com botão de olho */}
                      <div className="space-y-1.5">
                        <Label
                          htmlFor="password"
                          className="text-slate-800 font-semibold text-sm flex items-center gap-1.5"
                        >
                          <Lock className="w-4 h-4 text-slate-400" />
                          Senha (mínimo 8 caracteres) <span className="text-rose-500">*</span>
                        </Label>
                        <div className="relative">
                          <Input
                            ref={passwordRef}
                            id="password"
                            name="user_new_password"
                            type={showPassword ? 'text' : 'password'}
                            autoComplete="new-password"
                            placeholder="Crie sua senha de acesso"
                            value={password}
                            onChange={(e) => {
                              setPassword(e.target.value)
                              if (errors.password) {
                                setErrors((prev) => ({ ...prev, password: '' }))
                              }
                            }}
                            minLength={8}
                            className={`h-11 pr-11 bg-slate-50/50 border-slate-300 focus:bg-white text-sm ${
                              errors.password ? 'border-rose-500 ring-1 ring-rose-500' : ''
                            }`}
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            aria-label={showPassword ? 'Ocultar senha' : 'Ver senha'}
                            className="absolute right-0 top-0 h-11 w-11 flex items-center justify-center text-slate-400 hover:text-slate-600 focus:outline-hidden"
                          >
                            {showPassword ? (
                              <EyeOff className="w-4 h-4" />
                            ) : (
                              <Eye className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                        {errors.password && (
                          <p className="text-xs font-medium text-rose-600 mt-1 animate-in fade-in-50">
                            {errors.password}
                          </p>
                        )}
                      </div>

                      {/* Seção recolhível: "Mais dados (opcional)" */}
                      <div className="pt-2 border-t border-slate-100">
                        <button
                          type="button"
                          onClick={() => setShowOptionalFields(!showOptionalFields)}
                          className="w-full flex items-center justify-between py-2 text-xs font-semibold text-slate-600 hover:text-blue-600 transition-colors focus:outline-hidden"
                        >
                          <span className="flex items-center gap-1.5">
                            <Sparkles className="w-3.5 h-3.5 text-blue-500" />
                            Mais dados (opcional)
                          </span>
                          <span className="flex items-center gap-1 text-[11px] text-slate-400">
                            {showOptionalFields ? 'Recolher' : 'Expandir'}
                            {showOptionalFields ? (
                              <ChevronUp className="w-4 h-4" />
                            ) : (
                              <ChevronDown className="w-4 h-4" />
                            )}
                          </span>
                        </button>

                        {showOptionalFields && (
                          <div className="space-y-3.5 pt-3 animate-in fade-in-50 duration-200">
                            <div className="space-y-1.5">
                              <Label
                                htmlFor="cpfCnpj"
                                className="text-slate-700 font-medium text-xs"
                              >
                                CNPJ ou CPF (opcional)
                              </Label>
                              <Input
                                ref={cpfCnpjRef}
                                id="cpfCnpj"
                                name="doc_cpf_cnpj"
                                placeholder="00.000.000/0000-00 ou 000.000.000-00"
                                value={cpfCnpj}
                                onChange={(e) => {
                                  setCpfCnpj(formatCpfCnpj(e.target.value))
                                  if (errors.cpfCnpj) {
                                    setErrors((prev) => ({ ...prev, cpfCnpj: '' }))
                                  }
                                }}
                                maxLength={18}
                                className={`h-10 bg-slate-50/50 border-slate-300 focus:bg-white text-xs ${
                                  errors.cpfCnpj ? 'border-rose-500 ring-1 ring-rose-500' : ''
                                }`}
                              />
                              {errors.cpfCnpj && (
                                <p className="text-xs font-medium text-rose-600 mt-1 animate-in fade-in-50">
                                  {errors.cpfCnpj}
                                </p>
                              )}
                            </div>

                            <div className="space-y-1.5">
                              <Label
                                htmlFor="razaoSocialCompleta"
                                className="text-slate-700 font-medium text-xs"
                              >
                                Razão Social Completa (opcional)
                              </Label>
                              <Input
                                id="razaoSocialCompleta"
                                name="razao_social_completa"
                                placeholder="Razão social registrada na Receita Federal"
                                value={razaoSocialCompleta}
                                onChange={(e) => setRazaoSocialCompleta(e.target.value)}
                                className="h-10 bg-slate-50/50 border-slate-300 focus:bg-white text-xs"
                              />
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <div className="space-y-1.5">
                                <Label
                                  htmlFor="cidade"
                                  className="text-slate-700 font-medium text-xs"
                                >
                                  Cidade (opcional)
                                </Label>
                                <Input
                                  id="cidade"
                                  name="cidade_opcional"
                                  placeholder="Ex: Vitória"
                                  value={cidade}
                                  onChange={(e) => setCidade(e.target.value)}
                                  className="h-10 bg-slate-50/50 border-slate-300 focus:bg-white text-xs"
                                />
                              </div>

                              <div className="space-y-1.5">
                                <Label
                                  htmlFor="estado"
                                  className="text-slate-700 font-medium text-xs"
                                >
                                  Estado / UF (opcional)
                                </Label>
                                <Select value={estado} onValueChange={(val) => setEstado(val)}>
                                  <SelectTrigger className="h-10 bg-slate-50/50 border-slate-300 focus:bg-white text-xs">
                                    <SelectValue placeholder="Selecione a UF" />
                                  </SelectTrigger>
                                  <SelectContent className="max-h-60">
                                    {ESTADOS_BRASIL.map((uf) => (
                                      <SelectItem
                                        key={uf.sigla}
                                        value={uf.sigla}
                                        className="text-xs"
                                      >
                                        {uf.sigla} — {uf.nome}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  {/* ESCOLHA DE PLANO COMPACTA (VEM DEPOIS DO FORMULÁRIO) */}
                  <div className="space-y-3 pt-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Layers className="w-4 h-4 text-blue-600" />
                        <h2 className="text-base font-bold text-slate-800">
                          Escolha seu plano (após os 30 dias grátis)
                        </h2>
                      </div>
                      <button
                        type="button"
                        onClick={() => setIsCompareModalOpen(true)}
                        className="text-xs text-blue-600 hover:text-blue-800 hover:underline font-semibold flex items-center gap-1 focus:outline-hidden"
                      >
                        <HelpCircle className="w-3.5 h-3.5" />
                        comparar planos
                      </button>
                    </div>

                    {loadingPlans ? (
                      <div className="p-4 flex items-center justify-center bg-white rounded-xl border border-slate-200">
                        <Loader2 className="w-5 h-5 animate-spin text-blue-600 mr-2" />
                        <span className="text-xs text-slate-600">Carregando planos...</span>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {plans.map((plano) => {
                          const isSelected = selectedPlanId === plano.id
                          return (
                            <div
                              key={plano.id}
                              onClick={() => setSelectedPlanId(plano.id)}
                              className={`cursor-pointer rounded-lg p-3.5 border transition-all flex items-center justify-between ${
                                isSelected
                                  ? 'border-blue-600 bg-blue-50/50 shadow-xs ring-1 ring-blue-600'
                                  : 'border-slate-200 bg-white hover:border-slate-300'
                              }`}
                            >
                              <div className="flex items-center gap-3">
                                <div
                                  className={`w-4 h-4 rounded-full border flex items-center justify-center transition-all ${
                                    isSelected
                                      ? 'border-blue-600 bg-blue-600 text-white'
                                      : 'border-slate-300 bg-white'
                                  }`}
                                >
                                  {isSelected && <Check className="w-3 h-3" />}
                                </div>
                                <div>
                                  <div className="flex items-center gap-2">
                                    <span className="font-bold text-sm text-slate-900">
                                      {plano.nome}
                                    </span>
                                    {plano.nome.toLowerCase().includes('básico') && (
                                      <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded-sm bg-blue-100 text-blue-700">
                                        Recomendado
                                      </span>
                                    )}
                                  </div>
                                  <span className="text-xs text-slate-500">
                                    {plano.max_units
                                      ? `Até ${plano.max_units} unidades`
                                      : 'Unidades ilimitadas'}
                                  </span>
                                </div>
                              </div>

                              <div className="text-right">
                                <span className="font-bold text-slate-900 text-sm block">
                                  {formatCurrency(plano.preco_mensal)}
                                </span>
                                <span className="text-[10px] text-slate-400">/ mês</span>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>

                  {/* Botão Principal de Envio (ÚNICO NO FLUXO) */}
                  <div className="pt-2">
                    <Button
                      type="submit"
                      disabled={submitting}
                      className="w-full h-12 text-base font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-md transition-all gap-2"
                    >
                      {submitting ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin" />
                          <span>Criando sua conta...</span>
                        </>
                      ) : (
                        <>
                          <span>Começar meu teste grátis de 30 dias</span>
                          <ArrowRight className="w-4 h-4" />
                        </>
                      )}
                    </Button>
                    <p className="text-center text-xs text-slate-400 mt-2">
                      Sem compromisso • Ativação imediata • Suporte incluso
                    </p>
                  </div>

                  {/* No celular, o resumo do pedido fica ABAIXO do botão de envio */}
                  {renderOrderSummary(true)}
                </div>

                {/* Coluna Direita no Desktop: Resumo do Pedido (fica ao lado do formulário) */}
                <div className="lg:col-span-5">{renderOrderSummary(false)}</div>
              </div>
            </form>
          </div>
        )}
      </main>

      {/* Modal Comparar Planos (Exibe os 4 cards de planos atuais) */}
      <Dialog open={isCompareModalOpen} onOpenChange={setIsCompareModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <Layers className="w-5 h-5 text-blue-600" />
              Comparativo de Planos CondPack
            </DialogTitle>
          </DialogHeader>

          <p className="text-xs text-slate-500 mb-2">
            Todos os planos incluem o teste grátis de 30 dias. Selecione o plano ideal para a sua
            estrutura.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 py-2">
            {plans.map((plano) => {
              const isSelected = selectedPlanId === plano.id
              return (
                <div
                  key={plano.id}
                  onClick={() => {
                    setSelectedPlanId(plano.id)
                    setIsCompareModalOpen(false)
                  }}
                  className={`cursor-pointer rounded-xl p-4 border-2 transition-all flex flex-col justify-between ${
                    isSelected
                      ? 'border-blue-600 bg-blue-50/40 shadow-sm ring-1 ring-blue-600'
                      : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-xs'
                  }`}
                >
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-semibold text-blue-600 uppercase tracking-wider">
                        CondPack
                      </span>
                      {isSelected && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-blue-600 text-white">
                          Selecionado
                        </span>
                      )}
                    </div>

                    <div>
                      <h3 className="font-bold text-slate-900 text-base">{plano.nome}</h3>
                      {plano.descricao && (
                        <p className="text-xs text-slate-500 line-clamp-3 mt-1">
                          {plano.descricao}
                        </p>
                      )}
                    </div>

                    <div className="pt-1 border-t border-slate-100">
                      <div className="flex items-baseline gap-1">
                        <span className="text-xl font-black text-slate-900">
                          {formatCurrency(plano.preco_mensal)}
                        </span>
                        <span className="text-xs text-slate-500 font-medium">/ mês</span>
                      </div>
                      <span className="text-[11px] text-slate-500 block mt-0.5 font-medium">
                        {plano.max_units
                          ? `Até ${plano.max_units} unidades`
                          : 'Unidades ilimitadas'}
                      </span>
                    </div>

                    <div className="pt-2 text-xs text-slate-600 space-y-1.5">
                      <div className="flex items-center gap-1.5">
                        <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span>Gestão de Encomendas</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span>Avisos por WhatsApp</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span>App Morador & Portaria</span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-4">
                    <Button
                      size="sm"
                      variant={isSelected ? 'default' : 'outline'}
                      className={`w-full text-xs font-semibold ${
                        isSelected ? 'bg-blue-600 hover:bg-blue-700 text-white' : ''
                      }`}
                      onClick={(e) => {
                        e.stopPropagation()
                        setSelectedPlanId(plano.id)
                        setIsCompareModalOpen(false)
                      }}
                    >
                      {isSelected ? 'Plano Escolhido' : 'Escolher este'}
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>
        </DialogContent>
      </Dialog>

      {/* Footer público */}
      <footer className="bg-white border-t border-slate-200 mt-auto py-6">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div>
            © {new Date().getFullYear()} Sholver Soluções / CondPack. Todos os direitos reservados.
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
