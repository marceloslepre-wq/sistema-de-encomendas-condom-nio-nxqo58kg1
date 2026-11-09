import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'

/**
 * Detecta dispositivos de toque (celular/tablet) via media query de apontamento
 * (`pointer: coarse`) — NÃO por user-agent. No desktop (`pointer: fine`) o
 * retorno é sempre false e o comportamento fica idêntico ao de antes.
 */
export function useCoarsePointer(): boolean {
  const [isCoarse, setIsCoarse] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return
    const mq = window.matchMedia('(pointer: coarse)')
    const update = () => setIsCoarse(mq.matches)
    update()
    mq.addEventListener('change', update)
    return () => mq.removeEventListener('change', update)
  }, [])

  return isCoarse
}

type TouchComboboxProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Conteúdo do gatilho (o botão do combobox), renderizado com PopoverTrigger asChild. */
  trigger: ReactNode
  /** Classes extras para o PopoverContent (largura etc., igual ao layout atual). */
  contentClassName?: string
  /** Alinhamento do popover (padrão "start", como nos usos atuais). */
  align?: 'start' | 'center' | 'end'
  children: ReactNode
}

/**
 * Wrapper de Popover para combobox shadcn (Popover + Command/CommandInput) que
 * corrige o bug mobile: no toque, o PopoverContent do Radix rouba o foco e o
 * input de busca não recebe foco real de teclado, então o teclado virtual não sobe.
 *
 * Em dispositivos touch (`pointer: coarse`):
 *  - impede o Radix de focar o container do popover (onOpenAutoFocus);
 *  - após a montagem do popover, foca o input de busca com um pequeno atraso,
 *    fazendo o teclado virtual subir para digitar/filtrar;
 *  - corrige largura/pointer-events do conteúdo (max-width de viewport).
 *
 * No desktop nada muda: nenhuma dessas interferências é aplicada.
 */
export function TouchCombobox({
  open,
  onOpenChange,
  trigger,
  contentClassName,
  align = 'start',
  children,
}: TouchComboboxProps) {
  const isTouch = useCoarsePointer()
  const contentRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!open || !isTouch) return
    // Pequeno atraso para o popover montar antes de focar o input de busca,
    // fazendo o teclado virtual subir no celular.
    const timer = setTimeout(() => {
      const input = contentRef.current?.querySelector<HTMLInputElement>('input')
      input?.focus({ preventScroll: true })
    }, 120)
    return () => clearTimeout(timer)
  }, [open, isTouch])

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      <PopoverContent
        ref={contentRef}
        align={align}
        // Só em touch: impede o Radix de roubar o foco do input de busca.
        onOpenAutoFocus={(e) => {
          if (isTouch) e.preventDefault()
        }}
        className={cn(
          contentClassName,
          isTouch && 'max-w-[calc(100vw-2rem)] p-0 pointer-events-auto',
        )}
      >
        {children}
      </PopoverContent>
    </Popover>
  )
}
