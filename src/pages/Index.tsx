import { useNavigate } from 'react-router-dom'
import { useAuth, UserRole } from '@/hooks/use-auth'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Package } from 'lucide-react'

export default function Index() {
  const { login } = useAuth()
  const navigate = useNavigate()

  const handleLogin = (role: UserRole) => {
    login(role)
    if (role === 'gestor') navigate('/gestor/dashboard')
    if (role === 'portaria') navigate('/portaria/registro')
    if (role === 'morador') navigate('/morador/dashboard')
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{
        backgroundImage:
          'url(https://img.usecurling.com/p/1200/800?q=modern%20residential%20building)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm"></div>
      <Card className="w-full max-w-md relative z-10 animate-slide-up shadow-elevation border-0">
        <CardHeader className="space-y-1 text-center">
          <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center mx-auto mb-4 text-white shadow-lg">
            <Package className="h-8 w-8" />
          </div>
          <CardTitle className="text-2xl font-bold">CondoPack</CardTitle>
          <CardDescription>Sistema de Encomendas Digital</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">E-mail ou CPF</Label>
            <Input
              id="email"
              placeholder="Digite seu e-mail"
              defaultValue="usuario@condominio.com"
            />
          </div>
          <div className="space-y-2 relative">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Senha</Label>
              <a href="#" className="text-xs text-primary hover:underline font-medium">
                Esqueci minha senha
              </a>
            </div>
            <Input id="password" type="password" defaultValue="123456" />
          </div>

          <div className="pt-4 space-y-2">
            <p className="text-xs text-center text-muted-foreground mb-2">Simular login como:</p>
            <div className="grid grid-cols-3 gap-2">
              <Button
                onClick={() => handleLogin('gestor')}
                variant="outline"
                className="w-full text-xs"
              >
                Gestor
              </Button>
              <Button
                onClick={() => handleLogin('portaria')}
                variant="outline"
                className="w-full text-xs"
              >
                Portaria
              </Button>
              <Button
                onClick={() => handleLogin('morador')}
                variant="default"
                className="w-full text-xs"
              >
                Morador
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
