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
} from 'lucide-react'
import { useAuth } from '@/hooks/use-auth'
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
  const location = useLocation()

  const getLinks = () => {
    switch (role) {
      case 'gestor':
        return [
          { title: 'Dashboard', url: '/gestor/dashboard', icon: LayoutDashboard },
          { title: 'Usuários', url: '/gestor/usuarios', icon: Users },
          { title: 'Unidades', url: '/gestor/unidades', icon: Building },
          { title: 'Transportadoras', url: '/gestor/transportadoras', icon: Truck },
          { title: 'Logística', url: '/gestor/logistica', icon: MapPin },
          { title: 'Relatórios', url: '/gestor/relatorios', icon: FileText },
          { title: 'Permissões', url: '/gestor/permissoes', icon: Shield },
          { title: 'Configurações', url: '/gestor/configuracoes', icon: Settings },
        ]
      case 'portaria':
      case 'porteiro':
        return [
          { title: 'Registro', url: '/portaria/registro', icon: Package },
          { title: 'Entregadores', url: '/portaria/entregadores', icon: Truck },
        ]
      case 'triagem':
        return [
          { title: 'Triagem', url: '/sala/triagem', icon: Package },
          { title: 'Retirada', url: '/sala/retirada', icon: QrCode },
        ]
      case 'morador':
        return [
          { title: 'Minhas Encomendas', url: '/morador/dashboard', icon: Package },
          { title: 'Meus Dados', url: '/morador/dados', icon: UserCircle },
        ]
      default:
        return []
    }
  }

  const links = getLinks()

  return (
    <Sidebar>
      <SidebarHeader className="border-b border-border/50 p-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-white">
            <Package className="w-5 h-5" />
          </div>
          <div>
            <h1 className="font-bold text-lg leading-tight">CondoPack</h1>
            <p className="text-xs text-muted-foreground capitalize">{role}</p>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Menu Principal</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {links.map((link) => (
                <SidebarMenuItem key={link.title}>
                  <SidebarMenuButton asChild isActive={location.pathname === link.url}>
                    <Link to={link.url}>
                      <link.icon className="w-4 h-4" />
                      <span>{link.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-border/50 p-4">
        <SidebarMenu>
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
