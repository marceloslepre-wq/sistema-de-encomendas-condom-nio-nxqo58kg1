import { useState, useEffect } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Package, AlertCircle } from 'lucide-react'
import { getInvitationLinkByToken, updateInvitationLink } from '@/services/api'
import { ResidentForm } from '@/components/ResidentForm'
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

  const handleSubmit = async (data: any) => {
    setSubmitting(true)
    try {
      await pb.collection('users').create({
        name: data.name,
        cpf: data.cpf,
        phone: data.phone,
        email: data.email,
        password: data.password,
        passwordConfirm: data.confirm,
        role: 'morador',
        status: 'Ativo',
        unit_id: data.unit_id,
        token: token,
      })
      await pb.collection('users').authWithPassword(data.email, data.password)
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
          <ResidentForm
            fixedUnit={unit}
            units={[]}
            onSubmit={handleSubmit}
            submitting={submitting}
          />
        </CardContent>
      </Card>
    </div>
  )
}
