import React from 'react'
import logoSimbolo from '@/assets/so-simbolo-condpack-03819.png'

interface CondPackLogoProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'full' | 'compact' | 'horizontal' | 'icon-only'
  size?: 'sm' | 'md' | 'lg' | 'xl'
  showSubtitle?: boolean
  showWordmark?: boolean
  className?: string
  imageClassName?: string
  subtitleText?: string
}

/**
 * Componente oficial da Identidade Visual CondPack:
 * - Símbolo isolado (oficial): Prédios azul marinho + caixa em perspectiva teal/turquesa
 * - Wordmark ao lado: "CondPack" (com notranslate e translate="no")
 * - Subtítulo / Slogan opcional: "Soluções Inteligentes"
 */
export function CondPackLogo({
  variant = 'horizontal',
  size = 'md',
  showSubtitle = true,
  showWordmark = true,
  className = '',
  imageClassName = '',
  subtitleText = 'Soluções Inteligentes',
  ...props
}: CondPackLogoProps) {
  // Configurações de altura e tipografia de acordo com o tamanho
  const sizeMap = {
    sm: { imgHeight: 'h-8', textTitle: 'text-base', textSub: 'text-[9px]', gap: 'gap-2' },
    md: { imgHeight: 'h-10', textTitle: 'text-lg', textSub: 'text-[10px]', gap: 'gap-2.5' },
    lg: { imgHeight: 'h-12', textTitle: 'text-xl', textSub: 'text-xs', gap: 'gap-3' },
    xl: { imgHeight: 'h-16', textTitle: 'text-2xl', textSub: 'text-sm', gap: 'gap-3.5' },
  }

  const { imgHeight, textTitle, textSub, gap } = sizeMap[size]

  if (variant === 'icon-only') {
    return (
      <div className={`inline-flex items-center justify-center shrink-0 ${className}`} {...props}>
        <img
          src={logoSimbolo}
          alt="CondPack"
          className={`w-auto object-contain max-w-full shrink-0 ${imgHeight} ${imageClassName}`}
          loading="eager"
        />
      </div>
    )
  }

  if (variant === 'full') {
    // Apresentação centralizada: símbolo com o texto CondPack logo abaixo ou ao lado
    return (
      <div
        className={`inline-flex flex-col items-center justify-center text-center gap-2 ${className}`}
        {...props}
      >
        <div className="flex items-center justify-center shrink-0">
          <img
            src={logoSimbolo}
            alt="CondPack"
            className={`w-auto object-contain max-w-full drop-shadow-xs shrink-0 ${imgHeight} ${imageClassName}`}
            loading="eager"
          />
        </div>
        {showWordmark && (
          <div className="flex flex-col items-center justify-center leading-none select-none">
            <span
              className={`font-black tracking-tight text-slate-900 notranslate ${textTitle}`}
              translate="no"
            >
              <span className="text-[#0d2a58]">Cond</span>
              <span className="text-[#00a896]">Pack</span>
            </span>
            {showSubtitle && (
              <span
                className={`font-semibold tracking-wider text-[#00a896] uppercase mt-1 ${textSub}`}
              >
                {subtitleText}
              </span>
            )}
          </div>
        )}
      </div>
    )
  }

  // Variante horizontal / compact (padrão):
  // Exibe o símbolo isolado AO LADO do texto "CondPack"
  return (
    <div className={`inline-flex items-center ${gap} ${className}`} {...props}>
      <img
        src={logoSimbolo}
        alt="CondPack"
        className={`w-auto object-contain shrink-0 ${imgHeight} ${imageClassName}`}
        loading="eager"
      />
      {showWordmark && (
        <div className="flex flex-col justify-center leading-none select-none">
          <span
            className={`font-black tracking-tight text-slate-900 notranslate ${textTitle}`}
            translate="no"
          >
            <span className="text-[#0d2a58]">Cond</span>
            <span className="text-[#00a896]">Pack</span>
          </span>
          {showSubtitle && (
            <span
              className={`font-semibold tracking-wider text-[#00a896] uppercase mt-0.5 ${textSub}`}
            >
              {subtitleText}
            </span>
          )}
        </div>
      )}
    </div>
  )
}

export const logoOfficial = logoSimbolo
export default CondPackLogo
