import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/hooks/use-auth'
import { useToast } from '@/hooks/use-toast'
import { updateUser } from '@/services/api'
import { User, Phone, Mail, Hash, MapPin, Building } from 'lucide-react'
import pb from '@/lib/pocketbase/client'
import { Skeleton } from '@/components/ui/skeleton'

export default function MoradorDados() {
  const { user } = useAuth()
  const { toast } = useToast()

  const [phone, setPhone] = useState('')
  const [moradorData, setMoradorData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (user) {
      console.log('Morador logado:', user.email)
      setPhone(user.phone || '')
      pb.collection('moradores')
        .getFirstListItem(`email="${user.email}"`)
        .then((morador) => {
          console.log('Perfil carregado:', morador)
          setMoradorData(morador)
        })
        .catch((erro) => {
          console.log('ERRO:', erro)
        })
        .finally(() => setLoading(false))
    }
  }, [user])

  const maskPhone = (value: string) => {
    return value
      .replace(/\D/g, '')
      .replace(/(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{5})(\d{4})/, '$1-$2')
      .replace(/(-\d{4})\d+?$/, '$1')
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return
    setSubmitting(true)
    try {
      await updateUser(user.id, { phone })
      if (moradorData) {
        await pb.collection('moradores').update(moradorData.id, { telefone: phone })
      }
      toast({ title: 'Dados atualizados com sucesso.' })
    } catch (erro) {
      console.log('ERRO:', erro)
      toast({
        title: 'Erro',
        description: 'Não foi possível atualizar os dados.',
        variant: 'destructive',
      })
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-[400px] w-full" />
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-primary">Meus Dados</h2>
        <p className="text-muted-foreground">Visualize e atualize suas informações de contato.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Perfil do Morador
          </CardTitle>
          <CardDescription>
            Alguns campos são gerenciados apenas pela administração do condomínio.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSave} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  Nome Completo
                </Label>
                <Input
                  value={moradorData?.nome || user?.name || ''}
                  disabled
                  className="bg-muted"
                />
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  E-mail
                </Label>
                <Input
                  value={moradorData?.email || user?.email || ''}
                  disabled
                  className="bg-muted"
                />
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Hash className="h-4 w-4 text-muted-foreground" />
                  CPF
                </Label>
                <Input value={moradorData?.cpf || user?.cpf || ''} disabled className="bg-muted" />
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  Celular
                </Label>
                <Input
                  required
                  value={phone}
                  onChange={(e) => setPhone(maskPhone(e.target.value))}
                  placeholder="(00) 00000-0000"
                  maxLength={15}
                />
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Building className="h-4 w-4 text-muted-foreground" />
                  Torre / Bloco
                </Label>
                <Input
                  value={moradorData ? `Torre ${moradorData.torre}` : '-'}
                  disabled
                  className="bg-muted"
                />
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  Apartamento
                </Label>
                <Input
                  value={moradorData ? `Apto ${moradorData.apartamento}` : '-'}
                  disabled
                  className="bg-muted"
                />
              </div>
            </div>

            <div className="flex justify-end pt-4">
              <Button type="submit" disabled={submitting}>
                {submitting ? 'Salvando...' : 'Salvar Alterações'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
