import { useState, useEffect, useRef, useMemo } from 'react'
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
  createParcelWithFormData,
} from '@/services/api'
import useRealtime from '@/hooks/use-realtime'
import { format } from 'date-fns'
import pb from '@/lib/pocketbase/client'

type ExpandedVolume = RecebimentoAuditoria & {
  _volumeIndex: number
  _totalVolumes: number
  _volumeStatus: string
  _matchedMorador?: any
}

export default function SalaTriagem() {
  const { toast } = useToast()
  const [recebimentos, setRecebimentos] = useState<RecebimentoAuditoria[]>([])
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
        filter: `status='ENTRADA_PORTARIA' || status='EM_TRIAGEM'`,
        sort: 'created',
      })
      const moradoresData = await pb.collection('moradores').getFullList<any>()

      const enhancedData = data.map((parcel) => {
        console.log('Entrada encontrada:', parcel)
        console.log('Buscando morador para unidade:', parcel.unidade)

        const morador = moradoresData.find((m) => {
          if (!parcel.unidade) return false
          const aptMatch = parcel.unidade.includes(m.apartamento)
          const torreMatch = m.torre ? parcel.unidade.includes(m.torre) : true
          return aptMatch && torreMatch
        })

        if (morador) {
          console.log('Morador encontrado:', morador)
        }

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

  const expandedRows = useMemo(() => {
    return recebimentos.flatMap((r: any) => {
      const count = r.volumes && r.volumes > 0 ? r.volumes : 1
      const statuses = r.volume_statuses || {}
      return Array.from({ length: count }).map((_, i) => {
        const volIndex = i + 1
        return {
          ...r,
          _volumeIndex: volIndex,
          _totalVolumes: count,
          _volumeStatus: statuses[volIndex] || 'Pendente',
          _matchedMorador: r._matchedMorador,
        } as ExpandedVolume
      })
    })
  }, [recebimentos])

  const handleStatusChange = async (id: string, volIndex: number, status: string) => {
    const recebimento = recebimentos.find((r) => r.id === id)
    if (!recebimento) return

    const currentStatuses = recebimento.volume_statuses || {}
    const updatedStatuses = { ...currentStatuses, [volIndex]: status }
    const total = recebimento.volumes || 1

    const isAllProcessed = Array.from({ length: total }).every(
      (_, i) => updatedStatuses[i + 1] === 'Processado' || updatedStatuses[i + 1] === 'Entregue',
    )

    try {
      const updateData: any = {
        volume_statuses: updatedStatuses,
        status: isAllProcessed ? 'LIBERADO_RETIRADA' : 'EM_TRIAGEM',
      }
      if (isAllProcessed && recebimento.status !== 'LIBERADO_RETIRADA') {
        updateData.data_hora_liberado = new Date().toISOString()
      }
      await updateRecebimentoAuditoria(id, updateData)
      toast({
        title: 'Status Atualizado',
        description: `Volume ${volIndex}/${total} atualizado para ${status}.`,
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
      if (vol.status === 'ENTRADA_PORTARIA') {
        const updated = await updateRecebimentoAuditoria(vol.id, {
          status: 'EM_TRIAGEM',
          data_hora_triagem: new Date().toISOString(),
        })
        vol = { ...vol, ...updated, status: 'EM_TRIAGEM' }
      }
      setSelectedVolume(vol)
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
      const code = Math.floor(100000 + Math.random() * 900000).toString()
      const formData = new FormData()
      formData.append('status', 'LIBERADO_RETIRADA')
      formData.append('codigo_liberacao', code)
      formData.append('tracking_code', trackingCode)
      formData.append('volume_type', volumeType)
      formData.append('shelf_location', shelfLocation)

      if (selectedVolume.unit_id) formData.append('unit_id', selectedVolume.unit_id)
      if (selectedVolume.resident_id) formData.append('resident_id', selectedVolume.resident_id)
      formData.append('carrier', selectedVolume.carrier || '')
      formData.append('volumes', '1') // Processing individual volume
      formData.append(
        'entry_date',
        selectedVolume.data_hora_recebimento || new Date().toISOString(),
      )
      formData.append('courier_name', selectedVolume.entregador_nome || '')
      formData.append('courier_cpf', selectedVolume.entregador_cpf || '')

      if (photo) {
        formData.append('photo', photo)
      }

      await createParcelWithFormData(formData)

      const currentStatuses = selectedVolume.volume_statuses || {}
      const updatedStatuses = { ...currentStatuses, [selectedVolume._volumeIndex]: 'Processado' }
      const isAllProcessed = Array.from({ length: selectedVolume._totalVolumes }).every(
        (_, i) => updatedStatuses[i + 1] === 'Processado' || updatedStatuses[i + 1] === 'Entregue',
      )

      const updateData: any = {
        volume_statuses: updatedStatuses,
        status: isAllProcessed ? 'LIBERADO_RETIRADA' : 'EM_TRIAGEM',
      }
      if (isAllProcessed && selectedVolume.status !== 'LIBERADO_RETIRADA') {
        updateData.data_hora_liberado = new Date().toISOString()
        updateData.codigo_liberacao = code
      }

      await updateRecebimentoAuditoria(selectedVolume.id, updateData)

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
                <TableHead>Email</TableHead>
                <TableHead>Telefone</TableHead>
                <TableHead>Volume #</TableHead>
                <TableHead>Transportadora</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-32 pr-6">Ação</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {expandedRows.map((vol: any) => (
                <TableRow key={`${vol.id}-${vol._volumeIndex}`}>
                  <TableCell className="pl-6 font-medium">{vol.unidade || 'N/D'}</TableCell>
                  <TableCell>
                    {vol._matchedMorador?.nome || vol.morador || vol.morador_nome || 'N/D'}
                  </TableCell>
                  <TableCell>{vol._matchedMorador?.email || 'N/D'}</TableCell>
                  <TableCell>{vol._matchedMorador?.telefone || 'N/D'}</TableCell>
                  <TableCell className="font-mono text-muted-foreground whitespace-nowrap">
                    {vol._volumeIndex}/{vol._totalVolumes}
                  </TableCell>
                  <TableCell>{vol.transportadora || vol.carrier || 'N/D'}</TableCell>
                  <TableCell>
                    <Select
                      value={vol._volumeStatus}
                      onValueChange={(val) => handleStatusChange(vol.id, vol._volumeIndex, val)}
                    >
                      <SelectTrigger className="w-[160px] h-8 bg-background">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Pendente">Pendente</SelectItem>
                        <SelectItem value="Em Processamento">Em Processamento</SelectItem>
                        <SelectItem value="Processado">Processado</SelectItem>
                        <SelectItem value="Entregue">Entregue</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="pr-6">
                    <Button size="sm" variant="outline" onClick={() => handleStartTriage(vol)}>
                      <Settings className="w-4 h-4 mr-2" />
                      Processar
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {expandedRows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
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
              <Package className="h-5 w-5 text-primary" /> Processar Volume{' '}
              {selectedVolume?._volumeIndex}/{selectedVolume?._totalVolumes}
            </DialogTitle>
            <DialogDescription>
              Unidade: {selectedVolume?.unidade} | Morador: {selectedVolume?.morador_nome || 'N/D'}
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
                  A etiqueta será gerada especificamente para o volume{' '}
                  {selectedVolume?._volumeIndex} de {selectedVolume?._totalVolumes}.
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
        <div className="hidden print:flex flex-col items-center justify-center space-y-4 print:w-full print:m-0 print:p-0 print:fixed print:top-0 print:left-0 print:bg-white print:z-50 print:h-screen">
          <div className="w-64 bg-white border-2 border-dashed border-gray-300 p-6 flex flex-col items-center text-center shadow-sm rounded-md print:border-none print:shadow-none print:w-auto">
            <h3 className="font-extrabold text-3xl mb-1 text-black">{selectedVolume.unidade}</h3>
            <p className="text-base font-medium mb-4 text-black line-clamp-1 overflow-hidden">
              {selectedVolume.morador_nome || 'Morador'}
            </p>
            <p className="text-xs font-bold uppercase mt-2 text-black">
              LOC: {shelfLocation} | VOL: {selectedVolume._volumeIndex}/
              {selectedVolume._totalVolumes}
            </p>
            <p className="text-[10px] text-gray-600 font-medium">{volumeType}</p>
            <p className="text-[10px] text-gray-500 mt-2">
              ID: {selectedVolume.id.substring(0, 6).toUpperCase()} •{' '}
              {format(new Date(), 'dd/MM/yyyy')}
            </p>
          </div>
        </div>
      )}

      <style
        dangerouslySetInnerHTML={{
          __html: `
        @media print {
          body > :not(.print\\:flex) { visibility: hidden; }
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
