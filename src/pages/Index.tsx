import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/use-auth'
import { Button } from '@/components/ui/button'
import { getErrorMessage } from '@/lib/pocketbase/errors'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Package, Loader2 } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

export default function Index() {
  const { signIn, isAuthenticated, role, loading } = useAuth()
  const navigate = useNavigate()
  const { toast } = useToast()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isRecovering, setIsRecovering] = useState(false)

  useEffect(() => {
    if (!loading && isAuthenticated && role) {
      if (role === 'master') navigate('/master')
      else if (role === 'gestor') navigate('/gestor/dashboard')
      else if (role === 'portaria') navigate('/portaria/registro')
      else if (role === 'triagem') navigate('/sala/triagem')
      else if (role === 'morador') navigate('/morador/dashboard')
      else navigate('/')
    }
  }, [isAuthenticated, role, loading, navigate])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !password) return

    setIsSubmitting(true)
    const { error, record } = await signIn(email, password)
    if (error) {
      console.log('ERRO:', error)
      const msg = getErrorMessage(error)
      toast({
        title: 'Acesso Negado',
        description: msg === 'Failed to authenticate.' ? 'E-mail ou senha incorretos.' : msg,
        variant: 'destructive',
      })
      setIsSubmitting(false)
    } else {
      if (record?.role === 'morador') {
        console.log('Morador logado:', record.email)
      }
    }
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4 bg-muted/30"
      style={{
        backgroundImage:
          'url(https://img.usecurling.com/p/1200/800?q=modern%20residential%20building)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px]"></div>
      <Card className="w-full max-w-md relative z-10 animate-fade-in-up shadow-2xl border-0">
        <CardHeader className="space-y-1 text-center pb-6">
          <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center mx-auto mb-4 text-white shadow-lg">
            <Package className="h-8 w-8" />
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight">CondoPack</CardTitle>
          <CardDescription className="text-base">Sistema de Encomendas Digital</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                placeholder="Digite seu e-mail"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isSubmitting}
                className="h-11"
              />
            </div>
            <div className="space-y-2 relative">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Senha</Label>
                <button
                  type="button"
                  onClick={async (e) => {
                    e.preventDefault()
                    if (!email) {
                      toast({
                        title: 'Atenção',
                        description: 'Preencha o campo e-mail para recuperar sua senha.',
                        variant: 'destructive',
                      })
                      return
                    }
                    setIsRecovering(true)
                    try {
                      await fetch(
                        `${import.meta.env.VITE_POCKETBASE_URL}/backend/v1/password-recovery`,
                        {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ email }),
                        },
                      )
                      toast({
                        title: 'E-mail enviado',
                        description:
                          'Se o e-mail estiver cadastrado, você receberá uma senha provisória em instantes.',
                        className: 'bg-success text-white',
                      })
                    } catch (err) {
                      toast({
                        title: 'Erro',
                        description: 'Não foi possível solicitar a recuperação de senha.',
                        variant: 'destructive',
                      })
                    } finally {
                      setIsRecovering(false)
                    }
                  }}
                  className="text-xs text-primary hover:underline font-medium disabled:opacity-50"
                  tabIndex={-1}
                  disabled={isRecovering || isSubmitting}
                >
                  {isRecovering ? 'Enviando...' : 'Esqueci minha senha'}
                </button>
              </div>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isSubmitting}
                className="h-11"
              />
            </div>

            <div className="pt-2">
              <Button
                type="submit"
                className="w-full h-11 text-base font-medium"
                disabled={isSubmitting}
              >
                {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Entrar
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
