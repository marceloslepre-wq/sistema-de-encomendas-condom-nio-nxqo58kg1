import { useEffect, useState } from 'react'
import pb from '@/lib/pocketbase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { Link2, Copy, Mail, MessageCircle, Trash2, Search } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { format, isValid } from 'date-fns'

export default function GestorLinks() {
  const { toast } = useToast()
  const [units, setUnits] = useState<any[]>([])
  const [links, setLinks] = useState<any[]>([])
  const [selectedTower, setSelectedTower] = useState('')
  const [selectedUnitId, setSelectedUnitId] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      pb.collection('units').getFullList({ sort: 'tower,apartment', expand: 'condo_id' }),
      pb
        .collection('invitation_links')
        .getFullList({ expand: 'condo_id,unit_id', sort: '-created' }),
    ])
      .then(([u, l]) => {
        setUnits(u)
        setLinks(l)
        setLoading(false)
      })
      .catch((err) => {
        console.error('Failed to fetch data:', err)
        setLoading(false)
      })
  }, [])

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedTower || !selectedUnitId) return

    const unit = units.find((u) => u.id === selectedUnitId)
    if (!unit) return

    const token = Math.random().toString(36).substring(2, 10).toUpperCase()

    try {
      const newLink = await pb.collection('invitation_links').create({
        condo_id: unit.condo_id,
        role: 'morador',
        token,
        used: false,
        unit_id: selectedUnitId,
      })

      const linkWithCondo = {
        ...newLink,
        expand: {
          condo_id: unit.expand?.condo_id,
          unit_id: unit,
        },
      }
      setLinks([linkWithCondo, ...links])
      toast({ title: 'Link gerado com sucesso!', description: 'O link está pronto para uso.' })

      const linkUrl = `${window.location.origin}/cadastro-morador?torre=${unit.tower}&unidade=${unit.apartment}&token=${token}`
      console.log('Link gerado:', { torre: unit.tower, unidade: unit.apartment, link: linkUrl })

      setSelectedTower('')
      setSelectedUnitId('')
    } catch (err: any) {
      console.error('Failed to generate link:', err)
      toast({ title: 'Erro', description: 'Falha ao gerar link.', variant: 'destructive' })
    }
  }

  const getLinkUrl = (l: any) => {
    if (l.role === 'morador' && l.expand?.unit_id) {
      const unit = l.expand.unit_id
      return `${window.location.origin}/cadastro-morador?torre=${unit.tower}&unidade=${unit.apartment}&token=${l.token}`
    }
    return `${window.location.origin}/cadastro?token=${l.token}`
  }

  const copyToClipboard = (l: any) => {
    navigator.clipboard.writeText(getLinkUrl(l))
    toast({ title: 'Link copiado!', description: 'Área de transferência atualizada.' })
  }

  const handleDelete = async (id: string) => {
    try {
      await pb.collection('invitation_links').delete(id)
      setLinks(links.filter((l) => l.id !== id))
      toast({ title: 'Link removido!', description: 'O convite foi deletado com sucesso.' })
    } catch (err) {
      toast({ title: 'Erro', description: 'Falha ao remover link.', variant: 'destructive' })
    }
  }

  const availableTowers = Array.from(new Set(units.map((u) => u.tower))).sort()
  const availableApartments = units
    .filter((u) => u.tower === selectedTower)
    .sort((a, b) => a.apartment.localeCompare(b.apartment))

  const activeLinks = links.filter((l) => {
    if (l.used) return false
    if (!searchTerm) return true
    const search = searchTerm.toLowerCase()
    const condoName = l.expand?.condo_id?.name?.toLowerCase() || ''
    const tower = l.expand?.unit_id?.tower?.toLowerCase() || ''
    const apt = l.expand?.unit_id?.apartment?.toLowerCase() || ''
    const role = l.role?.toLowerCase() || ''
    return (
      condoName.includes(search) ||
      tower.includes(search) ||
      apt.includes(search) ||
      role.includes(search)
    )
  })

  const getLinkDescription = (l: any) => {
    const condoName = l.expand?.condo_id?.name || 'Sem Condomínio'
    if (l.role === 'morador' && l.expand?.unit_id) {
      return `${l.expand.unit_id.tower} - ${l.expand.unit_id.apartment} - ${condoName}`
    }
    return `${l.role} - ${condoName}`
  }

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-primary">Geração de Links</h2>
        <p className="text-muted-foreground">
          Crie links de convite para cadastrar novos moradores.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Novo Convite</CardTitle>
            <CardDescription>Gere um link seguro de uso único para moradores.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleGenerate} className="space-y-4">
              <div className="space-y-2">
                <Label>Torre</Label>
                <Select
                  value={selectedTower}
                  onValueChange={(val) => {
                    setSelectedTower(val)
                    setSelectedUnitId('')
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a Torre" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableTowers.map((tower: string) => (
                      <SelectItem key={tower} value={tower}>
                        {tower}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Unidade</Label>
                <Select
                  value={selectedUnitId}
                  onValueChange={setSelectedUnitId}
                  disabled={!selectedTower}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a Unidade" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableApartments.map((u) => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.apartment}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedTower && selectedUnitId && (
                <p className="text-sm font-medium text-primary mt-2">
                  Torre: {selectedTower} | Unidade:{' '}
                  {units.find((u) => u.id === selectedUnitId)?.apartment}
                </p>
              )}

              <Button
                type="submit"
                className="w-full mt-4"
                disabled={!selectedTower || !selectedUnitId}
              >
                <Link2 className="mr-2 h-4 w-4" /> Gerar Link
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Links Ativos</CardTitle>
            <CardDescription>Gerencie os convites gerados e não utilizados.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-4">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por torre, unidade ou condomínio..."
                  className="pl-8"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-4 max-h-[350px] overflow-y-auto pr-2">
              {loading && <p className="text-sm text-muted-foreground">Carregando...</p>}
              {!loading && activeLinks.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Nenhum link ativo encontrado.
                </p>
              )}
              {activeLinks.map((l) => (
                <div
                  key={l.id}
                  className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between p-3 border rounded-lg bg-white shadow-subtle"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm text-primary truncate capitalize">
                      {getLinkDescription(l)}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Criado em:{' '}
                      {l.created && isValid(new Date(l.created))
                        ? format(new Date(l.created), 'dd/MM HH:mm')
                        : 'Sem data'}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => copyToClipboard(l)}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Copiar Link</TooltipContent>
                    </Tooltip>

                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => {
                            const text = encodeURIComponent(
                              `Olá! Segue o seu link de convite para o sistema:\n\n${getLinkUrl(l)}`,
                            )
                            window.open(`https://wa.me/?text=${text}`, '_blank')
                          }}
                        >
                          <MessageCircle className="h-4 w-4 text-green-600" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Enviar por WhatsApp</TooltipContent>
                    </Tooltip>

                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => {
                            const subject = encodeURIComponent('Convite para o Sistema')
                            const body = encodeURIComponent(
                              `Olá! Segue o seu link de convite para acessar o sistema:\n\n${getLinkUrl(l)}`,
                            )
                            window.location.href = `mailto:?subject=${subject}&body=${body}`
                          }}
                        >
                          <Mail className="h-4 w-4 text-blue-600" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Enviar por Email</TooltipContent>
                    </Tooltip>

                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8 border-destructive/30 text-destructive hover:bg-destructive/10"
                          onClick={() => handleDelete(l.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Excluir Convite</TooltipContent>
                    </Tooltip>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
