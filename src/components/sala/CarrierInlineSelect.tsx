import { useState } from 'react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { useToast } from '@/hooks/use-toast'
import { ChevronsUpDown, Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { updateRecebimentoAuditoria, type Carrier } from '@/services/api'

type CarrierInlineSelectProps = {
  recebimentoId: string
  value: string
  carriers: Carrier[]
  onChanged: () => void
}

/**
 * Seletor discreto de transportadora para a coluna da fila da Triagem.
 * Aparece como texto simples e, ao clicar, abre a lista de transportadoras
 * cadastradas. A escolha grava o campo `transportadora` do próprio registro de
 * recebimentos_auditoria, que é a mesma fonte lida pelo Histórico de Validações.
 */
export function CarrierInlineSelect({
  recebimentoId,
  value,
  carriers,
  onChanged,
}: CarrierInlineSelectProps) {
  const { toast } = useToast()
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')

  const handleSelect = async (name: string) => {
    setOpen(false)
    setSearch('')
    if (name === value) return
    setSaving(true)
    try {
      await updateRecebimentoAuditoria(recebimentoId, { transportadora: name })
      toast({ title: 'Transportadora atualizada', description: `Agora: ${name}.` })
      onChanged()
    } catch {
      toast({
        title: 'Erro',
        description: 'Não foi possível trocar a transportadora.',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={saving}
          aria-label="Trocar transportadora"
          className="group inline-flex max-w-[160px] items-center gap-1 text-left text-sm hover:text-primary focus-visible:outline-none focus-visible:underline disabled:opacity-60"
        >
          <span className="truncate">{value || 'N/D'}</span>
          {saving ? null : (
            <ChevronsUpDown className="h-3 w-3 shrink-0 opacity-0 group-hover:opacity-60" />
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-64 p-0">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Buscar transportadora..."
            value={search}
            onValueChange={setSearch}
          />
          <CommandList>
            <CommandEmpty>Nenhuma transportadora encontrada.</CommandEmpty>
            <CommandGroup>
              {carriers
                .filter((c) => c.name.toLowerCase().includes(search.trim().toLowerCase()))
                .map((c) => (
                  <CommandItem key={c.id} value={c.name} onSelect={() => handleSelect(c.name)}>
                    <Check
                      className={cn('mr-2 h-4 w-4', value === c.name ? 'opacity-100' : 'opacity-0')}
                    />
                    {c.name}
                  </CommandItem>
                ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
