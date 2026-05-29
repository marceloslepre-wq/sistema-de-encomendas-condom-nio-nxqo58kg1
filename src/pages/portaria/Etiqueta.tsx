import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Printer, Package } from 'lucide-react'

export default function PortariaEtiqueta() {
  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Impressão de Etiqueta</h2>
        <p className="text-muted-foreground">Gere a etiqueta para armazenamento da encomenda.</p>
      </div>

      <div className="grid md:grid-cols-2 gap-8 items-start">
        <Card>
          <CardHeader>
            <CardTitle>Configuração</CardTitle>
            <CardDescription>Defina onde o item será guardado.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Encomenda Recente</Label>
              <Select defaultValue="1">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">João Silva (T-A 101) - Correios</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Tipo de Volume</Label>
              <Select defaultValue="caixa">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="caixa">Caixa Média</SelectItem>
                  <SelectItem value="envelope">Envelope</SelectItem>
                  <SelectItem value="grande">Volume Grande</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Localização (Prateleira)</Label>
              <Select defaultValue="b2">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="b2">Prateleira B - Nível 2</SelectItem>
                  <SelectItem value="gaveta">Gaveta de Envelopes</SelectItem>
                  <SelectItem value="chao">Chão (Volume Grande)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button className="w-full mt-4" size="lg">
              <Printer className="mr-2 h-5 w-5" /> Imprimir Etiqueta
            </Button>
          </CardContent>
        </Card>

        <div className="flex flex-col items-center justify-center space-y-4">
          <p className="text-sm font-medium text-muted-foreground">
            Pré-visualização (Etiqueta Térmica)
          </p>
          <div className="w-64 bg-white border-2 border-dashed border-gray-300 p-6 flex flex-col items-center text-center shadow-sm rounded-md">
            <Package className="h-6 w-6 text-gray-400 mb-2" />
            <h3 className="font-extrabold text-2xl mb-1 text-black">T-A 101</h3>
            <p className="text-sm font-medium mb-4 text-black">João Silva</p>
            <img
              src="https://img.usecurling.com/i?q=qrcode&shape=outline&color=black"
              alt="QR Code"
              className="w-32 h-32 my-2 opacity-90"
            />
            <p className="text-xs font-bold uppercase mt-2 text-black">LOC: B2 - Caixa</p>
            <p className="text-[10px] text-gray-500 mt-1">
              ID: PK-1001 • {new Date().toLocaleDateString('pt-BR')}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
