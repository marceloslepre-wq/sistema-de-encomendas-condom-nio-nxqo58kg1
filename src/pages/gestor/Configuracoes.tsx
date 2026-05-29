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
import { useToast } from '@/hooks/use-toast'
import { getCondo, updateCondo } from '@/services/api'
import { Skeleton } from '@/components/ui/skeleton'

export default function GestorConfiguracoes() {
  const [condoId, setCondoId] = useState('')
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    cnpj: '',
    phone: '',
    shifts: '',
    guards: 0,
    notifications_enabled: false,
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    getCondo().then((data: any) => {
      if (data) {
        setCondoId(data.id)
        setFormData({
          name: data.name || '',
          address: data.address || '',
          cnpj: data.cnpj || '',
          phone: data.phone || '',
          shifts: data.janitor_settings?.shifts || '',
          guards: data.janitor_settings?.guards || 0,
          notifications_enabled: data.notifications_enabled ?? true,
        })
      }
      setLoading(false)
    })
  }, [])

  const handleSave = async () => {
    setSaving(true)
    try {
      await updateCondo(condoId, {
        name: formData.name,
        address: formData.address,
        cnpj: formData.cnpj,
        phone: formData.phone,
        janitor_settings: { shifts: formData.shifts, guards: Number(formData.guards) },
        notifications_enabled: formData.notifications_enabled,
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

  if (loading) return <Skeleton className="h-[400px] w-full max-w-3xl" />

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-primary">
          Configurações do Condomínio
        </h2>
        <p className="text-muted-foreground">
          Gerencie as informações base e parâmetros operacionais.
        </p>
      </div>

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
          <CardTitle>Operação e Notificações</CardTitle>
          <CardDescription>Parâmetros para portaria e envio de alertas.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Turnos da Portaria</Label>
              <Input
                placeholder="Ex: 24h, 12x36"
                value={formData.shifts}
                onChange={(e) => setFormData({ ...formData, shifts: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Número de Porteiros</Label>
              <Input
                type="number"
                value={formData.guards}
                onChange={(e) =>
                  setFormData({ ...formData, guards: parseInt(e.target.value) || 0 })
                }
              />
            </div>
          </div>

          <div className="flex items-center justify-between border p-4 rounded-lg bg-neutralBg">
            <div className="space-y-0.5">
              <Label className="text-base font-semibold">Notificações Globais</Label>
              <p className="text-sm text-muted-foreground">
                Ativar o envio de e-mails/SMS para moradores sobre entregas.
              </p>
            </div>
            <Switch
              checked={formData.notifications_enabled}
              onCheckedChange={(v) => setFormData({ ...formData, notifications_enabled: v })}
            />
          </div>
        </CardContent>
        <CardFooter className="flex justify-end border-t pt-4">
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Salvando...' : 'Salvar Alterações'}
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
