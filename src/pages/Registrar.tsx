import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { getPublicInvitation, registerWithInvitation } from '@/services/api'
import { useToast } from '@/hooks/use-toast'
import { Loader2, CheckCircle2, ShieldAlert, ChevronsUpDown, Check } from 'lucide-react'
import { CondPackLogo } from '@/components/CondPackLogo'
import { cn } from '@/lib/utils'
import { dedupeTowers, towerMatches, sortUnitStrings } from '@/lib/unitMatching'

interface SearchableSelectProps {
  options: string[]
  value: string
  onChange: (value: string) => void
  placeholder: string
  searchPlaceholder: string
  emptyText: string
  disabled?: boolean
}

function SearchableSelect({
  options,
  value,
  onChange,
  placeholder,
  searchPlaceholder,
  emptyText,
  disabled = false,
}: SearchableSelectProps) {
  const [open, setOpen] = useState(false)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            'w-full justify-between bg-white text-left font-normal border-input hover:bg-slate-50',
            !value && 'text-muted-foreground',
          )}
        >
          <span className="truncate">{value ? value : placeholder}</span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] min-w-[200px] p-0" align="start">
        <Command>
          <CommandInput placeholder={searchPlaceholder} />
          <CommandList className="max-h-60">
            <CommandEmpty>{emptyText}</CommandEmpty>
            <CommandGroup>
              {options.map((opt) => (
                <CommandItem
                  key={opt}
                  value={opt}
                  onSelect={() => {
                    onChange(opt)
                    setOpen(false)
                  }}
                >
                  <Check
                    className={cn(
                      'mr-2 h-4 w-4 shrink-0 text-primary',
                      value === opt ? 'opacity-100' : 'opacity-0',
                    )}
                  />
                  <span className="truncate">{opt}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

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

        // O endpoint público /backend/v1/invitations/{token} retorna as unidades do condomínio
        if (data.units && Array.isArray(data.units)) {
          setUnits(data.units)
          const distinctTorres = dedupeTowers(data.units.map((x: any) => x.tower).filter(Boolean))
          setTorres(distinctTorres)
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
      const apts = units
        .filter((u) => towerMatches(formData.torre, u.tower))
        .map((u) => u.apartment)
        .filter(Boolean)
      const uniqueApts = Array.from(new Set(apts)) as string[]
      setUnidadesPorTorre(sortUnitStrings(uniqueApts))
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

    if (invitation?.role === 'morador') {
      const finalTorre = invitation.torre || formData.torre
      const finalUnidade = invitation.unidade || formData.unidade

      if (!formData.cpf || formData.cpf.trim() === '') {
        toast({
          title: 'Atenção',
          description: 'O CPF é obrigatório.',
          variant: 'destructive',
        })
        return
      }

      if (!finalTorre) {
        toast({
          title: 'Atenção',
          description: 'Por favor, selecione a Torre.',
          variant: 'destructive',
        })
        return
      }

      if (!finalUnidade) {
        toast({
          title: 'Atenção',
          description: 'Por favor, selecione a Unidade.',
          variant: 'destructive',
        })
        return
      }
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
            <div className="flex items-center justify-center gap-3 mb-3">
              <div className="flex items-center justify-center w-12 h-12 bg-white rounded-xl border border-slate-200 p-1 shadow-2xs">
                <CondPackLogo variant="icon-only" size="md" imageClassName="h-10 w-auto" />
              </div>
              <div className="text-left select-none">
                <span
                  className="font-black text-2xl text-slate-900 tracking-tight notranslate select-none"
                  translate="no"
                >
                  <span className="text-[#0d2a58]">Cond</span>
                  <span className="text-[#00a896]">Pack</span>
                </span>
              </div>
            </div>
            <ShieldAlert className="w-10 h-10 text-destructive mx-auto mb-2" />
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
            <div className="flex items-center justify-center gap-3 mb-3">
              <div className="flex items-center justify-center w-12 h-12 bg-white rounded-xl border border-slate-200 p-1 shadow-2xs">
                <CondPackLogo variant="icon-only" size="md" imageClassName="h-10 w-auto" />
              </div>
              <div className="text-left select-none">
                <span
                  className="font-black text-2xl text-slate-900 tracking-tight notranslate select-none"
                  translate="no"
                >
                  <span className="text-[#0d2a58]">Cond</span>
                  <span className="text-[#00a896]">Pack</span>
                </span>
              </div>
            </div>
            <CheckCircle2 className="w-10 h-10 text-green-500 mx-auto mb-2" />
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
          <div className="flex items-center justify-center gap-3 mb-2">
            <div className="flex items-center justify-center w-12 h-12 bg-white rounded-xl border border-slate-200 p-1 shadow-2xs">
              <CondPackLogo variant="icon-only" size="md" imageClassName="h-10 w-auto" />
            </div>
            <div className="text-left select-none">
              <span
                className="font-black text-2xl text-slate-900 tracking-tight notranslate select-none"
                translate="no"
              >
                <span className="text-[#0d2a58]">Cond</span>
                <span className="text-[#00a896]">Pack</span>
              </span>
            </div>
          </div>
          <CardTitle className="text-xl font-semibold text-slate-800">
            Registro de Usuário Convidado
          </CardTitle>
          <CardDescription>
            Você foi convidado para acessar o condomínio como{' '}
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

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>
                      Torre <span className="text-destructive">*</span>
                    </Label>
                    {invitation.torre ? (
                      <Input
                        value={invitation.torre}
                        disabled
                        readOnly
                        className="bg-muted text-muted-foreground cursor-not-allowed"
                      />
                    ) : (
                      <SearchableSelect
                        options={torres}
                        value={formData.torre}
                        onChange={(v) => setFormData({ ...formData, torre: v, unidade: '' })}
                        placeholder="Selecione ou busque a torre..."
                        searchPlaceholder="Buscar torre..."
                        emptyText="Nenhuma torre encontrada."
                      />
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label>
                      Unidade <span className="text-destructive">*</span>
                    </Label>
                    {invitation.unidade ? (
                      <Input
                        value={invitation.unidade}
                        disabled
                        readOnly
                        className="bg-muted text-muted-foreground cursor-not-allowed"
                      />
                    ) : (
                      <SearchableSelect
                        options={unidadesPorTorre}
                        value={formData.unidade}
                        onChange={(v) => setFormData({ ...formData, unidade: v })}
                        disabled={!formData.torre}
                        placeholder={
                          formData.torre
                            ? 'Selecione ou busque a unidade...'
                            : 'Primeiro selecione a torre'
                        }
                        searchPlaceholder="Buscar unidade (ex: 101)..."
                        emptyText={
                          formData.torre
                            ? 'Nenhuma unidade cadastrada para esta torre.'
                            : 'Selecione uma torre primeiro.'
                        }
                      />
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
