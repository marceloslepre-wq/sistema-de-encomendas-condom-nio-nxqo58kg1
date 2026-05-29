import { Outlet } from 'react-router-dom'
import { useAuth } from '@/hooks/use-auth'
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar'
import { AppSidebar } from './AppSidebar'
import { Header } from './Header'
import { MobileNav } from './MobileNav'

export default function Layout() {
  const { role } = useAuth()

  if (!role) {
    return (
      <main className="flex flex-col min-h-screen bg-neutralBg animate-fade-in">
        <Outlet />
      </main>
    )
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="flex flex-col min-h-screen bg-neutralBg overflow-hidden">
        <Header />
        <main className="flex-1 p-4 md:p-6 pb-20 md:pb-6 overflow-y-auto animate-fade-in">
          <Outlet />
        </main>
        <MobileNav />
      </SidebarInset>
    </SidebarProvider>
  )
}
