import { Link, useLocation } from 'react-router-dom'
import {
  LayoutDashboard,
  Users,
  Building,
  Truck,
  FileText,
  Settings,
  Shield,
  Package,
  History,
  UserCircle,
  QrCode,
  LogOut,
  MapPin,
  Award,
  BookOpen,
  Smartphone,
} from 'lucide-react'
import { useAuth } from '@/hooks/use-auth'
import { usePWA } from '@/components/pwa/PWAContext'
import { CondPackLogo } from '@/components/CondPackLogo'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
} from '@/components/ui/sidebar'

export function AppSidebar() {
  const { role, signOut } = useAuth()
  const { isStandalone, openManualPrompt } = usePWA()
  const location = useLocation()

  type NavLinkItem = {
    title: string
    url: string
    icon: any
    highlight?: boolean
  }

  const getLinks = (): NavLinkItem[] => {
    switch (role) {
      case 'master':
        return [
          { title: 'Dashboard', url: '/gestor/dashboard', icon: LayoutDashboard },
          { title: 'Usuários', url: '/gestor/usuarios', icon: Users },
          { title: 'Unidades', url: '/gestor/unidades', icon: Building },
          { title: 'Transportadoras', url: '/gestor/transportadoras', icon: Truck },
          { title: 'Logística', url: '/gestor/logistica', icon: MapPin },
          { title: 'Relatórios', url: '/gestor/relatorios', icon: FileText },
          { title: 'Licenças e Planos', url: '/gestor/licencas', icon: Award },
          { title: 'Painel Master', url: '/master', icon: Shield, highlight: true },
          { title: 'Guia de Uso', url: '/guia', icon: BookOpen },
          { title: 'Configurações', url: '/gestor/configuracoes', icon: Settings },
        ]
      case 'gestor':
        return [
          { title: 'Dashboard', url: '/gestor/dashboard', icon: LayoutDashboard },
          { title: 'Usuários', url: '/gestor/usuarios', icon: Users },
          { title: 'Unidades', url: '/gestor/unidades', icon: Building },
          { title: 'Transportadoras', url: '/gestor/transportadoras', icon: Truck },
          { title: 'Logística', url: '/gestor/logistica', icon: MapPin },
          { title: 'Relatórios', url: '/gestor/relatorios', icon: FileText },
          { title: 'Permissões', url: '/gestor/permissoes', icon: Shield },
          { title: 'Licenças e Planos', url: '/gestor/licencas', icon: Award },
          { title: 'Guia de Uso', url: '/guia', icon: BookOpen },
          { title: 'Configurações', url: '/gestor/configuracoes', icon: Settings },
        ]
      case 'porteiro':
        return [
          { title: 'Registro', url: '/portaria/registro', icon: Package },
          { title: 'Entregadores', url: '/portaria/entregadores', icon: Truck },
          { title: 'Transportadoras', url: '/gestor/transportadoras', icon: Truck },
          { title: 'Guia de Uso', url: '/guia', icon: BookOpen },
        ]
      case 'portaria':
        return [
          { title: 'Registro', url: '/portaria/registro', icon: Package },
          { title: 'Entregadores', url: '/portaria/entregadores', icon: Truck },
          { title: 'Transportadoras', url: '/gestor/transportadoras', icon: Truck },
          { title: 'Triagem', url: '/sala/triagem', icon: Package },
          { title: 'Retirada', url: '/sala/retirada', icon: QrCode },
          { title: 'Guia de Uso', url: '/guia', icon: BookOpen },
        ]
      case 'triagem':
        return [
          { title: 'Triagem', url: '/sala/triagem', icon: Package },
          { title: 'Retirada', url: '/sala/retirada', icon: QrCode },
          { title: 'Guia de Uso', url: '/guia', icon: BookOpen },
        ]
      case 'morador':
        return [
          { title: 'Minhas Encomendas', url: '/morador/dashboard', icon: Package },
          { title: 'Meus Dados', url: '/morador/dados', icon: UserCircle },
          { title: 'Guia de Uso', url: '/guia', icon: BookOpen },
        ]
      default:
        return []
    }
  }

  const links = getLinks()

  return (
    <Sidebar>
      <SidebarHeader className="border-b border-border/50 p-3 sm:p-4">
        <div className="flex items-center gap-3">
          <CondPackLogo
            variant="icon-only"
            size="md"
            className="shrink-0 w-11 h-11 bg-white rounded-lg border border-slate-200/80 p-1 shadow-2xs"
            imageClassName="h-9 w-auto max-h-9"
          />
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline gap-1">
              <span
                className="font-black text-base leading-tight tracking-tight notranslate select-none"
                translate="no"
              >
                <span className="text-[#0d2a58]">Cond</span>
                <span className="text-[#00a896]">Pack</span>
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground capitalize leading-tight truncate">
              {role === 'master' ? 'Master Admin' : role}
            </p>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Menu Principal</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {links.map((link) => {
                const isActive = location.pathname === link.url
                const isMasterTab = link.highlight

                return (
                  <SidebarMenuItem key={link.title}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      className={
                        isMasterTab
                          ? isActive
                            ? 'bg-gradient-to-r from-indigo-50 to-purple-50 text-indigo-700 font-semibold border border-indigo-300/80 shadow-xs ring-1 ring-indigo-400/30'
                            : 'text-indigo-700 hover:text-indigo-900 hover:bg-indigo-50/70 font-semibold border border-indigo-200/60 bg-indigo-50/30'
                          : undefined
                      }
                    >
                      <Link to={link.url} className="flex items-center gap-2">
                        <link.icon
                          className={
                            isMasterTab ? 'w-4 h-4 text-indigo-600 shrink-0' : 'w-4 h-4 shrink-0'
                          }
                        />
                        <span className="flex-1 truncate">{link.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-border/50 p-4 space-y-1">
        <SidebarMenu>
          {!isStandalone && (
            <SidebarMenuItem>
              <SidebarMenuButton
                onClick={openManualPrompt}
                className="text-[#00a896] hover:text-[#008f80] hover:bg-[#00a896]/10 font-medium"
              >
                <Smartphone className="w-4 h-4" />
                <span>Instalar aplicativo</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          )}
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={signOut}
              className="text-destructive hover:text-destructive"
            >
              <LogOut className="w-4 h-4" />
              <span>Sair da conta</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}
