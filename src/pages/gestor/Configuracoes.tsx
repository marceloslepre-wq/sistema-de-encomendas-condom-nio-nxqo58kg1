import { useEffect, useState, useRef } from 'react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Trash2,
  Plus,
  Pencil,
  Info,
  Upload,
  Image as ImageIcon,
  Check,
  QrCode,
  CheckCircle2,
  XCircle,
  Loader2,
  Smartphone,
  Unplug,
  RefreshCw,
} from 'lucide-react'
import {
  getCondo,
  updateCondo,
  conectarWhatsAppCondo,
  consultarWhatsAppStatus,
  desconectarWhatsAppCondo,
} from '@/services/condos'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  getTemplatesNotificacao,
  createTemplateNotificacao,
  updateTemplateNotificacao,
  deleteTemplateNotificacao,
} from '@/services/templates_notificacao'
import pb from '@/lib/pocketbase/client'

export default function GestorConfiguracoes() {
  const [condoId, setCondoId] = useState('')
  const [condoRecord, setCondoRecord] = useState<any>(null)
  const [formData, setFormData] = useState({
    name: '',
    cnpj: '',
    email: '',
    cidade: '',
    estado: '',
    responsavel: '',
    phone: '',
    address: '',
    shifts: '',
    guards: 0,
  })
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Estados de WhatsApp da Instância Própria
  const [waConnected, setWaConnected] = useState(false)
  const [waStatus, setWaStatus] = useState<
    'disconnected' | 'connecting' | 'connected' | 'failed' | string
  >('disconnected')
  const [waPhone, setWaPhone] = useState('')
  const [waQrCode, setWaQrCode] = useState('')
  const [waLoading, setWaLoading] = useState(false)
  const [waModalOpen, setWaModalOpen] = useState(false)
  const [waError, setWaError] = useState<string | null>(null)
  const [countdownSeconds, setCountdownSeconds] = useState<number>(120)
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const pollingCountRef = useRef<number>(0)

  // Máscaras
  const maskCNPJ = (value: string) => {
    return value
      .replace(/\D/g, '')
      .replace(/^(\d{2})(\d)/, '$1.$2')
      .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
      .replace(/\.(\d{3})(\d)/, '.$1/$2')
      .replace(/(\d{4})(\d)/, '$1-$2')
      .substring(0, 18)
  }

  const maskPhone = (value: string) => {
    return value
      .replace(/\D/g, '')
      .replace(/^(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{5})(\d{4})$/, '$1-$2')
      .substring(0, 15)
  }

  const formatDisplayPhone = (value: string) => {
    if (!value) return ''
    const digits = String(value).replace(/\D/g, '')
    // Se vier com DDI 55 e tiver 12 ou 13 dígitos no total (55 + DDD de 2 dígitos + 8 ou 9 dígitos)
    if (digits.startsWith('55') && (digits.length === 12 || digits.length === 13)) {
      const ddd = digits.substring(2, 4)
      const rest = digits.substring(4)
      if (rest.length === 9) {
        return `+55 (${ddd}) ${rest.substring(0, 5)}-${rest.substring(5)}`
      } else {
        return `+55 (${ddd}) ${rest.substring(0, 4)}-${rest.substring(4)}`
      }
    }
    // Formato padrão celular/fixo nacional (11 ou 10 dígitos)
    if (digits.length === 11) {
      return `(${digits.substring(0, 2)}) ${digits.substring(2, 7)}-${digits.substring(7)}`
    }
    if (digits.length === 10) {
      return `(${digits.substring(0, 2)}) ${digits.substring(2, 6)}-${digits.substring(6)}`
    }
    // Caso de fallback: exibir o número completo se não bater nos comprimentos conhecidos
    return value
  }

  const [templates, setTemplates] = useState<any[]>([])
  const [newTemplateStatus, setNewTemplateStatus] = useState('')
  const [newTemplateMensagem, setNewTemplateMensagem] = useState('')
  const [reminderFreq, setReminderFreq] = useState('1')
  const [reminderTime, setReminderTime] = useState('09:00')
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null)

  const FLOW_STAGES = [
    { id: 'Entrada na portaria', label: 'Entrada na portaria' },
    { id: 'Em triagem na sala de encomendas', label: 'Em triagem na sala de encomendas' },
    { id: 'Processado e Liberado para Retirada', label: 'Processado e Liberado para Retirada' },
    { id: 'Encomenda Retirada', label: 'Encomenda Retirada' },
    { id: 'CANCELADO', label: 'Cancelado' },
    { id: 'LEMBRETE', label: 'Lembrete (Retirada)' },
  ]

  const { toast } = useToast()

  // Limpeza de timers ao desmontar
  useEffect(() => {
    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current)
      }
      if (countdownRef.current) {
        clearInterval(countdownRef.current)
      }
    }
  }, [])

  const stopPolling = () => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current)
      pollingRef.current = null
    }
    if (countdownRef.current) {
      clearInterval(countdownRef.current)
      countdownRef.current = null
    }
    pollingCountRef.current = 0
  }

  const handleTimeoutFailure = async (targetCondoId: string) => {
    stopPolling()
    setWaStatus('failed')
    setWaError('Tempo limite esgotado (2 minutos). O WhatsApp não foi conectado a tempo.')
    toast({
      title: 'Falha na conexão',
      description: 'O tempo limite de 2 minutos esgotou. Clique em "Tentar novamente".',
      variant: 'destructive',
    })

    // Atualizar no banco para desconectado para que recarregar a página não mostre "Conectando..." congelado
    if (targetCondoId) {
      try {
        await updateCondo(targetCondoId, {
          whatsapp_status: 'disconnected',
          whatsapp_qrcode: '',
          whatsapp_updated_at: new Date().toISOString(),
        })
      } catch {
        /* intentionally ignored */
      }
    }
  }

  const startPollingStatus = (targetCondoId: string, initialSeconds = 120) => {
    stopPolling()
    pollingCountRef.current = 0
    const clampedInitial = Math.max(1, Math.min(120, initialSeconds))
    setCountdownSeconds(clampedInitial)

    // Contador regressivo de segundo a segundo para feedback visual de tempo
    countdownRef.current = setInterval(() => {
      setCountdownSeconds((prev) => {
        if (prev <= 1) {
          // Quando o contador zera, disparar falha por timeout
          handleTimeoutFailure(targetCondoId)
          return 0
        }
        return prev - 1
      })
    }, 1000)

    // Polling a cada 5 segundos
    pollingRef.current = setInterval(async () => {
      pollingCountRef.current += 1

      // Fallback secundário de timeout por ciclos de polling
      if (pollingCountRef.current > 24) {
        await handleTimeoutFailure(targetCondoId)
        return
      }

      try {
        const res = await consultarWhatsAppStatus(targetCondoId)
        if (res.connected || res.status === 'connected') {
          setWaConnected(true)
          setWaStatus('connected')
          if (res.phone) setWaPhone(res.phone)
          setWaQrCode('')
          setWaError(null)
          stopPolling()
          setWaModalOpen(false)
          toast({
            title: 'WhatsApp Conectado!',
            description: 'Seu WhatsApp foi conectado com sucesso para envios do condomínio.',
          })
        } else if (res.qrcode && !waConnected) {
          setWaQrCode(res.qrcode)
          setWaError(null)
        } else if (res.status === 'disconnected' && !res.qrcode) {
          // Se a instância foi finalizada ou não existe
          setWaStatus('disconnected')
        }
      } catch (err) {
        // Erro no polling: se falhar continuamente, não trava a tela
      }
    }, 5000)
  }

  const handleConectarWhatsApp = async () => {
    if (!condoId) return
    setWaLoading(true)
    setWaError(null)
    setWaModalOpen(true)
    try {
      const res = await conectarWhatsAppCondo(condoId)
      if (res.qrcode) {
        setWaQrCode(res.qrcode)
        setWaError(null)
        setWaStatus('connecting')
        startPollingStatus(condoId)
      } else {
        stopPolling()
        const errMsg =
          res.error ||
          'A Evolution API não gerou o QR Code. Verifique a chave de API global e o status do serviço.'
        setWaError(errMsg)
        toast({
          title: 'Não foi possível gerar o QR Code',
          description: errMsg,
          variant: 'destructive',
        })
      }
    } catch (err: any) {
      stopPolling()
      const errMsg =
        err?.data?.error ||
        err?.response?.error ||
        err.message ||
        'Falha ao iniciar conexão com a Evolution API.'
      setWaError(errMsg)
      toast({
        title: 'Erro ao conectar WhatsApp',
        description: errMsg,
        variant: 'destructive',
      })
    } finally {
      setWaLoading(false)
    }
  }

  const handleConsultarStatusManual = async () => {
    if (!condoId) return
    setWaLoading(true)
    try {
      const res = await consultarWhatsAppStatus(condoId)
      setWaConnected(res.connected)
      setWaStatus(res.status)
      if (res.phone) setWaPhone(res.phone)
      if (res.qrcode) setWaQrCode(res.qrcode)
      toast({
        title: 'Status atualizado',
        description: res.connected ? 'WhatsApp está Conectado ✓' : 'WhatsApp está ' + res.status,
      })
    } catch (err: any) {
      toast({
        title: 'Erro ao consultar status',
        description: err.message || 'Não foi possível verificar status na Evolution API.',
        variant: 'destructive',
      })
    } finally {
      setWaLoading(false)
    }
  }

  const handleDesconectarWhatsApp = async () => {
    if (!condoId) return
    if (!confirm('Deseja realmente desconectar o seu número de WhatsApp do condomínio?')) {
      return
    }
    setWaLoading(true)
    stopPolling()
    try {
      await desconectarWhatsAppCondo(condoId)
      setWaConnected(false)
      setWaStatus('disconnected')
      setWaQrCode('')
      setWaModalOpen(false)
      toast({
        title: 'WhatsApp Desconectado',
        description: 'Sua instância de WhatsApp foi desconectada com sucesso.',
      })
    } catch (err: any) {
      toast({
        title: 'Erro ao desconectar',
        description: err.message || 'Falha ao desconectar instância.',
        variant: 'destructive',
      })
    } finally {
      setWaLoading(false)
    }
  }

  useEffect(() => {
    Promise.all([getCondo(), getTemplatesNotificacao()])
      .then(([condo, tmpls]) => {
        if (condo) {
          setCondoId(condo.id)
          setCondoRecord(condo)
          setFormData({
            name: condo.name || '',
            cnpj: condo.cnpj ? maskCNPJ(condo.cnpj) : '',
            email: (condo as any).email || '',
            cidade: (condo as any).cidade || '',
            estado: (condo as any).estado || '',
            responsavel: (condo as any).responsavel || '',
            phone: condo.phone ? maskPhone(condo.phone) : '',
            address: condo.address || '',
            shifts: condo.janitor_settings?.shifts || '',
            guards: condo.janitor_settings?.guards || 0,
          })
          if ((condo as any).logo) {
            setLogoPreview(pb.files.getURL(condo, (condo as any).logo))
          }
          const isConnected = !!condo.whatsapp_connected
          setWaConnected(isConnected)
          const currentStatus =
            condo.whatsapp_status || (isConnected ? 'connected' : 'disconnected')
          setWaStatus(currentStatus)
          setWaPhone(condo.whatsapp_phone || '')
          setWaQrCode(condo.whatsapp_qrcode || '')

          // Se a tela abriu já com status connecting (ex: recarga da página durante conexão)
          if (!isConnected && currentStatus === 'connecting') {
            // Calcular tempo restante com base em whatsapp_updated_at (limite de 120s)
            let remaining = 120
            if (condo.whatsapp_updated_at) {
              const diffSec = Math.floor(
                (Date.now() - new Date(condo.whatsapp_updated_at).getTime()) / 1000,
              )
              if (diffSec > 0 && diffSec < 120) {
                remaining = 120 - diffSec
              } else if (diffSec >= 120) {
                remaining = 0
              }
            }
            if (remaining > 0) {
              startPollingStatus(condo.id, remaining)
            } else {
              handleTimeoutFailure(condo.id)
            }
          }
        }
        setTemplates(tmpls)
        setLoading(false)
      })
      .catch(() => {
        setLoading(false)
        toast({
          title: 'Erro',
          description: 'Falha ao carregar as configurações.',
          variant: 'destructive',
        })
      })
  }, [])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Formato inválido',
        description: 'Por favor, selecione uma imagem (PNG, JPG, WebP).',
        variant: 'destructive',
      })
      return
    }

    if (file.size > 2 * 1024 * 1024) {
      toast({
        title: 'Arquivo muito grande',
        description: 'A imagem deve ter no máximo 2MB.',
        variant: 'destructive',
      })
      return
    }

    setLogoFile(file)
    setLogoPreview(URL.createObjectURL(file))
  }

  const handleSaveCondo = async () => {
    setSaving(true)
    try {
      const data = new FormData()
      data.append('name', formData.name)
      data.append('cnpj', formData.cnpj)
      data.append('email', formData.email)
      data.append('cidade', formData.cidade)
      data.append('estado', formData.estado.toUpperCase())
      data.append('responsavel', formData.responsavel)
      data.append('phone', formData.phone)
      data.append('address', formData.address)
      data.append(
        'janitor_settings',
        JSON.stringify({ shifts: formData.shifts, guards: Number(formData.guards) }),
      )

      if (logoFile) {
        data.append('logo', logoFile)
      }

      const updated = await updateCondo(condoId, data)
      setCondoRecord(updated)
      if ((updated as any).logo) {
        setLogoPreview(pb.files.getURL(updated, (updated as any).logo))
      }
      setLogoFile(null)

      // Disparar evento para atualizar o cabeçalho imediatamente
      window.dispatchEvent(new CustomEvent('condo-updated', { detail: updated }))

      toast({ title: 'Sucesso', description: 'Configurações atualizadas com sucesso!' })
    } catch (e: any) {
      toast({
        title: 'Erro',
        description: e.message || 'Falha ao salvar as configurações.',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  const handleAddTemplate = async () => {
    if (!newTemplateStatus || !newTemplateMensagem) return
    try {
      if (editingTemplateId) {
        const res = await updateTemplateNotificacao(editingTemplateId, {
          status: newTemplateStatus,
          flow_stage: newTemplateStatus,
          mensagem_template: newTemplateMensagem,
          reminder_frequency: newTemplateStatus === 'LEMBRETE' ? parseInt(reminderFreq) : 0,
          reminder_time: newTemplateStatus === 'LEMBRETE' ? reminderTime : '',
        })
        setTemplates(templates.map((t) => (t.id === editingTemplateId ? res : t)))
        setEditingTemplateId(null)
        toast({ title: 'Template atualizado com sucesso' })
      } else {
        const res = await createTemplateNotificacao({
          status: newTemplateStatus,
          flow_stage: newTemplateStatus,
          mensagem_template: newTemplateMensagem,
          reminder_frequency: newTemplateStatus === 'LEMBRETE' ? parseInt(reminderFreq) : 0,
          reminder_time: newTemplateStatus === 'LEMBRETE' ? reminderTime : '',
          ativo: true,
        })
        setTemplates([...templates, res])
        toast({ title: 'Template adicionado com sucesso' })
      }
      setNewTemplateStatus('')
      setNewTemplateMensagem('')
      setReminderFreq('1')
      setReminderTime('09:00')
    } catch (e) {
      toast({
        title: editingTemplateId ? 'Erro ao atualizar template' : 'Erro ao adicionar template',
        variant: 'destructive',
      })
    }
  }

  const handleEditTemplate = (t: any) => {
    setNewTemplateStatus(t.flow_stage || t.status)
    setNewTemplateMensagem(t.mensagem_template)
    setReminderFreq(t.reminder_frequency?.toString() || '1')
    setReminderTime(t.reminder_time || '09:00')
    setEditingTemplateId(t.id)
  }

  const handleCancelEdit = () => {
    setNewTemplateStatus('')
    setNewTemplateMensagem('')
    setReminderFreq('1')
    setReminderTime('09:00')
    setEditingTemplateId(null)
  }

  const handleDeleteTemplate = async (id: string) => {
    try {
      await deleteTemplateNotificacao(id)
      setTemplates(templates.filter((t) => t.id !== id))
      toast({ title: 'Template removido com sucesso' })
    } catch (e) {
      toast({ title: 'Erro ao remover template', variant: 'destructive' })
    }
  }

  if (loading) return <Skeleton className="h-[400px] w-full max-w-3xl" />

  return (
    <div className="space-y-6 max-w-4xl pb-10">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-primary">Configurações do Sistema</h2>
        <p className="text-muted-foreground">
          Gerencie parâmetros operacionais, logística e comunicações.
        </p>
      </div>

      <Tabs defaultValue="geral" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="geral">Geral</TabsTrigger>
          <TabsTrigger value="notificacoes">Notificações</TabsTrigger>
        </TabsList>

        <TabsContent value="geral" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Dados Gerais</CardTitle>
              <CardDescription>
                Informações cadastrais e identidade visual da empresa ou condomínio.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              {/* Upload da Logomarca */}
              <div className="p-4 border rounded-lg bg-slate-50/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-lg border bg-white flex items-center justify-center overflow-hidden shrink-0 shadow-xs">
                    {logoPreview ? (
                      <img
                        src={logoPreview}
                        alt="Logomarca do condomínio"
                        className="w-full h-full object-contain p-1"
                      />
                    ) : (
                      <ImageIcon className="w-8 h-8 text-slate-400" />
                    )}
                  </div>
                  <div>
                    <Label className="text-sm font-semibold text-slate-800 block">
                      Logomarca do Condomínio
                    </Label>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Exibida no cabeçalho de todas as páginas do sistema. PNG ou JPG de até 2MB.
                    </p>
                    {logoFile && (
                      <p className="text-xs text-blue-600 font-medium flex items-center gap-1 mt-1">
                        <Check className="w-3.5 h-3.5" /> Arquivo selecionado: {logoFile.name}{' '}
                        (salve as alterações)
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    className="hidden"
                    onChange={handleFileChange}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    className="gap-1.5"
                  >
                    <Upload className="w-4 h-4" />
                    {logoPreview ? 'Trocar Logo' : 'Enviar Logo'}
                  </Button>
                </div>
              </div>

              {/* Card de Conexão WhatsApp Próprio do Condomínio */}
              <div className="p-4 border rounded-lg bg-emerald-50/40 border-emerald-200/80 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Smartphone className="w-5 h-5 text-emerald-700" />
                      <Label className="text-base font-semibold text-emerald-950">
                        WhatsApp Próprio do Condomínio
                      </Label>
                      {waConnected || waStatus === 'connected' ? (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Conectado ✓
                        </span>
                      ) : waStatus === 'connecting' ? (
                        <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300">
                          <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-600" />{' '}
                          Conectando...{' '}
                          <span className="font-mono text-[11px] text-amber-700 font-medium">
                            ({Math.floor(countdownSeconds / 60)}:
                            {String(countdownSeconds % 60).padStart(2, '0')})
                          </span>
                        </span>
                      ) : waStatus === 'failed' ? (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-300">
                          <XCircle className="w-3.5 h-3.5 text-rose-600" /> Falhou a conexão
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-300">
                          <XCircle className="w-3.5 h-3.5 text-slate-500" /> Desconectado ✗
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-600">
                      Envie mensagens de encomendas e notificações com o número de WhatsApp do
                      próprio condomínio.
                    </p>
                    {waPhone && (
                      <p className="text-xs font-medium text-emerald-900 mt-1">
                        Número conectado:{' '}
                        <span className="font-mono">{formatDisplayPhone(waPhone)}</span>
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {waConnected || waStatus === 'connected' ? (
                      <>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={handleConsultarStatusManual}
                          disabled={waLoading}
                          className="gap-1.5"
                          title="Atualizar status"
                        >
                          <RefreshCw className={`w-3.5 h-3.5 ${waLoading ? 'animate-spin' : ''}`} />
                          Verificar
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={handleDesconectarWhatsApp}
                          disabled={waLoading}
                          className="gap-1.5 text-rose-600 border-rose-200 hover:bg-rose-50"
                        >
                          <Unplug className="w-4 h-4" />
                          Desconectar
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button
                          type="button"
                          variant="default"
                          size="sm"
                          onClick={handleConectarWhatsApp}
                          disabled={waLoading}
                          className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
                        >
                          {waLoading ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <QrCode className="w-4 h-4" />
                          )}
                          {waStatus === 'connecting'
                            ? 'Reconectar / Ver QR Code'
                            : waStatus === 'failed'
                              ? 'Tentar novamente'
                              : 'Conectar meu WhatsApp'}
                        </Button>
                        {waStatus === 'connecting' && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setWaModalOpen(true)}
                            className="gap-1 text-xs"
                          >
                            Abrir QR Code
                          </Button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Razão Social / Nome do Condomínio */}
              <div className="space-y-2">
                <Label>Razão Social / Nome do Condomínio</Label>
                <Input
                  placeholder="Sua Empresa LTDA ou Condomínio Residencial"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>

              {/* CNPJ e Email Corporativo */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>CNPJ</Label>
                  <Input
                    placeholder="00.000.000/0000-00"
                    maxLength={18}
                    value={formData.cnpj}
                    onChange={(e) => setFormData({ ...formData, cnpj: maskCNPJ(e.target.value) })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Email Corporativo</Label>
                  <Input
                    type="email"
                    placeholder="gestor@email.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>
              </div>

              {/* Cidade e Estado */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Cidade</Label>
                  <Input
                    placeholder="Ex: São Paulo"
                    value={formData.cidade}
                    onChange={(e) => setFormData({ ...formData, cidade: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Estado</Label>
                  <Input
                    placeholder="EX: SP"
                    maxLength={2}
                    className="uppercase"
                    value={formData.estado}
                    onChange={(e) =>
                      setFormData({ ...formData, estado: e.target.value.toUpperCase() })
                    }
                  />
                </div>
              </div>

              {/* Nome do Responsável / Gestor e Telefone / WhatsApp */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Nome do Responsável / Gestor</Label>
                  <Input
                    placeholder="Ex: Marcelo Silva"
                    value={formData.responsavel}
                    onChange={(e) => setFormData({ ...formData, responsavel: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Telefone / WhatsApp</Label>
                  <Input
                    placeholder="(00) 00000-0000"
                    maxLength={15}
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: maskPhone(e.target.value) })}
                  />
                </div>
              </div>

              {/* Endereço Completo */}
              <div className="space-y-2">
                <Label>Endereço Completo</Label>
                <Input
                  placeholder="Rua, número, bairro, complemento, CEP"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Operação da Portaria</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Turnos</Label>
                <Input
                  value={formData.shifts}
                  onChange={(e) => setFormData({ ...formData, shifts: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Nº Porteiros</Label>
                <Input
                  type="number"
                  value={formData.guards}
                  onChange={(e) =>
                    setFormData({ ...formData, guards: parseInt(e.target.value) || 0 })
                  }
                />
              </div>
            </CardContent>
            <CardFooter className="justify-end border-t pt-4">
              <Button onClick={handleSaveCondo} disabled={saving}>
                {saving ? 'Salvando...' : 'Salvar Alterações'}
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>

        <TabsContent value="notificacoes" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Templates de Notificação</CardTitle>
              <CardDescription>
                Configure os templates de mensagens para cada estágio do fluxo da encomenda.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 text-blue-800 text-sm p-4 rounded-md flex items-start gap-3 mb-6">
                <Info className="w-5 h-5 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold mb-1">Variáveis Dinâmicas</p>
                  <p>Você pode usar as seguintes variáveis nas mensagens:</p>
                  <ul className="list-disc pl-5 mt-2 space-y-1">
                    <li>
                      <strong>{'{name}'}</strong>: Nome do morador
                    </li>
                    <li>
                      <strong>{'{tracking}'}</strong>: Código de rastreio
                    </li>
                    <li>
                      <strong>{'{code}'}</strong>: Código de segurança (token)
                    </li>
                    <li>
                      <strong>{'{condoName}'}</strong>: Nome do condomínio
                    </li>
                  </ul>
                </div>
              </div>

              <div className="flex flex-col gap-4 p-4 border rounded-md bg-muted/20">
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="flex-1 space-y-2">
                    <Label>Estágio do Fluxo</Label>
                    <Select value={newTemplateStatus} onValueChange={setNewTemplateStatus}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o estágio" />
                      </SelectTrigger>
                      <SelectContent>
                        {FLOW_STAGES.map((stage) => (
                          <SelectItem key={stage.id} value={stage.id}>
                            {stage.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {newTemplateStatus === 'LEMBRETE' && (
                    <>
                      <div className="flex-[0.5] space-y-2">
                        <Label>Frequência (dias)</Label>
                        <Input
                          type="number"
                          min="1"
                          value={reminderFreq}
                          onChange={(e) => setReminderFreq(e.target.value)}
                        />
                      </div>
                      <div className="flex-[0.5] space-y-2">
                        <Label>Horário do Envio</Label>
                        <Input
                          type="time"
                          value={reminderTime}
                          onChange={(e) => setReminderTime(e.target.value)}
                        />
                      </div>
                    </>
                  )}
                </div>

                <div className="flex flex-col gap-2">
                  <Label>Mensagem</Label>
                  <Input
                    placeholder="Olá {name}, sua encomenda..."
                    value={newTemplateMensagem}
                    onChange={(e) => setNewTemplateMensagem(e.target.value)}
                  />
                </div>

                <div className="flex justify-end gap-2 mt-2">
                  {editingTemplateId && (
                    <Button variant="outline" onClick={handleCancelEdit}>
                      Cancelar
                    </Button>
                  )}
                  <Button onClick={handleAddTemplate}>
                    {editingTemplateId ? (
                      'Salvar'
                    ) : (
                      <>
                        <Plus className="w-4 h-4 mr-2" /> Adicionar
                      </>
                    )}
                  </Button>
                </div>
              </div>
              <div className="space-y-2 mt-4">
                {templates.map((t) => (
                  <div
                    key={t.id}
                    className="flex items-center justify-between p-3 border rounded-md bg-card"
                  >
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                          {FLOW_STAGES.find((s) => s.id === (t.flow_stage || t.status))?.label ||
                            t.status}
                        </span>
                        {(t.flow_stage === 'LEMBRETE' || t.status === 'LEMBRETE') && (
                          <span className="text-xs text-muted-foreground">
                            A cada {t.reminder_frequency || 1} dia(s) às{' '}
                            {t.reminder_time || '09:00'}
                          </span>
                        )}
                      </div>
                      <span className="text-sm mt-1">{t.mensagem_template}</span>
                    </div>
                    <div className="flex flex-shrink-0 ml-4">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-muted-foreground hover:text-primary"
                        onClick={() => handleEditTemplate(t)}
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive"
                        onClick={() => handleDeleteTemplate(t.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Modal de Conexão WhatsApp / Exibição de QR Code */}
      <Dialog
        open={waModalOpen}
        onOpenChange={(open) => {
          setWaModalOpen(open)
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-emerald-800">
              <Smartphone className="w-5 h-5 text-emerald-600" />
              Conectar WhatsApp do Condomínio
            </DialogTitle>
            <DialogDescription>
              Abra o WhatsApp no celular do condomínio, vá em <strong>Aparelhos conectados</strong>{' '}
              e aponte a câmera para o QR Code abaixo.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col items-center justify-center p-4 bg-slate-50 border rounded-lg space-y-4">
            {waQrCode ? (
              <div className="p-3 bg-white border-2 border-emerald-500 rounded-xl shadow-md">
                <img
                  src={
                    waQrCode.startsWith('data:') ? waQrCode : `data:image/png;base64,${waQrCode}`
                  }
                  alt="QR Code WhatsApp"
                  className="w-64 h-64 object-contain"
                />
              </div>
            ) : waError ? (
              <div className="w-full p-4 border-2 border-rose-200 rounded-xl bg-rose-50 text-rose-800 flex flex-col items-center text-center gap-2">
                <XCircle className="w-10 h-10 text-rose-500" />
                <p className="font-semibold text-sm">Não foi possível gerar o QR Code</p>
                <p className="text-xs text-rose-700 leading-relaxed max-w-sm">{waError}</p>
              </div>
            ) : (
              <div className="w-64 h-64 flex flex-col items-center justify-center border-2 border-dashed border-slate-300 rounded-xl bg-white text-slate-400 gap-2">
                <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
                <span className="text-xs font-medium text-slate-500">Gerando QR Code...</span>
              </div>
            )}

            <div className="text-center space-y-1">
              {waQrCode ? (
                <>
                  <div className="inline-flex items-center gap-2 text-xs font-medium text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Aguardando leitura do QR Code... ({Math.floor(countdownSeconds / 60)}:
                    {String(countdownSeconds % 60).padStart(2, '0')})
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Esta tela atualiza automaticamente assim que a conexão for estabelecida.
                  </p>
                </>
              ) : waError ? (
                <p className="text-[11px] text-slate-500">
                  Clique em &quot;Tentar novamente&quot; abaixo para reiniciar o fluxo de conexão.
                </p>
              ) : (
                <p className="text-[11px] text-slate-400">
                  Comunicando com o servidor da Evolution API...
                </p>
              )}
            </div>
          </div>

          <div className="flex justify-between items-center gap-2 pt-2">
            <Button
              type="button"
              variant={waError ? 'default' : 'outline'}
              size="sm"
              onClick={handleConectarWhatsApp}
              disabled={waLoading}
              className={`gap-1.5 text-xs ${waError ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : ''}`}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${waLoading ? 'animate-spin' : ''}`} />
              {waError ? 'Tentar novamente' : 'Gerar Novo QR Code'}
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => {
                setWaModalOpen(false)
              }}
            >
              Fechar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
