import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Toaster } from '@/components/ui/toaster'
import { Toaster as Sonner } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import { AuthProvider } from '@/hooks/use-auth'

import Layout from './components/Layout'
import Index from './pages/Index'
import NotFound from './pages/NotFound'
import Cadastro from './pages/Cadastro'

// Gestor Pages
import GestorDashboard from './pages/gestor/Dashboard'
import GestorMoradores from './pages/gestor/Moradores'
import GestorLinks from './pages/gestor/Links'
import GestorRelatorios from './pages/gestor/Relatorios'
import GestorConfiguracoes from './pages/gestor/Configuracoes'
import GestorPermissoes from './pages/gestor/Permissoes'

// Portaria Pages
import PortariaRegistro from './pages/portaria/Registro'
import PortariaEtiqueta from './pages/portaria/Etiqueta'

// Morador Pages
import MoradorDashboard from './pages/morador/Dashboard'
import MoradorHistorico from './pages/morador/Historico'
import MoradorDetalhes from './pages/morador/Detalhes'

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
            <Route path="/gestor/dashboard" element={<GestorDashboard />} />
            <Route path="/gestor/moradores" element={<GestorMoradores />} />
            <Route path="/gestor/links" element={<GestorLinks />} />
            <Route path="/gestor/relatorios" element={<GestorRelatorios />} />
            <Route path="/gestor/configuracoes" element={<GestorConfiguracoes />} />
            <Route path="/gestor/permissoes" element={<GestorPermissoes />} />

            <Route path="/portaria/registro" element={<PortariaRegistro />} />
            <Route path="/portaria/etiqueta" element={<PortariaEtiqueta />} />

            <Route path="/morador/dashboard" element={<MoradorDashboard />} />
            <Route path="/morador/historico" element={<MoradorHistorico />} />
            <Route path="/morador/encomenda/:id" element={<MoradorDetalhes />} />
          </Route>

          <Route path="*" element={<NotFound />} />
        </Routes>
      </TooltipProvider>
    </AuthProvider>
  </BrowserRouter>
)

export default App
