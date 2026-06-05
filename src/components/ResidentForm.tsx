import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface ResidentFormProps {
  initialData?: any
  onSubmit: (data: any) => Promise<void>
  onCancel?: () => void
  submitting?: boolean
  fieldErrors?: Record<string, string>
}

export function ResidentForm({
  initialData,
  onSubmit,
  onCancel,
  submitting,
  fieldErrors = {},
}: ResidentFormProps) {
  const [formData, setFormData] = useState({
    nome: initialData?.nome || '',
    email: initialData?.email || '',
    cpf: initialData?.cpf || '',
    torre: initialData?.torre || '',
    apartamento: initialData?.apartamento || '',
    telefone: initialData?.telefone || '',
  })

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
    onSubmit({
      ...formData,
      cpf: formData.cpf.replace(/\D/g, ''),
      telefone: formData.telefone.replace(/\D/g, ''),
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label>Nome</Label>
        <Input
          required
          value={formData.nome}
          onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
          placeholder="Ex: João"
        />
        {fieldErrors.nome && <p className="text-xs text-destructive">{fieldErrors.nome}</p>}
      </div>

      <div className="space-y-2">
        <Label>Email</Label>
        <Input
          required
          type="email"
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          placeholder="joao@email.com"
        />
        {fieldErrors.email && <p className="text-xs text-destructive">{fieldErrors.email}</p>}
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
          {fieldErrors.cpf && <p className="text-xs text-destructive">{fieldErrors.cpf}</p>}
        </div>
        <div className="space-y-2">
          <Label>Telefone</Label>
          <Input
            required
            value={formData.telefone}
            onChange={(e) => setFormData({ ...formData, telefone: maskPhone(e.target.value) })}
            placeholder="(00) 00000-0000"
            maxLength={15}
          />
          {fieldErrors.telefone && (
            <p className="text-xs text-destructive">{fieldErrors.telefone}</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Torre</Label>
          <Input
            required
            value={formData.torre}
            onChange={(e) => setFormData({ ...formData, torre: e.target.value })}
            placeholder="A"
          />
          {fieldErrors.torre && <p className="text-xs text-destructive">{fieldErrors.torre}</p>}
        </div>
        <div className="space-y-2">
          <Label>Apartamento</Label>
          <Input
            required
            value={formData.apartamento}
            onChange={(e) => setFormData({ ...formData, apartamento: e.target.value })}
            placeholder="101"
          />
          {fieldErrors.apartamento && (
            <p className="text-xs text-destructive">{fieldErrors.apartamento}</p>
          )}
        </div>
      </div>

      <div className="flex justify-end gap-2 mt-6">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel} disabled={submitting}>
            Cancelar
          </Button>
        )}
        <Button type="submit" disabled={submitting} className={!onCancel ? 'w-full' : ''}>
          {submitting ? 'Salvando...' : 'Salvar'}
        </Button>
      </div>
    </form>
  )
}
