import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from '@/components/ui/toaster'
import { Toaster as Sonner } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import { AuthProvider, useAuth } from '@/hooks/use-auth'

import Layout from './components/Layout'
import Index from './pages/Index'
import NotFound from './pages/NotFound'
import Cadastro from './pages/Cadastro'

// Gestor Pages
import GestorDashboard from './pages/gestor/Dashboard'
import GestorUsuarios from './pages/gestor/Usuarios'
import GestorMoradores from './pages/gestor/Moradores'
import GestorUnidades from './pages/gestor/Unidades'
import GestorRelatorios from './pages/gestor/Relatorios'
import GestorConfiguracoes from './pages/gestor/Configuracoes'
import GestorPermissoes from './pages/gestor/Permissoes'
import GestorTransportadoras from './pages/gestor/Carriers'
import GestorLogistica from './pages/gestor/Logistica'

// Portaria / Sala Pages
import PortariaRegistro from './pages/portaria/Registro'
import SalaTriagem from './pages/sala/Triagem'
import SalaRetirada from './pages/sala/Retirada'

// Morador Pages
import MoradorDashboard from './pages/morador/Dashboard'
import MoradorHistorico from './pages/morador/Historico'
import MoradorDetalhes from './pages/morador/Detalhes'
import MoradorDados from './pages/morador/Dados'
import MoradorRetirada from './pages/morador/Retirada'

const ProtectedRoute = ({
  children,
  requiredRole,
}: {
  children: React.ReactNode
  requiredRole?: string
}) => {
  const { user, role, isAuthenticated, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!isAuthenticated || !user) return <Navigate to="/" replace />

  if (requiredRole && role !== requiredRole) {
    if (
      (requiredRole === 'portaria' || requiredRole === 'triagem') &&
      (role === 'portaria' || role === 'triagem')
    ) {
      // allow interchangeable access based on layout needs
    } else {
      if (role === 'gestor') return <Navigate to="/gestor/dashboard" replace />
      if (role === 'portaria') return <Navigate to="/portaria/registro" replace />
      if (role === 'triagem') return <Navigate to="/sala/triagem" replace />
      if (role === 'morador') return <Navigate to="/morador/dashboard" replace />
      return <Navigate to="/" replace />
    }
  }

  return <>{children}</>
}

const App = () => (
  <BrowserRouter future={{ v7_startTransition: false, v7_relativeSplatPath: false }}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/cadastro" element={<Cadastro />} />

          <Route element={<Layout />}>
            <Route
              path="/gestor/dashboard"
              element={
                <ProtectedRoute requiredRole="gestor">
                  <GestorDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/gestor/usuarios"
              element={
                <ProtectedRoute requiredRole="gestor">
                  <GestorUsuarios />
                </ProtectedRoute>
              }
            />
            <Route
              path="/gestor/unidades"
              element={
                <ProtectedRoute requiredRole="gestor">
                  <GestorUnidades />
                </ProtectedRoute>
              }
            />
            <Route
              path="/gestor/transportadoras"
              element={
                <ProtectedRoute requiredRole="gestor">
                  <GestorTransportadoras />
                </ProtectedRoute>
              }
            />
            <Route
              path="/gestor/moradores"
              element={
                <ProtectedRoute requiredRole="gestor">
                  <GestorMoradores />
                </ProtectedRoute>
              }
            />
            <Route
              path="/gestor/relatorios"
              element={
                <ProtectedRoute requiredRole="gestor">
                  <GestorRelatorios />
                </ProtectedRoute>
              }
            />
            <Route
              path="/gestor/configuracoes"
              element={
                <ProtectedRoute requiredRole="gestor">
                  <GestorConfiguracoes />
                </ProtectedRoute>
              }
            />
            <Route
              path="/gestor/permissoes"
              element={
                <ProtectedRoute requiredRole="gestor">
                  <GestorPermissoes />
                </ProtectedRoute>
              }
            />
            <Route
              path="/gestor/logistica"
              element={
                <ProtectedRoute requiredRole="gestor">
                  <GestorLogistica />
                </ProtectedRoute>
              }
            />
            <Route
              path="/portaria/registro"
              element={
                <ProtectedRoute requiredRole="portaria">
                  <PortariaRegistro />
                </ProtectedRoute>
              }
            />
            <Route
              path="/sala/triagem"
              element={
                <ProtectedRoute requiredRole="portaria">
                  <SalaTriagem />
                </ProtectedRoute>
              }
            />
            <Route
              path="/sala/retirada"
              element={
                <ProtectedRoute requiredRole="portaria">
                  <SalaRetirada />
                </ProtectedRoute>
              }
            />

            <Route
              path="/morador/dashboard"
              element={
                <ProtectedRoute requiredRole="morador">
                  <MoradorDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/morador/historico"
              element={
                <ProtectedRoute requiredRole="morador">
                  <MoradorHistorico />
                </ProtectedRoute>
              }
            />
            <Route
              path="/morador/encomenda/:id"
              element={
                <ProtectedRoute requiredRole="morador">
                  <MoradorDetalhes />
                </ProtectedRoute>
              }
            />
            <Route
              path="/morador/dados"
              element={
                <ProtectedRoute requiredRole="morador">
                  <MoradorDados />
                </ProtectedRoute>
              }
            />
            <Route
              path="/morador/retirada"
              element={
                <ProtectedRoute requiredRole="morador">
                  <MoradorRetirada />
                </ProtectedRoute>
              }
            />
          </Route>

          <Route path="*" element={<NotFound />} />
        </Routes>
      </TooltipProvider>
    </AuthProvider>
  </BrowserRouter>
)

export default App
