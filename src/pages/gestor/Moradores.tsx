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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Search, Mail, Ban, CheckCircle, Plus, Edit, Trash2 } from 'lucide-react'
import { getUnits, AppUser, Unit } from '@/services/api'
import pb from '@/lib/pocketbase/client'
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
  const [users, setUsers] = useState<AppUser[]>([])
  const [units, setUnits] = useState<Unit[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const { toast } = useToast()

  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<AppUser | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [userToDelete, setUserToDelete] = useState<AppUser | null>(null)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const [userData, unitData] = await Promise.all([
        pb.collection('users').getFullList({ expand: 'unit_id' }),
        getUnits(),
      ])
      setUsers(userData as unknown as AppUser[])
      setUnits(unitData as Unit[])
    } catch (e: any) {
      console.error('Failed to load users or units:', e, e.response)
    } finally {
      setLoading(false)
    }
  }

  const handleSaveUser = async (data: any) => {
    setSubmitting(true)
    setFieldErrors({})
    try {
      if (editingUser) {
        const updatePayload: any = {
          name: data.name,
          phone: data.phone,
          role: 'morador',
        }
        if (data.password) {
          updatePayload.password = data.password
          updatePayload.passwordConfirm = data.confirm
        }
        await pb.collection('users').update(editingUser.id, updatePayload)
        toast({ title: 'Morador atualizado com sucesso.' })
      } else {
        const createPayload: any = {
          email: data.email,
          name: data.name,
          phone: data.phone,
          role: 'morador',
          password: data.password,
          passwordConfirm: data.confirm,
        }
        await pb.collection('users').create(createPayload)
        toast({ title: 'Morador criado com sucesso.' })
      }
      setIsFormOpen(false)
      loadData()
    } catch (e: any) {
      console.error('Failed to save resident:', e, e.response)
      const errors = extractFieldErrors(e)
      setFieldErrors(errors)

      let errorMsg = 'Não foi possível salvar o registro. Verifique os dados informados.'
      if (Object.keys(errors).length > 0) {
        errorMsg = Object.values(errors)[0]
      } else if (e?.response?.message) {
        errorMsg = e.response.message
      } else if (e?.message) {
        errorMsg = e.message
      }

      toast({
        title: 'Erro ao salvar',
        description: errorMsg,
        variant: 'destructive',
      })
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeleteUser = async () => {
    if (!userToDelete) return
    try {
      await pb.collection('users').delete(userToDelete.id)
      toast({ title: 'Morador removido com sucesso.' })
      loadData()
    } catch (e: any) {
      console.error('Failed to delete user:', e, e.response)
      toast({
        title: 'Erro',
        description: 'Não foi possível remover o morador.',
        variant: 'destructive',
      })
    } finally {
      setIsDeleteDialogOpen(false)
      setUserToDelete(null)
    }
  }

  const openNewForm = () => {
    setEditingUser(null)
    setFieldErrors({})
    setIsFormOpen(true)
  }

  const openEditForm = (user: AppUser) => {
    setEditingUser(user)
    setFieldErrors({})
    setIsFormOpen(true)
  }

  const openDeleteConfirm = (user: AppUser) => {
    setUserToDelete(user)
    setIsDeleteDialogOpen(true)
  }

  const toggleStatus = async (user: AppUser) => {
    const newStatus = user.status === 'Ativo' ? 'Bloqueado' : 'Ativo'
    try {
      await pb.collection('users').update(user.id, { status: newStatus })
      setUsers(users.map((u) => (u.id === user.id ? { ...u, status: newStatus } : u)))
      toast({ title: 'Status atualizado', description: `${user.name} agora está ${newStatus}.` })
    } catch (e: any) {
      console.error('Failed to update status:', e, e.response)
      toast({
        title: 'Erro',
        description: 'Não foi possível atualizar o status.',
        variant: 'destructive',
      })
    }
  }

  const resendInvite = (user: AppUser) => {
    toast({
      title: 'Convite reenviado',
      description: `Um novo email foi enviado para ${user.email}.`,
    })
  }

  const filtered = users.filter(
    (u) =>
      u.role === 'morador' &&
      (!u.unit_id || units.some((unit) => unit.id === u.unit_id)) &&
      (u.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.expand?.unit_id?.apartment?.includes(searchTerm)),
  )

  const cadastrados = filtered.filter(
    (u) => u.status === 'Ativo' || u.status === 'Bloqueado' || !u.status,
  )
  const pendentes = filtered.filter((u) => u.status === 'Pendente')

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
        <p className="text-muted-foreground">Gerencie o acesso e perfil dos condôminos.</p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <CardTitle>Lista de Moradores</CardTitle>
            <div className="flex flex-col sm:flex-row gap-4 items-center w-full sm:w-auto">
              <div className="relative w-full sm:w-72">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nome ou apto..."
                  className="pl-8"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <Button onClick={openNewForm} className="w-full sm:w-auto">
                <Plus className="h-4 w-4 mr-2" /> Novo Morador
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="cadastrados">
            <TabsList className="mb-4">
              <TabsTrigger value="cadastrados">
                Cadastrados{' '}
                <Badge variant="secondary" className="ml-2">
                  {cadastrados.length}
                </Badge>
              </TabsTrigger>
              <TabsTrigger value="pendentes">
                Pendentes{' '}
                <Badge variant="secondary" className="ml-2">
                  {pendentes.length}
                </Badge>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="cadastrados" className="m-0">
              <div className="border rounded-md">
                <Table>
                  <TableHeader className="bg-neutralBg">
                    <TableRow>
                      <TableHead>Unidade</TableHead>
                      <TableHead>Nome</TableHead>
                      <TableHead>CPF</TableHead>
                      <TableHead>Celular</TableHead>
                      <TableHead>E-mail</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {cadastrados.map((r) => (
                      <TableRow key={r.id}>
                        <TableCell className="font-medium whitespace-nowrap">
                          {r.expand?.unit_id
                            ? `T${r.expand.unit_id.tower} - ${r.expand.unit_id.apartment}`
                            : '-'}
                        </TableCell>
                        <TableCell>{r.name}</TableCell>
                        <TableCell>{r.cpf || '-'}</TableCell>
                        <TableCell>{r.phone || '-'}</TableCell>
                        <TableCell>{r.email}</TableCell>
                        <TableCell>
                          <Badge
                            variant={r.status === 'Bloqueado' ? 'destructive' : 'default'}
                            className={
                              r.status !== 'Bloqueado' ? 'bg-success hover:bg-success/80' : ''
                            }
                          >
                            {r.status || 'Ativo'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => toggleStatus(r)}
                              title={r.status === 'Ativo' ? 'Bloquear' : 'Ativar'}
                            >
                              {r.status === 'Ativo' ? (
                                <Ban className="h-4 w-4 text-destructive" />
                              ) : (
                                <CheckCircle className="h-4 w-4 text-success" />
                              )}
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openEditForm(r)}
                              title="Editar"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openDeleteConfirm(r)}
                              title="Excluir"
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {cadastrados.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-4 text-muted-foreground">
                          Nenhum morador encontrado.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>

            <TabsContent value="pendentes" className="m-0">
              <div className="border rounded-md">
                <Table>
                  <TableHeader className="bg-neutralBg">
                    <TableRow>
                      <TableHead>Unidade</TableHead>
                      <TableHead>Nome</TableHead>
                      <TableHead>E-mail</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pendentes.map((r) => (
                      <TableRow key={r.id}>
                        <TableCell className="font-medium whitespace-nowrap">
                          {r.expand?.unit_id
                            ? `T${r.expand.unit_id.tower} - ${r.expand.unit_id.apartment}`
                            : '-'}
                        </TableCell>
                        <TableCell>{r.name}</TableCell>
                        <TableCell>{r.email}</TableCell>
                        <TableCell>
                          <Badge variant="secondary">{r.status || 'Pendente'}</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button variant="ghost" size="sm" onClick={() => resendInvite(r)}>
                              <Mail className="h-4 w-4 mr-2" /> Reenviar
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openEditForm(r)}
                              title="Editar"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openDeleteConfirm(r)}
                              title="Excluir"
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {pendentes.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-4 text-muted-foreground">
                          Nenhum cadastro pendente.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{editingUser ? 'Editar Morador' : 'Novo Morador'}</DialogTitle>
            <DialogDescription>
              {editingUser
                ? 'Altere os dados do morador abaixo.'
                : 'Preencha os dados para cadastrar um novo morador.'}
            </DialogDescription>
          </DialogHeader>
          <ResidentForm
            initialData={editingUser}
            units={units}
            onSubmit={handleSaveUser}
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
              Tem certeza que deseja excluir o morador <strong>{userToDelete?.name}</strong>? Esta
              ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={submitting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault()
                handleDeleteUser()
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
