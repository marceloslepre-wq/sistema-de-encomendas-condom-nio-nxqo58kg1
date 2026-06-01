import { useState, useEffect, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import {
  CheckCircle2,
  Package as PkgIcon,
  Loader2,
  Truck,
  Hash,
  Plus,
  Send,
  ShieldCheck,
} from 'lucide-react'
import {
  getUnits,
  getUsers,
  createParcel,
  getCarriers,
  Unit,
  AppUser,
  Carrier,
  verifyWhatsapp,
  createRecebimentoAuditoria,
} from '@/services/api'
import { useAuth } from '@/hooks/use-auth'
import pb from '@/lib/pocketbase/client'
import { getErrorMessage } from '@/lib/pocketbase/errors'

const formatCpf = (value: string) => {
  const v = value.replace(/\D/g, '').substring(0, 11)
  return v
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2')
}

const formatPhone = (value: string) => {
  const v = value.replace(/\D/g, '').substring(0, 11)
  if (v.length <= 10) {
    return v.replace(/(\d{2})(\d)/, '($1) $2').replace(/(\d{4})(\d)/, '$1-$2')
  }
  return v.replace(/(\d{2})(\d)/, '($1) $2').replace(/(\d{5})(\d)/, '$1-$2')
}

export default function PortariaRegistro() {
  const { toast } = useToast()
  const { user } = useAuth()

  const [isSuccess, setIsSuccess] = useState(false)

  const [units, setUnits] = useState<Unit[]>([])
  const [users, setUsers] = useState<AppUser[]>([])
  const [carriers, setCarriers] = useState<Carrier[]>([])

  const [unitId, setUnitId] = useState('')
  const [residentId, setResidentId] = useState('')
  const [volumes, setVolumes] = useState<number | ''>(1)
  const [carrier, setCarrier] = useState('')

  const [courierName, setCourierName] = useState('')
  const [courierCpf, setCourierCpf] = useState('')
  const [courierPhone, setCourierPhone] = useState('')

  const [whatsappCode, setWhatsappCode] = useState('')
  const [isWhatsappSent, setIsWhatsappSent] = useState(false)
  const [isWhatsappSending, setIsWhatsappSending] = useState(false)
  const [isWhatsappVerified, setIsWhatsappVerified] = useState(false)
  const [isWhatsappVerifying, setIsWhatsappVerifying] = useState(false)

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [exigeValidacao, setExigeValidacao] = useState(true)

  useEffect(() => {
    pb.collection('condos')
      .getFullList()
      .then((res) => {
        if (res.length > 0) setExigeValidacao(res[0].exige_validacao_sms)
      })
      .catch(() => {})

    getUnits()
      .then(setUnits)
      .catch(() => {})
    getUsers()
      .then(setUsers)
      .catch(() => {})
    getCarriers()
      .then(setCarriers)
      .catch(() => {})
  }, [])

  const filteredResidents = useMemo(() => {
    if (!unitId) return []
    return users.filter((u) => u.unit_id === unitId)
  }, [unitId, users])

  useEffect(() => {
    if (filteredResidents.length === 1 && !residentId) {
      setResidentId(filteredResidents[0].id)
    }
  }, [filteredResidents, residentId])

  const isFormValid = useMemo(() => {
    const validCode = exigeValidacao ? isWhatsappVerified : true
    return (
      unitId &&
      carrier &&
      Number(volumes) > 0 &&
      courierName &&
      courierCpf.length === 14 &&
      validCode
    )
  }, [unitId, carrier, volumes, courierName, courierCpf, isWhatsappVerified, exigeValidacao])

  const handleSendWhatsapp = async () => {
    const rawPhone = courierPhone.replace(/\D/g, '')
    if (rawPhone.length < 10) return
    setIsWhatsappSending(true)
    try {
      const code = Math.floor(100000 + Math.random() * 900000).toString()
      const message = `Seu código de validação na portaria é: ${code}`

      // Create validation record locally so verifyWhatsapp can validate it
      try {
        await pb.collection('whatsapp_verifications').create({
          phone: rawPhone,
          code,
          expires_at: new Date(Date.now() + 10 * 60000).toISOString(),
          used: false,
          attempts: 0,
        })
      } catch (err) {
        console.error('Failed to create verification record', err)
      }

      const response = await fetch(
        `${import.meta.env.VITE_POCKETBASE_URL}/functions/enviar_whatsapp_zapi`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            phone: rawPhone,
            message,
            tipo: 'codigo',
          }),
        },
      )

      const result = await response.json()

      if (result.success) {
        setIsWhatsappSent(true)
        toast({
          title: 'WhatsApp Enviado',
          description: 'O código foi enviado para o celular do entregador.',
        })
      } else {
        console.error(result.error)
        toast({
          title: 'Erro',
          description: 'Falha ao enviar o WhatsApp.',
          variant: 'destructive',
        })
      }
    } catch (err: any) {
      console.error(err)
      toast({
        title: 'Erro',
        description: 'Falha ao enviar o WhatsApp.',
        variant: 'destructive',
      })
    } finally {
      setIsWhatsappSending(false)
    }
  }

  const handleVerifyWhatsapp = async () => {
    if (!whatsappCode) return
    const rawPhone = courierPhone.replace(/\D/g, '')
    setIsWhatsappVerifying(true)
    try {
      await verifyWhatsapp(rawPhone, whatsappCode)
      setIsWhatsappVerified(true)
      toast({
        title: 'Entregador Verificado',
        description: 'O código foi validado com sucesso.',
        className: 'bg-success text-white',
      })
    } catch (err: any) {
      toast({
        title: 'Erro de Verificação',
        description: getErrorMessage(err),
        variant: 'destructive',
      })
    } finally {
      setIsWhatsappVerifying(false)
    }
  }

  const handleFinish = async () => {
    if (!isFormValid) return
    setIsSubmitting(true)

    try {
      await createParcel({
        unit_id: unitId,
        resident_id: residentId || '',
        volumes: Number(volumes),
        carrier,
        courier_name: courierName,
        courier_cpf: courierCpf.replace(/\D/g, ''),
        status: 'ENTRADA_PORTARIA',
        entry_date: new Date().toISOString(),
        porter_id: user?.id || '',
      })

      // Try saving audit log
      try {
        await createRecebimentoAuditoria({
          morador_nome: courierName,
          morador_cpf: courierCpf.replace(/\D/g, ''),
          morador_celular: courierPhone.replace(/\D/g, ''),
          codigo_enviado: whatsappCode || '',
          codigo_validado: exigeValidacao ? isWhatsappVerified : false,
          data_hora_recebimento: new Date().toISOString(),
          status: 'Recebido',
        })
      } catch (auditErr) {
        console.error('Failed to create audit record', auditErr)
      }

      setIsSuccess(true)
      toast({
        title: 'Sucesso!',
        description: 'Encomenda registrada na portaria.',
        className: 'bg-success text-white',
      })
    } catch (err: any) {
      console.error('Failed to create parcel:', err, err.response)
      toast({
        title: 'Erro',
        description: 'Falha ao registrar encomenda.',
        variant: 'destructive',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleReset = () => {
    setIsSuccess(false)
    setUnitId('')
    setResidentId('')
    setVolumes(1)
    setCarrier('')
    setCourierName('')
    setCourierCpf('')
    setCourierPhone('')
    setWhatsappCode('')
    setIsWhatsappSent(false)
    setIsWhatsappVerified(false)
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
              <h2 className="text-2xl font-bold text-foreground">Recebido na Portaria!</h2>
              <p className="text-muted-foreground">
                A encomenda agora deve ser enviada para a Sala de Encomendas.
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
    <div className="max-w-3xl mx-auto space-y-6 pb-20 animate-fade-in">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Recepção de Encomendas</h2>
        <p className="text-muted-foreground">
          Registro rápido de entrada de pacotes no Lobby (Portaria).
        </p>
      </div>

      <Card>
        <CardHeader className="border-b bg-muted/20">
          <CardTitle className="flex items-center gap-2 text-lg">
            <PkgIcon className="h-5 w-5 text-primary" /> Dados da Encomenda
          </CardTitle>
          <CardDescription>Identifique a unidade de destino e a transportadora.</CardDescription>
        </CardHeader>
        <CardContent className="pt-6 space-y-6">
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
              <Label>Morador (Opcional)</Label>
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
                <Truck className="w-4 h-4 text-muted-foreground" /> Transportadora{' '}
                <span className="text-destructive">*</span>
              </Label>
              <Select value={carrier} onValueChange={setCarrier}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  {carriers.map((c) => (
                    <SelectItem key={c.id} value={c.name}>
                      {c.name}
                    </SelectItem>
                  ))}
                  <SelectItem value="Outros">Outros</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-1.5">
                <Hash className="w-4 h-4 text-muted-foreground" /> Volumes{' '}
                <span className="text-destructive">*</span>
              </Label>
              <Input
                type="number"
                min="1"
                value={volumes}
                onChange={(e) =>
                  setVolumes(e.target.value === '' ? '' : parseInt(e.target.value, 10))
                }
                className="h-10"
                placeholder="Quantidade de volumes"
              />
            </div>
          </div>

          <div className="border-t pt-6 mt-6 space-y-6">
            <h3 className="text-lg font-medium flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-primary" /> Identificação do Entregador
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-2">
                <Label>
                  Nome <span className="text-destructive">*</span>
                </Label>
                <Input
                  value={courierName}
                  onChange={(e) => setCourierName(e.target.value)}
                  placeholder="Ex: João da Silva"
                  disabled={isWhatsappVerified}
                />
              </div>

              <div className="space-y-2">
                <Label>
                  CPF <span className="text-destructive">*</span>
                </Label>
                <Input
                  value={courierCpf}
                  onChange={(e) => setCourierCpf(formatCpf(e.target.value))}
                  placeholder="000.000.000-00"
                  maxLength={14}
                  disabled={isWhatsappVerified}
                />
              </div>

              <div className="space-y-2">
                <Label>
                  Celular {exigeValidacao && <span className="text-destructive">*</span>}
                </Label>
                <div className="flex gap-2">
                  <Input
                    value={courierPhone}
                    onChange={(e) => {
                      setCourierPhone(formatPhone(e.target.value))
                      setIsWhatsappSent(false)
                      setWhatsappCode('')
                    }}
                    placeholder="(00) 00000-0000"
                    maxLength={15}
                    disabled={exigeValidacao ? isWhatsappVerified || isWhatsappSending : false}
                  />
                  {exigeValidacao && !isWhatsappVerified && (
                    <Button
                      type="button"
                      onClick={handleSendWhatsapp}
                      disabled={isWhatsappSending || courierPhone.length < 14}
                      className="shrink-0"
                      variant={isWhatsappSent ? 'outline' : 'default'}
                    >
                      {isWhatsappSending ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Send className="w-4 h-4 mr-2" />
                      )}
                      {isWhatsappSent ? 'Reenviar' : 'Enviar Cod. Validação'}
                    </Button>
                  )}
                </div>
              </div>

              {exigeValidacao && isWhatsappSent && !isWhatsappVerified && (
                <div className="space-y-2 animate-fade-in">
                  <Label>
                    Código de Verificação <span className="text-destructive">*</span>
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      value={whatsappCode}
                      onChange={(e) => setWhatsappCode(e.target.value)}
                      placeholder="000000"
                      maxLength={6}
                    />
                    <Button
                      type="button"
                      onClick={handleVerifyWhatsapp}
                      disabled={isWhatsappVerifying || whatsappCode.length < 4}
                      variant="secondary"
                    >
                      {isWhatsappVerifying ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        'Verificar'
                      )}
                    </Button>
                  </div>
                </div>
              )}

              {exigeValidacao && isWhatsappVerified && (
                <div className="space-y-2 flex items-end">
                  <div className="flex items-center gap-2 text-success font-medium h-10 px-3 bg-success/10 rounded-md w-full border border-success/20">
                    <CheckCircle2 className="w-5 h-5" /> Entregador Verificado
                  </div>
                </div>
              )}
            </div>
          </div>

          <Button
            className="w-full bg-success hover:bg-success/90 text-white mt-8"
            size="lg"
            onClick={handleFinish}
            disabled={isSubmitting || !isFormValid}
          >
            {isSubmitting ? (
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            ) : (
              <CheckCircle2 className="mr-2 h-5 w-5" />
            )}
            Registrar Entrada
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
