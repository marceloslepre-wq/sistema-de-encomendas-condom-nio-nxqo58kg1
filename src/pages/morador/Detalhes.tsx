import { useParams, useNavigate } from 'react-router-dom'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, Check, Copy } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { MOCK_PACKAGES } from '@/lib/mock'

export default function MoradorDetalhes() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { toast } = useToast()

  const pkg = MOCK_PACKAGES.find((p) => p.id === id) || MOCK_PACKAGES[0]

  const timelineEvents = [
    { title: 'Pronto para Retirada', time: '14:30', date: 'Hoje', active: true },
    { title: 'Etiqueta Impressa', time: '14:28', date: 'Hoje', active: true },
    { title: 'Recebido na Portaria', time: '14:25', date: 'Hoje', active: true },
  ]

  const copyToken = () => {
    toast({ title: 'Token Copiado!', description: 'Apresente este código na portaria.' })
  }

  return (
    <div className="space-y-6 max-w-lg mx-auto">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h2 className="text-2xl font-bold tracking-tight">Detalhes do Pacote</h2>
      </div>

      <Card className="border-primary shadow-md overflow-hidden relative">
        <div className="bg-primary p-6 text-center text-primary-foreground relative z-10">
          <p className="text-sm opacity-80 mb-2">CÓDIGO DE RETIRADA</p>
          <div className="text-5xl font-black tracking-widest font-mono mb-4">{pkg.token}</div>
          <Button
            variant="secondary"
            size="sm"
            onClick={copyToken}
            className="font-semibold text-primary"
          >
            <Copy className="h-4 w-4 mr-2" /> Copiar Código
          </Button>
        </div>
      </Card>

      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-4 flex flex-col items-center text-center justify-center space-y-1">
            <span className="text-xs text-muted-foreground">Transportadora</span>
            <span className="font-semibold">{pkg.courier}</span>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex flex-col items-center text-center justify-center space-y-1">
            <span className="text-xs text-muted-foreground">Formato</span>
            <span className="font-semibold">{pkg.type}</span>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-6">
          <h3 className="font-semibold mb-6">Linha do Tempo</h3>
          <div className="flex flex-col space-y-6">
            {timelineEvents.map((event, idx) => (
              <div key={idx} className="flex gap-4 items-start relative">
                <div className="flex flex-col items-center">
                  <div className="w-8 h-8 rounded-full bg-success flex items-center justify-center text-white z-10 shadow-sm">
                    <Check size={16} />
                  </div>
                  {idx !== timelineEvents.length - 1 && (
                    <div className="absolute top-8 bottom-[-24px] left-4 w-0.5 bg-success/30 -translate-x-1/2"></div>
                  )}
                </div>
                <div className="pt-1">
                  <p className="font-medium leading-none">{event.title}</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {event.date} às {event.time}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
