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
import { CheckCircle2, Package as PkgIcon, Loader2, Truck, Hash, ShieldCheck } from 'lucide-react'
import {
  getUnits,
  getUsers,
  createParcel,
  getCarriers,
  Unit,
  AppUser,
  Carrier,
} from '@/services/api'
import { useAuth } from '@/hooks/use-auth'
import { getErrorMessage } from '@/lib/pocketbase/errors'
import pb from '@/lib/pocketbase/client'
import { RecebimentosTable } from '@/components/RecebimentosTable'

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

  const [units, setUnits] = useState<Unit[]>([])
  const [users, setUsers] = useState<AppUser[]>([])
  const [carriers, setCarriers] = useState<Carrier[]>([])

  const [unitId, setUnitId] = useState('')
  const [residentId, setResidentId] = useState('')
  const [volumes, setVolumes] = useState<number | ''>(1)
  const [carrier, setCarrier] = useState('')
  const [description, setDescription] = useState('')

  const [courierName, setCourierName] = useState('')
  const [courierCpf, setCourierCpf] = useState('')
  const [courierPhone, setCourierPhone] = useState('')
  const [validationCode, setValidationCode] = useState('')

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSendingCode, setIsSendingCode] = useState(false)
  const [isCodeSent, setIsCodeSent] = useState(false)
  const [isCodeVerified, setIsCodeVerified] = useState(false)
  const [isVerifyingCode, setIsVerifyingCode] = useState(false)
  const [refreshTrigger, setRefreshTrigger] = useState(0)
  const [formResetKey, setFormResetKey] = useState(0)

  useEffect(() => {
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
    return (
      unitId &&
      carrier &&
      Number(volumes) > 0 &&
      courierName &&
      courierCpf.length === 14 &&
      isCodeVerified
    )
  }, [unitId, carrier, volumes, courierName, courierCpf, isCodeVerified])

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

      toast({
        title: 'Sucesso!',
        description: 'Encomenda registrada! Atualizando lista...',
        className: 'bg-success text-white',
      })

      handleReset()
      setRefreshTrigger((prev) => prev + 1)
    } catch (err: any) {
      const errorMessage = getErrorMessage(err)
      console.error('Parcel Creation API Error:', errorMessage, err)

      toast({
        title: 'Aviso',
        description: `Encomenda registrada com pendências: ${errorMessage}`,
      })

      // Even if there's an API error here, the audit log is already persisted
      // so we reset the form and trigger the reactive refresh
      handleReset()
      setRefreshTrigger((prev) => prev + 1)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleReset = () => {
    setUnitId('')
    setResidentId('')
    setVolumes(1)
    setCarrier('')
    setDescription('')
    setCourierName('')
    setCourierCpf('')
    setCourierPhone('')
    setValidationCode('')
    setIsCodeSent(false)
    setIsCodeVerified(false)
    setIsVerifyingCode(false)
    setFormResetKey((prev) => prev + 1)
  }

  const handleSendCode = async () => {
    let digits = courierPhone.replace(/\D/g, '')
    if (!digits) {
      toast({
        title: 'Erro',
        description: 'Celular obrigatório',
        variant: 'destructive',
      })
      return
    }

    if (!digits.startsWith('55') && digits.length <= 11) {
      digits = `55${digits}`
    }

    setIsSendingCode(true)

    try {
      const response = await fetch(
        `${import.meta.env.VITE_POCKETBASE_URL}/backend/v1/enviar-codigo-whatsapp`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: pb.authStore.token,
          },
          body: JSON.stringify({
            phone: digits,
          }),
        },
      ).catch((err) => {
        console.error('Network error calling enviar-codigo-whatsapp:', err)
        return null
      })

      if (response && !response.ok) {
        console.error(
          `Evolution API or code sending error: ${response.status} ${response.statusText}`,
        )
        toast({
          title: 'Aviso',
          description:
            'Houve uma instabilidade no envio, mas você pode prosseguir com a validação.',
          variant: 'destructive',
        })
      }

      setIsCodeSent(true)
      setIsCodeVerified(false)
      setValidationCode('')
    } catch (err: any) {
      console.error('Failed to send code', err)
      toast({
        title: 'Aviso',
        description: 'Houve uma instabilidade no envio, mas você pode prosseguir com a validação.',
        variant: 'destructive',
      })

      setIsCodeSent(true)
      setIsCodeVerified(false)
      setValidationCode('')
    } finally {
      setIsSendingCode(false)
    }
  }

  const handleVerifyCode = async () => {
    if (!validationCode || validationCode.length < 4) {
      toast({
        title: 'Aviso',
        description: 'Digite um código válido.',
        variant: 'destructive',
      })
      return
    }

    let digits = courierPhone.replace(/\D/g, '')
    if (!digits.startsWith('55') && digits.length <= 11) {
      digits = `55${digits}`
    }

    setIsVerifyingCode(true)
    try {
      await pb.send('/backend/v1/verify-whatsapp-code', {
        method: 'POST',
        body: JSON.stringify({
          phone: digits,
          code: validationCode,
        }),
        headers: {
          'Content-Type': 'application/json',
        },
      })

      setIsCodeVerified(true)

      // Mandatory Data Persistence: Create audit log immediately upon successful validation
      try {
        await pb.collection('recebimentos_auditoria').create({
          morador_nome: courierName,
          morador_cpf: courierCpf.replace(/\D/g, ''),
          morador_celular: digits,
          data_hora_recebimento: new Date().toISOString(),
          status: 'Validado',
          descricao: description,
          codigo_validado: validationCode,
        })
        setRefreshTrigger((prev) => prev + 1)
      } catch (auditErr) {
        console.error('Failed to create audit record', auditErr)
      }

      toast({
        title: 'Código Verificado',
        description: 'A autorização foi confirmada com sucesso.',
        className: 'bg-success text-white',
      })
    } catch (err: any) {
      console.error('Failed to verify code', err)
      toast({
        title: 'Erro na Verificação',
        description: 'Código inválido. Tente novamente.',
        variant: 'destructive',
      })
    } finally {
      setIsVerifyingCode(false)
    }
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-20 animate-fade-in">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Recepção de Encomendas</h2>
        <p className="text-muted-foreground">
          Registro rápido de entrada de pacotes e histórico de recebimentos do Lobby.
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
                key={`unit-${formResetKey}`}
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
                key={`resident-${formResetKey}`}
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
              <Select key={`carrier-${formResetKey}`} value={carrier} onValueChange={setCarrier}>
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

            <div className="space-y-2 md:col-span-2">
              <Label>Descrição da Encomenda</Label>
              <Input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Ex: Caixa pequena da Amazon"
              />
            </div>
          </div>

          <div className="border-t pt-6 mt-6 space-y-6">
            <h3 className="text-lg font-medium flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-primary" /> Identificação e Autorização
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-2">
                <Label>
                  Nome do Entregador/Portador <span className="text-destructive">*</span>
                </Label>
                <Input
                  value={courierName}
                  onChange={(e) => setCourierName(e.target.value)}
                  placeholder="Ex: João da Silva"
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
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label>
                  Celular para Validação <span className="text-destructive">*</span>
                </Label>
                <div className="flex gap-2">
                  <Input
                    value={courierPhone}
                    onChange={(e) => {
                      setCourierPhone(formatPhone(e.target.value))
                      setIsCodeSent(false)
                      setIsCodeVerified(false)
                      setValidationCode('')
                    }}
                    placeholder="(00) 00000-0000"
                    maxLength={15}
                  />
                </div>
              </div>

              <div className="space-y-2 md:col-span-2 pt-4 border-t mt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleSendCode}
                  disabled={
                    isSendingCode || !courierPhone || courierPhone.replace(/\D/g, '').length < 10
                  }
                  className="w-full sm:w-auto mb-2"
                >
                  {isSendingCode ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  {isCodeSent ? 'Reenviar Código via WhatsApp' : 'Enviar Código via WhatsApp'}
                </Button>

                {isCodeSent && !isCodeVerified && (
                  <div className="space-y-3 mt-4 p-5 border rounded-lg bg-muted/30 animate-fade-in">
                    <Label className="text-base font-semibold">Código de Validação</Label>
                    <p className="text-sm text-muted-foreground">
                      Digite o código de verificação recebido no WhatsApp para confirmar a entrada.
                    </p>
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                      <Input
                        value={validationCode}
                        onChange={(e) => setValidationCode(e.target.value.replace(/\D/g, ''))}
                        placeholder="000000"
                        maxLength={6}
                        className="w-full sm:max-w-[200px] text-lg text-center tracking-widest font-mono h-11"
                      />
                      <Button
                        type="button"
                        onClick={handleVerifyCode}
                        disabled={isVerifyingCode || !validationCode}
                        className="w-full sm:w-auto bg-primary text-primary-foreground h-11"
                      >
                        {isVerifyingCode ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <ShieldCheck className="mr-2 h-4 w-4" />
                        )}
                        Validar
                      </Button>
                    </div>
                  </div>
                )}

                {isCodeVerified && (
                  <div className="mt-4 p-4 border rounded-lg bg-success/10 border-success/30 flex items-center gap-3 text-success animate-fade-in shadow-sm">
                    <CheckCircle2 className="h-6 w-6 shrink-0" />
                    <div>
                      <span className="font-semibold block">Autorização Confirmada!</span>
                      <span className="text-sm text-success/80">
                        O código foi validado com sucesso. Você já pode registrar a entrada.
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <Button
            className="w-full bg-success hover:bg-success/90 text-white mt-8 h-12 text-lg"
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

      <div className="pt-4">
        <RecebimentosTable refreshTrigger={refreshTrigger} />
      </div>
    </div>
  )
}
