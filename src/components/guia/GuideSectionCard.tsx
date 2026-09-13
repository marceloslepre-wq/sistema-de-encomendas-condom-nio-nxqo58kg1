import React from 'react'
import { Link } from 'react-router-dom'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ArrowRight, ChevronRight, Lightbulb, AlertTriangle } from 'lucide-react'

export interface GuideStep {
  step: number
  title: string
  description: string
}

export interface GuideTip {
  title: string
  text: string
}

export interface GuideWarning {
  title: string
  text: string
}

export interface GuideSectionData {
  id: string
  number: string // '01', '02', ...
  order: number // 1 to 11
  category:
    | 'Visão Geral'
    | 'Administração'
    | 'Operação Diária'
    | 'Comunicação'
    | 'Gestão'
    | 'Financeiro'
  title: string
  subtitle: string
  targetRoute?: string
  targetLabel?: string
  steps: GuideStep[]
  previewComponent?: React.ReactNode
  tips?: GuideTip[]
  warnings?: GuideWarning[]
  allowedRoles: string[] // 'gestor', 'morador', 'porteiro', 'portaria', 'triagem', 'master'
}

interface GuideSectionCardProps {
  section: GuideSectionData
  totalVisible: number
  currentIndex: number
}

export function GuideSectionCard({ section, totalVisible, currentIndex }: GuideSectionCardProps) {
  return (
    <Card
      id={`secao-${section.id}`}
      className="border-slate-200 shadow-xs overflow-hidden transition-all duration-200 scroll-mt-24"
    >
      <CardContent className="p-5 sm:p-7 space-y-6">
        {/* Topo do card: número, badges, títulos e botão para ir para a tela */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="flex items-start gap-3 sm:gap-4">
            <span className="shrink-0 w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-blue-50 text-[#0d2a58] font-black text-base sm:text-lg flex items-center justify-center border border-blue-100/80 shadow-2xs select-none">
              {section.number}
            </span>
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <Badge
                  variant="secondary"
                  className="bg-blue-50 text-[#0d2a58] border-blue-200/60 font-semibold hover:bg-blue-50"
                >
                  {section.category}
                </Badge>
                <span className="text-slate-400">•</span>
                <span className="text-slate-500 font-medium text-xs">
                  Seção {currentIndex + 1} de {totalVisible}
                </span>
              </div>
              <h3 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
                {section.title}
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                {section.subtitle}
              </p>
            </div>
          </div>

          {section.targetRoute && (
            <div className="shrink-0 sm:self-start">
              <Button
                asChild
                size="sm"
                className="bg-[#0d2a58] hover:bg-[#0d2a58]/90 text-white font-medium text-xs shadow-xs"
              >
                <Link to={section.targetRoute}>
                  {section.targetLabel || 'Ir para Tela'}
                  <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                </Link>
              </Button>
            </div>
          )}
        </div>

        {/* Bloco Passo a Passo & Funcionamento */}
        {section.steps && section.steps.length > 0 && (
          <div className="space-y-3 pt-2">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 tracking-wider uppercase">
              <span className="text-primary font-black">📌</span>
              <span>Passo a Passo &amp; Funcionamento</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {section.steps.map((st) => (
                <div
                  key={st.step}
                  className="p-3.5 rounded-lg border border-slate-200/80 bg-slate-50/50 hover:bg-slate-50 transition-colors flex flex-col justify-start space-y-1.5"
                >
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-[#0d2a58] text-white font-bold text-[11px] flex items-center justify-center shrink-0">
                      {st.step}
                    </span>
                    <h4 className="font-bold text-xs text-slate-800 leading-snug">{st.title}</h4>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed pl-7">{st.description}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Prévia Ilustrativa do Modal Real em Runtime */}
        {section.previewComponent && <div className="pt-2">{section.previewComponent}</div>}

        {/* Caixas de Dica Prática (amarelo suave) e Atenção Importante (vermelho suave) */}
        {(section.tips?.length || section.warnings?.length) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
            {section.tips?.map((tip, idx) => (
              <div
                key={idx}
                className="p-3.5 rounded-lg bg-amber-50/80 border border-amber-200/70 text-amber-950 flex items-start gap-2.5"
              >
                <div className="p-1 rounded-md bg-amber-100 text-amber-800 shrink-0 mt-0.5">
                  <Lightbulb className="w-4 h-4" />
                </div>
                <div className="space-y-0.5 text-xs">
                  <span className="font-bold text-amber-900 block">Dica Prática: {tip.title}</span>
                  <p className="text-amber-800/90 leading-relaxed">{tip.text}</p>
                </div>
              </div>
            ))}

            {section.warnings?.map((warn, idx) => (
              <div
                key={idx}
                className="p-3.5 rounded-lg bg-red-50/80 border border-red-200/70 text-red-950 flex items-start gap-2.5"
              >
                <div className="p-1 rounded-md bg-red-100 text-red-800 shrink-0 mt-0.5">
                  <AlertTriangle className="w-4 h-4" />
                </div>
                <div className="space-y-0.5 text-xs">
                  <span className="font-bold text-red-900 block">
                    Atenção Importante: {warn.title}
                  </span>
                  <p className="text-red-800/90 leading-relaxed">{warn.text}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Rodapé do card: atalho rápido para acessar a tela */}
        {section.targetRoute && (
          <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Pronto para usar?</span>
            <Link
              to={section.targetRoute}
              className="font-semibold text-primary hover:text-primary/80 inline-flex items-center gap-1 transition-colors"
            >
              <span>
                Acessar {section.targetLabel?.replace(/^Ir para\s*/, '') || 'a funcionalidade'}
              </span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
