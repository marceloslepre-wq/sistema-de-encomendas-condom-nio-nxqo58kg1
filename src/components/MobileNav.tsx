import { Link, useLocation } from 'react-router-dom'
import { Package, History, User, QrCode, Truck } from 'lucide-react'
import { useAuth } from '@/hooks/use-auth'
import { cn } from '@/lib/utils'

export function MobileNav() {
  const { role } = useAuth()
  const location = useLocation()

  if (!role || role === 'gestor') return null

  const links =
    role === 'portaria' || role === 'porteiro'
      ? [
          { title: 'Registro', url: '/portaria/registro', icon: Package },
          { title: 'Entregadores', url: '/portaria/entregadores', icon: Truck },
        ]
      : [
          { title: 'Ativas', url: '/morador/dashboard', icon: Package },
          { title: 'Perfil', url: '/morador/dados', icon: User },
        ]

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-white border-t flex justify-around items-center z-50 px-2 pb-safe">
      {links.map((link) => {
        const isActive = location.pathname === link.url
        return (
          <Link
            key={link.title}
            to={link.url}
            className={cn(
              'flex flex-col items-center justify-center w-full h-full min-h-[44px] min-w-[44px] space-y-1 transition-colors',
              isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground',
            )}
          >
            <link.icon className={cn('h-5 w-5', isActive && 'fill-primary/20')} />
            <span className="text-[10px] font-medium">{link.title}</span>
          </Link>
        )
      })}
    </div>
  )
}
