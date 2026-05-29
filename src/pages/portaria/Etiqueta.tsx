import { useState, useEffect } from 'react'
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
import { getParcels, Parcel } from '@/services/api'
import { useToast } from '@/hooks/use-toast'

export default function PortariaEtiqueta() {
  const { toast } = useToast()
  const [parcels, setParcels] = useState<Parcel[]>([])
  const [selectedParcelId, setSelectedParcelId] = useState<string>('')
  const [volumeType, setVolumeType] = useState('Caixa')
  const [location, setLocation] = useState('Prateleira B2')

  useEffect(() => {
    getParcels()
      .then((data) => {
        // Only show parcels that are received or cataloged
        const activeParcels = data.filter((p) =>
          ['RECEBIDO_PORTARIA', 'CATALOGADO'].includes(p.status),
        )
        setParcels(activeParcels)
        if (activeParcels.length > 0) {
          setSelectedParcelId(activeParcels[0].id)
        }
      })
      .catch(() => {
        toast({
          title: 'Erro',
          description: 'Não foi possível carregar as encomendas.',
          variant: 'destructive',
        })
      })
  }, [toast])

  const selectedParcel = parcels.find((p) => p.id === selectedParcelId)

  const handlePrint = () => {
    window.print()
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-20">
      <div className="print:hidden">
        <h2 className="text-2xl font-bold tracking-tight">Impressão de Etiqueta</h2>
        <p className="text-muted-foreground">Gere a etiqueta para armazenamento da encomenda.</p>
      </div>

      <div className="grid md:grid-cols-2 gap-8 items-start">
        <Card className="print:hidden">
          <CardHeader>
            <CardTitle>Configuração</CardTitle>
            <CardDescription>Defina onde o item será guardado.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Encomenda</Label>
              <Select value={selectedParcelId} onValueChange={setSelectedParcelId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a encomenda" />
                </SelectTrigger>
                <SelectContent>
                  {parcels.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.expand?.resident_id?.name || 'Sem Morador'} ({p.expand?.unit_id?.tower}-
                      {p.expand?.unit_id?.apartment}) - {p.carrier}
                    </SelectItem>
                  ))}
                  {parcels.length === 0 && (
                    <SelectItem value="none" disabled>
                      Nenhuma encomenda pendente
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Tipo de Volume</Label>
              <Select value={volumeType} onValueChange={setVolumeType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Caixa">Caixa Média</SelectItem>
                  <SelectItem value="Envelope">Envelope</SelectItem>
                  <SelectItem value="Pacote Grande">Volume Grande</SelectItem>
                  <SelectItem value="Outro">Outro</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Localização (Prateleira)</Label>
              <Select value={location} onValueChange={setLocation}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Prateleira A1">Prateleira A - Nível 1</SelectItem>
                  <SelectItem value="Prateleira B2">Prateleira B - Nível 2</SelectItem>
                  <SelectItem value="Gaveta">Gaveta de Envelopes</SelectItem>
                  <SelectItem value="Chão">Chão (Volume Grande)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button
              className="w-full mt-4"
              size="lg"
              onClick={handlePrint}
              disabled={!selectedParcel}
            >
              <Printer className="mr-2 h-5 w-5" /> Imprimir Etiqueta
            </Button>
          </CardContent>
        </Card>

        {selectedParcel && (
          <div className="flex flex-col items-center justify-center space-y-4 print:w-full print:m-0 print:p-0">
            <p className="text-sm font-medium text-muted-foreground print:hidden">
              Pré-visualização (Etiqueta Térmica)
            </p>
            {/* Etiqueta */}
            <div className="w-64 bg-white border-2 border-dashed border-gray-300 p-6 flex flex-col items-center text-center shadow-sm rounded-md print:border-none print:shadow-none print:w-auto">
              <Package className="h-6 w-6 text-gray-400 mb-2 print:hidden" />
              <h3 className="font-extrabold text-3xl mb-1 text-black">
                {selectedParcel.expand?.unit_id?.tower}-{selectedParcel.expand?.unit_id?.apartment}
              </h3>
              <p className="text-base font-medium mb-4 text-black line-clamp-1 overflow-hidden">
                {selectedParcel.expand?.resident_id?.name || 'Morador'}
              </p>

              {/* QR Code Placeholder with curling */}
              <img
                src={`https://img.usecurling.com/i?q=qrcode&shape=outline&color=black&seed=${selectedParcel.id}`}
                alt="QR Code"
                className="w-32 h-32 my-2 opacity-90"
              />

              <p className="text-xs font-bold uppercase mt-2 text-black">LOC: {location}</p>
              <p className="text-[10px] text-gray-600 font-medium">{volumeType}</p>
              <p className="text-[10px] text-gray-500 mt-2">
                ID: {selectedParcel.id.substring(0, 6).toUpperCase()} •{' '}
                {new Date().toLocaleDateString('pt-BR')}
              </p>
            </div>
          </div>
        )}
      </div>

      <style
        dangerouslySetInnerHTML={{
          __html: `
        @media print {
          body * {
            visibility: hidden;
          }
          .print\\:w-auto, .print\\:w-auto * {
            visibility: visible;
          }
          .print\\:w-auto {
            position: absolute;
            left: 0;
            top: 0;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
          }
        }
      `,
        }}
      />
    </div>
  )
}
