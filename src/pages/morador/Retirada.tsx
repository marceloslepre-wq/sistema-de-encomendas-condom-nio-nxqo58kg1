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
import { Loader2, Package, CheckCircle2 } from 'lucide-react'
import { useAuth } from '@/hooks/use-auth'
import pb from '@/lib/pocketbase/client'
import { sendWhatsapp, verifyWhatsapp, updateParcel, Parcel } from '@/services/api'
import useRealtime from '@/hooks/use-realtime'

export default function MoradorRetirada() {
  const { user } = useAuth()
  const { toast } = useToast()
  const navigate = useNavigate()

  const [parcels, setParcels] = useState<Parcel[]>([])
  const [selected, setSelected] = useState<string[]>([])
  const [exigeWhatsapp, setExigeWhatsapp] = useState(true)

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showWhatsappDialog, setShowWhatsappDialog] = useState(false)
  const [whatsappCode, setWhatsappCode] = useState('')
  const [isWhatsappSending, setIsWhatsappSending] = useState(false)

  const loadData = async () => {
    try {
      const condoRes = await pb.collection('condos').getFullList()
      if (condoRes.length > 0) setExigeWhatsapp(condoRes[0].exige_validacao_whatsapp)

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
    if (exigeWhatsapp) {
      if (!user?.phone) {
        toast({
          title: 'Telefone não cadastrado',
          description: 'Por favor, atualize seu perfil com um número de celular.',
          variant: 'destructive',
        })
        return
      }
      setIsWhatsappSending(true)
      try {
        await sendWhatsapp(user.phone, 'codigo')
        setShowWhatsappDialog(true)
      } catch (err) {
        toast({
          title: 'Erro',
          description: 'Falha ao enviar WhatsApp para o seu celular.',
          variant: 'destructive',
        })
      } finally {
        setIsWhatsappSending(false)
      }
    } else {
      processWithdrawal()
    }
  }

  const handleVerifyAndWithdraw = async () => {
    setIsSubmitting(true)
    try {
      await verifyWhatsapp(user.phone, whatsappCode)
      await processWithdrawal()
      setShowWhatsappDialog(false)
    } catch (err) {
      toast({ title: 'Erro', description: 'Código inválido ou expirado.', variant: 'destructive' })
      setIsSubmitting(false)
    }
  }

  const processWithdrawal = async () => {
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
              disabled={selected.length === 0 || isWhatsappSending}
              onClick={handleRetirar}
            >
              {isWhatsappSending ? (
                <Loader2 className="animate-spin mr-2 h-5 w-5" />
              ) : (
                <Package className="mr-2 h-5 w-5" />
              )}
              Retirar {selected.length} Selecionada(s)
            </Button>
          )}
        </CardContent>
      </Card>

      <Dialog open={showWhatsappDialog} onOpenChange={setShowWhatsappDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Validação de Segurança</DialogTitle>
            <DialogDescription>
              Digite o código de 6 dígitos enviado por WhatsApp para o seu celular com final{' '}
              {user?.phone?.slice(-4)}
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center py-6 space-y-4">
            <InputOTP
              maxLength={6}
              value={whatsappCode}
              onChange={setWhatsappCode}
              disabled={isSubmitting}
            >
              <InputOTPGroup>
                <InputOTPSlot index={0} className="w-12 h-14 text-2xl" />
                <InputOTPSlot index={1} className="w-12 h-14 text-2xl" />
                <InputOTPSlot index={2} className="w-12 h-14 text-2xl" />
              </InputOTPGroup>
              <InputOTPSeparator />
              <InputOTPGroup>
                <InputOTPSlot index={3} className="w-12 h-14 text-2xl" />
                <InputOTPSlot index={4} className="w-12 h-14 text-2xl" />
                <InputOTPSlot index={5} className="w-12 h-14 text-2xl" />
              </InputOTPGroup>
            </InputOTP>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowWhatsappDialog(false)}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button
              disabled={whatsappCode.length < 6 || isSubmitting}
              onClick={handleVerifyAndWithdraw}
              className="bg-success hover:bg-success/90 text-white"
            >
              {isSubmitting ? (
                <Loader2 className="animate-spin mr-2 h-4 w-4" />
              ) : (
                <CheckCircle2 className="mr-2 h-4 w-4" />
              )}
              Confirmar Retirada
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
