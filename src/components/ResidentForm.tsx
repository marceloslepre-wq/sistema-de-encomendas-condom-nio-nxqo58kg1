import { useState, useMemo } from 'react'
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
import { Progress } from '@/components/ui/progress'
import { Unit } from '@/services/api'
import { useToast } from '@/hooks/use-toast'

interface ResidentFormProps {
  initialData?: any
  units?: Unit[]
  fixedUnit?: Unit
  onSubmit: (data: any) => Promise<void>
  onCancel?: () => void
  submitting?: boolean
}

export function ResidentForm({
  initialData,
  units = [],
  fixedUnit,
  onSubmit,
  onCancel,
  submitting,
}: ResidentFormProps) {
  const { toast } = useToast()

  const [formData, setFormData] = useState({
    name: initialData?.name || '',
    cpf: initialData?.cpf || '',
    phone: initialData?.phone || '',
    email: initialData?.email || '',
    password: '',
    confirm: '',
  })

  const isEdit = !!initialData?.id

  const [selectedTower, setSelectedTower] = useState(
    fixedUnit?.tower || initialData?.expand?.unit_id?.tower || '',
  )
  const [selectedApt, setSelectedApt] = useState(
    fixedUnit?.apartment || initialData?.expand?.unit_id?.apartment || '',
  )

  const towers = useMemo(() => Array.from(new Set(units.map((u) => u.tower))), [units])
  const filteredApts = useMemo(
    () => units.filter((u) => u.tower === selectedTower),
    [units, selectedTower],
  )

  const getPwdStrength = (pwd: string) => {
    if (pwd.length === 0) return 0
    if (pwd.length < 6) return 33
    if (pwd.match(/[a-z]/) && pwd.match(/[A-Z]/) && pwd.match(/[0-9]/)) return 100
    return 66
  }

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!isEdit || formData.password) {
      if (formData.password !== formData.confirm) {
        return toast({
          title: 'Erro',
          description: 'As senhas não conferem.',
          variant: 'destructive',
        })
      }
      if (formData.password.length < 8) {
        return toast({
          title: 'Erro',
          description: 'A senha deve ter pelo menos 8 caracteres.',
          variant: 'destructive',
        })
      }
    }

    let unit_id = fixedUnit?.id
    if (!unit_id && units.length > 0) {
      const u = units.find((x) => x.tower === selectedTower && x.apartment === selectedApt)
      if (u) unit_id = u.id
    }

    if (!unit_id) {
      return toast({
        title: 'Erro de Validação',
        description: 'Selecione a Torre e o Apartamento.',
        variant: 'destructive',
      })
    }

    onSubmit({
      ...formData,
      cpf: formData.cpf.replace(/\D/g, ''),
      phone: formData.phone.replace(/\D/g, ''),
      unit_id,
    })
  }

  const pwdScore = getPwdStrength(formData.password)

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Torre / Bloco</Label>
          {fixedUnit ? (
            <Select disabled value={fixedUnit.tower}>
              <SelectTrigger className="bg-neutralBg">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={fixedUnit.tower}>Torre {fixedUnit.tower}</SelectItem>
              </SelectContent>
            </Select>
          ) : (
            <Select
              value={selectedTower}
              onValueChange={(v) => {
                setSelectedTower(v)
                setSelectedApt('')
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                {towers.map((t) => (
                  <SelectItem key={t} value={t}>
                    Torre {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
        <div className="space-y-2">
          <Label>Apartamento</Label>
          {fixedUnit ? (
            <Select disabled value={fixedUnit.apartment}>
              <SelectTrigger className="bg-neutralBg">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={fixedUnit.apartment}>Apto {fixedUnit.apartment}</SelectItem>
              </SelectContent>
            </Select>
          ) : (
            <Select value={selectedApt} onValueChange={setSelectedApt} disabled={!selectedTower}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                {filteredApts.map((a) => (
                  <SelectItem key={a.id} value={a.apartment}>
                    Apto {a.apartment}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      </div>

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
            onChange={(e) => setFormData({ ...formData, cpf: maskCPF(e.target.value) })}
            placeholder="000.000.000-00"
            maxLength={14}
          />
        </div>
        <div className="space-y-2">
          <Label>Celular</Label>
          <Input
            required
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: maskPhone(e.target.value) })}
            placeholder="(00) 00000-0000"
            maxLength={15}
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
          <Label>{isEdit ? 'Nova Senha (opcional)' : 'Criar Senha'}</Label>
          <Input
            required={!isEdit}
            type="password"
            value={formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
          />
          {(!isEdit || formData.password) && (
            <div className="space-y-1 mt-2">
              <Progress value={pwdScore} className="h-1.5" />
              <p className="text-[10px] text-muted-foreground text-right">
                {pwdScore < 40 ? 'Fraca' : pwdScore < 80 ? 'Média' : 'Forte'}
              </p>
            </div>
          )}
        </div>
        <div className="space-y-2">
          <Label>{isEdit ? 'Confirmar Nova Senha' : 'Confirmar Senha'}</Label>
          <Input
            required={!isEdit || !!formData.password}
            type="password"
            value={formData.confirm}
            onChange={(e) => setFormData({ ...formData, confirm: e.target.value })}
          />
        </div>
      </div>

      <div className="flex justify-end gap-2 mt-6">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel} disabled={submitting}>
            Cancelar
          </Button>
        )}
        <Button type="submit" disabled={submitting} className={!onCancel ? 'w-full' : ''}>
          {submitting ? 'Salvando...' : isEdit ? 'Salvar Alterações' : 'Finalizar Cadastro'}
        </Button>
      </div>
    </form>
  )
}
