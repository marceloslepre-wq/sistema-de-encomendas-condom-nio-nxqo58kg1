import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/hooks/use-toast'
import { Loader2, MessageSquare, Info } from 'lucide-react'
import pb from '@/lib/pocketbase/client'

const STATUSES = [
  { id: 'ENTRADA_PORTARIA', label: 'Entrada na Portaria' },
  { id: 'EM_TRIAGEM', label: 'Em Triagem' },
  { id: 'LIBERADO_RETIRADA', label: 'Liberado para Retirada' },
  { id: 'RETIRADO', label: 'Retirado' },
  { id: 'CANCELADO', label: 'Cancelado' },
]

export default function GestorComunicacao() {
  const { toast } = useToast()
  const [templates, setTemplates] = useState<Record<string, { id?: string; message: string }>>({})
  const [loading, setLoading] = useState(false)

  const loadData = async () => {
    try {
      const data = await pb.collection('notification_templates').getFullList()
      const map: Record<string, { id?: string; message: string }> = {}
      data.forEach((t) => {
        map[t.status] = { id: t.id, message: t.message }
      })
      STATUSES.forEach((s) => {
        if (!map[s.id]) {
          map[s.id] = { message: `Sua encomenda atualizou para o status ${s.label}.` }
        }
      })
      setTemplates(map)
    } catch (err) {
      toast({ title: 'Erro', description: 'Falha ao carregar templates.', variant: 'destructive' })
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleSave = async (statusId: string) => {
    setLoading(true)
    const tpl = templates[statusId]
    try {
      if (tpl.id) {
        await pb.collection('notification_templates').update(tpl.id, { message: tpl.message })
      } else {
        const created = await pb
          .collection('notification_templates')
          .create({ status: statusId, message: tpl.message })
        setTemplates((prev) => ({ ...prev, [statusId]: { id: created.id, message: tpl.message } }))
      }
      toast({ title: 'Sucesso', description: 'Template salvo com sucesso.' })
    } catch (err) {
      toast({ title: 'Erro', description: 'Falha ao salvar template.', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6 pb-10 animate-fade-in">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Comunicação e Notificações</h2>
        <p className="text-muted-foreground">
          Configure as mensagens enviadas aos moradores por E-mail.
        </p>
      </div>

      <div className="bg-blue-50 border border-blue-200 text-blue-800 text-sm p-4 rounded-md flex items-start gap-3">
        <Info className="w-5 h-5 shrink-0 mt-0.5" />
        <div>
          <p className="font-semibold mb-1">Variáveis Dinâmicas</p>
          <p>
            Você pode usar as seguintes variáveis nas mensagens. Elas serão substituídas
            automaticamente:
          </p>
          <ul className="list-disc pl-5 mt-2 space-y-1">
            <li>
              <strong>{'{name}'}</strong>: Nome do morador
            </li>
            <li>
              <strong>{'{tracking}'}</strong>: Código de rastreio da encomenda
            </li>
            <li>
              <strong>{'{code}'}</strong>: Código de segurança (token) para retirada
            </li>
            <li>
              <strong>{'{condoName}'}</strong>: Nome do condomínio
            </li>
          </ul>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {STATUSES.map((status) => (
          <Card key={status.id}>
            <CardHeader className="pb-3 bg-muted/20 border-b">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-primary" />
                <h3 className="font-semibold">{status.label}</h3>
              </div>
              <CardDescription>Status da encomenda: {status.id}</CardDescription>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
              <Textarea
                className="min-h-[100px]"
                value={templates[status.id]?.message || ''}
                onChange={(e) =>
                  setTemplates((prev) => ({
                    ...prev,
                    [status.id]: { ...prev[status.id], message: e.target.value },
                  }))
                }
              />
              <div className="flex justify-end">
                <Button onClick={() => handleSave(status.id)} disabled={loading}>
                  {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Salvar Mensagem
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
