import { useState, useEffect } from 'react'
import { Bell, LogOut, User, Building2 } from 'lucide-react'
import { useAuth } from '@/hooks/use-auth'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { useNavigate } from 'react-router-dom'
import { SidebarTrigger } from '@/components/ui/sidebar'
import { getCondo, CondoRecord } from '@/services/condos'
import pb from '@/lib/pocketbase/client'

export function Header() {
  const { user, role, logout } = useAuth()
  const navigate = useNavigate()
  const [condo, setCondo] = useState<CondoRecord | null>(null)

  useEffect(() => {
    let isMounted = true

    const loadCondoData = async () => {
      try {
        const c = await getCondo()
        if (isMounted && c) {
          setCondo(c)
        }
      } catch (err) {
        console.error('Erro ao carregar dados do condomínio no Header:', err)
      }
    }

    loadCondoData()

    const handleCondoUpdated = (e: any) => {
      if (e.detail) {
        setCondo(e.detail)
      } else {
        loadCondoData()
      }
    }

    window.addEventListener('condo-updated', handleCondoUpdated)

    return () => {
      isMounted = false
      window.removeEventListener('condo-updated', handleCondoUpdated)
    }
  }, [user?.condo_id])

  const handleLogout = () => {
    logout()
    navigate('/', { replace: true })
  }

  if (!role) return null

  const condoName = condo?.name || 'Condomínio Residencial Parque'
  const logoUrl = condo?.logo ? pb.files.getURL(condo, condo.logo) : null

  return (
    <header className="h-16 border-b bg-white flex items-center justify-between px-4 md:px-6 sticky top-0 z-40">
      <div className="flex items-center gap-3">
        <SidebarTrigger className="md:hidden" />

        <div className="flex items-center gap-3">
          {logoUrl ? (
            <img
              src={logoUrl}
              alt={condoName}
              className="h-9 w-9 max-h-9 max-w-9 object-contain rounded-md border border-slate-200 bg-white p-0.5 shadow-2xs"
            />
          ) : (
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100 hidden sm:flex">
              <Building2 className="w-4 h-4" />
            </div>
          )}
          <h1 className="font-semibold text-base sm:text-lg text-slate-800 line-clamp-1">
            {condoName}
          </h1>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          className="relative text-muted-foreground hover:text-primary min-h-[44px] min-w-[44px]"
        >
          <Bell className="h-5 w-5" />
          <span className="absolute top-2 right-2 w-2 h-2 bg-warning rounded-full"></span>
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="relative h-11 w-11 rounded-full min-h-[44px] min-w-[44px]"
            >
              <Avatar className="h-11 w-11">
                <AvatarFallback className="bg-primary text-primary-foreground">
                  {user?.name?.charAt(0).toUpperCase() || role.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <div className="flex items-center justify-start gap-2 p-2">
              <div className="flex flex-col space-y-1 leading-none">
                {user?.name && <p className="font-medium">{user.name}</p>}
                <p className="text-sm text-muted-foreground capitalize">{role}</p>
              </div>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="flex items-center gap-2 cursor-pointer">
              <User className="h-4 w-4" />
              <span>Meu Perfil</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={handleLogout}
              className="flex items-center gap-2 text-destructive focus:text-destructive cursor-pointer"
            >
              <LogOut className="h-4 w-4" />
              <span>Sair</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
