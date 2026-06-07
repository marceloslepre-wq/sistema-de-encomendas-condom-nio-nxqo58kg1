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

  const [formData, setFormData] = useState({
    nome: '',
    email: '',
    telefone: '',
    cpf: '',
    senha: '',
    confirmarSenha: '',
  })

  useEffect(() => {
    if (!torreParam || !unidadeParam) {
      setError('Parâmetros de torre e unidade não encontrados na URL.')
      return
    }

    console.log('Formulário carregado:', { torre: torreParam, unidade: unidadeParam })
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
    if (formData.senha !== formData.confirmarSenha) {
      toast({ title: 'Erro', description: 'As senhas não coincidem.', variant: 'destructive' })
      return
    }

    setSubmitting(true)
    try {
      const cleanCpf = formData.cpf.replace(/\D/g, '')
      const cleanPhone = formData.telefone.replace(/\D/g, '')

      // Create auth user
      await pb.collection('users').create({
        name: formData.nome,
        phone: cleanPhone,
        email: formData.email,
        password: formData.senha,
        passwordConfirm: formData.confirmarSenha,
        role: 'morador',
      })

      // Create morador record
      await pb.collection('moradores').create({
        nome: formData.nome,
        email: formData.email,
        cpf: cleanCpf,
        telefone: cleanPhone,
        torre: torreParam,
        apartamento: unidadeParam,
      })

      // Authenticate user
      await pb.collection('users').authWithPassword(formData.email, formData.senha)

      console.log('Morador cadastrado:', {
        email: formData.email,
        torre: torreParam,
        unidade: unidadeParam,
      })

      toast({
        title: 'Cadastro realizado!',
        description: 'Seu cadastro foi concluído com sucesso.',
      })

      navigate('/morador/dashboard')
    } catch (erro: any) {
      console.log('ERRO ao cadastrar:', erro)
      const fieldErrors = extractFieldErrors(erro)
      const msg =
        Object.values(fieldErrors).join(', ') ||
        erro.message ||
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
              />
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
                />
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
                  minLength={8}
                />
              </div>
              <div className="space-y-2">
                <Label>Confirmar Senha</Label>
                <Input
                  required
                  type="password"
                  value={formData.confirmarSenha}
                  onChange={(e) => setFormData({ ...formData, confirmarSenha: e.target.value })}
                  placeholder="********"
                  minLength={8}
                />
              </div>
            </div>

            <Button type="submit" className="w-full mt-6" disabled={submitting}>
              {submitting ? 'Cadastrando...' : 'Cadastrar'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
