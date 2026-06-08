import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useEffect } from 'react'
import { format } from 'date-fns'

const STEPS = ['Entrada', 'Triagem', 'Sala de Encomenda', 'Liberado para Retirada', 'Retirado']

export function VerticalTimeline({
  currentStep,
  pkg,
  history = [],
}: {
  currentStep: number
  pkg?: any
  history?: any[]
}) {
  useEffect(() => {
    console.log('Timeline atualizada:', {
      status: STEPS[currentStep] || 'Concluído',
      data_atualizacao: new Date().toISOString(),
    })
  }, [currentStep])

  const getStepDate = (idx: number) => {
    if (!pkg) return null
    if (idx === 0) return pkg.data_criacao || pkg.created
    if (idx === 1) {
      const h = history.find((h) => h.status === 'EM_TRIAGEM')
      return h?.created
    }
    if (idx === 2) {
      const h = history.find(
        (h) =>
          h.status === 'EM_SALA' ||
          h.status === 'SALA_ENCOMENDA' ||
          h.status === 'EM_SALA_DE_ENCOMENDAS',
      )
      return h?.created
    }
    if (idx === 3) {
      const h = history.find((h) => h.status === 'LIBERADO_RETIRADA')
      return h?.created || (pkg.status === 'LIBERADO_RETIRADA' ? pkg.updated : null)
    }
    if (idx === 4) {
      const h = history.find((h) => h.status === 'RETIRADO' || h.status === 'ENTREGUE')
      return (
        h?.created || (pkg.status === 'RETIRADO' || pkg.status === 'ENTREGUE' ? pkg.updated : null)
      )
    }
    return null
  }

  return (
    <div className="flex flex-col space-y-6 relative ml-2">
      <div className="absolute left-[15px] top-4 bottom-4 w-[2px] bg-muted" />
      {STEPS.map((step, idx) => {
        const isCompleted = idx < currentStep
        const isActive = idx === currentStep
        const stepDate = getStepDate(idx)

        return (
          <div key={step} className="flex items-center gap-4 relative z-10">
            <div
              className={cn(
                'w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-colors duration-300',
                isCompleted
                  ? 'bg-success text-white'
                  : isActive
                    ? 'bg-primary text-white ring-4 ring-primary/20'
                    : 'bg-muted text-muted-foreground border-2 border-background',
              )}
            >
              {isCompleted ? (
                <Check className="w-4 h-4" />
              ) : (
                <span className="text-xs">{idx + 1}</span>
              )}
            </div>
            <div className="flex-1 flex flex-col">
              <span
                className={cn(
                  'text-sm font-medium',
                  isActive || isCompleted ? 'text-foreground' : 'text-muted-foreground',
                )}
              >
                {step}
              </span>
              {stepDate && (isCompleted || isActive) && (
                <span className="text-xs text-muted-foreground">
                  {format(new Date(stepDate), 'dd/MM/yyyy HH:mm')}
                </span>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

export function HorizontalTimeline({
  currentStep,
  pkg,
  history = [],
}: {
  currentStep: number
  pkg?: any
  history?: any[]
}) {
  useEffect(() => {
    console.log('Timeline atualizada:', {
      status: STEPS[currentStep] || 'Concluído',
      data_atualizacao: new Date().toISOString(),
    })
  }, [currentStep])

  const getStepDate = (idx: number) => {
    if (!pkg) return null
    if (idx === 0) return pkg.data_criacao || pkg.created
    if (idx === 1) {
      const h = history.find((h) => h.status === 'EM_TRIAGEM')
      return h?.created
    }
    if (idx === 2) {
      const h = history.find(
        (h) =>
          h.status === 'EM_SALA' ||
          h.status === 'SALA_ENCOMENDA' ||
          h.status === 'EM_SALA_DE_ENCOMENDAS',
      )
      return h?.created
    }
    if (idx === 3) {
      const h = history.find((h) => h.status === 'LIBERADO_RETIRADA')
      return h?.created || (pkg.status === 'LIBERADO_RETIRADA' ? pkg.updated : null)
    }
    if (idx === 4) {
      const h = history.find((h) => h.status === 'RETIRADO' || h.status === 'ENTREGUE')
      return (
        h?.created || (pkg.status === 'RETIRADO' || pkg.status === 'ENTREGUE' ? pkg.updated : null)
      )
    }
    return null
  }

  return (
    <div className="flex items-start justify-between w-full">
      {STEPS.map((step, idx) => {
        const isCompleted = idx < currentStep
        const isActive = idx === currentStep
        const stepDate = getStepDate(idx)

        return (
          <div key={step} className="flex flex-col items-center relative flex-1">
            {idx !== 0 && (
              <div
                className={cn(
                  'absolute left-[-50%] top-4 w-full h-[2px]',
                  isCompleted || isActive ? 'bg-success' : 'bg-gray-200',
                )}
              />
            )}
            <div
              className={cn(
                'w-8 h-8 rounded-full flex items-center justify-center z-10 transition-colors duration-300',
                isCompleted
                  ? 'bg-success text-white'
                  : isActive
                    ? 'bg-primary text-white ring-4 ring-primary/20'
                    : 'bg-gray-200 text-gray-400',
              )}
            >
              {isCompleted ? (
                <Check className="w-4 h-4" />
              ) : (
                <span className="text-xs">{idx + 1}</span>
              )}
            </div>
            <div className="mt-2 flex flex-col items-center">
              <span
                className={cn(
                  'text-xs font-medium text-center',
                  isActive || isCompleted ? 'text-foreground' : 'text-muted-foreground',
                )}
              >
                {step}
              </span>
              {stepDate && (isCompleted || isActive) && (
                <span className="text-[10px] text-muted-foreground mt-1 text-center leading-tight whitespace-pre-line">
                  {format(new Date(stepDate), 'dd/MM\nHH:mm')}
                </span>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
