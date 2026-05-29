import { useState } from 'react'
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
import { Link2, Copy } from 'lucide-react'

export default function GestorLinks() {
  const { toast } = useToast()
  const [links, setLinks] = useState([
    { id: 1, unit: 'T-A 101', url: 'https://condo.app/cad/x8f9', expires: '24h' },
  ])

  const handleGenerate = (e: React.FormEvent) => {
    e.preventDefault()
    setLinks([
      {
        id: Date.now(),
        unit: 'T-B 502',
        url: `https://condo.app/cad/${Math.random().toString(36).substring(7)}`,
        expires: '24h',
      },
      ...links,
    ])
    toast({
      title: 'Link gerado com sucesso!',
      description: 'O link foi adicionado à lista abaixo.',
    })
  }

  const copyToClipboard = () => {
    toast({ title: 'Link copiado!', description: 'Área de transferência atualizada.' })
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Geração de Links</h2>
        <p className="text-muted-foreground">Crie links de convite para novos moradores.</p>
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
                <Label>Torre / Bloco</Label>
                <Select defaultValue="a">
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="a">Torre A</SelectItem>
                    <SelectItem value="b">Torre B</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Apartamento</Label>
                <Input placeholder="Ex: 101" required />
              </div>
              <Button type="submit" className="w-full">
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
            <div className="space-y-4">
              {links.map((l) => (
                <div
                  key={l.id}
                  className="flex items-center justify-between p-3 border rounded-lg bg-white"
                >
                  <div>
                    <p className="font-medium text-sm">{l.unit}</p>
                    <p className="text-xs text-muted-foreground">Expira em {l.expires}</p>
                  </div>
                  <Button variant="outline" size="sm" onClick={copyToClipboard}>
                    <Copy className="h-4 w-4 mr-2" /> Copiar
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
