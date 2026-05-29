import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Check, Copy } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { getParcelById, getParcelAuditLogs, Parcel } from '@/services/api'
import useRealtime from '@/hooks/use-realtime'
import { format } from 'date-fns'

export default function MoradorDetalhes() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { toast } = useToast()

  const [pkg, setPkg] = useState<Parcel | null>(null)
  const [logs, setLogs] = useState<any[]>([])

  const load = () => {
    if (!id) return
    getParcelById(id)
      .then(setPkg)
      .catch(() => navigate('/morador/dashboard'))
    getParcelAuditLogs(id).then(setLogs)
  }

  useEffect(() => {
    load()
  }, [id])
  useRealtime('parcels', (e) => {
    if (e.record.id === id) load()
  })
  useRealtime('audit_logs', (e) => {
    if (e.record.parcel_id === id) load()
  })

  if (!pkg) return <div className="p-8 text-center">Carregando...</div>

  const withdrawalToken = pkg.id.substring(0, 6).toUpperCase()

  const copyToken = () => {
    navigator.clipboard.writeText(withdrawalToken)
    toast({ title: 'Token Copiado!', description: 'Apresente este código na portaria.' })
  }

  // Deduplicate consecutive actions for visual timeline
  const uniqueLogs = logs.reduce((acc, log) => {
    if (acc.length === 0 || acc[acc.length - 1].action !== log.action) {
      acc.push(log)
    }
    return acc
  }, [] as any[])

  return (
    <div className="space-y-6 max-w-lg mx-auto">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h2 className="text-2xl font-bold tracking-tight">Detalhes do Pacote</h2>
      </div>

      {pkg.status === 'DISPONIVEL_RETIRADA' && (
        <Card className="border-primary shadow-md overflow-hidden relative">
          <div className="bg-primary p-6 text-center text-primary-foreground relative z-10">
            <p className="text-sm opacity-80 mb-2">CÓDIGO DE RETIRADA</p>
            <div className="text-5xl font-black tracking-widest font-mono mb-4">
              {withdrawalToken}
            </div>
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
      )}

      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-4 flex flex-col items-center text-center justify-center space-y-1">
            <span className="text-xs text-muted-foreground">Transportadora</span>
            <span className="font-semibold">{pkg.carrier || 'Não informada'}</span>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex flex-col items-center text-center justify-center space-y-1">
            <span className="text-xs text-muted-foreground">Status Atual</span>
            <span className="font-semibold uppercase text-sm">{pkg.status.replace(/_/g, ' ')}</span>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-6">
          <h3 className="font-semibold mb-6">Histórico de Movimentações</h3>
          <div className="flex flex-col space-y-6">
            {uniqueLogs.map((log, idx) => (
              <div key={log.id} className="flex gap-4 items-start relative">
                <div className="flex flex-col items-center">
                  <div className="w-8 h-8 rounded-full bg-success flex items-center justify-center text-white z-10 shadow-sm">
                    <Check size={16} />
                  </div>
                  {idx !== uniqueLogs.length - 1 && (
                    <div className="absolute top-8 bottom-[-24px] left-4 w-0.5 bg-success/30 -translate-x-1/2"></div>
                  )}
                </div>
                <div className="pt-1">
                  <p className="font-medium leading-none uppercase text-sm">
                    {log.action.replace(/_/g, ' ')}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {format(new Date(log.created), 'dd/MM/yyyy')} às{' '}
                    {format(new Date(log.created), 'HH:mm')}
                  </p>
                </div>
              </div>
            ))}
            {uniqueLogs.length === 0 && (
              <p className="text-sm text-muted-foreground">Nenhuma movimentação registrada.</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
