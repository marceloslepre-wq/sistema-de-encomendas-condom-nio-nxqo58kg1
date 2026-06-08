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
import { useToast } from '@/hooks/use-toast'
import { Skeleton } from '@/components/ui/skeleton'
import { Trash2, Plus, Pencil } from 'lucide-react'
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
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null)

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
          mensagem_template: newTemplateMensagem,
        })
        setTemplates(templates.map((t) => (t.id === editingTemplateId ? res : t)))
        setEditingTemplateId(null)
        toast({ title: 'Template atualizado com sucesso' })
      } else {
        const res = await createTemplateNotificacao({
          status: newTemplateStatus,
          mensagem_template: newTemplateMensagem,
          ativo: true,
        })
        setTemplates([...templates, res])
        toast({ title: 'Template adicionado com sucesso' })
      }
      setNewTemplateStatus('')
      setNewTemplateMensagem('')
    } catch (e) {
      toast({
        title: editingTemplateId ? 'Erro ao atualizar template' : 'Erro ao adicionar template',
        variant: 'destructive',
      })
    }
  }

  const handleEditTemplate = (t: any) => {
    setNewTemplateStatus(t.status)
    setNewTemplateMensagem(t.mensagem_template)
    setEditingTemplateId(t.id)
  }

  const handleCancelEdit = () => {
    setNewTemplateStatus('')
    setNewTemplateMensagem('')
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
              <CardDescription>Mensagens automáticas enviadas aos moradores.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col md:flex-row gap-2">
                <div className="flex-1 space-y-2">
                  <Input
                    placeholder="Status (ex: recebido, retirado)"
                    value={newTemplateStatus}
                    onChange={(e) => setNewTemplateStatus(e.target.value)}
                  />
                </div>
                <div className="flex-[2] space-y-2">
                  <Input
                    placeholder="Mensagem do template..."
                    value={newTemplateMensagem}
                    onChange={(e) => setNewTemplateMensagem(e.target.value)}
                  />
                </div>
                <div className="mt-auto flex gap-2">
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
                    <div className="flex flex-col">
                      <span className="font-medium text-sm text-muted-foreground uppercase">
                        {t.status}
                      </span>
                      <span>{t.mensagem_template}</span>
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
