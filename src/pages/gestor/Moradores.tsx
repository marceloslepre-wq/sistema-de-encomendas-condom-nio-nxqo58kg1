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
import { Search, Plus, Edit, Trash2 } from 'lucide-react'
import { getMoradores, createMorador, updateMorador, deleteMorador, Morador } from '@/services/api'
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
import { ResidentForm } from '@/components/ResidentForm'
import { extractFieldErrors } from '@/lib/pocketbase/errors'

export default function GestorMoradores() {
  const [moradores, setMoradores] = useState<Morador[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const { toast } = useToast()

  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingMorador, setEditingMorador] = useState<Morador | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [moradorToDelete, setMoradorToDelete] = useState<Morador | null>(null)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const data = await getMoradores()
      setMoradores(data as Morador[])
    } catch (e: any) {
      console.error('Failed to load moradores:', e)
      toast({ title: 'Erro ao carregar moradores', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async (data: any) => {
    setSubmitting(true)
    setFieldErrors({})
    try {
      if (editingMorador) {
        await updateMorador(editingMorador.id, data)
        toast({ title: 'Morador atualizado com sucesso.' })
      } else {
        await createMorador(data)
        toast({ title: 'Morador criado com sucesso.' })
      }
      setIsFormOpen(false)
      loadData()
    } catch (e: any) {
      console.error('Failed to save morador:', e)
      const errors = extractFieldErrors(e)

      if (errors.name) {
        errors.nome = errors.name
        delete errors.name
      }
      if (errors.phone) {
        errors.telefone = errors.phone
        delete errors.phone
      }
      if (errors.unidade) {
        errors.apartamento = errors.unidade
        delete errors.unidade
      }

      setFieldErrors(errors)
      toast({
        title: 'Erro ao salvar',
        description: Object.values(errors)[0] || 'Verifique os dados informados.',
        variant: 'destructive',
      })
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!moradorToDelete) return
    setSubmitting(true)
    try {
      await deleteMorador(moradorToDelete.id)
      toast({ title: 'Morador removido com sucesso.' })
      loadData()
    } catch (e: any) {
      console.error('Failed to delete morador:', e)
      toast({
        title: 'Erro',
        description: 'Não foi possível remover o morador.',
        variant: 'destructive',
      })
    } finally {
      setSubmitting(false)
      setIsDeleteDialogOpen(false)
      setMoradorToDelete(null)
    }
  }

  const openNewForm = () => {
    setEditingMorador(null)
    setFieldErrors({})
    setIsFormOpen(true)
  }

  const openEditForm = (morador: Morador) => {
    setEditingMorador(morador)
    setFieldErrors({})
    setIsFormOpen(true)
  }

  const openDeleteConfirm = (morador: Morador) => {
    setMoradorToDelete(morador)
    setIsDeleteDialogOpen(true)
  }

  const filtered = moradores.filter(
    (m) =>
      m.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.cpf.includes(searchTerm) ||
      m.email.toLowerCase().includes(searchTerm.toLowerCase()),
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
        <h2 className="text-2xl font-bold tracking-tight text-primary">Gestão de Moradores</h2>
        <p className="text-muted-foreground">Gerencie o cadastro de moradores e suas unidades.</p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <CardTitle>Lista de Moradores</CardTitle>
            <div className="flex flex-col sm:flex-row gap-4 items-center w-full sm:w-auto">
              <div className="relative w-full sm:w-72">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nome, cpf ou email..."
                  className="pl-8"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <Button onClick={openNewForm} className="w-full sm:w-auto">
                <Plus className="h-4 w-4 mr-2" /> Cadastrar Morador
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="border rounded-md">
            <Table>
              <TableHeader className="bg-neutralBg">
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>CPF</TableHead>
                  <TableHead>Torre</TableHead>
                  <TableHead>Apartamento</TableHead>
                  <TableHead>Telefone</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell className="font-medium whitespace-nowrap">{m.nome}</TableCell>
                    <TableCell>{m.email}</TableCell>
                    <TableCell>{m.cpf}</TableCell>
                    <TableCell>{m.torre}</TableCell>
                    <TableCell>{m.apartamento}</TableCell>
                    <TableCell>{m.telefone}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEditForm(m)}
                          title="Editar"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openDeleteConfirm(m)}
                          title="Deletar"
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-4 text-muted-foreground">
                      Nenhum morador encontrado.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{editingMorador ? 'Editar Morador' : 'Cadastrar Morador'}</DialogTitle>
            <DialogDescription>
              {editingMorador
                ? 'Altere os dados do morador abaixo.'
                : 'Preencha os dados para cadastrar um novo morador.'}
            </DialogDescription>
          </DialogHeader>
          <ResidentForm
            initialData={editingMorador}
            onSubmit={handleSave}
            onCancel={() => setIsFormOpen(false)}
            submitting={submitting}
            fieldErrors={fieldErrors}
          />
        </DialogContent>
      </Dialog>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir morador?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o morador <strong>{moradorToDelete?.nome}</strong>?
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={submitting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault()
                handleDelete()
              }}
              disabled={submitting}
              className="bg-destructive hover:bg-destructive/90"
            >
              {submitting ? 'Excluindo...' : 'Deletar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
