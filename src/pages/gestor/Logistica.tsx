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

export default function GestorLogistica() {
  const { toast } = useToast()
  const [volumeTypes, setVolumeTypes] = useState<any[]>([])
  const [shelfLocations, setShelfLocations] = useState<any[]>([])
  const [newVolumeType, setNewVolumeType] = useState('')
  const [newShelfLocation, setNewShelfLocation] = useState('')
  const [loading, setLoading] = useState(false)

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
    if (!newVolumeType.trim()) return
    setLoading(true)
    try {
      await pb.collection('volume_types').create({ name: newVolumeType })
      setNewVolumeType('')
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
    if (!newShelfLocation.trim()) return
    setLoading(true)
    try {
      await pb.collection('shelf_locations').create({ name: newShelfLocation })
      setNewShelfLocation('')
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
            <CardHeader className="pb-4">
              <div className="flex gap-2">
                <Input
                  placeholder="Novo tipo de volume (ex: Caixa P, Envelope...)"
                  value={newVolumeType}
                  onChange={(e) => setNewVolumeType(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddVolumeType()}
                />
                <Button onClick={handleAddVolumeType} disabled={loading || !newVolumeType.trim()}>
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Plus className="w-4 h-4 mr-2" />
                  )}
                  Adicionar
                </Button>
              </div>
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
            <CardHeader className="pb-4">
              <div className="flex gap-2">
                <Input
                  placeholder="Novo local (ex: Prateleira A, Chão...)"
                  value={newShelfLocation}
                  onChange={(e) => setNewShelfLocation(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddShelfLocation()}
                />
                <Button
                  onClick={handleAddShelfLocation}
                  disabled={loading || !newShelfLocation.trim()}
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Plus className="w-4 h-4 mr-2" />
                  )}
                  Adicionar
                </Button>
              </div>
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
