import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useEffect } from 'react'

export function VerticalTimeline({ currentStep }: { currentStep: number }) {
  const steps = ['Entrada', 'Triagem', 'Sala de Encomenda', 'Liberado para Retirada', 'Retirado']

  useEffect(() => {
    console.log('Timeline atualizada:', {
      status: steps[currentStep] || 'Concluído',
      data_atualizacao: new Date().toISOString(),
    })
  }, [currentStep])

  return (
    <div className="flex flex-col space-y-6 relative ml-2">
      <div className="absolute left-[15px] top-4 bottom-4 w-[2px] bg-muted" />
      {steps.map((step, idx) => {
        const isCompleted = idx < currentStep
        const isActive = idx === currentStep
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
            <div className="flex-1">
              <span
                className={cn(
                  'text-sm font-medium',
                  isActive || isCompleted ? 'text-foreground' : 'text-muted-foreground',
                )}
              >
                {step}
              </span>
            </div>
          </div>
        )
      })}
    </div>
  )
}

export function HorizontalTimeline({ currentStep }: { currentStep: number }) {
  const steps = ['Entrada', 'Triagem', 'Sala de Encomenda', 'Liberado para Retirada', 'Retirado']

  useEffect(() => {
    console.log('Timeline atualizada:', {
      status: steps[currentStep] || 'Concluído',
      data_atualizacao: new Date().toISOString(),
    })
  }, [currentStep])

  return (
    <div className="flex items-center justify-between w-full">
      {steps.map((step, idx) => {
        const isCompleted = idx < currentStep
        const isActive = idx === currentStep
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
            <span
              className={cn(
                'mt-2 text-xs font-medium text-center',
                isActive || isCompleted ? 'text-foreground' : 'text-muted-foreground',
              )}
            >
              {step}
            </span>
          </div>
        )
      })}
    </div>
  )
}
