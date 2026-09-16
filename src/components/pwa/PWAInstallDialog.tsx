import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { usePWA } from './PWAContext'
import { CondPackLogo } from '@/components/CondPackLogo'
import {
  Share,
  PlusSquare,
  Smartphone,
  Download,
  CheckCircle2,
  Zap,
  WifiOff,
  Bell,
  X,
} from 'lucide-react'

export function PWAInstallDialog() {
  const {
    isStandalone,
    isIOS,
    canPromptNative,
    isModalOpen,
    setIsModalOpen,
    dismissPrompt,
    installApp,
  } = usePWA()

  // Se já estiver em modo standalone/instalado, não exibe
  if (isStandalone) return null

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      dismissPrompt()
    } else {
      setIsModalOpen(true)
    }
  }

  return (
    <Dialog open={isModalOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[440px] p-0 overflow-hidden border-slate-200/80 shadow-2xl rounded-2xl max-h-[90vh] flex flex-col">
        {/* Cabeçalho Visual com Identidade CondPack */}
        <div className="bg-gradient-to-br from-[#0d2a58] via-[#0f346c] to-[#00a896] p-6 text-white text-center relative overflow-hidden shrink-0">
          {/* Efeito de brilho de fundo */}
          <div className="absolute -top-10 -right-10 w-36 h-36 bg-white/10 rounded-full blur-2xl pointer-events-none" />
          <div className="absolute -bottom-10 -left-10 w-36 h-36 bg-[#00a896]/30 rounded-full blur-2xl pointer-events-none" />

          <div className="relative z-10 flex flex-col items-center">
            {/* Ícone oficial do CondPack em cartão elevado */}
            <div className="w-16 h-16 rounded-2xl bg-white shadow-xl flex items-center justify-center p-2 mb-3.5 border-2 border-white/60">
              <CondPackLogo
                variant="icon-only"
                size="md"
                className="w-full h-full flex items-center justify-center"
                imageClassName="h-11 w-auto max-h-11"
              />
            </div>

            <div
              className="inline-flex items-baseline gap-1 select-none notranslate"
              translate="no"
            >
              <span className="font-black text-2xl tracking-tight text-white drop-shadow-xs">
                Cond<span className="text-[#38e8cb]">Pack</span>
              </span>
            </div>
            <p className="text-xs text-blue-100 font-medium tracking-wide uppercase mt-0.5">
              Aplicativo Oficial do Condomínio
            </p>
          </div>
        </div>

        {/* Conteúdo e Instruções */}
        <div className="p-5 sm:p-6 space-y-4 overflow-y-auto">
          <DialogHeader className="space-y-1.5 text-left">
            <DialogTitle className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <Smartphone className="w-5 h-5 text-[#00a896]" />
              Instalar o CondPack na sua tela inicial?
            </DialogTitle>
            <DialogDescription className="text-sm text-slate-600 leading-relaxed">
              Tenha a experiência completa de aplicativo: abertura instantânea, tela cheia sem barra
              do navegador e acesso rápido ao receber e retirar encomendas.
            </DialogDescription>
          </DialogHeader>

          {/* Vantagens do App */}
          <div className="grid grid-cols-3 gap-2 py-1">
            <div className="flex flex-col items-center text-center p-2 rounded-lg bg-slate-50 border border-slate-100">
              <Zap className="w-4 h-4 text-[#00a896] mb-1" />
              <span className="text-[11px] font-semibold text-slate-800">Mais Rápido</span>
              <span className="text-[10px] text-slate-500">Abre em 1 toque</span>
            </div>
            <div className="flex flex-col items-center text-center p-2 rounded-lg bg-slate-50 border border-slate-100">
              <WifiOff className="w-4 h-4 text-[#0d2a58] mb-1" />
              <span className="text-[11px] font-semibold text-slate-800">Modo Offline</span>
              <span className="text-[10px] text-slate-500">Shell protegido</span>
            </div>
            <div className="flex flex-col items-center text-center p-2 rounded-lg bg-slate-50 border border-slate-100">
              <Bell className="w-4 h-4 text-amber-600 mb-1" />
              <span className="text-[11px] font-semibold text-slate-800">Sem Barras</span>
              <span className="text-[10px] text-slate-500">Tela cheia nativa</span>
            </div>
          </div>

          {/* Guia específico por Sistema Operacional */}
          {isIOS ? (
            /* Guia ilustrado passo a passo para iPhone/Safari */
            <div className="rounded-xl border border-blue-100 bg-blue-50/60 p-3.5 space-y-2.5">
              <p className="text-xs font-semibold text-slate-900 flex items-center gap-1.5">
                <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-blue-600 text-white text-[10px]">
                  i
                </span>
                Como adicionar no seu iPhone (Safari):
              </p>

              <div className="space-y-2 text-xs text-slate-700">
                <div className="flex items-start gap-2.5 bg-white p-2.5 rounded-lg border border-blue-100/80 shadow-2xs">
                  <div className="w-6 h-6 rounded-full bg-blue-50 flex items-center justify-center shrink-0 mt-0.5 text-blue-600 font-bold text-xs">
                    1
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900">Toque no botão Compartilhar</p>
                    <p className="text-slate-500 text-[11px]">
                      É o ícone <Share className="w-3.5 h-3.5 inline text-blue-600 mx-0.5" /> na
                      barra inferior do Safari.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-2.5 bg-white p-2.5 rounded-lg border border-blue-100/80 shadow-2xs">
                  <div className="w-6 h-6 rounded-full bg-blue-50 flex items-center justify-center shrink-0 mt-0.5 text-blue-600 font-bold text-xs">
                    2
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900">
                      Escolha &ldquo;Adicionar à Tela de Início&rdquo;
                    </p>
                    <p className="text-slate-500 text-[11px]">
                      Role o menu para cima e toque em{' '}
                      <PlusSquare className="w-3.5 h-3.5 inline text-blue-600 mx-0.5" />{' '}
                      <strong>Adicionar à Tela de Início</strong>.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-2.5 bg-white p-2.5 rounded-lg border border-blue-100/80 shadow-2xs">
                  <div className="w-6 h-6 rounded-full bg-blue-50 flex items-center justify-center shrink-0 mt-0.5 text-blue-600 font-bold text-xs">
                    3
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900">
                      Toque em &ldquo;Adicionar&rdquo; no canto superior
                    </p>
                    <p className="text-slate-500 text-[11px]">
                      Pronto! O ícone do CondPack aparecerá com os seus outros aplicativos.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ) : canPromptNative ? (
            /* Botão direto do Android / Chrome */
            <div className="rounded-xl border border-emerald-100 bg-emerald-50/60 p-3.5 text-xs text-emerald-900 flex items-center gap-2.5">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <span>Pronto para instalar em 1 clique direto no seu celular Android.</span>
            </div>
          ) : (
            /* Fallback para navegadores genéricos que não dispararam beforeinstallprompt ainda */
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600 space-y-1.5">
              <p className="font-medium text-slate-800">
                Para instalar pelo menu do seu navegador:
              </p>
              <p className="text-[11px]">
                Toque nos três pontinhos <strong>⋮</strong> ou no ícone de opções do navegador e
                selecione <strong>&ldquo;Instalar aplicativo&rdquo;</strong> ou{' '}
                <strong>&ldquo;Adicionar à tela inicial&rdquo;</strong>.
              </p>
            </div>
          )}

          {/* Botões de Ação */}
          <div className="pt-2 flex flex-col sm:flex-row-reverse gap-2">
            {canPromptNative ? (
              <Button
                onClick={installApp}
                className="w-full sm:flex-1 bg-[#00a896] hover:bg-[#008f80] text-white font-semibold shadow-md min-h-[44px]"
              >
                <Download className="w-4 h-4 mr-2" />
                Instalar Aplicativo Agora
              </Button>
            ) : isIOS ? (
              <Button
                onClick={dismissPrompt}
                className="w-full sm:flex-1 bg-[#0d2a58] hover:bg-[#0a2044] text-white font-semibold min-h-[44px]"
              >
                Entendi, vou adicionar
              </Button>
            ) : (
              <Button
                onClick={dismissPrompt}
                className="w-full sm:flex-1 bg-[#0d2a58] hover:bg-[#0a2044] text-white font-semibold min-h-[44px]"
              >
                Continuar
              </Button>
            )}

            <Button
              variant="ghost"
              onClick={dismissPrompt}
              className="w-full sm:w-auto text-slate-500 hover:text-slate-800 min-h-[44px]"
            >
              Agora não
            </Button>
          </div>

          <p className="text-[10px] text-center text-slate-400">
            Você pode acessar esta opção a qualquer momento pelo menu lateral ou pelo seu perfil.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  )
}
