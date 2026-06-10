import { Link, useLocation } from 'react-router-dom'
import {
  Package,
  Users,
  BarChart3,
  Settings,
  QrCode,
  ClipboardList,
  History,
  User,
  FileText,
  Shield,
  Home,
  Truck,
  Box,
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
          { title: 'Usuários', url: '/gestor/usuarios', icon: Users },
          { title: 'Unidades', url: '/gestor/unidades', icon: Home },
          { title: 'Transportadoras', url: '/gestor/transportadoras', icon: Truck },
          { title: 'Relatórios', url: '/gestor/relatorios', icon: FileText },
          { title: 'Logística', url: '/gestor/logistica', icon: Box },
          { title: 'Permissões', url: '/gestor/permissoes', icon: Shield },
          { title: 'Configurações', url: '/gestor/configuracoes', icon: Settings },
        ]
      case 'portaria':
      case 'triagem':
        return [
          { title: 'Recepção de Encomendas', url: '/portaria/registro', icon: Package },
          { title: 'Triagem & Etiqueta', url: '/sala/triagem', icon: ClipboardList },
          { title: 'Validar Retirada', url: '/sala/retirada', icon: QrCode },
          { title: 'Cadastro de Entregador', url: '/portaria/entregadores', icon: Users },
        ]
      case 'morador':
        return [
          { title: 'Minhas Encomendas', url: '/morador/dashboard', icon: Package },
          { title: 'Meus Dados', url: '/morador/dados', icon: User },
        ]
      default:
        return []
    }
  }

  const links = getLinks()
  console.log("Aba 'Gerar Links' deletada")

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
