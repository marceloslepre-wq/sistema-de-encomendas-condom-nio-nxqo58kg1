import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import pb from '@/lib/pocketbase/client'

export default function GestorPermissoes() {
  const [condo, setCondo] = useState<any>(null)

  useEffect(() => {
    pb.collection('condos')
      .getFullList()
      .then((res) => setCondo(res[0]))
  }, [])

  const handleSmsToggle = async (checked: boolean) => {
    if (!condo) return
    setCondo({ ...condo, exige_validacao_sms: checked })
    await pb.collection('condos').update(condo.id, { exige_validacao_sms: checked })
  }

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-primary">Permissões e Perfis</h2>
        <p className="text-muted-foreground">
          Configure o que cada tipo de usuário pode fazer no sistema.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Gestor */}
        <Card className="border-primary/20 shadow-sm">
          <CardHeader className="bg-primary/5 pb-4">
            <CardTitle>Gestor (Síndico)</CardTitle>
            <CardDescription>Acesso total ao sistema administrativo.</CardDescription>
          </CardHeader>
          <CardContent className="pt-6 space-y-4">
            <div className="flex items-center justify-between">
              <Label className="font-normal">Exportar relatórios</Label>
              <Switch checked disabled />
            </div>
            <div className="flex items-center justify-between">
              <Label className="font-normal">Gerar links de convite</Label>
              <Switch checked disabled />
            </div>
            <div className="flex items-center justify-between">
              <Label className="font-normal">Alterar configurações</Label>
              <Switch checked disabled />
            </div>
          </CardContent>
        </Card>

        {/* Portaria */}
        <Card className="border-warning/20 shadow-sm">
          <CardHeader className="bg-warning/5 pb-4">
            <CardTitle>Portaria</CardTitle>
            <CardDescription>Ações operacionais de recebimento.</CardDescription>
          </CardHeader>
          <CardContent className="pt-6 space-y-4">
            <div className="flex items-center justify-between">
              <Label className="font-normal">Registrar novas encomendas</Label>
              <Switch checked disabled />
            </div>
            <div className="flex items-center justify-between">
              <Label className="font-normal">Validar retirada via SMS</Label>
              <Switch
                checked={condo?.exige_validacao_sms ?? true}
                onCheckedChange={handleSmsToggle}
                disabled={!condo}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label className="font-normal">Cancelar registro</Label>
              <Switch checked={false} />
            </div>
          </CardContent>
        </Card>

        {/* Morador */}
        <Card className="border-success/20 shadow-sm">
          <CardHeader className="bg-success/5 pb-4">
            <CardTitle>Morador</CardTitle>
            <CardDescription>Visualização e gestão das próprias encomendas.</CardDescription>
          </CardHeader>
          <CardContent className="pt-6 space-y-4">
            <div className="flex items-center justify-between">
              <Label className="font-normal">Gerar código de retirada</Label>
              <Switch checked disabled />
            </div>
            <div className="flex items-center justify-between">
              <Label className="font-normal">Autorizar terceiros</Label>
              <Switch checked={true} />
            </div>
            <div className="flex items-center justify-between">
              <Label className="font-normal">Editar próprios dados</Label>
              <Switch checked={true} />
            </div>
          </CardContent>
        </Card>
      </div>

      <p className="text-sm text-muted-foreground mt-4 italic">
        * As permissões marcadas em cinza são nativas e não podem ser removidas.
      </p>
    </div>
  )
}
