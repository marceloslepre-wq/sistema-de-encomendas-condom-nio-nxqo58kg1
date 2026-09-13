import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { CondPackLogo } from '@/components/CondPackLogo'
import { CONDPACK_PUBLIC_SECTIONS } from '@/components/guia/guideData'
import { GuideSectionCard } from '@/components/guia/GuideSectionCard'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Search,
  BookOpen,
  Sparkles,
  Filter,
  X,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  ExternalLink,
} from 'lucide-react'

// Categorias relevantes presentes no subconjunto público
const PUBLIC_CATEGORIAS = [
  'Todas as Seções',
  'Visão Geral',
  'Operação Diária',
  'Comunicação',
  'Financeiro',
] as const

type CategoriaPublicaFiltro = (typeof PUBLIC_CATEGORIAS)[number]

export default function GuiaPublico() {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] =
    useState<CategoriaPublicaFiltro>('Todas as Seções')

  // Filtragem combinada por busca textual e por categoria sobre as seções públicas
  const filteredSections = useMemo(() => {
    const term = searchTerm.trim().toLowerCase()

    return CONDPACK_PUBLIC_SECTIONS.filter((sec) => {
      const matchCategory =
        selectedCategory === 'Todas as Seções' || sec.category === selectedCategory

      if (!matchCategory) return false
      if (!term) return true

      const inTitle = sec.title.toLowerCase().includes(term)
      const inSubtitle = sec.subtitle.toLowerCase().includes(term)
      const inCategory = sec.category.toLowerCase().includes(term)
      const inSteps = sec.steps.some(
        (st) =>
          st.title.toLowerCase().includes(term) || st.description.toLowerCase().includes(term),
      )
      const inTips =
        sec.tips?.some(
          (t) => t.title.toLowerCase().includes(term) || t.text.toLowerCase().includes(term),
        ) ?? false
      const inWarnings =
        sec.warnings?.some(
          (w) => w.title.toLowerCase().includes(term) || w.text.toLowerCase().includes(term),
        ) ?? false

      return inTitle || inSubtitle || inCategory || inSteps || inTips || inWarnings
    })
  }, [searchTerm, selectedCategory])

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* Cabeçalho Vitrine Público com Logo CondPack + Botão CTA Testar Grátis por 15 dias */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-2xs">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 sm:h-20 flex items-center justify-between gap-4">
          <Link
            to="/guia-publica"
            className="flex items-center gap-3 transition-opacity hover:opacity-90 shrink-0"
            title="CondPack — Vitrine do Guia de Uso"
          >
            <div className="flex items-center justify-center w-10 h-10 sm:w-11 sm:h-11 bg-white rounded-lg border border-slate-200 p-1 shadow-2xs">
              <CondPackLogo variant="icon-only" size="sm" imageClassName="h-8 w-auto max-h-8" />
            </div>
            <div className="leading-tight select-none">
              <span
                className="font-black text-lg sm:text-xl text-slate-900 tracking-tight notranslate"
                translate="no"
              >
                <span className="text-[#0d2a58]">Cond</span>
                <span className="text-[#00a896]">Pack</span>
              </span>
              <span className="text-[11px] sm:text-xs text-[#00a896] font-semibold block">
                Guia Interativo • Vitrine
              </span>
            </div>
          </Link>

          {/* Botão de Ação CTA "Testar Grátis por 15 dias" para /cadastro */}
          <div className="flex items-center gap-3 shrink-0">
            <Link
              to="/"
              className="text-xs sm:text-sm font-medium text-slate-600 hover:text-slate-900 hidden md:inline-block px-3 py-1.5"
            >
              Já sou cliente (Login)
            </Link>
            <Button
              asChild
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm h-9 sm:h-11 px-3 sm:px-5 shadow-sm transition-all gap-1.5"
            >
              <Link to="/cadastro">
                <span>Testar Grátis por 15 dias</span>
                <ArrowRight className="w-4 h-4 ml-0.5" />
              </Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Faixa / Badge Indicador no Topo: Demonstração — dados fictícios */}
      <aside
        aria-label="Aviso de demonstração"
        className="bg-gradient-to-r from-[#0d2a58] to-[#123e7e] text-white border-b border-blue-950/20 py-2.5 px-4 text-center text-xs"
      >
        <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-center gap-2 sm:gap-3">
          <Badge className="bg-amber-400 text-slate-950 font-bold hover:bg-amber-400 text-[11px] px-2 py-0.5">
            Demonstração — dados fictícios
          </Badge>
          <span className="text-blue-100 text-xs">
            Esta vitrine pública interativa simula a operação em um condomínio modelo fictício (
            <strong className="text-white">Residencial Vista Verde</strong>). Nenhuma conta real é
            acessada.
          </span>
          <Link
            to="/cadastro"
            className="text-white underline font-semibold hover:text-amber-300 inline-flex items-center gap-1 text-xs"
          >
            Ativar meu condomínio <ExternalLink className="w-3 h-3" />
          </Link>
        </div>
      </aside>

      {/* Conteúdo Principal do Guia */}
      <main className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 py-6 sm:py-10 space-y-6">
        {/* Banner Hero de Apresentação da Vitrine */}
        <div className="p-6 sm:p-8 rounded-2xl bg-gradient-to-br from-white via-blue-50/40 to-slate-50 border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Badge className="bg-[#0d2a58] hover:bg-[#0d2a58] text-white gap-1.5 px-3 py-1 text-xs">
              <BookOpen className="w-3.5 h-3.5 text-[#00a896]" />
              Vitrine Interativa do Sistema
            </Badge>

            <div className="flex items-center gap-2 text-xs text-slate-600 font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>
                Mostrando <strong>{filteredSections.length}</strong> de{' '}
                <strong>{CONDPACK_PUBLIC_SECTIONS.length}</strong> seções de demonstração
              </span>
            </div>
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              Guia de Uso &amp; Demonstração do{' '}
              <span className="notranslate" translate="no">
                <span className="text-[#0d2a58]">Cond</span>
                <span className="text-[#00a896]">Pack</span>
              </span>
            </h1>
            <p className="text-sm sm:text-base text-slate-600 leading-relaxed max-w-3xl">
              Conheça de perto o funcionamento da plataforma que automatiza o recebimento de
              encomendas na portaria, organiza a triagem e notifica moradores pelo WhatsApp oficial
              com código seguro de retirada.
            </p>
          </div>

          {/* Destaques rápidos */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
            <div className="p-3 bg-white rounded-xl border border-slate-200/70 text-xs flex items-center gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span className="text-slate-700">
                <strong>WhatsApp Próprio:</strong> conexão com QR Code em 2 min
              </span>
            </div>
            <div className="p-3 bg-white rounded-xl border border-slate-200/70 text-xs flex items-center gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span className="text-slate-700">
                <strong>Código de 6 dígitos:</strong> entrega segura e sem extravio
              </span>
            </div>
            <div className="p-3 bg-white rounded-xl border border-slate-200/70 text-xs flex items-center gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span className="text-slate-700">
                <strong>Trial 15 Dias:</strong> sem cartão e ativação imediata
              </span>
            </div>
          </div>
        </div>

        {/* Barra de Busca Rápida */}
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar nas funcionalidades (ex.: portaria, whatsapp, qr code, código de retirada, licença)..."
            className="pl-10 pr-10 h-11 text-sm bg-white border-slate-200 shadow-xs"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
              title="Limpar busca"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Chips de Filtro por Categoria */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-1 scrollbar-none">
          <span className="text-xs font-semibold text-slate-500 shrink-0 flex items-center gap-1 mr-1">
            <Filter className="w-3.5 h-3.5" />
            Filtrar por:
          </span>
          {PUBLIC_CATEGORIAS.map((cat) => {
            const isSelected = selectedCategory === cat
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all shrink-0 cursor-pointer ${
                  isSelected
                    ? 'bg-[#0d2a58] text-white shadow-xs font-bold'
                    : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
                }`}
              >
                {cat}
              </button>
            )
          })}
        </div>

        {/* Lista das Seções Filtradas da Vitrine */}
        {filteredSections.length > 0 ? (
          <div className="space-y-6">
            {filteredSections.map((sec, idx) => (
              <GuideSectionCard
                key={sec.id}
                section={sec}
                totalVisible={filteredSections.length}
                currentIndex={idx}
                isPublicMode={true}
              />
            ))}
          </div>
        ) : (
          <div className="p-12 text-center rounded-xl border border-dashed border-slate-300 bg-white space-y-3">
            <Sparkles className="w-10 h-10 text-slate-300 mx-auto" />
            <h3 className="text-base font-bold text-slate-800">
              Nenhuma funcionalidade encontrada para a sua busca
            </h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Tente buscar por termos como &quot;portaria&quot;, &quot;whatsapp&quot;,
              &quot;retirada&quot; ou limpe os filtros.
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSearchTerm('')
                setSelectedCategory('Todas as Seções')
              }}
              className="text-xs"
            >
              Limpar Filtros
            </Button>
          </div>
        )}

        {/* Card CTA de Conversão Final no Rodapé do Conteúdo */}
        <div className="p-6 sm:p-8 rounded-2xl bg-gradient-to-r from-[#0d2a58] via-[#123e7e] to-[#00a896] text-white shadow-md flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-2 text-center md:text-left">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/15 text-xs font-semibold text-white backdrop-blur-xs">
              <ShieldCheck className="w-4 h-4 text-emerald-300" />
              15 Dias Sem Compromisso
            </div>
            <h3 className="text-xl sm:text-2xl font-black tracking-tight">
              Gostou do CondPack? Comece seu teste agora mesmo.
            </h3>
            <p className="text-xs sm:text-sm text-blue-100 max-w-xl">
              Crie a conta do seu condomínio em menos de 2 minutos, convide porteiros e moradores e
              veja a fila de encomendas da portaria zerar.
            </p>
          </div>

          <div className="shrink-0 w-full md:w-auto text-center">
            <Button
              asChild
              size="lg"
              className="w-full sm:w-auto bg-white text-[#0d2a58] hover:bg-slate-100 font-extrabold text-sm sm:text-base h-12 px-6 shadow-lg transition-transform hover:scale-105"
            >
              <Link to="/cadastro">
                <span>Testar Grátis por 15 dias</span>
                <ArrowRight className="w-4 h-4 ml-1.5 text-[#00a896]" />
              </Link>
            </Button>
            <span className="block text-[11px] text-blue-200 mt-2">
              Ativação imediata • Sem necessidade de cartão
            </span>
          </div>
        </div>
      </main>

      {/* Rodapé Vitrine com Copyright Sholver / CondPack */}
      <footer className="bg-white border-t border-slate-200 mt-auto py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div className="flex items-center gap-2 select-none">
            <span className="font-bold text-slate-800 notranslate" translate="no">
              CondPack
            </span>
            <span>—</span>
            <span>
              © {new Date().getFullYear()} Sholver Soluções &amp; Tecnologia. Todos os direitos
              reservados.
            </span>
          </div>

          <div className="flex items-center gap-5">
            <Link to="/cadastro" className="text-blue-600 hover:underline font-semibold">
              Criar Conta (15 dias grátis)
            </Link>
            <Link to="/" className="hover:underline">
              Acesso ao Sistema
            </Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
