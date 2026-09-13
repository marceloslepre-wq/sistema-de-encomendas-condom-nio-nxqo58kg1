import { useState } from 'react'
import { RuntimeModalFrame } from './RuntimeModalFrame'
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { QrCode, Clock, Check, Copy, AlertCircle, Package, Send, CheckCircle2 } from 'lucide-react'

/**
 * 01. Visão Geral: Ciclo da Encomenda Ilustrativo
 */
export function ModalPreviewCicloEncomenda() {
  return (
    <RuntimeModalFrame
      title="Fluxo Operacional: Ciclo de Vida da Encomenda"
      caption="Visão em tempo real das 4 etapas de uma encomenda no CondPack (Portaria → Sala → Notificação → Retirada)"
      maxHeight="420px"
    >
      <div className="space-y-4">
        <div className="flex items-center justify-between pb-3 border-b">
          <div>
            <h4 className="font-semibold text-slate-800 text-sm">Ciclo Completo da Encomenda</h4>
            <p className="text-xs text-muted-foreground">
              Do recebimento do entregador à entrega com código
            </p>
          </div>
          <Badge className="bg-[#00a896] hover:bg-[#00a896] text-white">4 Etapas</Badge>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-center text-xs">
          <div className="p-3 rounded-lg border border-blue-200 bg-blue-50/70">
            <span className="w-6 h-6 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center mx-auto mb-1 text-[11px]">
              1
            </span>
            <p className="font-bold text-blue-900">1. Portaria</p>
            <p className="text-[11px] text-blue-700 mt-0.5">
              Entregador validado + pacote registrado
            </p>
          </div>

          <div className="p-3 rounded-lg border border-amber-200 bg-amber-50/70">
            <span className="w-6 h-6 rounded-full bg-amber-600 text-white font-bold flex items-center justify-center mx-auto mb-1 text-[11px]">
              2
            </span>
            <p className="font-bold text-amber-900">2. Triagem</p>
            <p className="text-[11px] text-amber-700 mt-0.5">
              Tipo de volume + local na prateleira
            </p>
          </div>

          <div className="p-3 rounded-lg border border-emerald-200 bg-emerald-50/70">
            <span className="w-6 h-6 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center mx-auto mb-1 text-[11px]">
              3
            </span>
            <p className="font-bold text-emerald-900">3. Notificação</p>
            <p className="text-[11px] text-emerald-700 mt-0.5">Código de 6 dígitos via WhatsApp</p>
          </div>

          <div className="p-3 rounded-lg border border-purple-200 bg-purple-50/70">
            <span className="w-6 h-6 rounded-full bg-purple-600 text-white font-bold flex items-center justify-center mx-auto mb-1 text-[11px]">
              4
            </span>
            <p className="font-bold text-purple-900">4. Retirada</p>
            <p className="text-[11px] text-purple-700 mt-0.5">
              Código conferido e baixa registrada
            </p>
          </div>
        </div>
      </div>
    </RuntimeModalFrame>
  )
}

/**
 * 02. Usuários & Convite: Modal de Cadastro de Usuário + Gerador de Link
 */
