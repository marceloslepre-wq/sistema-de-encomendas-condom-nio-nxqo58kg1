import { useState } from 'react'
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
import { InputOTP, InputOTPGroup, InputOTPSlot, InputOTPSeparator } from '@/components/ui/input-otp'
import { useToast } from '@/hooks/use-toast'
import { Smartphone, CheckCircle2, User, Package as PkgIcon } from 'lucide-react'

export default function PortariaRegistro() {
  const { toast } = useToast()
  const [step, setStep] = useState(1)
  const [smsSent, setSmsSent] = useState(false)

  const handleSendSMS = () => {
    setSmsSent(true)
    toast({ title: 'SMS Enviado', description: 'Código enviado para o celular do entregador.' })
  }

  const handleFinish = () => {
    toast({
      title: 'Sucesso!',
      description: 'Encomenda registrada com sucesso.',
      className: 'bg-success text-white',
    })
    setStep(1)
    setSmsSent(false)
  }

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Registrar Nova Encomenda</h2>
        <p className="text-muted-foreground">
          Siga os passos para garantir a segurança da entrega.
        </p>
      </div>

      <div className="flex items-center justify-between mb-8 relative">
        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 bg-muted z-0"></div>
        <div
          className="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-primary z-0 transition-all"
          style={{ width: step === 1 ? '0%' : step === 2 ? '50%' : '100%' }}
        ></div>

        {[1, 2, 3].map((s) => (
          <div
            key={s}
            className={`w-8 h-8 rounded-full flex items-center justify-center z-10 transition-colors ${step >= s ? 'bg-primary text-white' : 'bg-muted text-muted-foreground'}`}
          >
            {s}
          </div>
        ))}
      </div>

      {step === 1 && (
        <Card className="animate-fade-in">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" /> Dados do Destinatário
            </CardTitle>
            <CardDescription>Busque pelo apartamento ou nome do morador.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Busca (Apto ou Nome)</Label>
              <Input placeholder="Ex: 101 ou João" />
            </div>
            <div className="p-3 bg-muted/50 rounded-md border text-sm">
              <strong>Morador Selecionado:</strong> João Silva (Torre A - 101)
            </div>
            <Button className="w-full mt-4" onClick={() => setStep(2)}>
              Avançar
            </Button>
          </CardContent>
        </Card>
      )}

      {step === 2 && (
        <Card className="animate-fade-in">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PkgIcon className="h-5 w-5" /> Dados do Entregador
            </CardTitle>
            <CardDescription>Registre quem está realizando a entrega.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Transportadora</Label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="correios">Correios</SelectItem>
                  <SelectItem value="ml">Mercado Livre</SelectItem>
                  <SelectItem value="sedex">Sedex</SelectItem>
                  <SelectItem value="outros">Outros</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nome</Label>
                <Input placeholder="Nome do entregador" />
              </div>
              <div className="space-y-2">
                <Label>Celular (Para validação)</Label>
                <Input placeholder="(11) 90000-0000" />
              </div>
            </div>
            <div className="flex gap-2 pt-4">
              <Button variant="outline" className="flex-1" onClick={() => setStep(1)}>
                Voltar
              </Button>
              <Button className="flex-1" onClick={() => setStep(3)}>
                Avançar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 3 && (
        <Card className="animate-fade-in border-primary">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Smartphone className="h-5 w-5" /> Validação SMS
            </CardTitle>
            <CardDescription>Confirme a identidade do entregador.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 flex flex-col items-center text-center">
            {!smsSent ? (
              <>
                <p className="text-sm">
                  Um código de 6 dígitos será enviado para o celular informado.
                </p>
                <Button onClick={handleSendSMS} size="lg" className="w-full">
                  Enviar SMS Agora
                </Button>
              </>
            ) : (
              <>
                <p className="text-sm font-medium">Digite o código recebido pelo entregador:</p>
                <InputOTP maxLength={6}>
                  <InputOTPGroup>
                    <InputOTPSlot index={0} />
                    <InputOTPSlot index={1} />
                    <InputOTPSlot index={2} />
                  </InputOTPGroup>
                  <InputOTPSeparator />
                  <InputOTPGroup>
                    <InputOTPSlot index={3} />
                    <InputOTPSlot index={4} />
                    <InputOTPSlot index={5} />
                  </InputOTPGroup>
                </InputOTP>
                <div className="flex gap-2 w-full pt-4">
                  <Button variant="outline" className="flex-1" onClick={() => setSmsSent(false)}>
                    Reenviar
                  </Button>
                  <Button className="flex-1 bg-success hover:bg-success/90" onClick={handleFinish}>
                    <CheckCircle2 className="mr-2 h-4 w-4" /> Validar e Concluir
                  </Button>
                </div>
              </>
            )}
            <Button variant="ghost" size="sm" className="w-full mt-2" onClick={() => setStep(2)}>
              Voltar para edição
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
