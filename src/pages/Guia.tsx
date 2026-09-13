import { useState, useMemo } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { CONDPACK_GUIDE_SECTIONS } from '@/components/guia/guideData'
import { GuideSectionCard } from '@/components/guia/GuideSectionCard'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Search, BookOpen, Sparkles, Filter, X } from 'lucide-react'

const CATEGORIAS = [
  'Todas as Seções',
  'Visão Geral',
  'Administração',
  'Operação Diária',
  'Comunicação',
  'Gestão',
  'Financeiro',
] as const

type CategoriaFiltro = (typeof CATEGORIAS)[number]

export default function Guia() {
  const { role } = useAuth()
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<CategoriaFiltro>('Todas as Seções')

  // Mapeamento amigável de perfil
  const getRoleDisplayName = (r: string | null) => {
    switch (r) {
      case 'gestor':
        return 'Gestor / Síndico'
      case 'morador':
        return 'Morador'
      case 'porteiro':
        return 'Porteiro'
      case 'portaria':
        return 'Portaria Geral'
      case 'triagem':
        return 'Triagem'
      case 'master':
        return 'Administrador Master'
      default:
        return 'Usuário'
    }
  }

  // Regra de negócio de filtragem por perfil decidida com o Marcelo:
  // - Gestor: todas as 11 seções
  // - Morador: Primeiros Passos (1), Minhas Encomendas / Triagem & Retirada (7), Licença e Planos (11)
  // - Porteiro / Portaria: Primeiros Passos (1), Registro (6), Triagem & Retirada (7)
  // - Triagem: Primeiros Passos (1), Triagem & Retirada (7)
  // - Master: todas as 11 seções
  const roleSections = useMemo(() => {
    const currentRole = role || 'gestor'

    return CONDPACK_GUIDE_SECTIONS.filter((sec) => {
      if (currentRole === 'gestor' || currentRole === 'master') {
        return true
      }
      if (currentRole === 'morador') {
        return sec.order === 1 || sec.order === 7 || sec.order === 11
      }
      if (currentRole === 'porteiro' || currentRole === 'portaria') {
        return sec.order === 1 || sec.order === 6 || sec.order === 7
      }
      if (currentRole === 'triagem') {
        return sec.order === 1 || sec.order === 7
      }
      return sec.allowedRoles.includes(currentRole)
    })
  }, [role])

  // Filtragem combinada por busca textual e por categoria
  const filteredSections = useMemo(() => {
    const term = searchTerm.trim().toLowerCase()

    return roleSections.filter((sec) => {
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
  }, [roleSections, searchTerm, selectedCategory])

  const totalSectionsOfRole = roleSections.length
  const totalGlobalSections = CONDPACK_GUIDE_SECTIONS.length

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-20 animate-fade-in">
      {/* Cabeçalho de Boas-Vindas Didático */}
      <div className="p-6 sm:p-8 rounded-2xl bg-gradient-to-br from-white via-blue-50/40 to-slate-50 border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Badge className="bg-[#0d2a58] hover:bg-[#0d2a58] text-white gap-1.5 px-3 py-1 text-xs">
            <BookOpen className="w-3.5 h-3.5 text-[#00a896]" />
            Guia Didático do Sistema
          </Badge>

          <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>
              Perfil atual: <strong className="text-slate-800">{getRoleDisplayName(role)}</strong>
            </span>
            <span>•</span>
            <span>
              Exibindo <strong>{filteredSections.length}</strong> de{' '}
              <strong>{totalSectionsOfRole}</strong> seções disponíveis
              {totalSectionsOfRole < totalGlobalSections && ` (${totalGlobalSections} no total)`}
            </span>
          </div>
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Guia de Uso — Aprenda a Usar o{' '}
            <span className="notranslate" translate="no">
              <span className="text-[#0d2a58]">Cond</span>
              <span className="text-[#00a896]">Pack</span>
            </span>
          </h1>
          <p className="text-sm sm:text-base text-slate-600 leading-relaxed max-w-3xl">
            Bem-vindo ao manual completo e ilustrado do seu sistema. Cada seção abaixo explica uma
            funcionalidade com imagens reais das janelas de cadastro, dicas práticas, avisos de
            segurança e atalhos rápidos para você ir direto ao que precisa.
          </p>
        </div>
      </div>

      {/* Barra de Busca Rápida */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <Input
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Buscar no guia (ex.: encomenda, triagem, whatsapp, licença, prateleira, morador)..."
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
        {CATEGORIAS.map((cat) => {
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

      {/* Lista das Seções Filtradas */}
      {filteredSections.length > 0 ? (
        <div className="space-y-6">
          {filteredSections.map((sec, idx) => (
            <GuideSectionCard
              key={sec.id}
              section={sec}
              totalVisible={filteredSections.length}
              currentIndex={idx}
            />
          ))}
        </div>
      ) : (
        <div className="p-12 text-center rounded-xl border border-dashed border-slate-300 bg-white space-y-3">
          <Sparkles className="w-10 h-10 text-slate-300 mx-auto" />
          <h3 className="text-base font-bold text-slate-800">
            Nenhuma seção encontrada para os filtros aplicados
          </h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Tente buscar com outras palavras-chave ou selecione &quot;Todas as Seções&quot; nos
            chips acima.
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
            Limpar Filtros de Busca
          </Button>
        </div>
      )}
    </div>
  )
}
