import { useState, useEffect } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Package, AlertCircle } from 'lucide-react'
import { Progress } from '@/components/ui/progress'
import { getInvitationLinkByToken, updateInvitationLink } from '@/services/api'
import pb from '@/lib/pocketbase/client'
import { useToast } from '@/hooks/use-toast'

export default function Cadastro() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')
  const navigate = useNavigate()
  const { toast } = useToast()

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [linkData, setLinkData] = useState<any>(null)

  const [formData, setFormData] = useState({
    name: '',
    cpf: '',
    phone: '',
    email: '',
    password: '',
    confirm: '',
  })
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!token) {
      setError('Token de convite não encontrado na URL.')
      setLoading(false)
      return
    }

    getInvitationLinkByToken(token)
      .then((res) => {
        if (res.used) setError('Este convite já foi utilizado.')
        else if (new Date(res.expires_at) < new Date()) setError('Este convite expirou.')
        else setLinkData(res)
      })
      .catch(() => setError('Convite inválido ou não encontrado.'))
      .finally(() => setLoading(false))
  }, [token])

  const getPwdStrength = (pwd: string) => {
    if (pwd.length === 0) return 0
    if (pwd.length < 6) return 33
    if (pwd.match(/[a-z]/) && pwd.match(/[A-Z]/) && pwd.match(/[0-9]/)) return 100
    return 66
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (formData.password !== formData.confirm) {
      return toast({
        title: 'Erro',
        description: 'As senhas não conferem.',
        variant: 'destructive',
      })
    }
    setSubmitting(true)
    try {
      await pb.collection('users').create({
        name: formData.name,
        cpf: formData.cpf,
        phone: formData.phone,
        email: formData.email,
        password: formData.password,
        passwordConfirm: formData.confirm,
        role: 'morador',
        status: 'Ativo',
        unit_id: linkData.unit_id,
      })
      await pb.collection('users').authWithPassword(formData.email, formData.password)
      await updateInvitationLink(linkData.id, { used: true })
      navigate('/morador/dashboard')
    } catch (err: any) {
      toast({
        title: 'Erro no cadastro',
        description: err.message || 'Verifique os dados informados, o CPF pode já estar em uso.',
        variant: 'destructive',
      })
    } finally {
      setSubmitting(false)
    }
  }

  if (loading)
    return <div className="min-h-screen flex items-center justify-center">Carregando...</div>

  if (error)
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-neutralBg">
        <Card className="w-full max-w-lg">
          <CardContent className="pt-6 flex flex-col items-center text-center space-y-4">
            <AlertCircle className="w-12 h-12 text-destructive" />
            <h2 className="text-xl font-bold">Acesso Negado</h2>
            <p className="text-muted-foreground">{error}</p>
            <Button asChild>
              <Link to="/">Voltar ao Início</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )

  const unit = linkData?.expand?.unit_id
  const pwdScore = getPwdStrength(formData.password)

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-neutralBg">
      <Card className="w-full max-w-lg animate-slide-up">
        <CardHeader className="text-center">
          <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center mx-auto mb-2 text-white">
            <Package className="h-6 w-6" />
          </div>
          <CardTitle className="text-xl font-bold">Completar Cadastro</CardTitle>
          <CardDescription>
            Você foi convidado para a Torre {unit?.tower}, Apto {unit?.apartment}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Nome Completo</Label>
              <Input
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ex: João da Silva"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>CPF</Label>
                <Input
                  required
                  value={formData.cpf}
                  onChange={(e) => setFormData({ ...formData, cpf: e.target.value })}
                  placeholder="000.000.000-00"
                />
              </div>
              <div className="space-y-2">
                <Label>Celular</Label>
                <Input
                  required
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="(00) 00000-0000"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>E-mail</Label>
              <Input
                required
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="joao@exemplo.com"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Criar Senha</Label>
                <Input
                  required
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                />
                <Progress value={pwdScore} className="h-1.5 mt-2" />
              </div>
              <div className="space-y-2">
                <Label>Confirmar Senha</Label>
                <Input
                  required
                  type="password"
                  value={formData.confirm}
                  onChange={(e) => setFormData({ ...formData, confirm: e.target.value })}
                />
              </div>
            </div>

            <Button type="submit" className="w-full mt-6" disabled={submitting}>
              {submitting ? 'Salvando...' : 'Finalizar Cadastro'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
