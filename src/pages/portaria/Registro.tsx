import { useState, useEffect, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useToast } from '@/hooks/use-toast'
import {
  CheckCircle2,
  Package as PkgIcon,
  Loader2,
  Truck,
  ShieldCheck,
  Trash2,
  Plus,
} from 'lucide-react'
import { getUnits, getUsers, getCarriers, Unit, AppUser, Carrier } from '@/services/api'
import { getErrorMessage, extractFieldErrors } from '@/lib/pocketbase/errors'
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

type TableEntry = {
  id: string
  unitId: string
  residentId: string
  volumes: number
}

export default function PortariaRegistro() {
  const { toast } = useToast()

  const [units, setUnits] = useState<Unit[]>([])
  const [users, setUsers] = useState<AppUser[]>([])
  const [carriers, setCarriers] = useState<Carrier[]>([])

  const [entries, setEntries] = useState<TableEntry[]>([
    { id: crypto.randomUUID(), unitId: '', residentId: '', volumes: 1 },
  ])
  const [carrier, setCarrier] = useState('')

  const [courierName, setCourierName] = useState('')
  const [courierCpf, setCourierCpf] = useState('')
  const [courierPhone, setCourierPhone] = useState('')
  const [validationCode, setValidationCode] = useState('')

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSendingCode, setIsSendingCode] = useState(false)
  const [isCodeSent, setIsCodeSent] = useState(false)
  const [isCodeVerified, setIsCodeVerified] = useState(false)
  const [isVerifyingCode, setIsVerifyingCode] = useState(false)
  const [bypassValidation, setBypassValidation] = useState(false)

  const [registrationSuccess, setRegistrationSuccess] = useState(false)
  const [refreshTrigger, setRefreshTrigger] = useState(0)
  const [resetTableTrigger, setResetTableTrigger] = useState(0)

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

  const handleAddEntry = () => {
    setEntries([...entries, { id: crypto.randomUUID(), unitId: '', residentId: '', volumes: 1 }])
  }

  const removeEntry = (id: string) => {
    if (entries.length > 1) {
      setEntries(entries.filter((e) => e.id !== id))
    }
  }

  const updateEntry = (id: string, updates: Partial<TableEntry>) => {
    setEntries(entries.map((e) => (e.id === id ? { ...e, ...updates } : e)))
  }

  const isFormValid = useMemo(() => {
    const hasInvalidEntry = entries.some((e) => !e.unitId || e.volumes < 1)
    return (
      entries.length > 0 &&
      !hasInvalidEntry &&
      carrier &&
      courierName &&
      courierCpf.length === 14 &&
      (isCodeVerified || bypassValidation)
    )
  }, [carrier, entries, courierName, courierCpf, isCodeVerified, bypassValidation])

  const handleFinish = async () => {
    if (!isFormValid) return
    setIsSubmitting(true)

    try {
      const groups = entries.reduce(
        (acc, entry) => {
          const key = `${entry.unitId}_${entry.residentId}`
          if (!acc[key]) acc[key] = { ...entry }
          else acc[key].volumes += entry.volumes
          return acc
        },
        {} as Record<string, TableEntry>,
      )

      for (const group of Object.values(groups)) {
        const unit = units.find((u) => u.id === group.unitId)
        const resident = users.find((u) => u.id === group.residentId)
        const unidadeStr = unit ? `${unit.tower} - ${unit.apartment}` : ''
        const moradorNome = resident ? resident.name : ''

        console.log('Tentando gravar:', {
          unidade: unidadeStr,
          morador: moradorNome,
          volume: group.volumes,
          transportadora: carrier,
        })

        const resultado = await pb.collection('recebimentos_auditoria').create({
          morador_nome: moradorNome,
          morador_cpf: resident?.cpf || '',
          morador_celular: resident?.phone || '',
          entregador_nome: courierName,
          entregador_cpf: courierCpf.replace(/\D/g, ''),
          entregador_celular: courierPhone.replace(/\D/g, ''),
          data_hora_recebimento: new Date().toISOString(),
          status: 'ENTRADA_PORTARIA',
          codigo_validado: bypassValidation ? 'MANUAL' : validationCode,
          codigo_liberacao: '',
          unidade: unidadeStr,
          volumes: group.volumes,
          carrier: carrier,
          unit_id: group.unitId || '',
          resident_id: group.residentId || '',
        })

        console.log('Gravado com sucesso:', resultado)
      }

      setRegistrationSuccess(true)
      toast({
        title: 'Sucesso!',
        description: 'Encomendas registradas com sucesso!',
        className: 'bg-success text-white',
      })
      setRefreshTrigger((prev) => prev + 1)
    } catch (err: any) {
      console.error('ERRO ao gravar:', err)
      const fieldErrors = extractFieldErrors(err)
      let detailedMsg = getErrorMessage(err)

      if (Object.keys(fieldErrors).length > 0) {
        const fields = Object.keys(fieldErrors).join(', ')
        detailedMsg = `Campo(s) inválido(s): ${fields}. ${detailedMsg}`
      }

      toast({
        title: 'Erro ao salvar no banco',
        description: detailedMsg,
        variant: 'destructive',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleNewRegistration = () => {
    setEntries([{ id: crypto.randomUUID(), unitId: '', residentId: '', volumes: 1 }])
    setCarrier('')
    setCourierName('')
    setCourierCpf('')
    setCourierPhone('')
    setValidationCode('')
    setIsCodeSent(false)
    setIsCodeVerified(false)
    setIsVerifyingCode(false)
    setBypassValidation(false)
    setRegistrationSuccess(false)
    setResetTableTrigger((prev) => prev + 1)
  }

  const handleSendCode = async () => {
    let digits = courierPhone.replace(/\D/g, '')
    if (!digits) {
      toast({ title: 'Erro', description: 'Celular obrigatório', variant: 'destructive' })
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
          headers: { 'Content-Type': 'application/json', Authorization: pb.authStore.token },
          body: JSON.stringify({ phone: digits }),
        },
      ).catch(() => null)

      if (response && !response.ok) {
        toast({
          title: 'Aviso',
          description: 'Erro na notificação, mas você pode prosseguir com o código.',
          variant: 'destructive',
        })
      }

      setIsCodeSent(true)
      setIsCodeVerified(false)
      setBypassValidation(false)
      setValidationCode('')
    } catch (err: any) {
      toast({
        title: 'Aviso',
        description: 'Erro na notificação, mas você pode prosseguir com o código.',
        variant: 'destructive',
      })
      setIsCodeSent(true)
      setIsCodeVerified(false)
      setBypassValidation(false)
      setValidationCode('')
    } finally {
      setIsSendingCode(false)
    }
  }

  const handleVerifyCode = async () => {
    if (!validationCode || validationCode.length < 4) {
      toast({ title: 'Aviso', description: 'Digite um código válido.', variant: 'destructive' })
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
        body: JSON.stringify({ phone: digits, code: validationCode }),
        headers: { 'Content-Type': 'application/json' },
      })

      setIsCodeVerified(true)

      toast({
        title: 'Código Verificado',
        description: 'A autorização foi confirmada com sucesso.',
        className: 'bg-success text-white',
      })
    } catch (err: any) {
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

      {registrationSuccess ? (
        <Card className="text-center py-12 animate-fade-in">
          <CardContent>
            <CheckCircle2 className="w-20 h-20 text-success mx-auto mb-6" />
            <h3 className="text-3xl font-bold tracking-tight mb-2">
              Encomendas registradas com sucesso!
            </h3>
            <p className="text-muted-foreground mb-8">
              Os pacotes foram lançados no sistema e já constam na fila da Triagem.
            </p>
            <Button onClick={handleNewRegistration} size="lg" className="h-12 text-lg">
              <Plus className="mr-2 w-5 h-5" /> Novo Registro
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader className="border-b bg-muted/20">
            <CardTitle className="flex items-center gap-2 text-lg">
              <PkgIcon className="h-5 w-5 text-primary" /> Dados da Encomenda
            </CardTitle>
            <CardDescription>Adicione as encomendas vinculadas à mesma entrega.</CardDescription>
          </CardHeader>
          <CardContent className="pt-6 space-y-6">
            <div className="space-y-4">
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
              </div>

              <div className="pt-4 border-t">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 gap-4">
                  <Label className="text-lg font-semibold flex items-center gap-2">
                    <PkgIcon className="w-5 h-5" /> Encomendas
                  </Label>
                  <Button type="button" variant="outline" size="sm" onClick={handleAddEntry}>
                    <Plus className="w-4 h-4 mr-1" /> Adicionar Destinatário
                  </Button>
                </div>

                <div className="rounded-md border bg-card overflow-hidden">
                  <Table>
                    <TableHeader className="bg-muted/50">
                      <TableRow>
                        <TableHead className="pl-4">
                          Unidade <span className="text-destructive">*</span>
                        </TableHead>
                        <TableHead>Morador (Opcional)</TableHead>
                        <TableHead className="w-32">
                          Volume <span className="text-destructive">*</span>
                        </TableHead>
                        <TableHead className="w-[80px] text-center pr-4">Ação</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {entries.map((entry) => {
                        const filteredResidents = users.filter((u) => u.unit_id === entry.unitId)
                        return (
                          <TableRow key={entry.id} className="animate-fade-in">
                            <TableCell className="align-top pt-4 pl-4">
                              <Select
                                value={entry.unitId}
                                onValueChange={(val) =>
                                  updateEntry(entry.id, { unitId: val, residentId: '' })
                                }
                              >
                                <SelectTrigger className="bg-background">
                                  <SelectValue placeholder="Selecione..." />
                                </SelectTrigger>
                                <SelectContent>
                                  {units.map((u) => (
                                    <SelectItem key={u.id} value={u.id}>
                                      {u.tower} - {u.apartment}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </TableCell>
                            <TableCell className="align-top pt-4">
                              <Select
                                value={entry.residentId}
                                onValueChange={(val) => updateEntry(entry.id, { residentId: val })}
                                disabled={!entry.unitId || filteredResidents.length === 0}
                              >
                                <SelectTrigger className="bg-background">
                                  <SelectValue
                                    placeholder={
                                      !entry.unitId ? 'Selecione a unidade' : 'Selecione o morador'
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
                            </TableCell>
                            <TableCell className="align-top pt-4">
                              <Input
                                type="number"
                                min="1"
                                value={entry.volumes || ''}
                                onChange={(e) =>
                                  updateEntry(entry.id, {
                                    volumes: parseInt(e.target.value, 10) || 0,
                                  })
                                }
                                className="bg-background"
                              />
                            </TableCell>
                            <TableCell className="align-top pt-4 text-center pr-4">
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="text-destructive hover:bg-destructive/10 hover:text-destructive h-10 w-10"
                                onClick={() => removeEntry(entry.id)}
                                disabled={entries.length === 1}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </div>
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
                        setBypassValidation(false)
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
                        Digite o código de verificação recebido no WhatsApp para confirmar a
                        entrada.
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

                  {isCodeSent && !isCodeVerified && (
                    <div className="mt-4 flex items-center gap-2">
                      <Checkbox
                        id="bypass-validation"
                        checked={bypassValidation}
                        onCheckedChange={(checked) => setBypassValidation(!!checked)}
                      />
                      <Label
                        htmlFor="bypass-validation"
                        className="text-sm font-medium text-muted-foreground cursor-pointer"
                      >
                        Sistema inoperante? Prosseguir sem código (Aprovação Manual)
                      </Label>
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

                  {bypassValidation && !isCodeVerified && (
                    <div className="mt-4 p-4 border rounded-lg bg-amber-100 border-amber-300 flex items-center gap-3 text-amber-800 animate-fade-in shadow-sm">
                      <ShieldCheck className="h-6 w-6 shrink-0" />
                      <div>
                        <span className="font-semibold block">Aprovação Manual Ativada</span>
                        <span className="text-sm text-amber-700">
                          A validação foi ignorada manualmente pelo porteiro.
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
                <Plus className="mr-2 h-5 w-5" />
              )}
              Adicionar Encomenda
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="pt-4">
        <RecebimentosTable key={resetTableTrigger} refreshTrigger={refreshTrigger} />
      </div>
    </div>
  )
}
