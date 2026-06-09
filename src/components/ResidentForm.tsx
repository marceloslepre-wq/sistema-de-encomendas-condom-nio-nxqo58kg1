import { useState, useEffect } from 'react'
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
import pb from '@/lib/pocketbase/client'
import { useRealtime } from '@/hooks/use-realtime'

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
    password: '',
  })
  const [units, setUnits] = useState<any[]>([])

  const fetchUnits = async () => {
    try {
      const records = await pb.collection('units').getFullList()
      setUnits(records)
    } catch (err) {
      console.error('Failed to fetch units:', err)
    }
  }

  useEffect(() => {
    fetchUnits()
  }, [])

  useRealtime('units', () => {
    fetchUnits()
  })

  const towers = Array.from(new Set(units.map((u) => u.tower))).sort()
  const apartments = units
    .filter((u) => u.tower === formData.torre)
    .map((u) => u.apartment)
    .sort()

  const handleTorreChange = (val: string) => {
    setFormData((prev) => ({ ...prev, torre: val, apartamento: '' }))
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
          className={fieldErrors.nome ? 'border-destructive focus-visible:ring-destructive' : ''}
        />
        {fieldErrors.nome && <p className="text-xs text-destructive">{fieldErrors.nome}</p>}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Email</Label>
          <Input
            required
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            placeholder="joao@email.com"
            className={fieldErrors.email ? 'border-destructive focus-visible:ring-destructive' : ''}
          />
          {fieldErrors.email && <p className="text-xs text-destructive">{fieldErrors.email}</p>}
        </div>
        <div className="space-y-2">
          <Label>
            Senha{' '}
            {initialData && (
              <span className="text-muted-foreground text-xs font-normal">
                (Opcional para alterar)
              </span>
            )}
          </Label>
          <Input
            type="password"
            required={!initialData}
            minLength={8}
            value={formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            placeholder="Mínimo 8 caracteres"
            className={
              fieldErrors.password ? 'border-destructive focus-visible:ring-destructive' : ''
            }
          />
          {fieldErrors.password && (
            <p className="text-xs text-destructive">{fieldErrors.password}</p>
          )}
        </div>
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
            className={fieldErrors.cpf ? 'border-destructive focus-visible:ring-destructive' : ''}
          />
          {fieldErrors.cpf && <p className="text-xs text-destructive">{fieldErrors.cpf}</p>}
        </div>
        <div className="space-y-2">
          <Label>Telefone</Label>
          <Input
            value={formData.telefone}
            onChange={(e) => setFormData({ ...formData, telefone: maskPhone(e.target.value) })}
            placeholder="(00) 00000-0000"
            maxLength={15}
            className={
              fieldErrors.telefone ? 'border-destructive focus-visible:ring-destructive' : ''
            }
          />
          {fieldErrors.telefone && (
            <p className="text-xs text-destructive">{fieldErrors.telefone}</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Torre</Label>
          <Select value={formData.torre || undefined} onValueChange={handleTorreChange} required>
            <SelectTrigger
              className={
                fieldErrors.torre ? 'border-destructive focus-visible:ring-destructive' : ''
              }
            >
              <SelectValue placeholder="Selecione" />
            </SelectTrigger>
            <SelectContent>
              {towers.map((tower) => (
                <SelectItem key={tower} value={tower}>
                  {tower}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {fieldErrors.torre && <p className="text-xs text-destructive">{fieldErrors.torre}</p>}
        </div>
        <div className="space-y-2">
          <Label>Apartamento</Label>
          <Select
            value={formData.apartamento || undefined}
            onValueChange={(val) => setFormData({ ...formData, apartamento: val })}
            disabled={!formData.torre}
            required
          >
            <SelectTrigger
              className={
                fieldErrors.apartamento ? 'border-destructive focus-visible:ring-destructive' : ''
              }
            >
              <SelectValue placeholder="Selecione" />
            </SelectTrigger>
            <SelectContent>
              {apartments.map((apt) => (
                <SelectItem key={apt} value={apt}>
                  {apt}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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
        <Button
          type="submit"
          disabled={submitting || !formData.torre || !formData.apartamento}
          className={!onCancel ? 'w-full' : ''}
        >
          {submitting ? 'Salvando...' : 'Salvar'}
        </Button>
      </div>
    </form>
  )
}
