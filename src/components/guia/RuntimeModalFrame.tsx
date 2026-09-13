import React from 'react'
import { Badge } from '@/components/ui/badge'

interface RuntimeModalFrameProps {
  title: string
  subtitle?: string
  caption?: string
  children: React.ReactNode
  maxHeight?: string
}

/**
 * RuntimeModalFrame
 * Moldura visual idêntica ao modelo do Ponto Digital (pontodigital.sholver.com.br/guia):
 * - Barra superior com bolinhas macOS (vermelha, amarela, verde)
 * - Título do modal de cadastro em tempo real
 * - Selo "PRÉVIA ILUSTRATIVA"
 * - Legenda explicativa no topo
 * - Container com scroll suave e estilo de janela real do sistema
 */
export function RuntimeModalFrame({
  title,
  subtitle = 'JANELA DE CADASTRO DA FUNCIONALIDADE (CAPTURA VIVA)',
  caption,
  children,
  maxHeight = '520px',
}: RuntimeModalFrameProps) {
  return (
    <div className="w-full my-6 rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden">
      {/* Barra superior de status / identificação */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 bg-slate-50 border-b border-slate-200 text-xs">
        <div className="flex items-center gap-2 font-medium text-slate-700">
          <span className="text-base select-none">🗺️</span>
          <span className="font-semibold text-slate-800 tracking-wide text-[11px] sm:text-xs uppercase">
            {subtitle}
          </span>
        </div>
        <span className="text-slate-500 text-[11px] hidden sm:inline">
          Renderizada em modo ilustrativo
        </span>
      </div>

      {/* Barra de controle da janela com bolinhas e título */}
      <div className="flex items-center justify-between px-4 py-2 bg-slate-100 border-b border-slate-200">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-red-400 inline-block border border-red-500/30" />
            <span className="w-3 h-3 rounded-full bg-amber-400 inline-block border border-amber-500/30" />
            <span className="w-3 h-3 rounded-full bg-emerald-400 inline-block border border-emerald-500/30" />
          </div>
          <div className="flex items-center gap-1.5 ml-2 text-xs font-semibold text-slate-700">
            <span>📁</span>
            <span>{title}</span>
          </div>
        </div>

        <Badge
          variant="secondary"
          className="bg-slate-200 text-slate-700 hover:bg-slate-200 text-[10px] uppercase font-bold tracking-wider px-2 py-0.5"
        >
          Prévia Ilustrativa
        </Badge>
      </div>

      {caption && (
        <div className="px-4 py-2 bg-slate-50/70 border-b border-slate-100 text-xs text-slate-600 italic">
          {caption}
        </div>
      )}

      {/* Conteúdo do Modal Real renderizado em runtime com scroll */}
      <div
        className="p-4 sm:p-6 bg-slate-50/40 overflow-y-auto flex justify-center items-start"
        style={{ maxHeight }}
      >
        <div className="w-full max-w-xl bg-white rounded-lg border border-slate-200 shadow-sm p-4 sm:p-6 pointer-events-auto">
          {children}
        </div>
      </div>
    </div>
  )
}
