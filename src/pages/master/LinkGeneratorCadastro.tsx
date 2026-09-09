import { useState, useMemo } from 'react'
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
import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { useToast } from '@/hooks/use-toast'
import { Link2, Copy, Check, Mail, ExternalLink, Sparkles, Layers, Send } from 'lucide-react'
import { Plano } from '@/services/master'

interface LinkGeneratorCadastroProps {
  planos: Plano[]
}

export function LinkGeneratorCadastro({ planos }: LinkGeneratorCadastroProps) {
  const { toast } = useToast()
  const [selectedPlanoNome, setSelectedPlanoNome] = useState<string>('todos')
  const [copied, setCopied] = useState(false)

  // Planos ativos disponíveis para seleção
  const activePlanos = useMemo(() => {
    return planos.filter((p) => p.status === 'ativo')
  }, [planos])

  // Plano atualmente selecionado no dropdown (se houver)
  const selectedPlano = useMemo(() => {
    if (!selectedPlanoNome || selectedPlanoNome === 'todos') return null
    return activePlanos.find((p) => p.nome === selectedPlanoNome) || null
  }, [activePlanos, selectedPlanoNome])

  // Monta a URL completa do primeiro cadastro
  const generatedUrl = useMemo(() => {
    const origin =
      typeof window !== 'undefined' && window.location?.origin ? window.location.origin : ''
    const basePath = `${origin}/cadastro`

    if (selectedPlanoNome && selectedPlanoNome !== 'todos') {
      return `${basePath}?plano=${encodeURIComponent(selectedPlanoNome)}`
    }
    return basePath
  }, [selectedPlanoNome])

  // Mensagem padrão para envio (WhatsApp / E-mail)
  const invitationMessage = useMemo(() => {
    const planoInfo = selectedPlano ? ` com o plano ${selectedPlano.nome}` : ''
    return (
      `Olá! Você foi convidado para testar gratuitamente por 15 dias o CondoPack, a plataforma definitiva de gestão inteligente de encomendas para condomínios.\n\n` +
      `Acesse o link abaixo para iniciar seu Primeiro Cadastro${planoInfo}:\n` +
      `${generatedUrl}\n\n` +
      `Aproveite todos os recursos durante o período de avaliação gratuita!`
    )
  }, [selectedPlano, generatedUrl])

  // Copiar para a área de transferência
  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(generatedUrl)
      setCopied(true)
      toast({
        title: 'Link copiado!',
        description: 'O link para Primeiro Cadastro foi copiado para a área de transferência.',
      })
      setTimeout(() => setCopied(false), 2500)
    } catch {
      toast({
        variant: 'destructive',
        title: 'Erro ao copiar link',
        description: 'Não foi possível copiar automaticamente.',
      })
    }
  }

  // Envio por WhatsApp
  const handleShareWhatsApp = () => {
    const url = `https://wa.me/?text=${encodeURIComponent(invitationMessage)}`
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  // Envio por E-mail
  const handleShareEmail = () => {
    const subject = encodeURIComponent('Convite: Teste Grátis de 15 dias no CondoPack')
    const body = encodeURIComponent(invitationMessage)
    window.location.href = `mailto:?subject=${subject}&body=${body}`
  }

  return (
    <Card className="border-indigo-100 shadow-sm overflow-hidden bg-white">
      <div className="bg-gradient-to-r from-indigo-600 via-indigo-700 to-slate-900 p-5 text-white">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center text-white shrink-0">
              <Link2 className="w-5 h-5 text-indigo-200" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-lg text-white">
                  Gerador de Link de Primeiro Cadastro
                </h3>
                <Badge className="bg-emerald-500/20 text-emerald-200 border-emerald-400/30 text-[11px] font-medium">
                  Página Pública /cadastro
                </Badge>
              </div>
              <p className="text-xs text-indigo-100/90 mt-0.5">
                Gere links personalizados de convite para onboarding com pré-seleção de plano ativo
                e envie diretamente por WhatsApp, e-mail ou copie manualmente.
              </p>
            </div>
          </div>
          <div className="hidden lg:flex items-center gap-1.5 text-xs bg-white/10 border border-white/15 px-3 py-1.5 rounded-md text-indigo-100">
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span>15 dias de teste grátis</span>
          </div>
        </div>
      </div>

      <CardContent className="p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-end">
          {/* Seletor de Plano Ativo */}
          <div className="md:col-span-5 space-y-2">
            <Label
              htmlFor="select-plano"
              className="text-xs font-semibold text-slate-700 flex items-center gap-1.5"
            >
              <Layers className="w-3.5 h-3.5 text-indigo-600" />
              Plano Pré-selecionado (Opcional)
            </Label>
            <Select value={selectedPlanoNome} onValueChange={setSelectedPlanoNome}>
              <SelectTrigger id="select-plano" className="h-10 bg-slate-50 border-slate-300">
                <SelectValue placeholder="Sem pré-seleção (cliente escolhe no cadastro)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">
                  Nenhum plano específico (cliente escolhe na tela)
                </SelectItem>
                {activePlanos.map((plano) => (
                  <SelectItem key={plano.id} value={plano.nome}>
                    {plano.nome} — R${' '}
                    {plano.preco_mensal !== undefined
                      ? Number(plano.preco_mensal).toFixed(2).replace('.', ',')
                      : '0,00'}
                    /mês
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-[11px] text-muted-foreground">
              {selectedPlano
                ? `O parâmetro ?plano=${encodeURIComponent(selectedPlano.nome)} selecionará automaticamente este plano no formulário.`
                : 'O cliente poderá visualizar e escolher qualquer plano ativo no formulário.'}
            </p>
          </div>

          {/* Input com Link Gerado */}
          <div className="md:col-span-7 space-y-2">
            <Label
              htmlFor="generated-link"
              className="text-xs font-semibold text-slate-700 flex items-center justify-between"
            >
              <span className="flex items-center gap-1.5">
                <Link2 className="w-3.5 h-3.5 text-indigo-600" />
                Link Gerado para Envio
              </span>
              <a
                href={generatedUrl}
                target="_blank"
                rel="noreferrer"
                className="text-[11px] text-indigo-600 hover:text-indigo-800 hover:underline flex items-center gap-1 font-normal"
              >
                Abrir página <ExternalLink className="w-3 h-3" />
              </a>
            </Label>
            <div className="flex gap-2">
              <Input
                id="generated-link"
                value={generatedUrl}
                readOnly
                onClick={(e) => (e.target as HTMLInputElement).select()}
                className="font-mono text-xs h-10 bg-slate-50 border-slate-300 select-all"
              />
              <Button
                type="button"
                onClick={handleCopyLink}
                className="h-10 shrink-0 bg-indigo-600 hover:bg-indigo-700 text-white gap-1.5 px-4 font-medium"
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-300" />
                    <span>Copiado!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    <span>Copiar</span>
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* Barra de Ações Rápidas de Compartilhamento */}
        <div className="pt-4 border-t flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-slate-50/80 p-4 rounded-lg border border-slate-200">
          <div className="space-y-0.5">
            <span className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
              <Send className="w-3.5 h-3.5 text-indigo-600" />
              Compartilhamento Direto
            </span>
            <p className="text-xs text-slate-500">
              Envie a mensagem de convite com o link de cadastro em apenas 1 clique:
            </p>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            {/* WhatsApp */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleShareWhatsApp}
                  className="flex-1 sm:flex-initial h-9 bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100 hover:text-emerald-800 gap-2 text-xs font-semibold"
                >
                  <svg className="w-4 h-4 fill-current text-emerald-600" viewBox="0 0 24 24">
                    <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" />
                  </svg>
                  <span>WhatsApp</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>Abrir WhatsApp com texto e link pronto</TooltipContent>
            </Tooltip>

            {/* E-mail */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleShareEmail}
                  className="flex-1 sm:flex-initial h-9 bg-blue-50 text-blue-700 border-blue-300 hover:bg-blue-100 hover:text-blue-800 gap-2 text-xs font-semibold"
                >
                  <Mail className="w-4 h-4 text-blue-600" />
                  <span>E-mail</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>Abrir cliente de e-mail com mensagem pronta</TooltipContent>
            </Tooltip>

            {/* Botão Copiar Alternativo */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCopyLink}
                  className="flex-1 sm:flex-initial h-9 border-slate-300 text-slate-700 hover:bg-slate-100 gap-2 text-xs font-medium"
                >
                  {copied ? (
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                  ) : (
                    <Copy className="w-3.5 h-3.5 text-slate-600" />
                  )}
                  <span>Copiar Link</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>Copiar link para colar manualmente</TooltipContent>
            </Tooltip>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
