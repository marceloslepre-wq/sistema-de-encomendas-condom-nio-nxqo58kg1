import { useState, useEffect, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { InputOTP, InputOTPGroup, InputOTPSlot, InputOTPSeparator } from '@/components/ui/input-otp'
import { useToast } from '@/hooks/use-toast'
import { Smartphone, CheckCircle2, User, Package as PkgIcon, Loader2 } from 'lucide-react'
import { getUnits, getUsers, createParcel, sendSms, verifySms, Unit, AppUser } from '@/services/api'
import { useAuth } from '@/hooks/use-auth'
import { extractFieldErrors } from '@/lib/pocketbase/errors'
import { cn } from '@/lib/utils'

const formatCpf = (val: string) => {
  return val
    .replace(/\D/g, '')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})/, '$1-$2')
    .replace(/(-\d{2})\d+?$/, '$1')
}

const formatPhone = (val: string) => {
  return val
    .replace(/\D/g, '')
    .replace(/(\d{2})(\d)/, '($1) $2')
    .replace(/(\d{5})(\d)/, '$1-$2')
    .replace(/(-\d{4})\d+?$/, '$1')
}

export default function PortariaRegistro() {
  const { toast } = useToast()
  const { user } = useAuth()
  const [step, setStep] = useState(1)

  const [units, setUnits] = useState<Unit[]>([])
  const [users, setUsers] = useState<AppUser[]>([])

  const [unitId, setUnitId] = useState('')
  const [residentId, setResidentId] = useState('')
  const [courierName, setCourierName] = useState('')
  const [courierCpf, setCourierCpf] = useState('')
  const [carrier, setCarrier] = useState('')
  const [phone, setPhone] = useState('')

  const [smsSent, setSmsSent] = useState(false)
  const [smsCode, setSmsCode] = useState('')
  const [smsMockCode, setSmsMockCode] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [isVerifying, setIsVerifying] = useState(false)

  useEffect(() => {
    getUnits()
      .then(setUnits)
      .catch(() => {})
    getUsers()
      .then(setUsers)
      .catch(() => {})
  }, [])

  const filteredResidents = useMemo(() => {
    if (!unitId) return []
    return users.filter((u) => u.unit_id === unitId)
  }, [unitId, users])

  const selectedUnit = useMemo(() => units.find((u) => u.id === unitId), [unitId, units])
  const selectedResident = useMemo(
    () => users.find((u) => u.id === residentId),
    [residentId, users],
  )

  const handleSendSMS = async () => {
    if (!phone || phone.length < 14) {
      toast({ title: 'Atenção', description: 'Informe um celular válido.', variant: 'destructive' })
      return
    }
    setIsSending(true)
    try {
      const res = await sendSms(phone)
      setSmsSent(true)
      if (res.mockCode) setSmsMockCode(res.mockCode)
      toast({ title: 'SMS Enviado', description: 'Código enviado para o celular do entregador.' })
    } catch (err) {
      toast({ title: 'Erro', description: 'Falha ao enviar SMS.', variant: 'destructive' })
    } finally {
      setIsSending(false)
    }
  }

  const handleFinish = async () => {
    if (smsCode.length < 6) return
    setIsVerifying(true)

    try {
      await verifySms(phone, smsCode)

      await createParcel({
        unit_id: unitId,
        resident_id: residentId || null,
        carrier,
        courier_name: courierName,
        courier_cpf: courierCpf,
        status: 'RECEBIDO_PORTARIA',
        entry_date: new Date().toISOString(),
        porter_id: user?.id,
      })

      toast({
        title: 'Sucesso!',
        description: 'Encomenda registrada com sucesso.',
        className: 'bg-success text-white',
      })

      // Reset form
      setStep(1)
      setSmsSent(false)
      setSmsCode('')
      setUnitId('')
      setResidentId('')
      setCourierName('')
      setCourierCpf('')
      setCarrier('')
      setPhone('')
    } catch (err: any) {
      toast({
        title: 'Erro',
        description: err.message || 'Código inválido ou expirado.',
        variant: 'destructive',
      })
    } finally {
      setIsVerifying(false)
    }
  }

  return (
    <div className="space-y-6 max-w-2xl mx-auto pb-20">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Registrar Nova Encomenda</h2>
        <p className="text-muted-foreground">
          Siga os passos para garantir a segurança da entrega.
        </p>
      </div>

      <div className="flex items-center justify-between mb-8 relative">
        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 bg-muted z-0"></div>
        <div
          className="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-primary z-0 transition-all duration-300"
          style={{ width: step === 1 ? '0%' : step === 2 ? '50%' : '100%' }}
        ></div>

        {[1, 2, 3].map((s) => (
          <div
            key={s}
            className={cn(
              'w-8 h-8 rounded-full flex items-center justify-center z-10 transition-colors duration-300',
              step >= s ? 'bg-primary text-white' : 'bg-muted text-muted-foreground',
            )}
          >
            {s}
          </div>
        ))}
      </div>

      {step === 1 && (
        <Card className="animate-fade-in-up">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" /> Dados do Destinatário
            </CardTitle>
            <CardDescription>Busque pelo apartamento ou nome do morador.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Unidade (Torre - Apto)</Label>
              <Select
                value={unitId}
                onValueChange={(val) => {
                  setUnitId(val)
                  setResidentId('')
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a unidade..." />
                </SelectTrigger>
                <SelectContent>
                  {units.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.tower} - {u.apartment}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {unitId && (
              <div className="space-y-2 animate-fade-in">
                <Label>Morador</Label>
                <Select value={residentId} onValueChange={setResidentId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o morador..." />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredResidents.map((r) => (
                      <SelectItem key={r.id} value={r.id}>
                        {r.name}
                      </SelectItem>
                    ))}
                    {filteredResidents.length === 0 && (
                      <SelectItem value="none" disabled>
                        Nenhum morador cadastrado
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
            )}

            {(selectedUnit || selectedResident) && (
              <div className="p-3 bg-muted/50 rounded-md border text-sm animate-fade-in">
                <strong>Destino:</strong>{' '}
                {selectedResident ? selectedResident.name : 'Morador não selecionado'}
                {selectedUnit && ` (${selectedUnit.tower} - ${selectedUnit.apartment})`}
              </div>
            )}

            <Button className="w-full mt-4" onClick={() => setStep(2)} disabled={!unitId}>
              Avançar
            </Button>
          </CardContent>
        </Card>
      )}

      {step === 2 && (
        <Card className="animate-fade-in-up">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PkgIcon className="h-5 w-5" /> Dados do Entregador
            </CardTitle>
            <CardDescription>Registre quem está realizando a entrega.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Transportadora</Label>
              <Select value={carrier} onValueChange={setCarrier}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Correios">Correios</SelectItem>
                  <SelectItem value="Mercado Envios">Mercado Envios</SelectItem>
                  <SelectItem value="UPS">UPS</SelectItem>
                  <SelectItem value="Fedex">Fedex</SelectItem>
                  <SelectItem value="Outros">Outros</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Nome do Entregador</Label>
              <Input
                placeholder="Ex: Carlos Silva"
                value={courierName}
                onChange={(e) => setCourierName(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>CPF</Label>
                <Input
                  placeholder="000.000.000-00"
                  value={courierCpf}
                  onChange={(e) => setCourierCpf(formatCpf(e.target.value))}
                  maxLength={14}
                />
              </div>
              <div className="space-y-2">
                <Label>Celular (Para validação SMS)</Label>
                <Input
                  placeholder="(11) 90000-0000"
                  value={phone}
                  onChange={(e) => setPhone(formatPhone(e.target.value))}
                  maxLength={15}
                />
              </div>
            </div>
            <div className="flex gap-2 pt-4">
              <Button variant="outline" className="flex-1" onClick={() => setStep(1)}>
                Voltar
              </Button>
              <Button
                className="flex-1"
                onClick={() => setStep(3)}
                disabled={!carrier || !courierName || courierCpf.length < 14 || phone.length < 14}
              >
                Avançar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 3 && (
        <Card className="animate-fade-in-up border-primary">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Smartphone className="h-5 w-5" /> Validação SMS
            </CardTitle>
            <CardDescription>Confirme a identidade do entregador.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 flex flex-col items-center text-center">
            {!smsSent ? (
              <>
                <p className="text-sm">
                  Um código de 6 dígitos será enviado para o celular: <strong>{phone}</strong>
                </p>
                <Button onClick={handleSendSMS} size="lg" className="w-full" disabled={isSending}>
                  {isSending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  {isSending ? 'Enviando...' : 'Enviar SMS Agora'}
                </Button>
              </>
            ) : (
              <>
                <p className="text-sm font-medium">Digite o código recebido pelo entregador:</p>
                {smsMockCode && (
                  <p className="text-xs text-muted-foreground bg-muted p-2 rounded">
                    (Mock code para testes: {smsMockCode})
                  </p>
                )}
                <InputOTP maxLength={6} value={smsCode} onChange={setSmsCode}>
                  <InputOTPGroup>
                    <InputOTPSlot index={0} />
                    <InputOTPSlot index={1} />
                    <InputOTPSlot index={2} />
                  </InputOTPGroup>
                  <InputOTPSeparator />
                  <InputOTPGroup>
                    <InputOTPSlot index={3} />
                    <InputOTPSlot index={4} />
                    <InputOTPSlot index={5} />
                  </InputOTPGroup>
                </InputOTP>
                <div className="flex gap-2 w-full pt-4">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={handleSendSMS}
                    disabled={isSending}
                  >
                    Reenviar
                  </Button>
                  <Button
                    className="flex-1 bg-success hover:bg-success/90 text-white"
                    onClick={handleFinish}
                    disabled={smsCode.length < 6 || isVerifying}
                  >
                    {isVerifying ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <CheckCircle2 className="mr-2 h-4 w-4" />
                    )}
                    Validar e Concluir
                  </Button>
                </div>
              </>
            )}
            <Button
              variant="ghost"
              size="sm"
              className="w-full mt-2"
              onClick={() => setStep(2)}
              disabled={isSending || isVerifying}
            >
              Voltar para edição
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
