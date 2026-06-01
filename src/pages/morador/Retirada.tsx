import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { useToast } from '@/hooks/use-toast'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { InputOTP, InputOTPGroup, InputOTPSlot, InputOTPSeparator } from '@/components/ui/input-otp'
import { Loader2, Package } from 'lucide-react'
import { useAuth } from '@/hooks/use-auth'
import pb from '@/lib/pocketbase/client'
import { updateParcel, Parcel } from '@/services/api'
import useRealtime from '@/hooks/use-realtime'

export default function MoradorRetirada() {
  const { user } = useAuth()
  const { toast } = useToast()
  const navigate = useNavigate()

  const [parcels, setParcels] = useState<Parcel[]>([])
  const [selected, setSelected] = useState<string[]>([])

  const [isSubmitting, setIsSubmitting] = useState(false)

  const loadData = async () => {
    try {
      const res = await pb.collection('parcels').getList<Parcel>(1, 100, {
        filter: 'status = "LIBERADO_RETIRADA"',
        expand: 'resident_id,unit_id',
      })
      setParcels(res.items)
    } catch (err) {
      console.error(err)
    }
  }

  useEffect(() => {
    loadData()
  }, [])
  useRealtime('parcels', () => loadData())

  const toggleSelect = (id: string) => {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }

  const handleRetirar = async () => {
    setIsSubmitting(true)
    try {
      for (const id of selected) {
        await updateParcel(id, { status: 'RETIRADO', exit_date: new Date().toISOString() })
      }
      toast({
        title: 'Sucesso',
        description: 'Encomendas retiradas com sucesso!',
        className: 'bg-success text-white',
      })
      navigate('/morador/dashboard')
    } catch (err) {
      toast({ title: 'Erro', description: 'Falha ao processar retirada.', variant: 'destructive' })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-20 animate-fade-in">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Retirada em Massa</h2>
        <p className="text-muted-foreground">
          Selecione as encomendas que deseja retirar do Smart Locker / Portaria agora.
        </p>
      </div>

      <Card>
        <CardContent className="pt-6 space-y-4">
          {parcels.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Package className="w-12 h-12 mb-4 opacity-20" />
              <p>Nenhuma encomenda disponível para retirada.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {parcels.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center space-x-4 p-4 border rounded-xl hover:bg-muted/50 transition-colors"
                >
                  <Checkbox
                    checked={selected.includes(p.id)}
                    onCheckedChange={() => toggleSelect(p.id)}
                    className="w-5 h-5"
                  />
                  <div className="flex-1">
                    <p className="font-semibold text-lg">{p.carrier || 'Pacote'}</p>
                    <p className="text-sm text-muted-foreground">
                      {p.volume_type || 'Outros'} • Local: {p.shelf_location || '-'}
                    </p>
                  </div>
                  {p.expand?.resident_id && p.resident_id !== user?.id && (
                    <span className="text-xs bg-primary/10 text-primary px-3 py-1 rounded-full font-medium">
                      De: {p.expand.resident_id.name.split(' ')[0]}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}

          {parcels.length > 0 && (
            <Button
              className="w-full mt-6 h-12 text-lg"
              disabled={selected.length === 0 || isSubmitting}
              onClick={handleRetirar}
            >
              {isSubmitting ? (
                <Loader2 className="animate-spin mr-2 h-5 w-5" />
              ) : (
                <Package className="mr-2 h-5 w-5" />
              )}
              Retirar {selected.length} Selecionada(s)
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
