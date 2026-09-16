import React, { createContext, useContext, useEffect } from 'react'
import { usePWAInstall } from '@/hooks/use-pwa-install'
import { useAuth } from '@/hooks/use-auth'

interface PWAContextType {
  isStandalone: boolean
  isMobileDevice: boolean
  isIOS: boolean
  canPromptNative: boolean
  isModalOpen: boolean
  setIsModalOpen: (open: boolean) => void
  openManualPrompt: () => void
  dismissPrompt: () => void
  installApp: () => Promise<void>
}

const PWAContext = createContext<PWAContextType | null>(null)

export function PWAProvider({ children }: { children: React.ReactNode }) {
  const pwa = usePWAInstall()
  const { isAuthenticated, user } = useAuth()

  // Conforme requisito do Marcelo: "quando um novo usuario acessar seja pelo link do navegador
  // da web quando for fazer seu primeiro acesso o programa ja pergunta automaticamente"
  // Exibido uma vez logado, independente do perfil (área autenticada)
  useEffect(() => {
    if (isAuthenticated && user && !pwa.isStandalone) {
      const cleanup = pwa.triggerAutoPrompt()
      return cleanup
    }
  }, [isAuthenticated, user?.id, pwa.isStandalone])

  return (
    <PWAContext.Provider
      value={{
        isStandalone: pwa.isStandalone,
        isMobileDevice: pwa.isMobileDevice,
        isIOS: pwa.isIOS,
        canPromptNative: pwa.canPromptNative,
        isModalOpen: pwa.isModalOpen,
        setIsModalOpen: pwa.setIsModalOpen,
        openManualPrompt: pwa.openManualPrompt,
        dismissPrompt: pwa.dismissPrompt,
        installApp: pwa.installApp,
      }}
    >
      {children}
    </PWAContext.Provider>
  )
}

export function usePWA() {
  const context = useContext(PWAContext)
  if (!context) {
    throw new Error('usePWA deve ser usado dentro de um PWAProvider')
  }
  return context
}
