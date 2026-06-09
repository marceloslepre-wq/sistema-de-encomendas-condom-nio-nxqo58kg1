import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { getPublicInvitation, registerWithInvitation, getUnits } from '@/services/api'
import { useToast } from '@/hooks/use-toast'
import { Loader2, CheckCircle2, ShieldAlert } from 'lucide-react'

export default function Registrar() {
  const { token } = useParams<{ token: string }>()
  const navigate = useNavigate()
  const { toast } = useToast()

  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [invitation, setInvitation] = useState<any>(null)
  const [error, setError] = useState('')

  const [units, setUnits] = useState<any[]>([])
  const [torres, setTorres] = useState<string[]>([])
  const [unidadesPorTorre, setUnidadesPorTorre] = useState<string[]>([])

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    cpf: '',
    torre: '',
    unidade: '',
  })

  useEffect(() => {
    if (!token) {
      setError('Token não fornecido.')
      setLoading(false)
      return
    }

    getPublicInvitation(token)
      .then((data) => {
        setInvitation(data)
        setFormData((prev) => ({
          ...prev,
          torre: data.torre || '',
          unidade: data.unidade || '',
        }))
        if (data.role === 'morador') {
          getUnits()
            .then((u) => {
              setUnits(u)
              setTorres(Array.from(new Set(u.map((x: any) => x.tower))) as string[])
            })
            .catch(console.error)
        }
      })
      .catch((err) => {
        setError(err.message || 'Link inválido ou expirado.')
      })
      .finally(() => {
        setLoading(false)
      })
  }, [token])

  useEffect(() => {
    if (formData.torre && units.length > 0) {
      const apts = units.filter((u) => u.tower === formData.torre).map((u) => u.apartment)
      setUnidadesPorTorre(Array.from(new Set(apts)) as string[])
    } else {
      setUnidadesPorTorre([])
    }
  }, [formData.torre, units])

  const formatPhone = (value: string) => {
    const v = value.replace(/\D/g, '').substring(0, 11)
    if (v.length <= 10) return v.replace(/(\d{2})(\d)/, '($1) $2').replace(/(\d{4})(\d)/, '$1-$2')
    return v.replace(/(\d{2})(\d)/, '($1) $2').replace(/(\d{5})(\d)/, '$1-$2')
  }

  const formatCPF = (value: string) => {
    const v = value.replace(/\D/g, '').substring(0, 11)
    let formatted = v
    if (v.length > 9) formatted = v.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
    else if (v.length > 6) formatted = v.replace(/(\d{3})(\d{3})(\d{3})/, '$1.$2.$3')
    else if (v.length > 3) formatted = v.replace(/(\d{3})(\d{3})/, '$1.$2')
    return formatted
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (formData.password.length < 8) {
      toast({
        title: 'Atenção',
        description: 'A senha deve ter no mínimo 8 caracteres.',
        variant: 'destructive',
      })
      return
    }

    setSubmitting(true)
    try {
      await registerWithInvitation(token!, formData)
      setSuccess(true)
    } catch (err: any) {
      toast({
        title: 'Erro',
        description: err.message || 'Falha ao registrar.',
        variant: 'destructive',
      })
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
        <Card className="w-full max-w-md shadow-lg border-destructive/20">
          <CardHeader className="text-center">
            <ShieldAlert className="w-12 h-12 text-destructive mx-auto mb-4" />
            <CardTitle className="text-2xl text-destructive">Link Inválido</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center">
            <Button onClick={() => navigate('/')}>Ir para o Login</Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
        <Card className="w-full max-w-md shadow-lg border-success/20">
          <CardHeader className="text-center">
            <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-4" />
            <CardTitle className="text-2xl text-green-600">Cadastro Concluído!</CardTitle>
            <CardDescription>
              Sua conta foi criada com sucesso. Você já pode fazer login no sistema.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center">
            <Button onClick={() => navigate('/')}>Acessar o Sistema</Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4 py-12">
      <Card className="w-full max-w-lg shadow-lg">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Registro de Usuário</CardTitle>
          <CardDescription>
            Você foi convidado para acessar o sistema como{' '}
            <strong>{invitation.role.toUpperCase()}</strong>.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>
                Nome Completo <span className="text-destructive">*</span>
              </Label>
              <Input
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ex: João Silva"
              />
            </div>

            <div className="space-y-2">
              <Label>
                E-mail <span className="text-destructive">*</span>
              </Label>
              <Input
                required
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="email@exemplo.com"
              />
            </div>

            <div className="space-y-2">
              <Label>
                Senha <span className="text-destructive">*</span>
              </Label>
              <Input
                required
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder="Mínimo 8 caracteres"
                minLength={8}
              />
            </div>

            <div className="space-y-2">
              <Label>Celular (Opcional)</Label>
              <Input
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: formatPhone(e.target.value) })}
                placeholder="(00) 00000-0000"
                maxLength={15}
              />
            </div>

            {invitation.role === 'morador' && (
              <>
                <div className="space-y-2">
                  <Label>
                    CPF <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    required
                    value={formData.cpf}
                    onChange={(e) => setFormData({ ...formData, cpf: formatCPF(e.target.value) })}
                    placeholder="000.000.000-00"
                    maxLength={14}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>
                      Torre <span className="text-destructive">*</span>
                    </Label>
                    {invitation.torre ? (
                      <Input value={invitation.torre} disabled className="bg-muted" />
                    ) : (
                      <Select
                        value={formData.torre}
                        onValueChange={(v) => setFormData({ ...formData, torre: v, unidade: '' })}
                        required
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                        <SelectContent>
                          {torres.map((t) => (
                            <SelectItem key={t} value={t}>
                              {t}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label>
                      Unidade <span className="text-destructive">*</span>
                    </Label>
                    {invitation.unidade ? (
                      <Input value={invitation.unidade} disabled className="bg-muted" />
                    ) : (
                      <Select
                        value={formData.unidade}
                        onValueChange={(v) => setFormData({ ...formData, unidade: v })}
                        disabled={!formData.torre}
                        required
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                        <SelectContent>
                          {unidadesPorTorre.map((u) => (
                            <SelectItem key={u} value={u}>
                              {u}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                </div>
              </>
            )}

            <Button type="submit" className="w-full mt-6" disabled={submitting}>
              {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Concluir Registro
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
