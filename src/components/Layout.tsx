import { useState, useEffect, useCallback } from 'react'
import { Outlet, useNavigate } from 'react-router-dom'
import { Eye, LogOut } from 'lucide-react'
import { useAuth } from '@/hooks/use-auth'
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar'
import { Button } from '@/components/ui/button'
import { AppSidebar } from './AppSidebar'
import { Header } from './Header'
import { MobileNav } from './MobileNav'
import {
  getSupportCondoSession,
  endSupportSession,
  isSupportModeActive,
  SupportCondoSession,
} from '@/services/supportSession'

export default function Layout() {
  const { role } = useAuth()
  const navigate = useNavigate()
  const [supportSession, setSupportSession] = useState<SupportCondoSession | null>(() =>
    role === 'master' ? getSupportCondoSession() : null,
  )

  const syncSupportSession = useCallback(() => {
    if (role === 'master' && isSupportModeActive()) {
      setSupportSession(getSupportCondoSession())
    } else {
      setSupportSession(null)
    }
  }, [role])

  useEffect(() => {
    syncSupportSession()

    const handleSessionChanged = () => {
      syncSupportSession()
    }

    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'condpack_support_condo' || e.key === null) {
        syncSupportSession()
      }
    }

    window.addEventListener('condpack:support-session-changed', handleSessionChanged)
    window.addEventListener('storage', handleStorage)

    return () => {
      window.removeEventListener('condpack:support-session-changed', handleSessionChanged)
      window.removeEventListener('storage', handleStorage)
    }
  }, [syncSupportSession])

  const handleExitSupport = () => {
    endSupportSession()
    setSupportSession(null)
    navigate('/master')
  }

  if (!role) {
    return (
      <main className="flex flex-col min-h-screen bg-neutralBg animate-fade-in">
        <Outlet />
      </main>
    )
  }

  const showSupportBanner = role === 'master' && !!supportSession

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="flex flex-col min-h-screen bg-neutralBg overflow-hidden">
        {/* Faixa Laranja de Suporte no topo do conteúdo, visível apenas em modo suporte do Master */}
        {showSupportBanner && (
          <div className="w-full bg-gradient-to-r from-amber-500 via-amber-600 to-orange-500 text-amber-950 px-4 py-2 sm:py-2.5 shadow-md flex items-center justify-between gap-3 sticky top-0 z-50 border-b border-amber-600/40">
            <div className="flex items-center gap-2 min-w-0 text-white font-medium text-xs sm:text-sm">
              <span className="p-1 bg-white/20 rounded-md backdrop-blur-xs shrink-0 inline-flex items-center justify-center">
                <Eye className="w-4 h-4 text-white" />
              </span>
              <p className="truncate">
                <span className="opacity-90 font-normal">Você está acessando como suporte: </span>
                <strong className="font-bold underline decoration-white/40 underline-offset-2">
                  {supportSession.name}
                </strong>
              </p>
            </div>
            <Button
              type="button"
              size="sm"
              onClick={handleExitSupport}
              className="shrink-0 h-7 sm:h-8 px-2.5 sm:px-3.5 bg-slate-900 text-white hover:bg-slate-800 hover:text-white font-semibold text-xs rounded-md shadow-xs transition-colors gap-1.5 border border-slate-700/60"
              title="Encerrar sessão de suporte e retornar ao Painel Master"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sair do acesso</span>
            </Button>
          </div>
        )}
        <Header />
        <main className="flex-1 p-4 md:p-6 pb-20 md:pb-6 overflow-y-auto animate-fade-in">
          <Outlet />
        </main>
        <MobileNav />
      </SidebarInset>
    </SidebarProvider>
  )
}
