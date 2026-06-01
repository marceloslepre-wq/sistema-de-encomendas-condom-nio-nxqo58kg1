import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { InputOTP, InputOTPGroup, InputOTPSlot, InputOTPSeparator } from '@/components/ui/input-otp'
import { useToast } from '@/hooks/use-toast'
import { Search, Package, ShieldCheck, CheckCircle2, Loader2 } from 'lucide-react'
import { getParcels, updateParcel, Parcel } from '@/services/api'
import useRealtime from '@/hooks/use-realtime'
import { format } from 'date-fns'

export default function SalaRetirada() {
  const { toast } = useToast()
  const [parcels, setParcels] = useState<Parcel[]>([])
  const [search, setSearch] = useState('')
  const [selectedParcel, setSelectedParcel] = useState<Parcel | null>(null)

  const [token, setToken] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const loadData = async () => {
    try {
      const data = await getParcels()
      setParcels(data.filter((p) => p.status === 'LIBERADO_RETIRADA'))
    } catch {
      /* intentionally ignored */
    }
  }

  useEffect(() => {
    loadData()
  }, [])
  useRealtime('parcels', () => loadData())

  const filteredParcels = parcels.filter((p) => {
    const term = search.toLowerCase()
    const apt = p.expand?.unit_id?.apartment?.toLowerCase() || ''
    const name = p.expand?.resident_id?.name?.toLowerCase() || ''
    return apt.includes(term) || name.includes(term)
  })

  const handleSelect = (p: Parcel) => {
    setSelectedParcel(p)
    setToken('')
  }

  const handleValidate = async () => {
    if (!selectedParcel) return
    setIsSubmitting(true)
    try {
      if (token !== selectedParcel.withdrawal_code) {
        toast({
          title: 'Código Inválido',
          description: 'O token informado não confere.',
          variant: 'destructive',
        })
        setIsSubmitting(false)
        return
      }

      await updateParcel(selectedParcel.id, {
        status: 'RETIRADO',
        exit_date: new Date().toISOString(),
      })

      toast({
        title: 'Sucesso',
        description: 'Encomenda retirada com sucesso!',
        className: 'bg-success text-white',
      })
      setSelectedParcel(null)
      setSearch('')
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
        <h2 className="text-3xl font-bold tracking-tight">Validação de Retirada</h2>
        <p className="text-muted-foreground">
          Solicite o código gerado no app do morador para entregar o pacote.
        </p>
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
                        {p.expand?.unit_id?.tower}-{p.expand?.unit_id?.apartment}
                      </p>
                      <p className="text-sm">{p.expand?.resident_id?.name || 'Morador'}</p>
                      <p className="text-xs text-muted-foreground mt-1">LOC: {p.shelf_location}</p>
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
                  <ShieldCheck className="h-5 w-5" /> Token de Segurança
                </CardTitle>
                <CardDescription>
                  Insira os 6 dígitos (enviados via WhatsApp) fornecidos pelo morador.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-8 space-y-8 flex flex-col items-center">
                <div className="text-center space-y-1 w-full">
                  <p className="text-xl font-bold">
                    {selectedParcel.expand?.unit_id?.tower}-
                    {selectedParcel.expand?.unit_id?.apartment}
                  </p>
                  <p className="text-muted-foreground">
                    {selectedParcel.expand?.resident_id?.name}
                  </p>
                  <div className="bg-muted p-3 rounded-md mt-4 flex items-center justify-center gap-2">
                    <Package className="w-5 h-5" />
                    <span>
                      {selectedParcel.volume_type} • {selectedParcel.shelf_location}
                    </span>
                  </div>
                </div>

                <div className="space-y-4 flex flex-col items-center">
                  <InputOTP maxLength={6} value={token} onChange={setToken} disabled={isSubmitting}>
                    <InputOTPGroup>
                      <InputOTPSlot index={0} className="w-12 h-14 text-2xl" />
                      <InputOTPSlot index={1} className="w-12 h-14 text-2xl" />
                      <InputOTPSlot index={2} className="w-12 h-14 text-2xl" />
                    </InputOTPGroup>
                    <InputOTPSeparator />
                    <InputOTPGroup>
                      <InputOTPSlot index={3} className="w-12 h-14 text-2xl" />
                      <InputOTPSlot index={4} className="w-12 h-14 text-2xl" />
                      <InputOTPSlot index={5} className="w-12 h-14 text-2xl" />
                    </InputOTPGroup>
                  </InputOTP>
                </div>

                <Button
                  className="w-full h-12 text-lg bg-success hover:bg-success/90 text-white"
                  onClick={handleValidate}
                  disabled={token.length < 6 || isSubmitting}
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
              <ShieldCheck className="w-16 h-16 opacity-20 mb-4" />
              <p className="text-center">
                Selecione uma encomenda na lista para validar a retirada.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
