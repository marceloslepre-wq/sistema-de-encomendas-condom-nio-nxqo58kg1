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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'
import { Package, Printer, CheckCircle2, Loader2, Settings } from 'lucide-react'
import {
  RecebimentoAuditoria,
  getVolumeTypes,
  getShelfLocations,
  updateRecebimentoAuditoria,
} from '@/services/api'
import useRealtime from '@/hooks/use-realtime'
import { format } from 'date-fns'
import pb from '@/lib/pocketbase/client'

type ExpandedVolume = RecebimentoAuditoria & {
  _matchedMorador?: any
}

export default function SalaTriagem() {
  const { toast } = useToast()
  const [recebimentos, setRecebimentos] = useState<ExpandedVolume[]>([])
  const [selectedVolume, setSelectedVolume] = useState<ExpandedVolume | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)

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
      console.log('Carregando triagem...')
      const data = await pb.collection('recebimentos_auditoria').getFullList<RecebimentoAuditoria>({
        filter: `status='ENTRADA_PORTARIA' || status='EM_TRIAGEM' || status='Validado' || status='Aprovação Manual'`,
        sort: 'created',
      })
      const moradoresData = await pb
        .collection('users')
        .getFullList<any>({ filter: "role='morador'" })

      const enhancedData = data.map((parcel) => {
        const morador = moradoresData.find((m) => {
          if (!parcel.unidade) return false

          const normalizeString = (str: string) => (str || '').replace(/\s+/g, '').toLowerCase()
          const normParcelUnit = normalizeString(parcel.unidade)

          const aptMatch = m.unidade ? normParcelUnit.includes(normalizeString(m.unidade)) : false
          const torreMatch = m.torre ? normParcelUnit.includes(normalizeString(m.torre)) : true

          return aptMatch && torreMatch
        })

        return {
          ...parcel,
          _matchedMorador: morador,
        }
      })

      setRecebimentos(enhancedData)
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

  useRealtime('recebimentos_auditoria', () => loadData())

  const handleStatusChange = async (vol: ExpandedVolume) => {
    try {
      await updateRecebimentoAuditoria(vol.id, {
        status: 'EM_TRIAGEM',
      })
      await pb.collection('historico_andamento').create({
        recebimento_id: vol.id,
        status: 'EM_TRIAGEM',
        observacoes: 'Recebido na sala de encomendas para triagem',
      })
      toast({
        title: 'Status Atualizado',
        description: `Volume ${vol.volume} atualizado para Em sala de encomendas.`,
      })
      loadData()
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Não foi possível atualizar o status.',
        variant: 'destructive',
      })
    }
  }

  const handleStartTriage = async (vol: ExpandedVolume) => {
    try {
      let updatedVol = { ...vol }

      if (['ENTRADA_PORTARIA', 'Validado', 'Aprovação Manual'].includes(vol.status || '')) {
        const updated = await updateRecebimentoAuditoria(vol.id, {
          status: 'EM_TRIAGEM',
        })
        await pb.collection('historico_andamento').create({
          recebimento_id: vol.id,
          status: 'EM_TRIAGEM',
          observacoes: 'Iniciada triagem e etiquetagem do volume',
        })
        updatedVol = { ...updatedVol, ...updated, status: 'EM_TRIAGEM' }
      }

      setSelectedVolume(updatedVol)
      setDialogOpen(true)
      setTrackingCode('')
      setVolumeType(volumeTypes.length > 0 ? volumeTypes[0].name : '')
      setShelfLocation(shelfLocations.length > 0 ? shelfLocations[0].name : '')
      setPhoto(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
    } catch (err: any) {
      toast({ title: 'Erro', description: 'Falha ao iniciar triagem.', variant: 'destructive' })
    }
  }

  const handleFinish = async () => {
    if (!selectedVolume) return
    setIsSubmitting(true)
    try {
      console.log('Processando ticket:', {
        volume_numero: selectedVolume.volume,
        rastreio_local: trackingCode,
        tipo_volume: volumeType,
      })

      const formData = new FormData()
      formData.append('status', 'LIBERADO_RETIRADA')

      const codigo_retirada = Math.floor(100000 + Math.random() * 900000).toString()
      formData.append('codigo_retirada', codigo_retirada)

      if (trackingCode) formData.append('codigo_rastreio', trackingCode)
      if (volumeType) formData.append('volume_type', volumeType)
      if (shelfLocation) formData.append('shelf_location', shelfLocation)
      if (photo) formData.append('photo', photo)

      await pb.collection('recebimentos_auditoria').update(selectedVolume.id, formData)

      await pb.collection('historico_andamento').create({
        recebimento_id: selectedVolume.id,
        status: 'LIBERADO_RETIRADA',
        observacoes: `Código gerado: ${codigo_retirada}`,
      })

      console.log('Código de retirada gerado:', {
        volume_numero: selectedVolume.volume,
        codigo_retirada,
      })

      toast({ title: 'Sucesso', description: 'Volume liberado para retirada.' })
      setDialogOpen(false)
      setSelectedVolume(null)
      loadData()
    } catch (err: any) {
      toast({ title: 'Erro', description: 'Falha ao finalizar.', variant: 'destructive' })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handlePrint = () => {
    window.print()
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-20 animate-fade-in">
      <div className="print:hidden">
        <h2 className="text-3xl font-bold tracking-tight">Triagem & Etiquetagem</h2>
        <p className="text-muted-foreground">
          Processe pacotes recebidos na portaria e gerencie cada volume individualmente.
        </p>
      </div>

      <Card className="print:hidden border-none shadow-none md:border md:shadow-sm">
        <CardHeader className="bg-muted/20 border-b">
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5 text-primary" /> Fila de Volumes Pendentes
          </CardTitle>
          <CardDescription>
            Defina o status de cada volume ou processe-os separadamente.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-6">Unidade</TableHead>
                <TableHead>Morador</TableHead>
                <TableHead>Volume #</TableHead>
                <TableHead>Transportadora</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-32 pr-6">Ação</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recebimentos.map((vol) => (
                <TableRow key={vol.id}>
                  <TableCell className="pl-6 font-medium">{vol.unidade || 'N/D'}</TableCell>
                  <TableCell>
                    {vol._matchedMorador?.name || vol.morador || vol.entregador_nome || 'N/D'}
                  </TableCell>
                  <TableCell className="font-mono text-muted-foreground whitespace-nowrap">
                    {vol.volume || '1'}
                  </TableCell>
                  <TableCell>{vol.transportadora || 'N/D'}</TableCell>
                  <TableCell>
                    {['ENTRADA_PORTARIA', 'Validado', 'Aprovação Manual'].includes(
                      vol.status || '',
                    ) ? (
                      <Select onValueChange={() => handleStatusChange(vol)}>
                        <SelectTrigger className="w-[260px] h-8 bg-background">
                          <SelectValue
                            placeholder={
                              vol.status === 'Validado'
                                ? 'Validado'
                                : vol.status === 'Aprovação Manual'
                                  ? 'Aprovação Manual'
                                  : 'Pendente'
                            }
                          />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="EM_TRIAGEM">Recebido sala de encomendas</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <span className="text-sm font-medium text-primary">
                        Em sala de encomendas
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="pr-6">
                    <Button size="sm" variant="outline" onClick={() => handleStartTriage(vol)}>
                      <Settings className="w-4 h-4 mr-2" />
                      Processar
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {recebimentos.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                    Nenhum volume na fila de triagem.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl print:hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="h-5 w-5 text-primary" /> Processar Volume {selectedVolume?.volume}
            </DialogTitle>
            <DialogDescription>
              Unidade: {selectedVolume?.unidade} | Morador: {selectedVolume?.morador || 'N/D'}
            </DialogDescription>
          </DialogHeader>

          <div className="grid md:grid-cols-2 gap-6 py-4">
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
                    {volumeTypes.length === 0 && (
                      <SelectItem value="none" disabled>
                        Nenhum tipo cadastrado
                      </SelectItem>
                    )}
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
                    {shelfLocations.length === 0 && (
                      <SelectItem value="none" disabled>
                        Nenhum local cadastrado
                      </SelectItem>
                    )}
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

            <div className="space-y-6 flex flex-col">
              <div className="bg-muted/30 p-4 rounded-lg border flex flex-col items-center flex-1 justify-center">
                <p className="text-sm font-medium mb-3">Gerar Etiqueta</p>
                <Button variant="outline" className="w-full" onClick={handlePrint}>
                  <Printer className="w-4 h-4 mr-2" /> Imprimir Etiqueta
                </Button>
                <p className="text-xs text-muted-foreground mt-3 text-center">
                  A etiqueta será gerada especificamente para este volume ({selectedVolume?.volume}
                  ).
                </p>
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
        </DialogContent>
      </Dialog>

      {/* Print-only layout */}
      {selectedVolume && (
        <div className="hidden print:flex flex-col items-center justify-center p-8 print:w-[100mm] print:h-[150mm] print:m-0 print:fixed print:top-0 print:left-0 print:bg-white print:z-50 print:box-border text-black">
          <div className="w-full h-full border-4 border-black p-6 flex flex-col justify-between rounded-xl">
            <div className="text-center">
              <h3 className="font-extrabold text-5xl mb-2 tracking-tight">
                {selectedVolume._matchedMorador?.torre
                  ? `${selectedVolume._matchedMorador.torre} - `
                  : ''}
                {selectedVolume.unidade || 'S/N'}
              </h3>
              <p className="text-3xl font-bold mb-6 line-clamp-2 overflow-hidden leading-tight">
                {selectedVolume._matchedMorador?.name || selectedVolume.morador || 'Morador N/D'}
              </p>
            </div>

            <div className="border-t-4 border-b-4 border-black py-6 my-4 w-full flex flex-col gap-4 text-center">
              <p className="text-3xl font-bold uppercase">
                LOC: <span className="font-black">{shelfLocation || 'N/D'}</span>
              </p>
              <p className="text-3xl font-bold uppercase">
                VOL: <span className="font-black">{selectedVolume.volume || '1'}</span>{' '}
                {volumeType ? `(${volumeType})` : ''}
              </p>
            </div>

            <div className="flex flex-col gap-3 w-full text-xl flex-1 justify-center">
              <div className="bg-gray-100 p-3 rounded-lg border-2 border-black">
                <p className="font-bold text-gray-600 uppercase text-sm mb-1">Transportadora</p>
                <p className="font-black text-2xl truncate">
                  {selectedVolume.transportadora || 'N/D'}
                </p>
              </div>
              <div className="bg-gray-100 p-3 rounded-lg border-2 border-black">
                <p className="font-bold text-gray-600 uppercase text-sm mb-1">Cód. Rastreio</p>
                <p className="font-black text-2xl truncate">
                  {trackingCode || selectedVolume.codigo_rastreio || 'N/D'}
                </p>
              </div>
            </div>

            <div className="mt-6 text-center">
              <p className="text-lg font-bold text-gray-800">
                ID: {selectedVolume.id.substring(0, 8).toUpperCase()}
              </p>
              <p className="text-sm font-semibold text-gray-500 mt-1">
                Processado em: {format(new Date(), 'dd/MM/yyyy HH:mm')}
              </p>
            </div>
          </div>
        </div>
      )}

      <style
        dangerouslySetInnerHTML={{
          __html: `
        @media print {
          @page {
            size: 100mm 150mm;
            margin: 0;
          }
          html, body {
            margin: 0;
            padding: 0;
            width: 100mm;
            height: 150mm;
            background: white;
          }
          body > :not(.print\\:flex) { display: none !important; }
        }
      `,
        }}
      />
    </div>
  )
}
