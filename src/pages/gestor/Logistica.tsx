import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useToast } from '@/hooks/use-toast'
import { Plus, Trash2, Loader2 } from 'lucide-react'
import pb from '@/lib/pocketbase/client'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'

export default function GestorLogistica() {
  const { toast } = useToast()
  const [volumeTypes, setVolumeTypes] = useState<any[]>([])
  const [shelfLocations, setShelfLocations] = useState<any[]>([])
  const [newVolumeType, setNewVolumeType] = useState('')
  const [newShelfLocation, setNewShelfLocation] = useState('')
  const [loading, setLoading] = useState(false)
  const [isVolumeModalOpen, setIsVolumeModalOpen] = useState(false)
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false)

  const loadData = async () => {
    try {
      const [vTypes, sLocs] = await Promise.all([
        pb.collection('volume_types').getFullList({ sort: '-created' }),
        pb.collection('shelf_locations').getFullList({ sort: '-created' }),
      ])
      setVolumeTypes(vTypes)
      setShelfLocations(sLocs)
    } catch (err) {
      toast({ title: 'Erro', description: 'Falha ao carregar dados.', variant: 'destructive' })
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleAddVolumeType = async () => {
    if (!newVolumeType.trim()) {
      toast({
        title: 'Aviso',
        description: 'Digite um nome para o tipo de volume.',
        variant: 'destructive',
      })
      return
    }
    setLoading(true)
    try {
      await pb.collection('volume_types').create({ name: newVolumeType })
      setNewVolumeType('')
      setIsVolumeModalOpen(false)
      loadData()
      toast({ title: 'Sucesso', description: 'Tipo de volume adicionado.' })
    } catch (err) {
      toast({ title: 'Erro', description: 'Falha ao adicionar.', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteVolumeType = async (id: string) => {
    if (!confirm('Deseja excluir este item?')) return
    try {
      await pb.collection('volume_types').delete(id)
      loadData()
      toast({ title: 'Sucesso', description: 'Item removido.' })
    } catch (err) {
      toast({ title: 'Erro', description: 'Falha ao excluir.', variant: 'destructive' })
    }
  }

  const handleAddShelfLocation = async () => {
    if (!newShelfLocation.trim()) {
      toast({ title: 'Aviso', description: 'Digite um nome para o local.', variant: 'destructive' })
      return
    }
    setLoading(true)
    try {
      await pb.collection('shelf_locations').create({ name: newShelfLocation })
      setNewShelfLocation('')
      setIsLocationModalOpen(false)
      loadData()
      toast({ title: 'Sucesso', description: 'Localização adicionada.' })
    } catch (err) {
      toast({ title: 'Erro', description: 'Falha ao adicionar.', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteShelfLocation = async (id: string) => {
    if (!confirm('Deseja excluir este item?')) return
    try {
      await pb.collection('shelf_locations').delete(id)
      loadData()
      toast({ title: 'Sucesso', description: 'Item removido.' })
    } catch (err) {
      toast({ title: 'Erro', description: 'Falha ao excluir.', variant: 'destructive' })
    }
  }

  return (
    <div className="space-y-6 pb-10 animate-fade-in">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Logística e Armazenamento</h2>
        <p className="text-muted-foreground">
          Gerencie as opções de tipos de volume e localizações nas prateleiras.
        </p>
      </div>

      <Tabs defaultValue="volumes" className="space-y-4">
        <TabsList>
          <TabsTrigger value="volumes">Tipos de Volume</TabsTrigger>
          <TabsTrigger value="locations">Locais de Prateleira</TabsTrigger>
        </TabsList>

        <TabsContent value="volumes" className="space-y-4">
          <Card>
            <CardHeader className="pb-4 flex flex-row items-center justify-between">
              <div>
                <h3 className="text-lg font-medium">Tipos de Volume</h3>
                <p className="text-sm text-muted-foreground">
                  Listagem de todos os tipos de volume cadastrados.
                </p>
              </div>
              <Dialog open={isVolumeModalOpen} onOpenChange={setIsVolumeModalOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    Adicionar Novo
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Adicionar Tipo de Volume</DialogTitle>
                    <DialogDescription>
                      Insira o nome do novo tipo de volume (ex: Caixa P, Envelope).
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                      <Label htmlFor="volume-name">Nome do Tipo de Volume</Label>
                      <Input
                        id="volume-name"
                        placeholder="Ex: Caixa P"
                        value={newVolumeType}
                        onChange={(e) => setNewVolumeType(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleAddVolumeType()}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsVolumeModalOpen(false)}>
                      Cancelar
                    </Button>
                    <Button
                      onClick={handleAddVolumeType}
                      disabled={loading || !newVolumeType.trim()}
                    >
                      {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                      Salvar
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border bg-card">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {volumeTypes.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={2} className="text-center h-24 text-muted-foreground">
                          Nenhum tipo de volume cadastrado.
                        </TableCell>
                      </TableRow>
                    ) : (
                      volumeTypes.map((v) => (
                        <TableRow key={v.id}>
                          <TableCell className="font-medium">{v.name}</TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-destructive"
                              onClick={() => handleDeleteVolumeType(v.id)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="locations" className="space-y-4">
          <Card>
            <CardHeader className="pb-4 flex flex-row items-center justify-between">
              <div>
                <h3 className="text-lg font-medium">Locais de Prateleira</h3>
                <p className="text-sm text-muted-foreground">
                  Listagem de todos os locais de prateleira cadastrados.
                </p>
              </div>
              <Dialog open={isLocationModalOpen} onOpenChange={setIsLocationModalOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    Adicionar Novo
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Adicionar Local de Prateleira</DialogTitle>
                    <DialogDescription>
                      Insira o nome do novo local de prateleira (ex: Prateleira A, Chão).
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                      <Label htmlFor="location-name">Nome do Local</Label>
                      <Input
                        id="location-name"
                        placeholder="Ex: Prateleira A"
                        value={newShelfLocation}
                        onChange={(e) => setNewShelfLocation(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleAddShelfLocation()}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsLocationModalOpen(false)}>
                      Cancelar
                    </Button>
                    <Button
                      onClick={handleAddShelfLocation}
                      disabled={loading || !newShelfLocation.trim()}
                    >
                      {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                      Salvar
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border bg-card">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {shelfLocations.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={2} className="text-center h-24 text-muted-foreground">
                          Nenhum local cadastrado.
                        </TableCell>
                      </TableRow>
                    ) : (
                      shelfLocations.map((s) => (
                        <TableRow key={s.id}>
                          <TableCell className="font-medium">{s.name}</TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-destructive"
                              onClick={() => handleDeleteShelfLocation(s.id)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