export function ModalPreviewUsuario() {
  const [tab, setTab] = useState<'cadastro' | 'link'>('cadastro')
  const [role, setRole] = useState('morador')
  const [copied, setCopied] = useState(false)

  return (
    <RuntimeModalFrame
      title="Modal de Cadastro: Novo Usuário e Gerar Link de Convite"
      caption="Janela aberta ao clicar em '+ Adicionar Usuário' ou 'Gerar Link de Convite' na aba Usuários"
      maxHeight="520px"
    >
      <Tabs value={tab} onValueChange={(v) => setTab(v as any)} className="w-full">
        <TabsList className="grid grid-cols-2 mb-4 w-full">
          <TabsTrigger value="cadastro">Cadastrar Usuário</TabsTrigger>
          <TabsTrigger value="link">Gerar Link de Convite</TabsTrigger>
        </TabsList>

        <TabsContent value="cadastro" className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Perfil de Acesso *</Label>
              <Select value={role} onValueChange={setRole}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="morador">Morador</SelectItem>
                  <SelectItem value="porteiro">Porteiro</SelectItem>
                  <SelectItem value="portaria">Portaria Geral</SelectItem>
                  <SelectItem value="triagem">Triagem</SelectItem>
                  <SelectItem value="gestor">Gestor / Síndico</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Nome Completo *</Label>
              <Input defaultValue="Mariana de Souza Oliveira" className="h-9 text-xs" />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">E-mail (Login) *</Label>
              <Input defaultValue="mariana.souza@exemplo.com.br" className="h-9 text-xs" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">WhatsApp / Celular</Label>
              <Input defaultValue="(11) 98765-4321" className="h-9 text-xs" />
            </div>
          </div>

          {role === 'morador' && (
            <div className="grid grid-cols-3 gap-2 p-2.5 rounded-md bg-slate-50 border border-slate-200">
              <div className="space-y-1">
                <Label className="text-[11px]">CPF *</Label>
                <Input defaultValue="123.456.789-00" className="h-8 text-xs" />
              </div>
              <div className="space-y-1">
                <Label className="text-[11px]">Torre / Bloco *</Label>
                <Input defaultValue="Torre A" className="h-8 text-xs" />
              </div>
              <div className="space-y-1">
                <Label className="text-[11px]">Apartamento *</Label>
                <Input defaultValue="402" className="h-8 text-xs" />
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2 border-t">
            <Button variant="outline" size="sm" className="h-8 text-xs">
              Cancelar
            </Button>
            <Button size="sm" className="h-8 text-xs bg-[#0d2a58] hover:bg-[#0d2a58]/90">
              Salvar Usuário
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="link" className="space-y-3">
          <p className="text-xs text-muted-foreground">
            Crie um link exclusivo para o morador ou colaborador se cadastrar sozinho.
          </p>

          <div className="grid grid-cols-3 gap-2">
            <div className="space-y-1">
              <Label className="text-[11px]">Perfil</Label>
              <Select defaultValue="morador">
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="morador">Morador</SelectItem>
                  <SelectItem value="porteiro">Porteiro</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-[11px]">Torre</Label>
              <Input defaultValue="Torre B" className="h-8 text-xs" />
            </div>
            <div className="space-y-1">
              <Label className="text-[11px]">Unidade</Label>
              <Input defaultValue="104" className="h-8 text-xs" />
            </div>
          </div>

          <div className="p-3 bg-emerald-50 rounded-md border border-emerald-200 space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold text-emerald-800">
              <span className="flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                Link Gerado Pronto para Envio
              </span>
              <Badge className="bg-emerald-600 text-white text-[10px]">Ativo</Badge>
            </div>
            <div className="flex items-center gap-2">
              <Input
                readOnly
                value="https://condpack.app/registrar/a8f9c1b7d4e2"
                className="h-8 text-xs bg-white font-mono"
              />
              <Button
                size="sm"
                variant="outline"
                className="h-8 text-xs shrink-0"
                onClick={() => {
                  setCopied(true)
                  setTimeout(() => setCopied(false), 2000)
                }}
              >
                {copied ? (
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
                {copied ? 'Copiado' : 'Copiar'}
              </Button>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </RuntimeModalFrame>
  )
}

/**
 * 03. Unidades: Modal de Adicionar Unidade
 */
export function ModalPreviewUnidade() {
  return (
    <RuntimeModalFrame
      title="Modal de Cadastro: Adicionar Unidade"
      caption="Janela aberta ao clicar em '+ Adicionar Unidade' na tela de Unidades"
      maxHeight="380px"
    >
      <div className="space-y-4">
        <div>
          <h4 className="font-semibold text-slate-800 text-sm">Nova Unidade</h4>
          <p className="text-xs text-muted-foreground">
            Preencha os dados da torre e do apartamento.
          </p>
        </div>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Torre / Bloco *</Label>
            <Input
              defaultValue="Torre A"
              className="h-9 text-xs"
              placeholder="Ex: Torre A, Bloco 1, Sul"
            />
            <p className="text-[11px] text-muted-foreground">
              Dica: O CondPack aceita tanto &quot;Torre A&quot; quanto &quot;A&quot; no matching
              inteligente.
            </p>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Apartamento *</Label>
            <Input defaultValue="302" className="h-9 text-xs" placeholder="Ex: 101, 102A" />
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-3 border-t">
          <Button variant="outline" size="sm" className="h-8 text-xs">
            Cancelar
          </Button>
          <Button size="sm" className="h-8 text-xs bg-[#0d2a58] hover:bg-[#0d2a58]/90">
            Salvar Unidade
          </Button>
        </div>
      </div>
    </RuntimeModalFrame>
  )
}

/**
 * 04. Transportadoras: Modal de Cadastro
 */
export function ModalPreviewTransportadora() {
  return (
    <RuntimeModalFrame
      title="Modal de Cadastro: Nova Transportadora"
      caption="Janela aberta ao clicar em '+ Adicionar' na tela de Transportadoras"
      maxHeight="380px"
    >
      <div className="space-y-4">
        <div>
          <h4 className="font-semibold text-slate-800 text-sm">Nova Transportadora</h4>
          <p className="text-xs text-muted-foreground">Preencha os dados da empresa de entrega.</p>
        </div>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Nome da Transportadora *</Label>
            <Input
              defaultValue="Mercado Livre Envios"
              className="h-9 text-xs"
              placeholder="Ex: Correios, Mercado Livre, Loggi"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Telefone / Central de Atendimento</Label>
            <Input
              defaultValue="(11) 4003-0102"
              className="h-9 text-xs"
              placeholder="Ex: (11) 99999-9999"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-3 border-t">
          <Button variant="outline" size="sm" className="h-8 text-xs">
            Cancelar
          </Button>
          <Button size="sm" className="h-8 text-xs bg-[#0d2a58] hover:bg-[#0d2a58]/90">
            Salvar Transportadora
          </Button>
        </div>
      </div>
    </RuntimeModalFrame>
  )
}

/**
 * 05. Logística: Modais de Tipo de Volume e Prateleiras
 */
export function ModalPreviewLogistica() {
  return (
    <RuntimeModalFrame
      title="Modal de Cadastro: Tipos de Volume & Prateleiras"
      caption="Janelas abertas ao clicar em 'Adicionar Novo' nas abas da tela de Logística"
      maxHeight="420px"
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="p-3 rounded-lg border border-slate-200 bg-slate-50 space-y-2.5">
          <Badge variant="outline" className="text-[10px] bg-white">
            Aba Tipos de Volume
          </Badge>
          <h5 className="font-semibold text-xs text-slate-800">Adicionar Tipo de Volume</h5>
          <div className="space-y-1">
            <Label className="text-[11px]">Nome do Volume</Label>
            <Input defaultValue="Caixa Grande (G)" className="h-8 text-xs bg-white" />
          </div>
          <p className="text-[10px] text-muted-foreground">
            Ex: Envelope, Caixa P, Pacote Médio, Caixa G
          </p>
          <Button size="sm" className="w-full h-7 text-xs bg-[#0d2a58]">
            Salvar Tipo
          </Button>
        </div>

        <div className="p-3 rounded-lg border border-slate-200 bg-slate-50 space-y-2.5">
          <Badge variant="outline" className="text-[10px] bg-white">
            Aba Prateleiras
          </Badge>
          <h5 className="font-semibold text-xs text-slate-800">Adicionar Local de Prateleira</h5>
          <div className="space-y-1">
            <Label className="text-[11px]">Nome da Localização</Label>
            <Input defaultValue="Prateleira A - Nível 2" className="h-8 text-xs bg-white" />
          </div>
          <p className="text-[10px] text-muted-foreground">
            Ex: Prateleira A, Chão Setor B, Armário 01
          </p>
          <Button
            size="sm"
            className="w-full h-7 text-xs bg-[#00a896] hover:bg-[#00a896]/90 text-white"
          >
            Salvar Local
          </Button>
        </div>
      </div>
    </RuntimeModalFrame>
  )
}

/**
 * 06. Registro de Encomenda: Tela / Formulário de Entrada na Portaria
 */
export function ModalPreviewRegistroPortaria() {
  return (
    <RuntimeModalFrame
      title="Painel de Registro: Entrada de Encomendas na Portaria"
      caption="Formulário principal de recepção na Portaria com validação do entregador e vinculação da unidade"
      maxHeight="520px"
    >
      <div className="space-y-4">
        <div className="flex items-center justify-between pb-2 border-b">
          <div>
            <h4 className="font-semibold text-slate-800 text-sm">Recebimento de Encomendas</h4>
            <p className="text-xs text-muted-foreground">
              Entregador identificado e pacotes vinculados à unidade
            </p>
          </div>
          <Badge className="bg-emerald-600 text-white text-[10px]">Portaria Ativa</Badge>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 p-3 rounded-lg bg-blue-50/60 border border-blue-200">
          <div className="space-y-1">
            <Label className="text-[11px]">Transportadora *</Label>
            <Input defaultValue="Amazon Log" className="h-8 text-xs bg-white" readOnly />
          </div>
          <div className="space-y-1">
            <Label className="text-[11px]">Nome do Entregador *</Label>
            <Input defaultValue="Carlos Eduardo Santos" className="h-8 text-xs bg-white" readOnly />
          </div>
          <div className="space-y-1">
            <Label className="text-[11px]">CPF do Entregador *</Label>
            <Input defaultValue="234.567.890-11" className="h-8 text-xs bg-white" readOnly />
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-xs font-semibold text-slate-800">
            Pacotes Desta Entrega (Tabela Dinâmica)
          </Label>
          <div className="p-2.5 rounded-md border border-slate-200 bg-white space-y-2">
            <div className="grid grid-cols-12 gap-2 text-[11px] font-semibold text-muted-foreground px-1">
              <span className="col-span-5">Unidade (Torre / Apto)</span>
              <span className="col-span-5">Morador</span>
              <span className="col-span-2 text-center">Volumes</span>
            </div>
            <div className="grid grid-cols-12 gap-2 items-center text-xs">
              <Input
                defaultValue="Torre A - 402"
                className="h-8 text-xs col-span-5 bg-slate-50"
                readOnly
              />
              <Input
                defaultValue="Mariana de Souza Oliveira"
                className="h-8 text-xs col-span-5 bg-slate-50"
                readOnly
              />
              <Input
                defaultValue="2"
                className="h-8 text-xs col-span-2 text-center font-bold bg-slate-50"
                readOnly
              />
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between pt-2 border-t text-xs">
          <span className="text-slate-500">Total: 1 entrega • 2 volumes</span>
          <Button size="sm" className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white">
            <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
            Finalizar e Encaminhar para Triagem
          </Button>
        </div>
      </div>
    </RuntimeModalFrame>
  )
}

/**
 * 07. Triagem & Retirada: Modal de Processamento + Confirmação com Código
 */
export function ModalPreviewTriagemRetirada() {
  return (
    <RuntimeModalFrame
      title="Modal de Triagem: Etiquetagem e Geração do Código de Retirada"
      caption="Janela aberta ao clicar em 'Processar' na Sala de Triagem para liberar o pacote para retirada"
      maxHeight="520px"
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-3">
          <div>
            <Badge variant="outline" className="text-[10px] mb-1">
              Processar Volume 1/2
            </Badge>
            <h4 className="font-bold text-slate-800 text-sm">Unidade: Torre A - 402</h4>
            <p className="text-xs text-muted-foreground">Morador: Mariana de Souza Oliveira</p>
          </div>

          <div className="space-y-1">
            <Label className="text-xs">Código de Rastreio (Opcional)</Label>
            <Input defaultValue="BR987654321AMZ" className="h-8 text-xs" />
          </div>

          <div className="space-y-1">
            <Label className="text-xs">Tipo de Volume</Label>
            <Select defaultValue="caixa_m">
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="caixa_m">Caixa Média (M)</SelectItem>
                <SelectItem value="caixa_p">Caixa Pequena (P)</SelectItem>
                <SelectItem value="envelope">Envelope</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label className="text-xs">Localização na Sala</Label>
            <Select defaultValue="prat_a2">
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="prat_a2">Prateleira A - Nível 2</SelectItem>
                <SelectItem value="prat_b1">Prateleira B - Nível 1</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Prévia da etiqueta com código */}
        <div className="flex flex-col items-center justify-between p-3 rounded-lg border border-dashed border-slate-300 bg-slate-50 text-center">
          <div>
            <Badge className="bg-[#00a896] text-white text-[10px] mb-1">Etiqueta do Pacote</Badge>
            <p className="font-extrabold text-base text-slate-900 leading-tight">TORRE A - 402</p>
            <p className="text-xs text-slate-600">Mariana S. Oliveira</p>
          </div>

          <div className="my-2 p-2 bg-white rounded border border-slate-200">
            <div className="w-20 h-20 bg-slate-900 text-white flex items-center justify-center font-mono text-[9px] mx-auto rounded">
              QR CODE
            </div>
            <p className="text-[10px] text-muted-foreground mt-1">VOL: 01/02</p>
          </div>

          <div className="w-full p-2 bg-emerald-50 rounded border border-emerald-200">
            <p className="text-[10px] font-semibold text-emerald-800">Código de Retirada:</p>
            <p className="font-mono font-black text-lg text-emerald-700 tracking-widest">741 852</p>
          </div>

          <Button size="sm" className="w-full mt-2 h-7 text-xs bg-[#0d2a58] hover:bg-[#0d2a58]/90">
            Liberar para Retirada
          </Button>
        </div>
      </div>
    </RuntimeModalFrame>
  )
}

/**
 * 08. Relatórios: Painel de Filtros e Exportação
 */
export function ModalPreviewRelatorios() {
  return (
    <RuntimeModalFrame
      title="Painel de Exportação: Relatórios Operacionais e Auditoria"
      caption="Filtros por data, torre e status para exportação em CSV das encomendas do condomínio"
      maxHeight="440px"
    >
      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
          <div className="space-y-1">
            <Label className="text-[11px]">Data Inicial</Label>
            <Input defaultValue="2025-01-01" type="date" className="h-8 text-xs" />
          </div>
          <div className="space-y-1">
            <Label className="text-[11px]">Data Final</Label>
            <Input defaultValue="2025-01-31" type="date" className="h-8 text-xs" />
          </div>
          <div className="space-y-1">
            <Label className="text-[11px]">Torre</Label>
            <Select defaultValue="Todas">
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Todas">Todas as Torres</SelectItem>
                <SelectItem value="A">Torre A</SelectItem>
                <SelectItem value="B">Torre B</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-[11px]">Status</Label>
            <Select defaultValue="Todos">
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Todos">Todos os Status</SelectItem>
                <SelectItem value="RECEBIDO">Recebido</SelectItem>
                <SelectItem value="RETIRADO">Retirado</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div>
            <p className="font-semibold text-slate-800">
              Total de registros no período: 142 encomendas
            </p>
            <p className="text-slate-500 text-[11px]">
              Campos: Código, Torre, Apto, Status, Transportadora, Entrada, Saída
            </p>
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            <Button variant="outline" size="sm" className="h-8 text-xs w-full sm:w-auto">
              Exportar PDF
            </Button>
            <Button
              size="sm"
              className="h-8 text-xs bg-[#0d2a58] hover:bg-[#0d2a58]/90 w-full sm:w-auto"
            >
              Exportar CSV
            </Button>
          </div>
        </div>
      </div>
    </RuntimeModalFrame>
  )
}

/**
 * 09. Permissões: Matriz de Perfis
 */
export function ModalPreviewPermissoes() {
  return (
    <RuntimeModalFrame
      title="Matriz de Permissões: O que cada perfil pode acessar"
      caption="Configuração das permissões ativas e travas de segurança por perfil de usuário"
      maxHeight="440px"
    >
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
        <div className="p-3 rounded-lg border border-primary/20 bg-primary/5 space-y-2">
          <p className="font-bold text-primary text-sm">Gestor (Síndico)</p>
          <ul className="space-y-1.5 text-[11px] text-slate-700">
            <li className="flex items-center gap-1.5">
              <Check className="w-3.5 h-3.5 text-emerald-600" /> Exportar relatórios
            </li>
            <li className="flex items-center gap-1.5">
              <Check className="w-3.5 h-3.5 text-emerald-600" /> Gerar links de convite
            </li>
            <li className="flex items-center gap-1.5">
              <Check className="w-3.5 h-3.5 text-emerald-600" /> Configurações & WhatsApp
            </li>
            <li className="flex items-center gap-1.5">
              <Check className="w-3.5 h-3.5 text-emerald-600" /> Licenças & Pagamento PIX
            </li>
          </ul>
        </div>

        <div className="p-3 rounded-lg border border-amber-200 bg-amber-50/60 space-y-2">
          <p className="font-bold text-amber-900 text-sm">Portaria / Porteiro</p>
          <ul className="space-y-1.5 text-[11px] text-slate-700">
            <li className="flex items-center gap-1.5">
              <Check className="w-3.5 h-3.5 text-emerald-600" /> Registrar encomendas
            </li>
            <li className="flex items-center gap-1.5">
              <Check className="w-3.5 h-3.5 text-emerald-600" /> Cadastrar entregador
            </li>
            <li className="flex items-center gap-1.5">
              <Check className="w-3.5 h-3.5 text-emerald-600" /> Validar retirada com código
            </li>
            <li className="flex items-center gap-1.5 text-slate-400">
              ✕ Sem acesso a relatórios e licenças
            </li>
          </ul>
        </div>

        <div className="p-3 rounded-lg border border-emerald-200 bg-emerald-50/60 space-y-2">
          <p className="font-bold text-emerald-900 text-sm">Morador</p>
          <ul className="space-y-1.5 text-[11px] text-slate-700">
            <li className="flex items-center gap-1.5">
              <Check className="w-3.5 h-3.5 text-emerald-600" /> Ver encomendas ativas
            </li>
            <li className="flex items-center gap-1.5">
              <Check className="w-3.5 h-3.5 text-emerald-600" /> Visualizar código de retirada
            </li>
            <li className="flex items-center gap-1.5">
              <Check className="w-3.5 h-3.5 text-emerald-600" /> Autorizar retirada por terceiros
            </li>
            <li className="flex items-center gap-1.5">
              <Check className="w-3.5 h-3.5 text-emerald-600" /> Timeline e histórico
            </li>
          </ul>
        </div>
      </div>
    </RuntimeModalFrame>
  )
}

/**
 * 10. Configurações: WhatsApp Próprio com QR Code e Contagem de 2 minutos
 */
export function ModalPreviewWhatsApp() {
  return (
    <RuntimeModalFrame
      title="Modal de Pareamento do WhatsApp (QR Code Real)"
      caption="Janela aberta ao clicar em 'Conectar WhatsApp' na aba Configurações → WhatsApp Próprio"
      maxHeight="540px"
    >
      <div className="space-y-4 text-center">
        <div className="flex items-center justify-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-xs font-semibold text-emerald-800">
            Aguardando leitura do QR Code
          </span>
        </div>

        {/* QR Code estilizado exatamente como o screenshot de referência */}
        <div className="p-4 bg-white border-2 border-dashed border-slate-300 rounded-xl inline-block mx-auto shadow-xs">
          <div className="w-44 h-44 bg-slate-900 rounded-lg p-2 flex flex-col justify-between text-white font-mono text-[10px] select-none mx-auto">
            <div className="flex justify-between">
              <span className="w-10 h-10 border-4 border-white bg-black inline-block rounded-xs" />
              <span className="w-10 h-10 border-4 border-white bg-black inline-block rounded-xs" />
            </div>
            <div className="text-center font-bold text-xs tracking-wider opacity-80">
              CONDPACK
              <br />
              <span className="text-[9px] font-normal">WHATSAPP QR</span>
            </div>
            <div className="flex justify-between items-end">
              <span className="w-10 h-10 border-4 border-white bg-black inline-block rounded-xs" />
              <div className="grid grid-cols-2 gap-1 w-8 h-8">
                <span className="bg-white rounded-xs" />
                <span className="bg-white rounded-xs" />
                <span className="bg-white rounded-xs" />
                <span className="bg-white rounded-xs" />
              </div>
            </div>
          </div>
        </div>

        {/* Alerta de contagem regressiva de 2 minutos */}
        <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-md text-xs text-amber-900 flex items-center justify-center gap-2 max-w-sm mx-auto">
          <Clock className="w-4 h-4 text-amber-600 shrink-0" />
          <span>
            Tempo restante para escanear: <strong>1:48</strong> (contagem de 2 min)
          </span>
        </div>

        <div className="text-left text-xs text-slate-600 bg-slate-50 p-3 rounded-md border border-slate-200 max-w-md mx-auto space-y-1">
          <p className="font-semibold text-slate-800">Como conectar:</p>
          <ol className="list-decimal list-inside space-y-0.5 text-[11px] text-slate-600">
            <li>Abra o WhatsApp no celular do condomínio</li>
            <li>
              Toque em <strong>Aparelhos Conectados → Conectar um aparelho</strong>
            </li>
            <li>Aponte a câmera para o QR Code acima</li>
          </ol>
        </div>
      </div>
    </RuntimeModalFrame>
  )
}

/**
 * 11. Licenças e Planos: Modal de Pagamento PIX com QR Code e Copia e Cola
 */
export function ModalPreviewLicencaPix() {
  const [copied, setCopied] = useState(false)

  return (
    <RuntimeModalFrame
      title="Modal de Pagamento PIX: Renovação da Licença do Condomínio"
      caption="Janela aberta ao clicar em 'Renovar com PIX' ou 'Pagar Licença' na tela de Licenças e Planos"
      maxHeight="520px"
    >
      <div className="space-y-4 text-center">
        <div className="flex items-center justify-between pb-2 border-b">
          <div className="text-left">
            <h4 className="font-bold text-slate-800 text-sm">
              Renovação Mensal — Plano Condomínio
            </h4>
            <p className="text-xs text-muted-foreground">
              +30 dias de acesso com liberação automática
            </p>
          </div>
          <Badge className="bg-emerald-600 text-white font-mono text-xs">R$ 99,90</Badge>
        </div>

        {/* QR Code PIX */}
        <div className="p-3 bg-white border border-slate-200 rounded-xl inline-block mx-auto">
          <div className="w-36 h-36 bg-slate-900 text-white rounded-md p-2 flex flex-col justify-between font-mono text-[9px] select-none mx-auto">
            <div className="flex justify-between">
              <span className="w-8 h-8 border-2 border-white bg-black inline-block rounded-xs" />
              <span className="w-8 h-8 border-2 border-white bg-black inline-block rounded-xs" />
            </div>
            <div className="text-center font-bold text-[10px]">PIX MERCADO PAGO</div>
            <div className="flex justify-between items-end">
              <span className="w-8 h-8 border-2 border-white bg-black inline-block rounded-xs" />
              <span className="w-6 h-6 bg-white inline-block rounded-xs" />
            </div>
          </div>
        </div>

        <div className="space-y-2 max-w-md mx-auto">
          <Label className="text-xs text-slate-700 font-semibold block text-left">
            Código PIX Copia e Cola:
          </Label>
          <div className="flex items-center gap-2">
            <Input
              readOnly
              value="00020126580014br.gov.bcb.pix0136e94a8c3d-2f1e-4c7b-a1d8-5b0c9e2f4a1b520400005303986540599.905802BR5913CONDPACK6009SAOPAULO62070503***6304ABCD"
              className="h-8 text-[11px] font-mono bg-slate-50"
            />
            <Button
              size="sm"
              className="h-8 text-xs bg-[#0d2a58] shrink-0"
              onClick={() => {
                setCopied(true)
                setTimeout(() => setCopied(false), 2000)
              }}
            >
              {copied ? (
                <Check className="w-3.5 h-3.5 text-emerald-400" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
              {copied ? 'Copiado!' : 'Copiar PIX'}
            </Button>
          </div>
        </div>

        <div className="p-2.5 bg-emerald-50 rounded-md border border-emerald-200 text-xs text-emerald-900 flex items-center justify-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>
            Após o pagamento no seu banco, o sistema renova em poucos segundos sem necessidade de
            enviar comprovante.
          </span>
        </div>
      </div>
    </RuntimeModalFrame>
  )
}
