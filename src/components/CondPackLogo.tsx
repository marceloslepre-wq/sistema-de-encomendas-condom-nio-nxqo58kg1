import React from 'react'
import logoOfficial from '@/assets/adobeexpressphotosd571e567b7c04e97963bed1eef6e9237copyedited-92155.png'

interface CondPackLogoProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'full' | 'compact' | 'horizontal'
  size?: 'sm' | 'md' | 'lg' | 'xl'
  showSubtitle?: boolean
  showWordmark?: boolean
  className?: string
  imageClassName?: string
}

/**
 * Componente oficial da Logomarca CondPack:
 * - Ícone oficial: Prédios azul marinho + caixa em perspectiva teal/turquesa
 * - Wordmark: "CondPack" (com notranslate e translate="no")
 * - Slogan: "SOLUÇÕES INTELIGENTES PARA CONDOMÍNIOS"
 * - Suporta exibição da imagem oficial completa ou versão em linha adaptada
 */
export function CondPackLogo({
  variant = 'horizontal',
  size = 'md',
  showSubtitle = true,
  showWordmark = true,
  className = '',
  imageClassName = '',
  ...props
}: CondPackLogoProps) {
  // Configurações de altura de acordo com a variante e tamanho
  const sizeMap = {
    sm: { imgHeight: 'h-8', textTitle: 'text-base', textSub: 'text-[9px]' },
    md: { imgHeight: 'h-10', textTitle: 'text-lg', textSub: 'text-[10px]' },
    lg: { imgHeight: 'h-12', textTitle: 'text-xl', textSub: 'text-xs' },
    xl: { imgHeight: 'h-16', textTitle: 'text-2xl', textSub: 'text-sm' },
  }

  const { imgHeight } = sizeMap[size]

  if (variant === 'full') {
    // Exibe a imagem oficial completa (ícone + wordmark + slogan)
    return (
      <div className={`inline-flex flex-col items-center justify-center ${className}`} {...props}>
        <img
          src={logoOfficial}
          alt="CondPack — Soluções Inteligentes para Condomínios"
          className={`w-auto object-contain max-w-full ${imgHeight} ${imageClassName}`}
          loading="eager"
        />
      </div>
    )
  }

  // Variante horizontal / compact:
  // Usa a logomarca oficial com alta definição e proporção preservada
  return (
    <div className={`inline-flex items-center gap-2.5 ${className}`} {...props}>
      <img
        src={logoOfficial}
        alt="CondPack"
        className={`w-auto object-contain shrink-0 ${imgHeight} ${imageClassName}`}
        loading="eager"
      />
      {showWordmark && (
        <div className="flex flex-col justify-center leading-none select-none">
          <span
            className={`font-black tracking-tight text-slate-900 notranslate ${sizeMap[size].textTitle}`}
            translate="no"
          >
            <span className="text-[#0d2a58]">Cond</span>
            <span className="text-[#00a896]">Pack</span>
          </span>
          {showSubtitle && (
            <span
              className={`font-semibold tracking-wider text-[#00a896] uppercase mt-0.5 ${sizeMap[size].textSub}`}
            >
              Soluções Inteligentes
            </span>
          )}
        </div>
      )}
    </div>
  )
}

export { logoOfficial }
export default CondPackLogo
