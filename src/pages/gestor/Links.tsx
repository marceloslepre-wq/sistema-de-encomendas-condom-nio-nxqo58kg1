import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
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
import { useToast } from '@/hooks/use-toast'
import { Link2, Copy, Mail, MessageCircle } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { getUnits, getLinks, createLink, Unit } from '@/services/api'
import { format } from 'date-fns'

export default function GestorLinks() {
  const { toast } = useToast()
  const [units, setUnits] = useState<Unit[]>([])
  const [links, setLinks] = useState<any[]>([])
  const [selectedTower, setSelectedTower] = useState('')
  const [selectedApt, setSelectedApt] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([getUnits(), getLinks()])
      .then(([u, l]) => {
        setUnits(u as Unit[])
        setLinks(l)
        setLoading(false)
      })
      .catch(console.error)
  }, [])

  const towers = Array.from(new Set(units.map((u) => u.tower)))
  const filteredApts = units.filter((u) => u.tower === selectedTower)

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedTower || !selectedApt) return

    const unit = units.find((u) => u.tower === selectedTower && u.apartment === selectedApt)
    if (!unit) return

    const token = Math.random().toString(36).substring(2, 10).toUpperCase()
    const expiresAt = new Date()
    expiresAt.setHours(expiresAt.getHours() + 48)

    try {
      const newLink = await createLink({
        unit_id: unit.id,
        token,
        expires_at: expiresAt.toISOString(),
        used: false,
      })
      const linkWithUnit = { ...newLink, expand: { unit_id: unit } }
      setLinks([linkWithUnit, ...links])
      toast({ title: 'Link gerado com sucesso!', description: 'O link é válido por 48 horas.' })
      setSelectedApt('')
    } catch (err: any) {
      console.error('Failed to generate link:', err, err.response)
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
          Crie links de convite para novos moradores se cadastrarem.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Novo Convite</CardTitle>
            <CardDescription>Gere um link seguro de uso único (48h).</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleGenerate} className="space-y-4">
              <div className="space-y-2">
                <Label>Torre / Bloco</Label>
                <Select
                  value={selectedTower}
                  onValueChange={(v) => {
                    setSelectedTower(v)
                    setSelectedApt('')
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a Torre" />
                  </SelectTrigger>
                  <SelectContent>
                    {towers.map((t) => (
                      <SelectItem key={t} value={t}>
                        Torre {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Apartamento</Label>
                <Select
                  value={selectedApt}
                  onValueChange={setSelectedApt}
                  disabled={!selectedTower}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o Apto" />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredApts.map((a) => (
                      <SelectItem key={a.id} value={a.apartment}>
                        Apto {a.apartment}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button type="submit" className="w-full" disabled={!selectedTower || !selectedApt}>
                <Link2 className="mr-2 h-4 w-4" /> Gerar Link
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Links Ativos</CardTitle>
            <CardDescription>Links válidos no momento.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
              {loading && <p className="text-sm text-muted-foreground">Carregando...</p>}
              {!loading && links.length === 0 && (
                <p className="text-sm text-muted-foreground">Nenhum link ativo.</p>
              )}
              {links.map((l) => {
                const expired = new Date(l.expires_at) < new Date()
                if (expired || l.used) return null

                return (
                  <div
                    key={l.id}
                    className="flex items-center justify-between p-3 border rounded-lg bg-white shadow-subtle"
                  >
                    <div>
                      <p className="font-medium text-sm text-primary">
                        T{l.expand?.unit_id?.tower} - {l.expand?.unit_id?.apartment}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Expira em: {format(new Date(l.expires_at), 'dd/MM HH:mm')}
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
                                `Olá! Segue o seu link de convite para o sistema de encomendas do condomínio: ${window.location.origin}/cadastro?token=${l.token}`,
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
                              const subject = encodeURIComponent(
                                'Convite para Sistema de Encomendas',
                              )
                              const body = encodeURIComponent(
                                `Olá! Segue o seu link de convite para o sistema de encomendas do condomínio:\n\n${window.location.origin}/cadastro?token=${l.token}`,
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
