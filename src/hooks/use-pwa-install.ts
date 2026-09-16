import { useState, useEffect, useCallback } from 'react'

const DISMISSED_STORAGE_KEY = 'condpack_pwa_prompt_dismissed_at'
// Cortesia aprovada: 21 dias (3 semanas) sem insistência chata
const DISMISS_COOLDOWN_MS = 21 * 24 * 60 * 60 * 1000

export interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[]
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed'
    platform: string
  }>
  prompt(): Promise<void>
}

// Declaração global para evitar erros de tipo em window
declare global {
  interface WindowEventMap {
    beforeinstallprompt: BeforeInstallPromptEvent
    appinstalled: Event
  }
}

export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [isStandalone, setIsStandalone] = useState<boolean>(false)
  const [isMobileDevice, setIsMobileDevice] = useState<boolean>(false)
  const [isIOS, setIsIOS] = useState<boolean>(false)
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false)

  // Checa se já está em modo standalone (PWA instalado e aberto)
  const checkIsStandalone = useCallback(() => {
    if (typeof window === 'undefined') return false
    const isStandaloneDisplay = window.matchMedia('(display-mode: standalone)').matches
    const isIOSStandalone =
      (window.navigator as unknown as { standalone?: boolean }).standalone === true
    const isAndroidApp = document.referrer.includes('android-app://')
    return Boolean(isStandaloneDisplay || isIOSStandalone || isAndroidApp)
  }, [])

  // Checa se o usuário é mobile (iOS ou Android)
  const checkMobile = useCallback(() => {
    if (typeof navigator === 'undefined') return { isMobile: false, isApple: false }
    const ua = navigator.userAgent || ''
    const isApple =
      /iphone|ipad|ipod/i.test(ua) ||
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1) // iPad moderno
    const isAndroid = /android/i.test(ua)
    const isMobile = isApple || isAndroid || /mobile|blackberry|iemobile|opera mini/i.test(ua)
    return { isMobile, isApple }
  }, [])

  useEffect(() => {
    const standalone = checkIsStandalone()
    setIsStandalone(standalone)

    const { isMobile, isApple } = checkMobile()
    setIsMobileDevice(isMobile)
    setIsIOS(isApple)

    // Se já estiver standalone, não precisa de listeners
    if (standalone) return

    // Listener para o evento nativo do Chrome/Android
    const handleBeforeInstallPrompt = (e: BeforeInstallPromptEvent) => {
      // Impede o mini-infobar padrão do Chrome para usarmos nosso modal amigável
      e.preventDefault()
      setDeferredPrompt(e)
    }

    const handleAppInstalled = () => {
      setDeferredPrompt(null)
      setIsStandalone(true)
      setIsModalOpen(false)
      try {
        localStorage.setItem(DISMISSED_STORAGE_KEY, Date.now().toString())
      } catch (err) {
        // Ignora erro de storage privado
      }
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.addEventListener('appinstalled', handleAppInstalled)

    // Listener para mudança de display mode dinâmico
    const mediaQuery = window.matchMedia('(display-mode: standalone)')
    const handleMediaChange = (evt: MediaQueryListEvent) => {
      if (evt.matches) {
        setIsStandalone(true)
        setIsModalOpen(false)
      }
    }
    mediaQuery.addEventListener('change', handleMediaChange)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('appinstalled', handleAppInstalled)
      mediaQuery.removeEventListener('change', handleMediaChange)
    }
  }, [checkIsStandalone, checkMobile])

  // Checa se o convite automático pode ser exibido com base no histórico de recusa
  const shouldAutoPrompt = useCallback(() => {
    if (checkIsStandalone()) return false

    try {
      const dismissedAt = localStorage.getItem(DISMISSED_STORAGE_KEY)
      if (dismissedAt) {
        const timePassed = Date.now() - parseInt(dismissedAt, 10)
        if (timePassed < DISMISS_COOLDOWN_MS) {
          return false
        }
      }
    } catch {
      // continua caso localStorage esteja bloqueado
    }

    const { isMobile } = checkMobile()
    return isMobile
  }, [checkIsStandalone, checkMobile])

  // Dispara o convite automático após o login (com leve delay para carregar a tela)
  const triggerAutoPrompt = useCallback(() => {
    if (shouldAutoPrompt()) {
      const timer = setTimeout(() => {
        setIsModalOpen(true)
      }, 1400)
      return () => clearTimeout(timer)
    }
  }, [shouldAutoPrompt])

  // Ação de fechar o aviso com cortesia de 3 semanas
  const dismissPrompt = useCallback(() => {
    setIsModalOpen(false)
    try {
      localStorage.setItem(DISMISSED_STORAGE_KEY, Date.now().toString())
    } catch {
      // silencia
    }
  }, [])

  // Abertura manual pelo botão do menu
  const openManualPrompt = useCallback(() => {
    setIsModalOpen(true)
  }, [])

  // Ação de instalar no Android/Chrome usando o prompt nativo
  const installApp = useCallback(async () => {
    if (deferredPrompt) {
      try {
        await deferredPrompt.prompt()
        const choice = await deferredPrompt.userChoice
        if (choice.outcome === 'accepted') {
          setIsModalOpen(false)
          setDeferredPrompt(null)
          try {
            localStorage.setItem(DISMISSED_STORAGE_KEY, Date.now().toString())
          } catch {
            // silencia
          }
        }
      } catch (err) {
        console.error('Erro ao acionar prompt de instalação:', err)
      }
    }
  }, [deferredPrompt])

  return {
    isStandalone,
    isMobileDevice,
    isIOS,
    canPromptNative: Boolean(deferredPrompt),
    isModalOpen,
    setIsModalOpen,
    triggerAutoPrompt,
    dismissPrompt,
    openManualPrompt,
    installApp,
  }
}
