import { useState, useEffect } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Package, AlertCircle } from 'lucide-react'
import pb from '@/lib/pocketbase/client'
import { useToast } from '@/hooks/use-toast'
import { extractFieldErrors } from '@/lib/pocketbase/errors'

export default function CadastroMorador() {
  const [searchParams] = useSearchParams()
  const torreParam = searchParams.get('torre') || ''
  const unidadeParam = searchParams.get('unidade') || ''

  const navigate = useNavigate()
  const { toast } = useToast()

  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  const [formData, setFormData] = useState({
    nome: '',
    email: '',
    telefone: '',
    cpf: '',
    senha: '',
    confirmarSenha: '',
  })

  useEffect(() => {
    const torre = torreParam
    const unidade = unidadeParam
    console.log('URL params:', { torre, unidade })
    console.log('Formulário carregado:', { torre, unidade })

    if (!torreParam || !unidadeParam) {
      setError('Torre e Unidade não foram informadas')
      return
    }
  }, [torreParam, unidadeParam])

  const maskCPF = (value: string) => {
    return value
      .replace(/\D/g, '')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})/, '$1-$2')
      .replace(/(-\d{2})\d+?$/, '$1')
  }

  const maskPhone = (value: string) => {
    return value
      .replace(/\D/g, '')
      .replace(/(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{5})(\d{4})/, '$1-$2')
      .replace(/(-\d{4})\d+?$/, '$1')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const cleanCpf = formData.cpf.replace(/\D/g, '')
    const cleanPhone = formData.telefone.replace(/\D/g, '')

    const email = formData.email
    const cpf = cleanCpf
    const senha_length = formData.senha.length

    console.log('Validando campos:', { email, cpf, senha_length })

    const errors: Record<string, string> = {}
    if (!formData.email.includes('@')) {
      errors.email = 'Email inválido'
    }
    if (cleanCpf.length !== 11) {
      errors.cpf = 'CPF deve ter 11 dígitos'
    }
    if (formData.senha.length < 8) {
      errors.senha = 'Senha deve ter no mínimo 8 caracteres'
    }
    if (formData.senha !== formData.confirmarSenha) {
      errors.confirmarSenha = 'Senhas não conferem'
    }

    setFieldErrors(errors)

    if (Object.keys(errors).length > 0) {
      return
    }

    console.log('Enviando cadastro:', {
      email,
      torre: torreParam,
      unidade: unidadeParam,
    })

    setSubmitting(true)
    try {
      // Create auth user
      // The server hook on_user_after_create_morador will handle the sync with moradores
      await pb.collection('users').create({
        name: formData.nome,
        phone: cleanPhone,
        email: formData.email,
        password: formData.senha,
        passwordConfirm: formData.confirmarSenha,
        role: 'morador',
        torre: torreParam,
        unidade: unidadeParam,
        cpf: cleanCpf,
      })

      // Authenticate user
      await pb.collection('users').authWithPassword(formData.email, formData.senha)

      const torre = torreParam
      const unidade = unidadeParam
      console.log('Morador cadastrado:', { email, torre, unidade })

      toast({
        title: 'Cadastro realizado!',
        description: 'Seu cadastro foi concluído com sucesso.',
      })

      navigate('/morador/dashboard')
    } catch (error: any) {
      console.log('ERRO ao cadastrar:', error)
      const apiErrors = extractFieldErrors(error)
      const msg =
        Object.values(apiErrors).join(', ') ||
        error.message ||
        'Verifique os dados informados, o CPF ou Email podem já estar em uso.'
      toast({
        title: 'Erro no cadastro',
        description: msg,
        variant: 'destructive',
      })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-neutralBg">
      <Card className="w-full max-w-lg animate-slide-up">
        <CardHeader className="text-center">
          <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center mx-auto mb-2 text-white">
            <Package className="h-6 w-6" />
          </div>
          <CardTitle className="text-xl font-bold">Completar Cadastro</CardTitle>
          <CardDescription>
            Você foi convidado para a Torre {torreParam}, Apto {unidadeParam}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="mb-4 p-4 rounded-md bg-destructive/10 text-destructive flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              <span>{error}</span>
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4 opacity-70">
              <div className="space-y-2">
                <Label>Torre</Label>
                <Input
                  value={torreParam}
                  readOnly
                  disabled
                  className="bg-muted text-muted-foreground"
                />
              </div>
              <div className="space-y-2">
                <Label>Unidade</Label>
                <Input
                  value={unidadeParam}
                  readOnly
                  disabled
                  className="bg-muted text-muted-foreground"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Nome Completo</Label>
              <Input
                required
                value={formData.nome}
                onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                placeholder="Seu nome completo"
              />
            </div>

            <div className="space-y-2">
              <Label>Email</Label>
              <Input
                required
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="seu@email.com"
                className={fieldErrors.email ? 'border-destructive' : ''}
              />
              {fieldErrors.email && <p className="text-sm text-destructive">{fieldErrors.email}</p>}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Telefone</Label>
                <Input
                  required
                  value={formData.telefone}
                  onChange={(e) =>
                    setFormData({ ...formData, telefone: maskPhone(e.target.value) })
                  }
                  placeholder="(00) 00000-0000"
                  maxLength={15}
                />
              </div>
              <div className="space-y-2">
                <Label>CPF</Label>
                <Input
                  required
                  value={formData.cpf}
                  onChange={(e) => setFormData({ ...formData, cpf: maskCPF(e.target.value) })}
                  placeholder="000.000.000-00"
                  maxLength={14}
                  className={fieldErrors.cpf ? 'border-destructive' : ''}
                />
                {fieldErrors.cpf && <p className="text-sm text-destructive">{fieldErrors.cpf}</p>}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Senha</Label>
                <Input
                  required
                  type="password"
                  value={formData.senha}
                  onChange={(e) => setFormData({ ...formData, senha: e.target.value })}
                  placeholder="********"
                  className={fieldErrors.senha ? 'border-destructive' : ''}
                />
                {fieldErrors.senha && (
                  <p className="text-sm text-destructive">{fieldErrors.senha}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label>Confirmar Senha</Label>
                <Input
                  required
                  type="password"
                  value={formData.confirmarSenha}
                  onChange={(e) => setFormData({ ...formData, confirmarSenha: e.target.value })}
                  placeholder="********"
                  className={fieldErrors.confirmarSenha ? 'border-destructive' : ''}
                />
                {fieldErrors.confirmarSenha && (
                  <p className="text-sm text-destructive">{fieldErrors.confirmarSenha}</p>
                )}
              </div>
            </div>

            <Button type="submit" className="w-full mt-6" disabled={submitting || !!error}>
              {submitting ? 'Cadastrando...' : 'Cadastrar'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
