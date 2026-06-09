import { useState, useEffect, useMemo } from 'react'
import pb from '@/lib/pocketbase/client'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { Plus, Search, Edit, Trash2, Loader2, ShieldAlert } from 'lucide-react'
import { useRealtime } from '@/hooks/use-realtime'
import { getUsers, createUser, adminUpdateUser, deleteUser, AppUser } from '@/services/api'
import { extractFieldErrors } from '@/lib/pocketbase/errors'

const formatPhone = (value: string) => {
  const v = value.replace(/\D/g, '').substring(0, 11)
  if (v.length <= 10) {
    return v.replace(/(\d{2})(\d)/, '($1) $2').replace(/(\d{4})(\d)/, '$1-$2')
  }
  return v.replace(/(\d{2})(\d)/, '($1) $2').replace(/(\d{5})(\d)/, '$1-$2')
}

export default function GestorUsuarios() {
  const { toast } = useToast()
  const [users, setUsers] = useState<AppUser[]>([])
  const [units, setUnits] = useState<any[]>([])
  const [torres, setTorres] = useState<string[]>([])
  const [unidadesPorTorre, setUnidadesPorTorre] = useState<string[]>([])

  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('todos')

  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<AppUser | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  const [formData, setFormData] = useState({
    role: 'morador',
    name: '',
    email: '',
    password: '',
    phone: '',
    cpf: '',
    torre: '',
    unidade: '',
  })

  useEffect(() => {
    loadData()
    pb.collection('units')
      .getFullList()
      .then((data) => {
        setUnits(data)
        const t = Array.from(new Set(data.map((u) => u.tower)))
        setTorres(t as string[])
      })
      .catch(() => {})
  }, [])

  const loadData = async () => {
    try {
      const usersData = await getUsers()
      setUsers(usersData)
    } catch (err) {
      toast({ title: 'Erro', description: 'Falha ao carregar dados.', variant: 'destructive' })
    }
  }

  useRealtime('users', () => {
    loadData()
  })

  useEffect(() => {
    if (formData.torre) {
      const apts = units.filter((u) => u.tower === formData.torre).map((u) => u.apartment)
      setUnidadesPorTorre(Array.from(new Set(apts)) as string[])
    } else {
      setUnidadesPorTorre([])
    }
  }, [formData.torre, units])

  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const matchSearch =
        u.name?.toLowerCase().includes(search.toLowerCase()) ||
        u.email?.toLowerCase().includes(search.toLowerCase()) ||
        (u as any).cpf?.includes(search)
      const matchRole = roleFilter === 'todos' || u.role === roleFilter
      return matchSearch && matchRole
    })
  }, [users, search, roleFilter])

  const handleOpenDialog = (user?: AppUser) => {
    setFieldErrors({})
    if (user) {
      setEditingUser(user)
      setFormData({
        role: user.role || 'morador',
        name: user.name || '',
        email: user.email || '',
        password: '',
        phone: user.phone || '',
        cpf: (user as any).cpf || '',
        torre: (user as any).torre || '',
        unidade: (user as any).unidade || '',
      })
    } else {
      setEditingUser(null)
      setFormData({
        role: 'morador',
        name: '',
        email: '',
        password: '',
        phone: '',
        cpf: '',
        torre: '',
        unidade: '',
      })
    }
    setIsDialogOpen(true)
  }

  const handleSubmit = async () => {
    if (!formData.name || !formData.email || !formData.role) {
      toast({
        title: 'Atenção',
        description: 'Preencha os campos obrigatórios (Nome, E-mail, Perfil).',
        variant: 'destructive',
      })
      return
    }

    if (!editingUser && formData.password.length < 8) {
      toast({
        title: 'Atenção',
        description: 'A senha deve ter no mínimo 8 caracteres.',
        variant: 'destructive',
      })
      return
    }

    if (formData.role === 'morador') {
      if (!formData.cpf || !formData.torre || !formData.unidade) {
        toast({
          title: 'Atenção',
          description: 'Preencha CPF, Torre e Unidade para moradores.',
          variant: 'destructive',
        })
        return
      }
    }

    setIsSubmitting(true)
    setFieldErrors({})

    try {
      const dataToSave: any = {}

      if (editingUser) {
        if (formData.name !== (editingUser.name || '')) dataToSave.name = formData.name
        if (formData.email !== (editingUser.email || '')) dataToSave.email = formData.email
        if (formData.phone !== (editingUser.phone || '')) dataToSave.phone = formData.phone
        if (formData.role !== (editingUser.role || '')) dataToSave.role = formData.role

        if (formData.role === 'morador') {
          if (formData.cpf !== ((editingUser as any).cpf || '')) dataToSave.cpf = formData.cpf
          if (formData.torre !== ((editingUser as any).torre || ''))
            dataToSave.torre = formData.torre
          if (formData.unidade !== ((editingUser as any).unidade || ''))
            dataToSave.unidade = formData.unidade
        } else {
          if ((editingUser as any).cpf) dataToSave.cpf = ''
          if ((editingUser as any).torre) dataToSave.torre = ''
          if ((editingUser as any).unidade) dataToSave.unidade = ''
        }
      } else {
        dataToSave.name = formData.name
        dataToSave.email = formData.email
        dataToSave.phone = formData.phone
        dataToSave.role = formData.role

        if (formData.role === 'morador') {
          dataToSave.cpf = formData.cpf
          dataToSave.torre = formData.torre
          dataToSave.unidade = formData.unidade
        }
      }

      if (formData.password && formData.password.trim() !== '') {
        dataToSave.password = formData.password
        dataToSave.passwordConfirm = formData.password
      }

      if (editingUser) {
        if (Object.keys(dataToSave).length > 0) {
          await adminUpdateUser(editingUser.id, dataToSave)
        }
        toast({
          title: 'Sucesso',
          description: 'Usuário atualizado com sucesso.',
          className: 'bg-success text-white',
        })
      } else {
        await createUser(dataToSave)
        toast({
          title: 'Sucesso',
          description: 'Usuário criado com sucesso.',
          className: 'bg-success text-white',
        })
      }

      setIsDialogOpen(false)
      loadData()
    } catch (err: any) {
      const errors = extractFieldErrors(err)
      if (
        err?.response?.data?.cpf?.code === 'validation_not_unique' ||
        errors.cpf === 'Value must be unique.'
      ) {
        errors.cpf = 'Este CPF já está cadastrado.'
      }
      setFieldErrors(errors)
      const errorMsg =
        Object.values(errors)[0] || err?.message || 'Falha ao salvar usuário. Verifique os dados.'
      toast({ title: 'Erro', description: errorMsg, variant: 'destructive' })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (confirm('Tem certeza que deseja excluir este usuário?')) {
      try {
        await deleteUser(id)
        toast({ title: 'Sucesso', description: 'Usuário excluído com sucesso.' })
        loadData()
      } catch (err) {
        toast({ title: 'Erro', description: 'Falha ao excluir usuário.', variant: 'destructive' })
      }
    }
  }

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'gestor':
        return <Badge className="bg-purple-500 hover:bg-purple-600">Gestor</Badge>
      case 'porteiro':
      case 'portaria':
        return <Badge className="bg-blue-500 hover:bg-blue-600">Portaria</Badge>
      case 'triagem':
        return <Badge className="bg-indigo-500 hover:bg-indigo-600">Triagem</Badge>
      case 'morador':
        return <Badge className="bg-green-500 hover:bg-green-600">Morador</Badge>
      default:
        return <Badge variant="outline">{role}</Badge>
    }
  }

  return (
    <div className="space-y-6 pb-10 animate-fade-in">
      <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Gestão de Usuários</h2>
          <p className="text-muted-foreground">
            Administre contas e permissões de acesso do condomínio.
          </p>
        </div>
        <Button onClick={() => handleOpenDialog()} className="gap-2 shrink-0">
          <Plus className="w-4 h-4" /> Novo Usuário
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row gap-4 justify-between">
            <div className="relative w-full sm:max-w-xs">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome, e-mail ou CPF..."
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="w-full sm:w-48">
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filtrar por Perfil" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os Perfis</SelectItem>
                  <SelectItem value="gestor">Gestor</SelectItem>
                  <SelectItem value="porteiro">Porteiro</SelectItem>
                  <SelectItem value="portaria">Portaria</SelectItem>
                  <SelectItem value="triagem">Triagem</SelectItem>
                  <SelectItem value="morador">Morador</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome e Contato</TableHead>
                  <TableHead>Telefone</TableHead>
                  <TableHead>Unidade</TableHead>
                  <TableHead>Perfil</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center h-24 text-muted-foreground">
                      Nenhum usuário encontrado com os filtros atuais.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredUsers.map((u) => (
                    <TableRow key={u.id}>
                      <TableCell>
                        <div className="font-medium">{u.name || 'Sem Nome'}</div>
                        <div className="text-sm text-muted-foreground">{u.email}</div>
                      </TableCell>
                      <TableCell>{u.phone || '-'}</TableCell>
                      <TableCell>
                        {u.role === 'morador' && (u as any).torre && (u as any).unidade
                          ? `${(u as any).torre} - ${(u as any).unidade}`
                          : '-'}
                      </TableCell>
                      <TableCell>{getRoleBadge(u.role)}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(u)}>
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive"
                          onClick={() => handleDelete(u.id)}
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

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingUser ? 'Editar Usuário' : 'Novo Usuário'}</DialogTitle>
            <DialogDescription>
              {editingUser
                ? 'Altere os dados do usuário abaixo e salve as modificações.'
                : 'Preencha os dados obrigatórios para cadastrar um novo acesso.'}
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
            <div className="space-y-2 md:col-span-2">
              <Label>
                Perfil de Acesso <span className="text-destructive">*</span>
              </Label>
              <Select
                value={formData.role}
                onValueChange={(v) => setFormData({ ...formData, role: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="gestor">Gestor</SelectItem>
                  <SelectItem value="porteiro">Porteiro</SelectItem>
                  <SelectItem value="portaria">Portaria</SelectItem>
                  <SelectItem value="triagem">Triagem</SelectItem>
                  <SelectItem value="morador">Morador</SelectItem>
                </SelectContent>
              </Select>
              {fieldErrors.role && <p className="text-xs text-destructive">{fieldErrors.role}</p>}
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label>
                Nome Completo <span className="text-destructive">*</span>
              </Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ex: João Silva"
              />
              {fieldErrors.name && <p className="text-xs text-destructive">{fieldErrors.name}</p>}
            </div>

            <div className="space-y-2">
              <Label>
                E-mail <span className="text-destructive">*</span>
              </Label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="email@exemplo.com"
              />
              {fieldErrors.email && <p className="text-xs text-destructive">{fieldErrors.email}</p>}
            </div>

            <div className="space-y-2">
              <Label>
                Senha
                {!editingUser && <span className="text-destructive"> *</span>}
                {editingUser && (
                  <span className="text-muted-foreground text-xs font-normal ml-1">(Opcional)</span>
                )}
              </Label>
              <Input
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder={editingUser ? 'Deixe em branco para manter' : 'Mínimo 8 caracteres'}
              />
              {fieldErrors.password && (
                <p className="text-xs text-destructive">{fieldErrors.password}</p>
              )}
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label>Celular (Opcional)</Label>
              <Input
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: formatPhone(e.target.value) })}
                placeholder="(00) 00000-0000"
                maxLength={15}
              />
              {fieldErrors.phone && <p className="text-xs text-destructive">{fieldErrors.phone}</p>}
            </div>

            {formData.role === 'morador' && (
              <>
                <div className="space-y-2 md:col-span-2">
                  <Label>
                    CPF <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    value={formData.cpf}
                    onChange={(e) => {
                      const v = e.target.value.replace(/\D/g, '').substring(0, 11)
                      let formatted = v
                      if (v.length > 9)
                        formatted = v.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
                      else if (v.length > 6)
                        formatted = v.replace(/(\d{3})(\d{3})(\d{3})/, '$1.$2.$3')
                      else if (v.length > 3) formatted = v.replace(/(\d{3})(\d{3})/, '$1.$2')
                      setFormData({ ...formData, cpf: formatted })
                    }}
                    placeholder="000.000.000-00"
                    maxLength={14}
                  />
                  {fieldErrors.cpf && <p className="text-xs text-destructive">{fieldErrors.cpf}</p>}
                </div>

                <div className="space-y-2">
                  <Label>
                    Torre <span className="text-destructive">*</span>
                  </Label>
                  <Select
                    value={formData.torre}
                    onValueChange={(v) => setFormData({ ...formData, torre: v, unidade: '' })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a Torre" />
                    </SelectTrigger>
                    <SelectContent>
                      {torres.map((t) => (
                        <SelectItem key={t} value={t}>
                          {t}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {fieldErrors.torre && (
                    <p className="text-xs text-destructive">{fieldErrors.torre}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>
                    Unidade <span className="text-destructive">*</span>
                  </Label>
                  <Select
                    value={formData.unidade}
                    onValueChange={(v) => setFormData({ ...formData, unidade: v })}
                    disabled={!formData.torre}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a Unidade" />
                    </SelectTrigger>
                    <SelectContent>
                      {unidadesPorTorre.map((u) => (
                        <SelectItem key={u} value={u}>
                          {u}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {fieldErrors.unidade && (
                    <p className="text-xs text-destructive">{fieldErrors.unidade}</p>
                  )}
                </div>
              </>
            )}

            {formData.role === 'triagem' && (
              <div className="col-span-1 md:col-span-2 mt-2">
                <div className="bg-indigo-50 border border-indigo-200 text-indigo-800 text-sm p-3 rounded-md flex items-start gap-2">
                  <ShieldAlert className="w-5 h-5 shrink-0 mt-0.5" />
                  <p>
                    O perfil <strong>Triagem</strong> possui os mesmos acessos operacionais que a
                    Portaria (registro de pacotes), mas sua conta será diferenciada nos relatórios e
                    logs de auditoria do condomínio.
                  </p>
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDialogOpen(false)}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {editingUser ? 'Salvar Alterações' : 'Criar Usuário'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
