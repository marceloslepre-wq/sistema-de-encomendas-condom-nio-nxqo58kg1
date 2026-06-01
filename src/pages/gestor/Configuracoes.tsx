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
import { Trash2, Plus } from 'lucide-react'
import {
  getCondo,
  updateCondo,
  getVolumeTypes,
  createVolumeType,
  deleteVolumeType,
  getShelfLocations,
  createShelfLocation,
  deleteShelfLocation,
} from '@/services/api'

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

  const [volumeTypes, setVolumeTypes] = useState<any[]>([])
  const [newVolumeType, setNewVolumeType] = useState('')

  const [shelfLocations, setShelfLocations] = useState<any[]>([])
  const [newShelfLocation, setNewShelfLocation] = useState('')

  const { toast } = useToast()

  useEffect(() => {
    Promise.all([getCondo(), getVolumeTypes(), getShelfLocations()]).then(
      ([condo, vTypes, sLocs]) => {
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
        setVolumeTypes(vTypes)
        setShelfLocations(sLocs)
        setLoading(false)
      },
    )
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

  const handleAddVolumeType = async () => {
    if (!newVolumeType) return
    try {
      const res = await createVolumeType({ name: newVolumeType })
      setVolumeTypes([...volumeTypes, res])
      setNewVolumeType('')
      toast({ title: 'Tipo de volume adicionado' })
    } catch (e) {
      toast({ title: 'Erro', variant: 'destructive' })
    }
  }

  const handleDeleteVolumeType = async (id: string) => {
    try {
      await deleteVolumeType(id)
      setVolumeTypes(volumeTypes.filter((v) => v.id !== id))
      toast({ title: 'Tipo de volume removido' })
    } catch (e) {
      toast({ title: 'Erro', variant: 'destructive' })
    }
  }

  const handleAddShelfLocation = async () => {
    if (!newShelfLocation) return
    try {
      const res = await createShelfLocation({ name: newShelfLocation })
      setShelfLocations([...shelfLocations, res])
      setNewShelfLocation('')
      toast({ title: 'Localização adicionada' })
    } catch (e) {
      toast({ title: 'Erro', variant: 'destructive' })
    }
  }

  const handleDeleteShelfLocation = async (id: string) => {
    try {
      await deleteShelfLocation(id)
      setShelfLocations(shelfLocations.filter((s) => s.id !== id))
      toast({ title: 'Localização removida' })
    } catch (e) {
      toast({ title: 'Erro', variant: 'destructive' })
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
          <TabsTrigger value="logistica">Logística</TabsTrigger>
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

        <TabsContent value="logistica" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Tipos de Volume</CardTitle>
              <CardDescription>Utilizados na triagem de encomendas.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  placeholder="Novo tipo..."
                  value={newVolumeType}
                  onChange={(e) => setNewVolumeType(e.target.value)}
                />
                <Button onClick={handleAddVolumeType}>
                  <Plus className="w-4 h-4 mr-2" /> Adicionar
                </Button>
              </div>
              <div className="space-y-2">
                {volumeTypes.map((v) => (
                  <div
                    key={v.id}
                    className="flex items-center justify-between p-2 border rounded-md"
                  >
                    <span>{v.name}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive"
                      onClick={() => handleDeleteVolumeType(v.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Localizações (Prateleiras)</CardTitle>
              <CardDescription>Locais de armazenamento na sala de triagem.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  placeholder="Nova localização..."
                  value={newShelfLocation}
                  onChange={(e) => setNewShelfLocation(e.target.value)}
                />
                <Button onClick={handleAddShelfLocation}>
                  <Plus className="w-4 h-4 mr-2" /> Adicionar
                </Button>
              </div>
              <div className="space-y-2">
                {shelfLocations.map((s) => (
                  <div
                    key={s.id}
                    className="flex items-center justify-between p-2 border rounded-md"
                  >
                    <span>{s.name}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive"
                      onClick={() => handleDeleteShelfLocation(s.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
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
