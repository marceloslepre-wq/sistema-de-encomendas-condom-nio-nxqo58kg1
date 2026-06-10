import { useEffect, useState } from 'react'
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
import { Switch } from '@/components/ui/switch'
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
import { Trash2, Plus, Pencil, Info } from 'lucide-react'
import { getCondo, updateCondo } from '@/services/condos'
import {
  getTemplatesNotificacao,
  createTemplateNotificacao,
  updateTemplateNotificacao,
  deleteTemplateNotificacao,
} from '@/services/templates_notificacao'

export default function GestorConfiguracoes() {
  const [condoId, setCondoId] = useState('')
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    cnpj: '',
    phone: '',
    shifts: '',
    guards: 0,
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [templates, setTemplates] = useState<any[]>([])
  const [newTemplateStatus, setNewTemplateStatus] = useState('')
  const [newTemplateMensagem, setNewTemplateMensagem] = useState('')
  const [reminderFreq, setReminderFreq] = useState('1')
  const [reminderTime, setReminderTime] = useState('09:00')
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null)

  const FLOW_STAGES = [
    { id: 'ENTRADA_PORTARIA', label: 'Entrada na Portaria' },
    { id: 'EM_TRIAGEM', label: 'Em Triagem' },
    { id: 'SALA_ENCOMENDA', label: 'Sala de Encomendas' },
    { id: 'LIBERADO_RETIRADA', label: 'Liberado para Retirada' },
    { id: 'RETIRADO', label: 'Retirado' },
    { id: 'CANCELADO', label: 'Cancelado' },
    { id: 'LEMBRETE', label: 'Lembrete (Retirada)' },
  ]

  const { toast } = useToast()

  useEffect(() => {
    Promise.all([getCondo(), getTemplatesNotificacao()])
      .then(([condo, tmpls]) => {
        if (condo) {
          setCondoId(condo.id)
          setFormData({
            name: condo.name || '',
            address: condo.address || '',
            cnpj: condo.cnpj || '',
            phone: condo.phone || '',
            shifts: condo.janitor_settings?.shifts || '',
            guards: condo.janitor_settings?.guards || 0,
          })
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

  const handleSaveCondo = async () => {
    setSaving(true)
    try {
      await updateCondo(condoId, {
        name: formData.name,
        address: formData.address,
        cnpj: formData.cnpj,
        phone: formData.phone,
        janitor_settings: { shifts: formData.shifts, guards: Number(formData.guards) },
      })
      toast({ title: 'Sucesso', description: 'Configurações atualizadas com sucesso!' })
    } catch (e) {
      toast({
        title: 'Erro',
        description: 'Falha ao salvar as configurações.',
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
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Nome do Condomínio</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>CNPJ</Label>
                  <Input
                    value={formData.cnpj}
                    onChange={(e) => setFormData({ ...formData, cnpj: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Telefone / Contato</Label>
                  <Input
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Endereço Completo</Label>
                <Input
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
    </div>
  )
}
