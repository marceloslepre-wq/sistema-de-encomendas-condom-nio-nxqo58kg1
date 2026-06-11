import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useToast } from '@/hooks/use-toast'
import { Search, Package, CheckCircle2, Loader2, Info } from 'lucide-react'
import { RecebimentoAuditoria } from '@/services/api'
import useRealtime from '@/hooks/use-realtime'
import { format } from 'date-fns'
import pb from '@/lib/pocketbase/client'

export default function SalaRetirada() {
  const { toast } = useToast()
  const [parcels, setParcels] = useState<any[]>([])
  const [search, setSearch] = useState('')
  const [selectedParcel, setSelectedParcel] = useState<any | null>(null)
  const [enteredCode, setEnteredCode] = useState('')

  const [isSubmitting, setIsSubmitting] = useState(false)

  const loadData = async () => {
    try {
      const data = await pb.collection('recebimentos_auditoria').getFullList({
        expand: 'unidade_id,morador_id',
        filter: 'unidade_id != "" && morador_id != ""',
      })
      setParcels(data.filter((p) => p.status === 'LIBERADO_RETIRADA'))
    } catch {
      /* intentionally ignored */
    }
  }

  useEffect(() => {
    loadData()
  }, [])
  useRealtime('recebimentos_auditoria', () => loadData())

  const filteredParcels = parcels.filter((p) => {
    const term = search.toLowerCase()
    const apt = p.expand?.unidade_id?.apartment?.toLowerCase() || p.unidade?.toLowerCase() || ''
    const name = p.expand?.morador_id?.name?.toLowerCase() || p.morador?.toLowerCase() || ''
    return apt.includes(term) || name.includes(term)
  })

  const handleSelect = (p: any) => {
    setSelectedParcel(p)
    setEnteredCode('')
  }

  const handleValidate = async () => {
    if (!selectedParcel) return

    if (selectedParcel.codigo_retirada) {
      console.log('Validando código:', {
        codigo_inserido: enteredCode,
        codigo_esperado: selectedParcel.codigo_retirada,
      })
      if (enteredCode !== selectedParcel.codigo_retirada) {
        console.log('ERRO: Código inválido')
        toast({ title: 'Erro', description: 'Código inválido.', variant: 'destructive' })
        return
      }
    }

    setIsSubmitting(true)
    try {
      await pb.collection('recebimentos_auditoria').update(selectedParcel.id, {
        status: 'ENTREGUE',
      })

      await pb.collection('historico_andamento').create({
        recebimento_id: selectedParcel.id,
        status: 'ENTREGUE',
        observacoes: 'Entregue ao morador',
      })

      console.log('Código validado, status = Entregue:', { volume_numero: selectedParcel.volume })

      toast({
        title: 'Sucesso',
        description: 'Encomenda entregue com sucesso!',
        className: 'bg-success text-white',
      })
      setSelectedParcel(null)
      setSearch('')
      setEnteredCode('')
      loadData()
    } catch (err) {
      toast({ title: 'Erro', description: 'Falha ao processar retirada.', variant: 'destructive' })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Registro de Retirada</h2>
        <p className="text-muted-foreground">Confirme a entrega da encomenda para o morador.</p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Card className="h-[75vh] flex flex-col">
          <CardHeader className="pb-4 border-b">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por apartamento ou morador..."
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </CardHeader>
          <CardContent className="flex-1 overflow-y-auto p-0">
            {filteredParcels.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                Nenhuma encomenda aguardando retirada encontrada.
              </div>
            ) : (
              <div className="divide-y">
                {filteredParcels.map((p) => (
                  <div
                    key={p.id}
                    className={`p-4 flex items-center justify-between cursor-pointer hover:bg-muted/50 transition-colors ${selectedParcel?.id === p.id ? 'bg-primary/5' : ''}`}
                    onClick={() => handleSelect(p)}
                  >
                    <div>
                      <p className="font-bold">
                        {p.expand?.unidade_id
                          ? `${p.expand.unidade_id.tower}-${p.expand.unidade_id.apartment}`
                          : p.unidade || 'Unidade N/D'}
                      </p>
                      <p className="text-sm">
                        {p.expand?.morador_id?.name || p.morador || 'Morador'}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">VOL: {p.volume || 1}</p>
                    </div>
                    <Button variant="ghost" size="sm">
                      Selecionar
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <div>
          {selectedParcel ? (
            <Card className="border-primary shadow-md animate-fade-in">
              <CardHeader className="bg-primary/5 border-b">
                <CardTitle className="flex items-center gap-2 text-primary">
                  <Info className="h-5 w-5" /> Confirmar Retirada
                </CardTitle>
                <CardDescription>
                  Verifique a identidade do morador antes de confirmar a entrega.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-8 space-y-8 flex flex-col items-center">
                <div className="text-center space-y-1 w-full">
                  <p className="text-xl font-bold">
                    {selectedParcel.expand?.unidade_id
                      ? `${selectedParcel.expand.unidade_id.tower}-${selectedParcel.expand.unidade_id.apartment}`
                      : selectedParcel.unidade || 'Unidade N/D'}
                  </p>
                  <p className="text-muted-foreground">
                    {selectedParcel.expand?.morador_id?.name || selectedParcel.morador || 'Morador'}
                  </p>
                  <div className="bg-muted p-3 rounded-md mt-4 flex items-center justify-center gap-2">
                    <Package className="w-5 h-5" />
                    <span>
                      {selectedParcel.transportadora || 'Pacote'} • VOL:{' '}
                      {selectedParcel.volume || 1}
                    </span>
                  </div>

                  <div
                    className={`mt-4 p-4 border rounded-lg text-left w-full ${
                      selectedParcel.expand?.morador_id?.permitir_retirada_terceiros === false
                        ? 'bg-destructive/10 border-destructive/30 text-destructive'
                        : 'bg-muted border-border text-muted-foreground'
                    }`}
                  >
                    <p className="text-sm font-semibold flex items-center gap-2">
                      <Info className="h-4 w-4" />
                      Regra de Retirada do Morador:
                    </p>
                    <p className="mt-1 text-sm font-bold">
                      {selectedParcel.expand?.morador_id?.permitir_retirada_terceiros === false
                        ? 'NÃO PERMITIR A RETIRADA DA MINHA ENCOMENDA POR TERCEIROS, MESMO COM O CODIGO DE LIBERAÇÃO'
                        : 'PERMITIR A RETIRADA DA MINHA ENCOMENDA COM O CODIGO DE LIBERAÇÃO POR TERCEIROS'}
                    </p>
                  </div>

                  {selectedParcel.codigo_retirada && (
                    <div className="mt-6 w-full text-left space-y-2">
                      <label className="text-sm font-semibold text-muted-foreground ml-1">
                        Código de Retirada
                      </label>
                      <Input
                        placeholder="Digite o código de 6 dígitos"
                        value={enteredCode}
                        onChange={(e) => setEnteredCode(e.target.value)}
                        className="text-center text-xl tracking-widest font-mono h-12"
                        maxLength={6}
                      />
                    </div>
                  )}
                </div>

                <Button
                  className="w-full h-12 text-lg bg-success hover:bg-success/90 text-white"
                  onClick={handleValidate}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  ) : (
                    <CheckCircle2 className="mr-2 h-5 w-5" />
                  )}
                  Confirmar Entrega
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground border-2 border-dashed rounded-lg p-10">
              <Info className="w-16 h-16 opacity-20 mb-4" />
              <p className="text-center">
                Selecione uma encomenda na lista para registrar a retirada.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
