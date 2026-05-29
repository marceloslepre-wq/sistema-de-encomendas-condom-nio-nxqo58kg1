import { Link, useLocation } from 'react-router-dom'
import {
  Package,
  Users,
  Link as LinkIcon,
  BarChart3,
  Settings,
  QrCode,
  ClipboardList,
  History,
  User,
  FileText,
  Shield,
} from 'lucide-react'
import { useAuth } from '@/hooks/use-auth'
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar'

export function AppSidebar() {
  const { role } = useAuth()
  const location = useLocation()

  const getLinks = () => {
    switch (role) {
      case 'gestor':
        return [
          { title: 'Dashboard', url: '/gestor/dashboard', icon: BarChart3 },
          { title: 'Moradores', url: '/gestor/moradores', icon: Users },
          { title: 'Gerar Links', url: '/gestor/links', icon: LinkIcon },
          { title: 'Relatórios', url: '/gestor/relatorios', icon: FileText },
          { title: 'Permissões', url: '/gestor/permissoes', icon: Shield },
          { title: 'Configurações', url: '/gestor/configuracoes', icon: Settings },
        ]
      case 'portaria':
        return [
          { title: 'Registrar Encomenda', url: '/portaria/registro', icon: Package },
          { title: 'Ativas', url: '#', icon: ClipboardList },
          { title: 'Imprimir Etiqueta', url: '/portaria/etiqueta', icon: QrCode },
        ]
      case 'morador':
        return [
          { title: 'Minhas Encomendas', url: '/morador/dashboard', icon: Package },
          { title: 'Histórico', url: '/morador/historico', icon: History },
          { title: 'Meus Dados', url: '#', icon: User },
        ]
      default:
        return []
    }
  }

  const links = getLinks()

  return (
    <Sidebar>
      <SidebarContent>
        <SidebarGroup>
          <div className="p-4 mb-4 flex items-center gap-2 text-primary font-bold text-lg">
            <Package className="h-6 w-6" />
            <span>CondoPack</span>
          </div>
          <SidebarGroupContent>
            <SidebarMenu>
              {links.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={location.pathname === item.url}>
                    <Link to={item.url}>
                      <item.icon />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  )
}
