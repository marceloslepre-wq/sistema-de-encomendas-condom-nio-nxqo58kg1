import { useState, useEffect, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
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
import { Package, Camera, Printer, CheckCircle2, Loader2, ArrowRight } from 'lucide-react'
import {
  getParcels,
  updateParcelWithFormData,
  updateParcel,
  Parcel,
  getVolumeTypes,
  getShelfLocations,
} from '@/services/api'
import useRealtime from '@/hooks/use-realtime'
import { format } from 'date-fns'

export default function SalaTriagem() {
  const { toast } = useToast()
  const [parcels, setParcels] = useState<Parcel[]>([])
  const [selectedParcel, setSelectedParcel] = useState<Parcel | null>(null)

  const [trackingCode, setTrackingCode] = useState('')
  const [volumeType, setVolumeType] = useState('')
  const [shelfLocation, setShelfLocation] = useState('')
  const [photo, setPhoto] = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [isSubmitting, setIsSubmitting] = useState(false)

  const [volumeTypes, setVolumeTypes] = useState<any[]>([])
  const [shelfLocations, setShelfLocations] = useState<any[]>([])

  const loadData = async () => {
    try {
      const data = await getParcels()
      setParcels(data.filter((p) => p.status === 'ENTRADA_PORTARIA' || p.status === 'EM_TRIAGEM'))
      const [vTypes, sLocs] = await Promise.all([getVolumeTypes(), getShelfLocations()])
      setVolumeTypes(vTypes)
      setShelfLocations(sLocs)
    } catch {
      /* intentionally ignored */
    }
  }

  useEffect(() => {
    loadData()
  }, [])
  useRealtime('parcels', () => loadData())

  const handleStartTriage = async (parcel: Parcel) => {
    try {
      if (parcel.status === 'ENTRADA_PORTARIA') {
        const updated = await updateParcel(parcel.id, { status: 'EM_TRIAGEM' })
        setSelectedParcel(updated)
      } else {
        setSelectedParcel(parcel)
      }
      setTrackingCode(parcel.tracking_code || '')
      setVolumeType(parcel.volume_type || (volumeTypes.length > 0 ? volumeTypes[0].name : ''))
      setShelfLocation(
        parcel.shelf_location || (shelfLocations.length > 0 ? shelfLocations[0].name : ''),
      )
      setPhoto(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
    } catch (err: any) {
      console.error('Failed to start triage:', err, err.response)
      toast({ title: 'Erro', description: 'Falha ao iniciar triagem.', variant: 'destructive' })
    }
  }

  const handleFinish = async () => {
    if (!selectedParcel) return
    setIsSubmitting(true)
    try {
      const code = Math.floor(100000 + Math.random() * 900000).toString()
      const formData = new FormData()
      formData.append('status', 'LIBERADO_RETIRADA')
      formData.append('withdrawal_code', code)
      formData.append('tracking_code', trackingCode)
      formData.append('volume_type', volumeType)
      formData.append('shelf_location', shelfLocation)
      if (photo) {
        formData.append('photo', photo)
      }

      await updateParcelWithFormData(selectedParcel.id, formData)
      toast({ title: 'Sucesso', description: 'Encomenda liberada para retirada.' })
      setSelectedParcel(null)
      loadData()
    } catch (err: any) {
      console.error('Failed to finish triage:', err, err.response)
      toast({ title: 'Erro', description: 'Falha ao finalizar.', variant: 'destructive' })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handlePrint = () => {
    window.print()
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-20">
      <div className="print:hidden">
        <h2 className="text-3xl font-bold tracking-tight">Triagem & Etiquetagem</h2>
        <p className="text-muted-foreground">
          Processe pacotes recebidos na portaria e prepare-os para o morador.
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <div className="md:col-span-1 space-y-4 print:hidden h-[75vh] overflow-y-auto pr-2">
          <h3 className="font-semibold text-lg sticky top-0 bg-background py-2">
            Fila de Entrada ({parcels.length})
          </h3>
          {parcels.length === 0 && (
            <p className="text-muted-foreground text-sm py-4">Nenhuma encomenda na fila.</p>
          )}
          {parcels.map((p) => (
            <Card
              key={p.id}
              className={`cursor-pointer transition-colors hover:border-primary ${selectedParcel?.id === p.id ? 'border-primary bg-primary/5' : ''}`}
              onClick={() => handleStartTriage(p)}
            >
              <CardContent className="p-4 flex justify-between items-center">
                <div>
                  <p className="font-bold">
                    {p.expand?.unit_id?.tower}-{p.expand?.unit_id?.apartment}
                  </p>
                  <p className="text-sm text-muted-foreground">{p.carrier}</p>
                </div>
                <ArrowRight className="w-4 h-4 text-muted-foreground" />
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="md:col-span-2">
          {selectedParcel ? (
            <Card className="print:border-none print:shadow-none">
              <CardHeader className="print:hidden border-b bg-muted/20">
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5 text-primary" /> Processamento de Encomenda
                </CardTitle>
                <CardDescription>
                  Unidade: {selectedParcel.expand?.unit_id?.tower}-
                  {selectedParcel.expand?.unit_id?.apartment} | Morador:{' '}
                  {selectedParcel.expand?.resident_id?.name || 'N/D'}
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="grid md:grid-cols-2 gap-6 print:hidden">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Código de Rastreio (Opcional)</Label>
                      <Input
                        value={trackingCode}
                        onChange={(e) => setTrackingCode(e.target.value)}
                        placeholder="Ex: AB123456789BR"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Tipo de Volume</Label>
                      <Select value={volumeType} onValueChange={setVolumeType}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione..." />
                        </SelectTrigger>
                        <SelectContent>
                          {volumeTypes.map((v) => (
                            <SelectItem key={v.id} value={v.name}>
                              {v.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Localização na Sala</Label>
                      <Select value={shelfLocation} onValueChange={setShelfLocation}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione..." />
                        </SelectTrigger>
                        <SelectContent>
                          {shelfLocations.map((s) => (
                            <SelectItem key={s.id} value={s.name}>
                              {s.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Foto do Pacote</Label>
                      <Input
                        type="file"
                        accept="image/*"
                        ref={fileInputRef}
                        onChange={(e) => setPhoto(e.target.files?.[0] || null)}
                      />
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div className="bg-muted/30 p-4 rounded-lg border flex flex-col items-center">
                      <p className="text-sm font-medium mb-3">Gerar Etiqueta</p>
                      <Button variant="outline" className="w-full" onClick={handlePrint}>
                        <Printer className="w-4 h-4 mr-2" /> Imprimir Etiqueta
                      </Button>
                    </div>

                    <Button
                      className="w-full h-12 bg-primary hover:bg-primary/90 text-white"
                      onClick={handleFinish}
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? (
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      ) : (
                        <CheckCircle2 className="mr-2 h-5 w-5" />
                      )}
                      Finalizar e Liberar
                    </Button>
                  </div>
                </div>

                <div className="hidden print:flex flex-col items-center justify-center space-y-4 print:w-full print:m-0 print:p-0">
                  <div className="w-64 bg-white border-2 border-dashed border-gray-300 p-6 flex flex-col items-center text-center shadow-sm rounded-md print:border-none print:shadow-none print:w-auto">
                    <h3 className="font-extrabold text-3xl mb-1 text-black">
                      {selectedParcel.expand?.unit_id?.tower}-
                      {selectedParcel.expand?.unit_id?.apartment}
                    </h3>
                    <p className="text-base font-medium mb-4 text-black line-clamp-1 overflow-hidden">
                      {selectedParcel.expand?.resident_id?.name || 'Morador'}
                    </p>
                    <p className="text-xs font-bold uppercase mt-2 text-black">
                      LOC: {shelfLocation}
                    </p>
                    <p className="text-[10px] text-gray-600 font-medium">{volumeType}</p>
                    <p className="text-[10px] text-gray-500 mt-2">
                      ID: {selectedParcel.id.substring(0, 6).toUpperCase()} •{' '}
                      {format(new Date(), 'dd/MM/yyyy')}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground print:hidden">
              <Camera className="w-16 h-16 opacity-20 mb-4" />
              <p>Selecione uma encomenda na fila para iniciar a triagem.</p>
            </div>
          )}
        </div>
      </div>

      <style
        dangerouslySetInnerHTML={{
          __html: `
        @media print {
          body * { visibility: hidden; }
          .print\\:w-auto, .print\\:w-auto * { visibility: visible; }
          .print\\:w-auto {
            position: absolute; left: 0; top: 0;
            width: 100% !important; margin: 0 !important; padding: 0 !important;
          }
        }
      `,
        }}
      />
    </div>
  )
}
