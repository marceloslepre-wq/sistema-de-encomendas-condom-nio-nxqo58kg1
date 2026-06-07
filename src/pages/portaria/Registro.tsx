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
import { getUnits, getMoradores, getCarriers, Unit, Morador, Carrier } from '@/services/api'
import { getErrorMessage, extractFieldErrors } from '@/lib/pocketbase/errors'
import pb from '@/lib/pocketbase/client'
import { RecebimentosTable } from '@/components/RecebimentosTable'
import { useRealtime } from '@/hooks/use-realtime'

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
  residents?: Morador[]
  loadingResidents?: boolean
}

export default function PortariaRegistro() {
  const { toast } = useToast()

  const [units, setUnits] = useState<Unit[]>([])
  const [moradores, setMoradores] = useState<Morador[]>([])
  const [carriers, setCarriers] = useState<Carrier[]>([])

  const [entries, setEntries] = useState<TableEntry[]>(() => [
    {
      id: crypto.randomUUID(),
      unitId: '',
      residentId: '',
      volumes: 1,
      residents: [],
      loadingResidents: false,
    },
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

  const loadUnits = () => {
    getUnits()
      .then(setUnits)
      .catch((err) => console.error('Error fetching units:', err))
  }

  const loadMoradores = () => {
    getMoradores()
      .then(setMoradores)
      .catch((err) => console.error('Error fetching moradores:', err))
  }

  const loadCarriers = () => {
    getCarriers()
      .then(setCarriers)
      .catch((err) => console.error('Error fetching carriers:', err))
  }

  useEffect(() => {
    loadUnits()
    loadMoradores()
    loadCarriers()
  }, [])

  useRealtime('units', () => loadUnits())
  useRealtime('moradores', () => loadMoradores())
  useRealtime('carriers', () => loadCarriers())

  const handleAddEntry = () => {
    setEntries((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        unitId: '',
        residentId: '',
        volumes: 1,
        residents: [],
        loadingResidents: false,
      },
    ])
  }

  const removeEntry = (id: string) => {
    setEntries((prev) => (prev.length > 1 ? prev.filter((e) => e.id !== id) : prev))
  }

  const updateEntry = (
    id: string,
    updates: Partial<TableEntry> | ((entry: TableEntry) => Partial<TableEntry>),
  ) => {
    setEntries((prev) =>
      prev.map((e) => {
        if (e.id === id) {
          const newValues = typeof updates === 'function' ? updates(e) : updates
          return { ...e, ...newValues }
        }
        return e
      }),
    )
  }

  const isFormValid = useMemo(() => {
    const hasInvalidEntry = entries.some((e) => !e.unitId || !e.residentId || e.volumes < 1)
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
      if (entries.length === 0) throw new Error('Adicione pelo menos uma encomenda.')
      const hasInvalid = entries.some((e) => !e.unitId || !e.residentId || e.volumes < 1)
      if (hasInvalid)
        throw new Error('Existem encomendas com campos obrigatórios ausentes ou inválidos.')
      if (!carrier) throw new Error('Selecione uma transportadora.')
      if (!courierName) throw new Error('Nome do entregador é obrigatório.')
      if (courierCpf.replace(/\D/g, '').length !== 11)
        throw new Error('CPF do entregador inválido.')
      if (!isCodeVerified && !bypassValidation)
        throw new Error('A validação via WhatsApp é obrigatória.')

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
        const resident =
          group.residents?.find((m) => m.id === group.residentId) ||
          moradores.find((m) => m.id === group.residentId)

        if (!unit || !resident) {
          throw new Error('Unidade ou morador referenciado não foi encontrado no sistema.')
        }

        if (!group.unitId || !group.residentId) {
          throw new Error(
            'As referências de unidade e morador (unit_id, resident_id) são obrigatórias.',
          )
        }

        let userId = ''
        try {
          const userRecord = await pb
            .collection('users')
            .getFirstListItem(`email="${resident.email}"`)
          if (userRecord && userRecord.id) {
            userId = userRecord.id
          }
        } catch (e) {
          console.log('Morador não possui cadastro de usuário ainda.')
        }

        const unidadeStr = `${unit.tower} - ${unit.apartment}`
        const moradorNome = resident.nome
        const codValidado = bypassValidation ? 'MANUAL' : validationCode

        if (!codValidado) {
          throw new Error('Código de validação está ausente.')
        }

        const totalVols = group.volumes
        const tickets =
          totalVols > 1
            ? Array.from({ length: totalVols }).map((_, i) => `${i + 1}/${totalVols}`)
            : ['1']

        console.log('Criando tickets:', {
          entrada_id: 'gerado-na-criacao',
          total_volumes: totalVols,
          tickets,
        })

        let messageSent = false

        for (let i = 0; i < totalVols; i++) {
          const payload: Record<string, any> = {
            unidade: unidadeStr,
            morador: moradorNome,
            volume: tickets[i],
            transportadora: carrier,
            status: isCodeVerified
              ? 'Validado'
              : bypassValidation
                ? 'Aprovação Manual'
                : 'ENTRADA_PORTARIA',
            unidade_id: group.unitId,
            morador_id: userId || '',
            entregador_nome: courierName,
            entregador_cpf: courierCpf.replace(/\D/g, ''),
            codigo_rastreio: '',
            observacoes: `Validação: ${codValidado} | Celular Entregador: ${courierPhone.replace(/\D/g, '')}`,
            celular_validacao: courierPhone.replace(/\D/g, ''),
            codigo_validacao: codValidado,
          }

          if (pb.authStore.record?.id) {
            payload.recebido_por = pb.authStore.record.id
          }

          console.log(
            'Database Submission Logging:',
            JSON.stringify(
              {
                unidade: payload.unidade,
                morador: payload.morador,
                volume: payload.volume,
                fullPayload: payload,
              },
              null,
              2,
            ),
          )

          try {
            const record = await pb.collection('recebimentos_auditoria').create(payload)
            console.log(
              'Database Confirmation Logging:',
              JSON.stringify(
                {
                  id: record.id,
                  timestamp: new Date().toISOString(),
                },
                null,
                2,
              ),
            )

            const unidade = payload.unidade
            const morador = payload.morador
            const volume = payload.volume
            console.log('Entrada registrada:', { unidade, morador, volume })

            if (!messageSent) {
              const message = `Sua encomenda (${totalVols} volume${totalVols > 1 ? 's' : ''}) chegou na portaria`
              const phone_morador = resident.telefone

              console.log('Enviando notificação para morador:', { phone_morador, message })

              if (phone_morador) {
                try {
                  const resposta = await pb.send('/backend/v1/enviar-notificacao-morador', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ phone: phone_morador, message }),
                  })
                  console.log('Resposta notificação:', resposta)
                } catch (erro) {
                  console.log('ERRO notificação:', erro)
                }
              }
              messageSent = true
            }
          } catch (dbErr: any) {
            console.error('Database Failure Logging:', dbErr)
            throw dbErr
          }
        }
      }

      setRegistrationSuccess(true)
      toast({
        title: 'Sucesso!',
        description: 'Encomendas registradas com sucesso e já disponíveis na Triagem.',
        className: 'bg-success text-white',
      })
      setRefreshTrigger((prev) => prev + 1)
    } catch (err: any) {
      console.error('ERRO ao gravar:', err)
      const fieldErrors = extractFieldErrors(err)
      let detailedMsg = err.message || getErrorMessage(err)

      if (Object.keys(fieldErrors).length > 0) {
        const fields = Object.entries(fieldErrors)
          .map(([key, val]) => `${key}: ${val}`)
          .join('\n')
        detailedMsg = `Erros de validação:\n${fields}`
      }

      toast({
        title: 'Falha ao salvar',
        description: detailedMsg,
        variant: 'destructive',
        className: 'whitespace-pre-wrap',
      })

      setIsSubmitting(false)
      throw err // Do not swallow the error per AC
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleNewRegistration = () => {
    setEntries([
      {
        id: crypto.randomUUID(),
        unitId: '',
        residentId: '',
        volumes: 1,
        residents: [],
        loadingResidents: false,
      },
    ])
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

    console.log('Enviando para entregador:', { phone: digits })

    try {
      const responseBody = await pb.send('/backend/v1/enviar-codigo-whatsapp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: digits }),
      })

      console.log('Resposta hook:', responseBody)

      if (!responseBody.success) {
        const errorMsg = responseBody.message || responseBody.error || 'Falha ao enviar WhatsApp.'
        toast({
          title: 'Erro na API WhatsApp',
          description: `Falha ao processar o envio. ${errorMsg}`,
          variant: 'destructive',
        })
        setIsCodeSent(false)
        return
      }

      setIsCodeSent(true)
      setIsCodeVerified(false)
      setBypassValidation(false)
      setValidationCode('')
    } catch (err: any) {
      console.log('ERRO hook:', err)
      toast({
        title: 'Erro de Conexão',
        description: 'Não foi possível conectar à API de WhatsApp.',
        variant: 'destructive',
      })
      setIsCodeSent(false)
      throw err // Do not swallow the error per AC
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
      const verifyResponse = await pb.send('/backend/v1/verify-whatsapp-code', {
        method: 'POST',
        body: JSON.stringify({ phone: digits, code: validationCode }),
        headers: { 'Content-Type': 'application/json' },
      })

      console.log('Verify API Response Logging:', verifyResponse)

      setIsCodeVerified(true)

      toast({
        title: 'Código validado com sucesso!',
        description: 'A autorização foi confirmada com sucesso.',
        className: 'bg-success text-white',
      })
    } catch (err: any) {
      console.error('Verify API Failure Logging:', err)
      const detail = err.response?.message || err.message || 'Código inválido ou expirado'
      toast({
        title: 'Erro na Verificação',
        description: detail,
        variant: 'destructive',
      })
      setIsVerifyingCode(false)
      throw err // Do not swallow the error per AC
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
                        <TableHead>
                          Morador <span className="text-destructive">*</span>
                        </TableHead>
                        <TableHead className="w-32">
                          Volume <span className="text-destructive">*</span>
                        </TableHead>
                        <TableHead className="w-[80px] text-center pr-4">Ação</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {entries.map((entry) => {
                        const selectedUnit = units.find((u) => u.id === entry.unitId)
                        const filteredResidents = entry.residents || []
                        return (
                          <TableRow key={entry.id} className="animate-fade-in">
                            <TableCell className="align-top pt-4 pl-4">
                              <Select
                                value={entry.unitId}
                                onValueChange={(val) => {
                                  updateEntry(entry.id, () => ({
                                    unitId: val,
                                    residentId: '',
                                    residents: [],
                                    loadingResidents: true,
                                  }))

                                  const unit = units.find((u) => u.id === val)
                                  const towerStr = unit?.tower ? String(unit.tower).trim() : ''
                                  const aptStr = unit?.apartment
                                    ? String(unit.apartment).trim()
                                    : ''

                                  if (!unit || !towerStr || !aptStr) {
                                    updateEntry(entry.id, (curr) =>
                                      curr.unitId === val ? { loadingResidents: false } : {},
                                    )
                                    return
                                  }

                                  const safeTower = towerStr.replace(/'/g, "\\'")
                                  const safeApartment = aptStr.replace(/'/g, "\\'")

                                  pb.collection('moradores')
                                    .getFullList({
                                      filter: `torre='${safeTower}' && apartamento='${safeApartment}'`,
                                    })
                                    .then((resultado) => {
                                      updateEntry(entry.id, (curr) =>
                                        curr.unitId === val
                                          ? {
                                              residents: resultado as Morador[],
                                              loadingResidents: false,
                                            }
                                          : {},
                                      )
                                    })
                                    .catch((erro) => {
                                      console.error('ERRO query moradores:', erro)
                                      toast({
                                        title: 'Erro de Busca',
                                        description:
                                          'Não foi possível carregar os moradores desta unidade. Verifique os dados e tente novamente.',
                                        variant: 'destructive',
                                      })
                                      updateEntry(entry.id, (curr) =>
                                        curr.unitId === val
                                          ? { residents: [], loadingResidents: false }
                                          : {},
                                      )
                                    })
                                }}
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
                                onValueChange={(val) =>
                                  updateEntry(entry.id, (curr) => ({ residentId: val }))
                                }
                                disabled={
                                  entry.loadingResidents ||
                                  (!entry.unitId && filteredResidents.length === 0)
                                }
                              >
                                <SelectTrigger className="bg-background">
                                  <SelectValue
                                    placeholder={
                                      !entry.unitId
                                        ? 'Selecione a unidade'
                                        : entry.loadingResidents
                                          ? 'Carregando moradores...'
                                          : filteredResidents.length === 0
                                            ? 'Nenhum morador encontrado'
                                            : 'Selecione o morador'
                                    }
                                  />
                                </SelectTrigger>
                                <SelectContent>
                                  {filteredResidents.map((r) => (
                                    <SelectItem key={r.id} value={r.id}>
                                      {r.nome}
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
                                  updateEntry(entry.id, (curr) => ({
                                    volumes: parseInt(e.target.value, 10) || 0,
                                  }))
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

                  {!isCodeVerified && (
                    <div className="mt-4 flex items-center gap-2">
                      <Checkbox
                        id="bypass-validation"
                        checked={bypassValidation}
                        onCheckedChange={(checked) => {
                          setBypassValidation(!!checked)
                          if (checked) {
                            setIsCodeSent(false)
                            setValidationCode('')
                          }
                        }}
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
