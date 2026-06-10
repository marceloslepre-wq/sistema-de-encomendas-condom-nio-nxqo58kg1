import { useState, useEffect } from 'react'
import pb from '@/lib/pocketbase/client'
import { useToast } from '@/hooks/use-toast'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Trash2, UserPlus, Search, Loader2 } from 'lucide-react'
import { useRealtime } from '@/hooks/use-realtime'

const formatCpf = (value: string) => {
  const v = value.replace(/\D/g, '').substring(0, 11)
  return v
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2')
}

const formatPhone = (value: string) => {
  const v = value.replace(/\D/g, '').substring(0, 11)
  if (v.length <= 10) return v.replace(/(\d{2})(\d)/, '($1) $2').replace(/(\d{4})(\d)/, '$1-$2')
  return v.replace(/(\d{2})(\d)/, '($1) $2').replace(/(\d{5})(\d)/, '$1-$2')
}

type Entregador = {
  id: string
  nome: string
  cpf: string
  celular: string
}

export default function PortariaEntregadores() {
  const { toast } = useToast()
  const [entregadores, setEntregadores] = useState<Entregador[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(false)

  const [nome, setNome] = useState('')
  const [cpf, setCpf] = useState('')
  const [celular, setCelular] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const loadData = async () => {
    setLoading(true)
    try {
      const records = await pb
        .collection('entregadores')
        .getFullList<Entregador>({ sort: '-created' })
      setEntregadores(records)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])
  useRealtime('entregadores', () => loadData())

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!nome || cpf.length !== 14 || celular.length < 14) {
      toast({
        title: 'Atenção',
        description: 'Preencha todos os campos corretamente.',
        variant: 'destructive',
      })
      return
    }

    setSubmitting(true)
    try {
      const digitsCpf = cpf.replace(/\D/g, '')
      const exists = entregadores.find((en) => en.cpf === digitsCpf)
      if (exists) {
        toast({
          title: 'Atenção',
          description: 'Este CPF já está cadastrado.',
          variant: 'destructive',
        })
        setSubmitting(false)
        return
      }

      await pb.collection('entregadores').create({
        nome,
        cpf: digitsCpf,
        celular: celular.replace(/\D/g, ''),
      })

      toast({ title: 'Sucesso', description: 'Entregador cadastrado com sucesso.' })
      setNome('')
      setCpf('')
      setCelular('')
    } catch (err: any) {
      toast({
        title: 'Erro',
        description: 'Falha ao cadastrar entregador.',
        variant: 'destructive',
      })
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!window.confirm('Deseja realmente excluir este entregador?')) return
    try {
      await pb.collection('entregadores').delete(id)
      toast({ title: 'Sucesso', description: 'Entregador excluído.' })
    } catch (err) {
      toast({ title: 'Erro', description: 'Falha ao excluir.', variant: 'destructive' })
    }
  }

  const filtered = entregadores.filter(
    (e) =>
      e.nome.toLowerCase().includes(search.toLowerCase()) ||
      e.cpf.includes(search.replace(/\D/g, '')),
  )

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-20 animate-fade-in">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Cadastro de Entregador</h2>
        <p className="text-muted-foreground">
          Gerencie a base de entregadores para preenchimento automático na portaria.
        </p>
      </div>

      <Card>
        <CardHeader className="border-b bg-muted/20">
          <CardTitle className="text-lg flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-primary" /> Novo Entregador
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <form onSubmit={handleAdd} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
            <div className="space-y-2 md:col-span-2">
              <Label>Nome Completo</Label>
              <Input
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Ex: João da Silva"
              />
            </div>
            <div className="space-y-2">
              <Label>CPF</Label>
              <Input
                value={cpf}
                onChange={(e) => setCpf(formatCpf(e.target.value))}
                placeholder="000.000.000-00"
                maxLength={14}
              />
            </div>
            <div className="space-y-2">
              <Label>Celular</Label>
              <Input
                value={celular}
                onChange={(e) => setCelular(formatPhone(e.target.value))}
                placeholder="(00) 00000-0000"
                maxLength={15}
              />
            </div>
            <div className="md:col-span-4 flex justify-end mt-2">
              <Button type="submit" disabled={submitting}>
                {submitting ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <UserPlus className="w-4 h-4 mr-2" />
                )}
                Cadastrar
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-4 border-b">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <CardTitle className="text-lg">Entregadores Cadastrados</CardTitle>
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome ou CPF..."
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead className="pl-6">Nome</TableHead>
                <TableHead>CPF</TableHead>
                <TableHead>Celular</TableHead>
                <TableHead className="text-right pr-6">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center h-24">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto text-muted-foreground" />
                  </TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center h-24 text-muted-foreground">
                    Nenhum entregador encontrado.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((ent) => (
                  <TableRow key={ent.id}>
                    <TableCell className="pl-6 font-medium">{ent.nome}</TableCell>
                    <TableCell>{formatCpf(ent.cpf)}</TableCell>
                    <TableCell>{formatPhone(ent.celular)}</TableCell>
                    <TableCell className="text-right pr-6">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:bg-destructive/10"
                        onClick={() => handleDelete(ent.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
