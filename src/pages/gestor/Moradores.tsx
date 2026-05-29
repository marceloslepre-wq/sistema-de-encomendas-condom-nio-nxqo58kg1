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
import { Search, Mail, Ban, CheckCircle } from 'lucide-react'
import { getUsers, updateUser, AppUser } from '@/services/api'
import { useToast } from '@/hooks/use-toast'
import { Skeleton } from '@/components/ui/skeleton'

export default function GestorMoradores() {
  const [users, setUsers] = useState<AppUser[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const { toast } = useToast()

  useEffect(() => {
    loadUsers()
  }, [])

  const loadUsers = async () => {
    try {
      const data = await getUsers()
      setUsers(data as AppUser[])
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const toggleStatus = async (user: AppUser) => {
    const newStatus = user.status === 'Ativo' ? 'Bloqueado' : 'Ativo'
    try {
      await updateUser(user.id, { status: newStatus })
      setUsers(users.map((u) => (u.id === user.id ? { ...u, status: newStatus } : u)))
      toast({ title: 'Status atualizado', description: `${user.name} agora está ${newStatus}.` })
    } catch (e) {
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
      (u.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.expand?.unit_id?.apartment?.includes(searchTerm)),
  )

  const cadastrados = filtered.filter((u) => u.status === 'Ativo' || u.status === 'Bloqueado')
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
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome ou apto..."
                className="pl-8"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
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
                          T{r.expand?.unit_id?.tower} - {r.expand?.unit_id?.apartment}
                        </TableCell>
                        <TableCell>{r.name}</TableCell>
                        <TableCell>{r.cpf || '-'}</TableCell>
                        <TableCell>{r.phone || '-'}</TableCell>
                        <TableCell>{r.email}</TableCell>
                        <TableCell>
                          <Badge
                            variant={r.status === 'Ativo' ? 'default' : 'destructive'}
                            className={r.status === 'Ativo' ? 'bg-success hover:bg-success/80' : ''}
                          >
                            {r.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm" onClick={() => toggleStatus(r)}>
                            {r.status === 'Ativo' ? (
                              <Ban className="h-4 w-4 text-destructive" />
                            ) : (
                              <CheckCircle className="h-4 w-4 text-success" />
                            )}
                          </Button>
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
                          T{r.expand?.unit_id?.tower} - {r.expand?.unit_id?.apartment}
                        </TableCell>
                        <TableCell>{r.name}</TableCell>
                        <TableCell>{r.email}</TableCell>
                        <TableCell>
                          <Badge variant="secondary">{r.status}</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm" onClick={() => resendInvite(r)}>
                            <Mail className="h-4 w-4 mr-2" /> Reenviar
                          </Button>
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
    </div>
  )
}
