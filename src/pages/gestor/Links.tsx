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
import { Link2, Copy, MessageCircle, Search } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { format, isValid } from 'date-fns'

export default function GestorLinks() {
  const { toast } = useToast()
  const [units, setUnits] = useState<any[]>([])
  const [links, setLinks] = useState<any[]>([])
  const [selectedTower, setSelectedTower] = useState('')
  const [selectedApartment, setSelectedApartment] = useState('')
  const [generatedLink, setGeneratedLink] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      pb.collection('units').getFullList({ sort: 'tower,apartment' }),
      pb.collection('generated_links').getFullList({ sort: '-created' }),
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
    if (!selectedTower || !selectedApartment) return

    const link = `${window.location.origin}/cadastro-morador?torre=${encodeURIComponent(
      selectedTower,
    )}&unidade=${encodeURIComponent(selectedApartment)}`

    setGeneratedLink(link)
    console.log('Link gerado:', { torre: selectedTower, unidade: selectedApartment, link })

    try {
      const newLink = await pb.collection('generated_links').create({
        torre: selectedTower,
        unidade: selectedApartment,
        link,
      })

      setLinks([newLink, ...links])
      toast({
        title: 'Link gerado com sucesso!',
        description: 'O link está pronto para ser compartilhado.',
      })

      setSelectedTower('')
      setSelectedApartment('')
    } catch (err: any) {
      console.error('Failed to save generated link:', err)
      toast({
        title: 'Erro',
        description: 'O link foi gerado, mas não pôde ser salvo no histórico.',
        variant: 'destructive',
      })
    }
  }

  const copyToClipboard = (link: string) => {
    navigator.clipboard.writeText(link)
    console.log('Link copiado')
    toast({ title: 'Link copiado!', description: 'Área de transferência atualizada.' })
  }

  const shareWhatsApp = (link: string) => {
    const text = encodeURIComponent(
      `Olá! Segue o seu link de convite para o sistema de encomendas:\n\n${link}`,
    )
    window.open(`https://wa.me/?text=${text}`, '_blank')
  }

  const availableTowers = Array.from(new Set(units.map((u) => u.tower))).sort()
  const availableApartments = Array.from(
    new Set(units.filter((u) => u.tower === selectedTower).map((u) => u.apartment)),
  ).sort((a, b) => a.localeCompare(b))

  const activeLinks = links.filter((l) => {
    if (!searchTerm) return true
    const search = searchTerm.toLowerCase()
    const tower = l.torre?.toLowerCase() || ''
    const apt = l.unidade?.toLowerCase() || ''
    return tower.includes(search) || apt.includes(search)
  })

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-primary">Geração de Links</h2>
        <p className="text-muted-foreground">
          Crie links simplificados de convite para cadastrar novos moradores.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Novo Convite</CardTitle>
            <CardDescription>
              Gere um link direto para moradores, sem tokens ou aprovações extras.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleGenerate} className="space-y-4">
              <div className="space-y-2">
                <Label>Torre</Label>
                <Select
                  value={selectedTower}
                  onValueChange={(val) => {
                    setSelectedTower(val)
                    setSelectedApartment('')
                    setGeneratedLink('')
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
                  value={selectedApartment}
                  onValueChange={(val) => {
                    setSelectedApartment(val)
                    setGeneratedLink('')
                  }}
                  disabled={!selectedTower}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a Unidade" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableApartments.map((apt) => (
                      <SelectItem key={apt} value={apt}>
                        {apt}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button
                type="submit"
                className="w-full mt-4"
                disabled={!selectedTower || !selectedApartment}
              >
                <Link2 className="mr-2 h-4 w-4" /> Gerar Link
              </Button>
            </form>

            {generatedLink && (
              <div className="mt-6 p-4 border rounded-lg bg-slate-50 space-y-3 animate-fade-in-up">
                <Label className="text-muted-foreground">Link Gerado:</Label>
                <Input readOnly value={generatedLink} className="bg-white text-xs" />
                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    className="w-full"
                    onClick={() => copyToClipboard(generatedLink)}
                  >
                    <Copy className="mr-2 h-4 w-4" /> Copiar Link
                  </Button>
                  <Button
                    variant="default"
                    className="w-full bg-green-600 hover:bg-green-700 text-white"
                    onClick={() => shareWhatsApp(generatedLink)}
                  >
                    <MessageCircle className="mr-2 h-4 w-4" /> WhatsApp
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Histórico de Links</CardTitle>
            <CardDescription>Visualize os últimos links gerados no sistema.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-4">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por torre ou unidade..."
                  className="pl-8"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-4 max-h-[450px] overflow-y-auto pr-2">
              {loading && <p className="text-sm text-muted-foreground">Carregando...</p>}
              {!loading && activeLinks.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Nenhum link no histórico.
                </p>
              )}
              {activeLinks.map((l) => (
                <div
                  key={l.id}
                  className="flex flex-col gap-2 p-3 border rounded-lg bg-white shadow-subtle"
                >
                  <div className="flex items-center justify-between">
                    <p className="font-semibold text-sm text-primary">
                      Torre {l.torre} - Unidade {l.unidade}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {l.created && isValid(new Date(l.created))
                        ? format(new Date(l.created), 'dd/MM/yyyy HH:mm')
                        : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Input readOnly value={l.link} className="h-8 text-xs bg-slate-50 flex-1" />
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8 shrink-0"
                          onClick={() => copyToClipboard(l.link)}
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
                          className="h-8 w-8 shrink-0 text-green-600 border-green-200 hover:bg-green-50 hover:text-green-700"
                          onClick={() => shareWhatsApp(l.link)}
                        >
                          <MessageCircle className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Compartilhar via WhatsApp</TooltipContent>
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
