import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Search, Plus, Trash2, Edit } from 'lucide-react'
import { getUnits, createUnit, updateUnit, deleteUnit, getCondo, Unit } from '@/services/api'
import { useToast } from '@/hooks/use-toast'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Label } from '@/components/ui/label'

export default function GestorUnidades() {
  const [units, setUnits] = useState<Unit[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const { toast } = useToast()

  const [isFormOpen, setIsFormOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [editingUnit, setEditingUnit] = useState<Unit | null>(null)
  const [formData, setFormData] = useState({ tower: '', apartment: '' })
  const [condoId, setCondoId] = useState<string>('')

  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [unitToDelete, setUnitToDelete] = useState<Unit | null>(null)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      let condoData = await getCondo()
      if (!condoData) {
        condoData = await createCondo({ name: 'Condomínio Principal' })
      }
      if (condoData) setCondoId(condoData.id)
      const data = await getUnits()
      setUnits(data as Unit[])
    } catch (e: any) {
      console.error('Failed to load units or condo:', e, e.response)
    } finally {
      setLoading(false)
    }
  }

  const handleSaveUnit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!condoId) {
      toast({
        title: 'Erro de Validação',
        description: 'ID do Condomínio não encontrado. Não é possível salvar a unidade.',
        variant: 'destructive',
      })
      return
    }

    setSubmitting(true)
    try {
      if (editingUnit) {
        await updateUnit(editingUnit.id, { ...formData, condo_id: condoId })
        toast({ title: 'Unidade atualizada com sucesso.' })
      } else {
        await createUnit({ ...formData, condo_id: condoId })
        toast({ title: 'Unidade criada com sucesso.' })
      }
      setIsFormOpen(false)
      loadData()
    } catch (err: any) {
      console.error('Failed to save unit:', err, err.response)
      toast({
        title: 'Erro ao salvar',
        description: err.message || 'Verifique os dados.',
        variant: 'destructive',
      })
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeleteUnit = async () => {
    if (!unitToDelete) return
    setSubmitting(true)
    try {
      await deleteUnit(unitToDelete.id)
      toast({ title: 'Unidade removida com sucesso.' })
      loadData()
    } catch (e: any) {
      console.error('Failed to delete unit:', e, e.response)
      toast({
        title: 'Erro',
        description: 'Não foi possível remover a unidade.',
        variant: 'destructive',
      })
    } finally {
      setSubmitting(false)
      setIsDeleteDialogOpen(false)
      setUnitToDelete(null)
    }
  }

  const openNewForm = () => {
    setEditingUnit(null)
    setFormData({ tower: '', apartment: '' })
    setIsFormOpen(true)
  }

  const openEditForm = (unit: Unit) => {
    setEditingUnit(unit)
    setFormData({ tower: unit.tower, apartment: unit.apartment })
    setIsFormOpen(true)
  }

  const openDeleteConfirm = (unit: Unit) => {
    setUnitToDelete(unit)
    setIsDeleteDialogOpen(true)
  }

  const filtered = units.filter(
    (u) =>
      u.tower.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.apartment.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-[400px] w-full" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-primary">Gestão de Unidades</h2>
        <p className="text-muted-foreground">Adicione e gerencie as torres e apartamentos.</p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <CardTitle>Lista de Unidades</CardTitle>
            <div className="flex flex-col sm:flex-row gap-4 items-center w-full sm:w-auto">
              <div className="relative w-full sm:w-72">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar torre ou apto..."
                  className="pl-8"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <Button onClick={openNewForm} className="w-full sm:w-auto">
                <Plus className="h-4 w-4 mr-2" /> Adicionar Unidade
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="border rounded-md">
            <Table>
              <TableHeader className="bg-neutralBg">
                <TableRow>
                  <TableHead>Torre / Bloco</TableHead>
                  <TableHead>Apartamento</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell className="font-medium">Torre {u.tower}</TableCell>
                    <TableCell>Apto {u.apartment}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEditForm(u)}
                          title="Editar"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openDeleteConfirm(u)}
                          title="Excluir"
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center py-4 text-muted-foreground">
                      Nenhuma unidade encontrada.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>{editingUnit ? 'Editar Unidade' : 'Nova Unidade'}</DialogTitle>
            <DialogDescription>Preencha os dados da unidade.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSaveUnit} className="space-y-4">
            <div className="space-y-2">
              <Label>Torre / Bloco</Label>
              <Input
                required
                value={formData.tower}
                onChange={(e) => setFormData({ ...formData, tower: e.target.value })}
                placeholder="Ex: A, 1, Sul"
              />
            </div>
            <div className="space-y-2">
              <Label>Apartamento</Label>
              <Input
                required
                value={formData.apartment}
                onChange={(e) => setFormData({ ...formData, apartment: e.target.value })}
                placeholder="Ex: 101, 102A"
              />
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsFormOpen(false)}
                disabled={submitting}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? 'Salvando...' : 'Salvar Unidade'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir unidade?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir a unidade{' '}
              <strong>
                Torre {unitToDelete?.tower} - Apto {unitToDelete?.apartment}
              </strong>
              ? Esta ação não pode ser desfeita e pode falhar se houver moradores ou encomendas
              vinculadas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={submitting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault()
                handleDeleteUnit()
              }}
              disabled={submitting}
              className="bg-destructive hover:bg-destructive/90"
            >
              {submitting ? 'Excluindo...' : 'Excluir'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
