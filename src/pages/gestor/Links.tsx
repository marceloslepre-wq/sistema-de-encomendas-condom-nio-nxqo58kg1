import { useEffect, useState } from 'react'
import pb from '@/lib/pocketbase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { Link2, Copy, Mail, MessageCircle } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { format, isValid } from 'date-fns'

export default function GestorLinks() {
  const { toast } = useToast()
  const [condos, setCondos] = useState<any[]>([])
  const [links, setLinks] = useState<any[]>([])
  const [selectedCondo, setSelectedCondo] = useState('')
  const [selectedRole, setSelectedRole] = useState('')
  const [loading, setLoading] = useState(true)

  const roles = [
    { value: 'gestor', label: 'Gestor' },
    { value: 'porteiro', label: 'Porteiro' },
    { value: 'portaria', label: 'Portaria' },
    { value: 'triagem', label: 'Triagem' },
    { value: 'morador', label: 'Morador' },
  ]

  useEffect(() => {
    Promise.all([
      pb.collection('condos').getFullList(),
      pb.collection('invitation_links').getFullList({ expand: 'condo_id', sort: '-created' }),
    ])
      .then(([c, l]) => {
        setCondos(c)
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
    if (!selectedCondo || !selectedRole) return

    const token = Math.random().toString(36).substring(2, 10).toUpperCase()

    try {
      const newLink = await pb.collection('invitation_links').create({
        condo_id: selectedCondo,
        role: selectedRole,
        token,
        used: false,
      })
      const condo = condos.find((c) => c.id === selectedCondo)
      const linkWithCondo = { ...newLink, expand: { condo_id: condo } }
      setLinks([linkWithCondo, ...links])
      toast({ title: 'Link gerado com sucesso!', description: 'O link está pronto para uso.' })
      setSelectedRole('')
    } catch (err: any) {
      console.error('Failed to generate link:', err)
      toast({ title: 'Erro', description: 'Falha ao gerar link.', variant: 'destructive' })
    }
  }

  const copyToClipboard = (token: string) => {
    navigator.clipboard.writeText(`${window.location.origin}/cadastro?token=${token}`)
    toast({ title: 'Link copiado!', description: 'Área de transferência atualizada.' })
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-primary">Geração de Links</h2>
        <p className="text-muted-foreground">
          Crie links de convite para cadastrar novos usuários e moradores.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Novo Convite</CardTitle>
            <CardDescription>Gere um link seguro de uso único.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleGenerate} className="space-y-4">
              <div className="space-y-2">
                <Label>Condomínio</Label>
                <Select value={selectedCondo} onValueChange={setSelectedCondo}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o Condomínio" />
                  </SelectTrigger>
                  <SelectContent>
                    {condos.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Perfil de Acesso</Label>
                <Select value={selectedRole} onValueChange={setSelectedRole}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o Perfil" />
                  </SelectTrigger>
                  <SelectContent>
                    {roles.map((r) => (
                      <SelectItem key={r.value} value={r.value}>
                        {r.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button type="submit" className="w-full" disabled={!selectedCondo || !selectedRole}>
                <Link2 className="mr-2 h-4 w-4" /> Gerar Link
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Links Ativos</CardTitle>
            <CardDescription>Links gerados não utilizados.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
              {loading && <p className="text-sm text-muted-foreground">Carregando...</p>}
              {!loading && links.filter((l) => !l.used).length === 0 && (
                <p className="text-sm text-muted-foreground">Nenhum link ativo.</p>
              )}
              {links.map((l) => {
                if (l.used) return null

                return (
                  <div
                    key={l.id}
                    className="flex items-center justify-between p-3 border rounded-lg bg-white shadow-subtle"
                  >
                    <div>
                      <p className="font-medium text-sm text-primary capitalize">
                        {l.role} - {l.expand?.condo_id?.name || 'Sem Condomínio'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Criado em:{' '}
                        {l.created && isValid(new Date(l.created))
                          ? format(new Date(l.created), 'dd/MM HH:mm')
                          : 'Sem data'}
                        {l.expires_at && isValid(new Date(l.expires_at))
                          ? ` • Expira em: ${format(new Date(l.expires_at), 'dd/MM HH:mm')}`
                          : ''}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => copyToClipboard(l.token)}
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
                            onClick={() => {
                              const text = encodeURIComponent(
                                `Olá! Segue o seu link de convite para o sistema: ${window.location.origin}/cadastro?token=${l.token}`,
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
                            onClick={() => {
                              const subject = encodeURIComponent('Convite para o Sistema')
                              const body = encodeURIComponent(
                                `Olá! Segue o seu link de convite para acessar o sistema:\n\n${window.location.origin}/cadastro?token=${l.token}`,
                              )
                              window.location.href = `mailto:?subject=${subject}&body=${body}`
                            }}
                          >
                            <Mail className="h-4 w-4 text-blue-600" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Enviar por Email</TooltipContent>
                      </Tooltip>
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
