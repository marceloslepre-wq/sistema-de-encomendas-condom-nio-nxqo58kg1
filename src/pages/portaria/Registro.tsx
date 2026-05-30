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
import {
  Smartphone,
  CheckCircle2,
  Package as PkgIcon,
  Loader2,
  Truck,
  Hash,
  ShieldCheck,
  Plus,
} from 'lucide-react'
import { getUnits, getUsers, createParcel, sendSms, verifySms, Unit, AppUser } from '@/services/api'
import { useAuth } from '@/hooks/use-auth'

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

  const [isSuccess, setIsSuccess] = useState(false)

  const [units, setUnits] = useState<Unit[]>([])
  const [users, setUsers] = useState<AppUser[]>([])

  const [unitId, setUnitId] = useState('')
  const [residentId, setResidentId] = useState('')
  const [volumes, setVolumes] = useState(1)
  const [trackingCode, setTrackingCode] = useState('')

  const [courierName, setCourierName] = useState('')
  const [courierCpf, setCourierCpf] = useState('')
  const [carrier, setCarrier] = useState('')

  const [phone, setPhone] = useState('')
  const [smsSent, setSmsSent] = useState(false)
  const [smsCode, setSmsCode] = useState('')
  const [smsMockCode, setSmsMockCode] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

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

  const selectedResident = useMemo(
    () => users.find((u) => u.id === residentId),
    [residentId, users],
  )

  useEffect(() => {
    if (filteredResidents.length === 1 && !residentId) {
      setResidentId(filteredResidents[0].id)
    }
  }, [filteredResidents, residentId])

  useEffect(() => {
    if (selectedResident?.phone) {
      setPhone(formatPhone(selectedResident.phone))
    } else {
      setPhone('')
    }
  }, [selectedResident])

  const isFormValid = useMemo(() => {
    return unitId && carrier && courierName.trim() !== '' && courierCpf.length === 14
  }, [unitId, carrier, courierName, courierCpf])

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
      toast({ title: 'SMS Enviado', description: 'Código enviado para o celular informado.' })
    } catch (err) {
      toast({ title: 'Erro', description: 'Falha ao enviar SMS.', variant: 'destructive' })
    } finally {
      setIsSending(false)
    }
  }

  const handleFinish = async () => {
    if (smsCode.length < 6 || !isFormValid) return
    setIsSubmitting(true)

    try {
      await verifySms(phone, smsCode)

      await createParcel({
        unit_id: unitId,
        resident_id: residentId || null,
        volumes,
        tracking_code: trackingCode,
        carrier,
        courier_name: courierName,
        courier_cpf: courierCpf,
        status: 'RECEBIDO_PORTARIA',
        entry_date: new Date().toISOString(),
        porter_id: user?.id,
      })

      setIsSuccess(true)
      toast({
        title: 'Sucesso!',
        description: 'Encomenda registrada com sucesso.',
        className: 'bg-success text-white',
      })
    } catch (err: any) {
      toast({
        title: 'Erro',
        description: err.message || 'Código inválido ou expirado.',
        variant: 'destructive',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleReset = () => {
    setIsSuccess(false)
    setSmsSent(false)
    setSmsCode('')
    setSmsMockCode('')
    setUnitId('')
    setResidentId('')
    setVolumes(1)
    setTrackingCode('')
    setCourierName('')
    setCourierCpf('')
    setCarrier('')
    setPhone('')
  }

  if (isSuccess) {
    return (
      <div className="flex flex-col items-center justify-center h-[70vh] animate-fade-in-up">
        <Card className="max-w-md w-full border-success/50 shadow-lg">
          <CardContent className="pt-10 pb-8 space-y-6 text-center">
            <div className="mx-auto w-20 h-20 bg-success/10 rounded-full flex items-center justify-center">
              <CheckCircle2 className="w-10 h-10 text-success" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-foreground">
                Encomenda registrada com sucesso!
              </h2>
              <p className="text-muted-foreground">
                O morador foi notificado e a encomenda está pronta para retirada.
              </p>
            </div>
            <Button onClick={handleReset} size="lg" className="w-full gap-2 mt-4">
              <Plus className="w-4 h-4" /> Registrar Nova Encomenda
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-20 animate-fade-in">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Registrar Encomenda</h2>
        <p className="text-muted-foreground">
          Preencha os dados em uma única tela para agilizar o recebimento.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader className="border-b bg-muted/20">
              <CardTitle className="flex items-center gap-2 text-lg">
                <PkgIcon className="h-5 w-5 text-primary" /> Dados da Encomenda
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-2">
                  <Label>
                    Unidade (Torre - Apto) <span className="text-destructive">*</span>
                  </Label>
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

                <div className="space-y-2">
                  <Label>Morador</Label>
                  <Select
                    value={residentId}
                    onValueChange={setResidentId}
                    disabled={!unitId || filteredResidents.length === 0}
                  >
                    <SelectTrigger>
                      <SelectValue
                        placeholder={
                          !unitId ? 'Selecione a unidade primeiro' : 'Selecione o morador...'
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {filteredResidents.map((r) => (
                        <SelectItem key={r.id} value={r.id}>
                          {r.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-2">
                  <Label className="flex items-center gap-1.5">
                    <Hash className="w-4 h-4 text-muted-foreground" /> Quantidade de Volumes{' '}
                    <span className="text-destructive">*</span>
                  </Label>
                  <div className="flex gap-2">
                    {[1, 2, 3, 4, 5].map((num) => (
                      <Button
                        key={num}
                        type="button"
                        variant={volumes === num ? 'default' : 'outline'}
                        onClick={() => setVolumes(num)}
                        className="flex-1 text-base h-10"
                      >
                        {num}
                        {num === 5 && '+'}
                      </Button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Código de Rastreio (Opcional)</Label>
                  <Input
                    placeholder="Ex: AB123456789BR"
                    value={trackingCode}
                    onChange={(e) => setTrackingCode(e.target.value)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="border-b bg-muted/20">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Truck className="h-5 w-5 text-primary" /> Dados do Entregador
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <div className="space-y-2">
                  <Label>
                    Transportadora <span className="text-destructive">*</span>
                  </Label>
                  <Select value={carrier} onValueChange={setCarrier}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Correios">Correios</SelectItem>
                      <SelectItem value="Mercado Livre">Mercado Livre</SelectItem>
                      <SelectItem value="Amazon">Amazon</SelectItem>
                      <SelectItem value="Loggi">Loggi</SelectItem>
                      <SelectItem value="Sedex">Sedex</SelectItem>
                      <SelectItem value="Outros">Outros</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>
                    Nome <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    placeholder="Ex: Carlos Silva"
                    value={courierName}
                    onChange={(e) => setCourierName(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label>
                    CPF <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    placeholder="000.000.000-00"
                    value={courierCpf}
                    onChange={(e) => setCourierCpf(formatCpf(e.target.value))}
                    maxLength={14}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="border-primary shadow-md lg:sticky lg:top-6">
            <CardHeader className="bg-primary/5 border-b">
              <CardTitle className="flex items-center gap-2 text-primary">
                <ShieldCheck className="h-5 w-5" /> Validação do Morador
              </CardTitle>
              <CardDescription>Confirme com o morador para liberar a entrega.</CardDescription>
            </CardHeader>
            <CardContent className="pt-6 space-y-5">
              <div className="space-y-2">
                <Label>Celular do Morador</Label>
                <Input
                  placeholder="(11) 90000-0000"
                  value={phone}
                  onChange={(e) => setPhone(formatPhone(e.target.value))}
                  maxLength={15}
                  disabled={smsSent || isSubmitting}
                />
              </div>

              {!smsSent ? (
                <Button
                  className="w-full"
                  size="lg"
                  onClick={handleSendSMS}
                  disabled={phone.length < 14 || isSending}
                >
                  {isSending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Smartphone className="mr-2 h-4 w-4" />
                  )}
                  Enviar Código SMS
                </Button>
              ) : (
                <div className="space-y-5 pt-2 animate-fade-in">
                  <div className="space-y-2 flex flex-col items-center">
                    <Label className="text-primary font-medium w-full text-left">
                      Código Recebido
                    </Label>
                    {smsMockCode && (
                      <p className="text-xs text-muted-foreground bg-muted p-2 rounded w-full text-center mb-2 border border-dashed">
                        Mock code para testes: <strong>{smsMockCode}</strong>
                      </p>
                    )}
                    <InputOTP
                      maxLength={6}
                      value={smsCode}
                      onChange={setSmsCode}
                      disabled={isSubmitting}
                    >
                      <InputOTPGroup>
                        <InputOTPSlot index={0} className="w-10 h-12 text-lg" />
                        <InputOTPSlot index={1} className="w-10 h-12 text-lg" />
                        <InputOTPSlot index={2} className="w-10 h-12 text-lg" />
                      </InputOTPGroup>
                      <InputOTPSeparator />
                      <InputOTPGroup>
                        <InputOTPSlot index={3} className="w-10 h-12 text-lg" />
                        <InputOTPSlot index={4} className="w-10 h-12 text-lg" />
                        <InputOTPSlot index={5} className="w-10 h-12 text-lg" />
                      </InputOTPGroup>
                    </InputOTP>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => setSmsSent(false)}
                      disabled={isSubmitting}
                    >
                      Alterar Celular
                    </Button>
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={handleSendSMS}
                      disabled={isSending || isSubmitting}
                    >
                      {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Reenviar'}
                    </Button>
                  </div>

                  <Button
                    className="w-full bg-success hover:bg-success/90 text-white shadow-sm"
                    size="lg"
                    onClick={handleFinish}
                    disabled={smsCode.length < 6 || isSubmitting || !isFormValid}
                  >
                    {isSubmitting ? (
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    ) : (
                      <CheckCircle2 className="mr-2 h-5 w-5" />
                    )}
                    Validar e Registrar
                  </Button>
                  {!isFormValid && smsCode.length === 6 && (
                    <p className="text-xs text-destructive text-center mt-2 animate-fade-in">
                      Preencha todos os campos obrigatórios (*) antes de registrar.
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
