import { useEffect, useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import {
  Search,
  Plus,
  Trash2,
  Edit,
  Building2,
  Home,
  Check,
  ChevronsUpDown,
  Loader2,
} from 'lucide-react'
import {
  getUnits,
  createUnit,
  updateUnit,
  deleteUnit,
  getCondo,
  createCondo,
  Unit,
  Tower,
  getTowers,
  createTower,
  updateTower,
  deleteTower,
} from '@/services/api'
import { useToast } from '@/hooks/use-toast'
import { normalizeTower, compareUnitNumbers } from '@/lib/unitMatching'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { cn } from '@/lib/utils'

export default function GestorUnidades() {
  const [activeTab, setActiveTab] = useState<'units' | 'towers'>('units')
  const [units, setUnits] = useState<Unit[]>([])
  const [towers, setTowers] = useState<Tower[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [towerSearchTerm, setTowerSearchTerm] = useState('')
  const { toast } = useToast()

  // Form de Unidade
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [editingUnit, setEditingUnit] = useState<Unit | null>(null)
  const [formData, setFormData] = useState({ tower_id: '', apartment: '' })
  const [condoId, setCondoId] = useState<string>('')
  const [towerComboboxOpen, setTowerComboboxOpen] = useState(false)

  // Modal para criar torre inline a partir do formulário de unidade
  const [isInlineTowerModalOpen, setIsInlineTowerModalOpen] = useState(false)
  const [inlineTowerData, setInlineTowerData] = useState({ identifier: '', nickname: '' })

  // Modal CRUD de Torre
  const [isTowerFormOpen, setIsTowerFormOpen] = useState(false)
  const [editingTower, setEditingTower] = useState<Tower | null>(null)
  const [towerFormData, setTowerFormData] = useState({ identifier: '', nickname: '' })

  // Confirmação de exclusão de Unidade
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [unitToDelete, setUnitToDelete] = useState<Unit | null>(null)

  // Confirmação de exclusão de Torre
  const [isDeleteTowerDialogOpen, setIsDeleteTowerDialogOpen] = useState(false)
  const [towerToDelete, setTowerToDelete] = useState<Tower | null>(null)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      let condoData = await getCondo()
      if (!condoData) {
        condoData = await createCondo({ name: 'Condomínio Principal' })
      }
      if (condoData) setCondoId(condoData.id)
      const [unitsData, towersData] = await Promise.all([getUnits(), getTowers()])
      setUnits(unitsData as Unit[])
      setTowers(towersData as Tower[])
    } catch (e: any) {
      console.error('Failed to load units, towers or condo:', e, e.response)
    } finally {
      setLoading(false)
    }
  }

  // Mapa de contagem de unidades vinculadas a cada torre
  const unitsCountByTower = useMemo(() => {
    const map = new Map<string, number>()
    for (const u of units) {
      if (u.tower_id) {
        map.set(u.tower_id, (map.get(u.tower_id) || 0) + 1)
      } else {
        // Fallback por nome caso a unit ainda não tenha tower_id
        const matchedTower = towers.find(
          (t) => normalizeTower(t.display_name) === normalizeTower(u.tower),
        )
        if (matchedTower) {
          map.set(matchedTower.id, (map.get(matchedTower.id) || 0) + 1)
        }
      }
    }
    return map
  }, [units, towers])

  // --- Handlers de Unidade ---

  const handleSaveUnit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!condoId) {
      toast({
        title: 'Erro de Validação',
        description: 'ID do Condomínio não encontrado.',
        variant: 'destructive',
      })
      return
    }

    const cleanedApartment = formData.apartment.trim().replace(/\s+/g, ' ')
    if (!formData.tower_id) {
      toast({
        title: 'Selecione a Torre',
        description: 'Selecione ou cadastre uma torre para a unidade.',
        variant: 'destructive',
      })
      return
    }

    if (!cleanedApartment) {
      toast({
        title: 'Apartamento obrigatório',
        description: 'Informe o número do apartamento / unidade.',
        variant: 'destructive',
      })
      return
    }

    const selectedTower = towers.find((t) => t.id === formData.tower_id)
    const towerDisplayName = selectedTower ? selectedTower.display_name : ''

    setSubmitting(true)
    try {
      if (editingUnit) {
        await updateUnit(editingUnit.id, {
          tower: towerDisplayName,
          tower_id: formData.tower_id,
          apartment: cleanedApartment,
          condo_id: condoId,
        })
        toast({ title: 'Unidade atualizada com sucesso.' })
      } else {
        await createUnit({
          tower: towerDisplayName,
          tower_id: formData.tower_id,
          apartment: cleanedApartment,
          condo_id: condoId,
        })
        toast({ title: 'Unidade criada com sucesso.' })
      }
      setIsFormOpen(false)
      loadData()
    } catch (err: any) {
      console.error('Failed to save unit:', err, err.response)
      toast({
        title: 'Erro ao salvar',
        description: err.message || 'Verifique os dados.',
        variant: 'destructive',
      })
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeleteUnit = async () => {
    if (!unitToDelete) return
    setSubmitting(true)
    try {
      await deleteUnit(unitToDelete.id)
      toast({ title: 'Unidade removida com sucesso.' })
      loadData()
    } catch (e: any) {
      console.error('Failed to delete unit:', e, e.response)
      toast({
        title: 'Erro',
        description: 'Não foi possível remover a unidade.',
        variant: 'destructive',
      })
    } finally {
      setSubmitting(false)
      setIsDeleteDialogOpen(false)
      setUnitToDelete(null)
    }
  }

  // --- Handlers de Torre ---

  const handleSaveTower = async (e: React.FormEvent) => {
    e.preventDefault()

    const cleanIdent = towerFormData.identifier.trim().replace(/\s+/g, ' ')
    const cleanNick = towerFormData.nickname.trim().replace(/\s+/g, ' ')

    if (!cleanIdent) {
      toast({
        title: 'Identificador obrigatório',
        description: 'Informe o identificador da torre ou bloco (ex: A, 1, Norte).',
        variant: 'destructive',
      })
      return
    }

    // Validação anti-duplicidade no front
    const normIdent = normalizeTower(cleanIdent)
    const duplicate = towers.find(
      (t) =>
        normalizeTower(t.identifier) === normIdent && (!editingTower || t.id !== editingTower.id),
    )
    if (duplicate) {
      toast({
        title: 'Torre já cadastrada',
        description: `Já existe uma torre com o identificador "${cleanIdent}" neste condomínio.`,
        variant: 'destructive',
      })
      return
    }

    const displayName = cleanNick ? `${cleanIdent} (${cleanNick})` : cleanIdent

    setSubmitting(true)
    try {
      if (editingTower) {
        await updateTower(editingTower.id, {
          identifier: cleanIdent,
          nickname: cleanNick,
          display_name: displayName,
          condo_id: condoId,
        })
        toast({ title: 'Torre atualizada com sucesso.' })
      } else {
        await createTower({
          identifier: cleanIdent,
          nickname: cleanNick,
          display_name: displayName,
          condo_id: condoId,
        })
        toast({ title: 'Torre criada com sucesso.' })
      }
      setIsTowerFormOpen(false)
      loadData()
    } catch (err: any) {
      console.error('Failed to save tower:', err, err.response)
      toast({
        title: 'Erro ao salvar torre',
        description: err.message || 'Verifique os dados.',
        variant: 'destructive',
      })
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeleteTower = async () => {
    if (!towerToDelete) return

    const linkedCount = unitsCountByTower.get(towerToDelete.id) || 0
    if (linkedCount > 0) {
      toast({
        title: 'Exclusão não permitida',
        description: `Esta torre possui ${linkedCount} unidade(s) vinculada(s). Altere ou exclua as unidades antes de remover a torre.`,
        variant: 'destructive',
      })
      setIsDeleteTowerDialogOpen(false)
      setTowerToDelete(null)
      return
    }

    setSubmitting(true)
    try {
      await deleteTower(towerToDelete.id)
      toast({ title: 'Torre excluída com sucesso.' })
      loadData()
    } catch (err: any) {
      console.error('Failed to delete tower:', err)
      toast({
        title: 'Erro ao excluir torre',
        description: err.message || 'Não foi possível excluir a torre.',
        variant: 'destructive',
      })
    } finally {
      setSubmitting(false)
      setIsDeleteTowerDialogOpen(false)
      setTowerToDelete(null)
    }
  }

  // Salvar torre inline via modal rápido acionado no seletor de unidade
  const handleSaveInlineTower = async (e: React.FormEvent) => {
    e.preventDefault()
    const cleanIdent = inlineTowerData.identifier.trim().replace(/\s+/g, ' ')
    const cleanNick = inlineTowerData.nickname.trim().replace(/\s+/g, ' ')

    if (!cleanIdent) {
      toast({
        title: 'Identificador obrigatório',
        description: 'Informe o identificador da torre ou bloco.',
        variant: 'destructive',
      })
      return
    }

    const normIdent = normalizeTower(cleanIdent)
    const duplicate = towers.find((t) => normalizeTower(t.identifier) === normIdent)
    if (duplicate) {
      toast({
        title: 'Torre já existente',
        description: `A torre "${duplicate.display_name}" já existe. Ela foi selecionada no formulário.`,
      })
      setFormData((prev) => ({ ...prev, tower_id: duplicate.id }))
      setIsInlineTowerModalOpen(false)
      return
    }

    const displayName = cleanNick ? `${cleanIdent} (${cleanNick})` : cleanIdent
    setSubmitting(true)
    try {
      const created = await createTower({
        identifier: cleanIdent,
        nickname: cleanNick,
        display_name: displayName,
        condo_id: condoId,
      })
      toast({ title: 'Nova torre criada com sucesso!' })
      await loadData()
      setFormData((prev) => ({ ...prev, tower_id: created.id }))
      setIsInlineTowerModalOpen(false)
    } catch (err: any) {
      toast({
        title: 'Erro ao criar torre',
        description: err.message || 'Não foi possível cadastrar a torre.',
        variant: 'destructive',
      })
    } finally {
      setSubmitting(false)
    }
  }

  // --- Abertura de Modais ---

  const openNewUnitForm = () => {
    setEditingUnit(null)
    setFormData({ tower_id: towers[0]?.id || '', apartment: '' })
    setIsFormOpen(true)
  }

  const openEditUnitForm = (unit: Unit) => {
    setEditingUnit(unit)
    let towerId = unit.tower_id || ''
    if (!towerId) {
      const matched = towers.find(
        (t) => normalizeTower(t.display_name) === normalizeTower(unit.tower),
      )
      if (matched) towerId = matched.id
    }
    setFormData({ tower_id: towerId, apartment: unit.apartment })
    setIsFormOpen(true)
  }

  const openNewTowerForm = () => {
    setEditingTower(null)
    setTowerFormData({ identifier: '', nickname: '' })
    setIsTowerFormOpen(true)
  }

  const openEditTowerForm = (tower: Tower) => {
    setEditingTower(tower)
    setTowerFormData({
      identifier: tower.identifier || '',
      nickname: tower.nickname || '',
    })
    setIsTowerFormOpen(true)
  }

  // --- Listas Filtradas ---

  const filteredUnits = units
    .filter(
      (u) =>
        u.tower.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.apartment.toLowerCase().includes(searchTerm.toLowerCase()),
    )
    .sort((a, b) => {
      const towerComp = a.tower.localeCompare(b.tower, 'pt-BR', {
        numeric: true,
        sensitivity: 'base',
      })
      if (towerComp !== 0) return towerComp
      return compareUnitNumbers(a.apartment, b.apartment)
    })

  const filteredTowers = towers
    .filter(
      (t) =>
        t.display_name.toLowerCase().includes(towerSearchTerm.toLowerCase()) ||
        t.identifier.toLowerCase().includes(towerSearchTerm.toLowerCase()) ||
        (t.nickname || '').toLowerCase().includes(towerSearchTerm.toLowerCase()),
    )
    .sort((a, b) =>
      a.display_name.localeCompare(b.display_name, 'pt-BR', {
        numeric: true,
        sensitivity: 'base',
      }),
    )

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-[400px] w-full" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-primary">
            Gestão de Unidades e Torres
          </h2>
          <p className="text-muted-foreground">
            Cadastre as torres/blocos do condomínio e gerencie todos os apartamentos.
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'units' | 'towers')}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-2">
          <TabsList className="grid grid-cols-2 w-full sm:w-80">
            <TabsTrigger value="units" className="flex items-center gap-2">
              <Home className="w-4 h-4" />
              <span>Unidades ({units.length})</span>
            </TabsTrigger>
            <TabsTrigger value="towers" className="flex items-center gap-2">
              <Building2 className="w-4 h-4" />
              <span>Torres ({towers.length})</span>
            </TabsTrigger>
          </TabsList>

          {activeTab === 'units' ? (
            <Button onClick={openNewUnitForm} className="w-full sm:w-auto">
              <Plus className="h-4 w-4 mr-2" /> Adicionar Unidade
            </Button>
          ) : (
            <Button onClick={openNewTowerForm} className="w-full sm:w-auto">
              <Plus className="h-4 w-4 mr-2" /> Nova Torre / Bloco
            </Button>
          )}
        </div>

        {/* --- ABA 1: UNIDADES --- */}
        <TabsContent value="units" className="mt-4 space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <CardTitle>Apartamentos Cadastrados</CardTitle>
                  <CardDescription>
                    Unidades vinculadas às torres cadastradas no condomínio.
                  </CardDescription>
                </div>
                <div className="relative w-full sm:w-72">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar torre ou apto..."
                    className="pl-8"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="border rounded-md overflow-hidden">
                <Table>
                  <TableHeader className="bg-muted/40">
                    <TableRow>
                      <TableHead>Torre / Bloco</TableHead>
                      <TableHead>Apartamento</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUnits.map((u) => (
                      <TableRow key={u.id}>
                        <TableCell className="font-medium">
                          <span className="inline-flex items-center gap-1.5">
                            <Building2 className="w-3.5 h-3.5 text-muted-foreground" />
                            {u.tower}
                          </span>
                        </TableCell>
                        <TableCell className="font-semibold text-slate-800">
                          {u.apartment}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openEditUnitForm(u)}
                              title="Editar Unidade"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setUnitToDelete(u)
                                setIsDeleteDialogOpen(true)
                              }}
                              title="Excluir Unidade"
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {filteredUnits.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center py-6 text-muted-foreground">
                          Nenhuma unidade encontrada.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* --- ABA 2: TORRES / BLOCOS --- */}
        <TabsContent value="towers" className="mt-4 space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <CardTitle>Cadastro de Torres / Blocos</CardTitle>
                  <CardDescription>
                    Cada torre possui um identificador (ex: A, 1) e opcionalmente um nome/apelido
                    (ex: Amarílis).
                  </CardDescription>
                </div>
                <div className="relative w-full sm:w-72">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar identificador ou apelido..."
                    className="pl-8"
                    value={towerSearchTerm}
                    onChange={(e) => setTowerSearchTerm(e.target.value)}
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="border rounded-md overflow-hidden">
                <Table>
                  <TableHeader className="bg-muted/40">
                    <TableRow>
                      <TableHead>Nome Exibido</TableHead>
                      <TableHead>Identificador</TableHead>
                      <TableHead>Nome / Apelido do Prédio</TableHead>
                      <TableHead className="text-center">Unidades Vinculadas</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTowers.map((t) => {
                      const linked = unitsCountByTower.get(t.id) || 0
                      return (
                        <TableRow key={t.id}>
                          <TableCell className="font-semibold text-primary">
                            <span className="inline-flex items-center gap-1.5">
                              <Building2 className="w-4 h-4 text-slate-500" />
                              {t.display_name}
                            </span>
                          </TableCell>
                          <TableCell className="font-medium text-slate-800">
                            {t.identifier}
                          </TableCell>
                          <TableCell className="text-slate-600">
                            {t.nickname ? (
                              <Badge variant="secondary" className="font-normal">
                                {t.nickname}
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground text-xs italic">—</span>
                            )}
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant={linked > 0 ? 'outline' : 'secondary'}>
                              {linked} {linked === 1 ? 'unidade' : 'unidades'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => openEditTowerForm(t)}
                                title="Editar Torre"
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                  setTowerToDelete(t)
                                  setIsDeleteTowerDialogOpen(true)
                                }}
                                title="Excluir Torre"
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                    {filteredTowers.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-6 text-muted-foreground">
                          Nenhuma torre cadastrada.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* DIALOG DE UNIDADE */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="sm:max-w-[440px]">
          <DialogHeader>
            <DialogTitle>{editingUnit ? 'Editar Unidade' : 'Nova Unidade'}</DialogTitle>
            <DialogDescription>
              Selecione a torre oficial cadastrada e informe o apartamento.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSaveUnit} className="space-y-4 pt-2">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Torre / Bloco *</Label>
                <Button
                  type="button"
                  variant="link"
                  size="sm"
                  className="h-auto p-0 text-xs text-primary font-medium"
                  onClick={() => {
                    setInlineTowerData({ identifier: '', nickname: '' })
                    setIsInlineTowerModalOpen(true)
                  }}
                >
                  <Plus className="w-3 h-3 mr-1" /> Criar nova torre
                </Button>
              </div>

              {/* Seletor digitável com busca e opção de criar */}
              <Popover open={towerComboboxOpen} onOpenChange={setTowerComboboxOpen}>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    role="combobox"
                    aria-expanded={towerComboboxOpen}
                    className="w-full justify-between bg-white text-left font-normal"
                  >
                    <span className="truncate">
                      {formData.tower_id
                        ? towers.find((t) => t.id === formData.tower_id)?.display_name ||
                          'Selecione a torre'
                        : 'Selecione a torre...'}
                    </span>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent
                  className="w-[--radix-popover-trigger-width] min-w-[240px] p-0"
                  align="start"
                >
                  <Command>
                    <CommandInput placeholder="Buscar torre existente..." />
                    <CommandList className="max-h-60">
                      <CommandEmpty>
                        <div className="p-2 text-center text-xs text-muted-foreground">
                          Nenhuma torre encontrada.
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="w-full mt-2 text-xs"
                            onClick={() => {
                              setTowerComboboxOpen(false)
                              setInlineTowerData({ identifier: '', nickname: '' })
                              setIsInlineTowerModalOpen(true)
                            }}
                          >
                            <Plus className="w-3 h-3 mr-1" /> Criar nova torre
                          </Button>
                        </div>
                      </CommandEmpty>
                      <CommandGroup>
                        {towers.map((t) => (
                          <CommandItem
                            key={t.id}
                            value={`${t.display_name} ${t.identifier} ${t.nickname || ''}`}
                            onSelect={() => {
                              setFormData({ ...formData, tower_id: t.id })
                              setTowerComboboxOpen(false)
                            }}
                          >
                            <Check
                              className={cn(
                                'mr-2 h-4 w-4 shrink-0 text-primary',
                                formData.tower_id === t.id ? 'opacity-100' : 'opacity-0',
                              )}
                            />
                            <div className="flex-1 truncate">
                              <span className="font-medium">{t.display_name}</span>
                              {t.nickname && (
                                <span className="text-xs text-muted-foreground ml-1.5">
                                  ({t.nickname})
                                </span>
                              )}
                            </div>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label>Apartamento / Unidade *</Label>
              <Input
                required
                value={formData.apartment}
                onChange={(e) => setFormData({ ...formData, apartment: e.target.value })}
                placeholder="Ex: 101, 102A, 1603"
              />
            </div>

            <DialogFooter className="pt-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsFormOpen(false)}
                disabled={submitting}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={submitting || !formData.tower_id}>
                {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {editingUnit ? 'Salvar Unidade' : 'Criar Unidade'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* DIALOG DE TORRE (CRUD DE TORRE) */}
      <Dialog open={isTowerFormOpen} onOpenChange={setIsTowerFormOpen}>
        <DialogContent className="sm:max-w-[440px]">
          <DialogHeader>
            <DialogTitle>
              {editingTower ? 'Editar Torre / Bloco' : 'Nova Torre / Bloco'}
            </DialogTitle>
            <DialogDescription>
              Separe o identificador (A, B, 1) do apelido/nome do prédio (Orquídea, Amarílis).
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSaveTower} className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label>Identificador da Torre ou Bloco *</Label>
              <Input
                required
                value={towerFormData.identifier}
                onChange={(e) => setTowerFormData({ ...towerFormData, identifier: e.target.value })}
                placeholder="Ex: A, B, Torre 1, Bloco A"
              />
              <p className="text-[11px] text-muted-foreground">
                Como a torre é identificada no condomínio. Deve ser único por condomínio.
              </p>
            </div>

            <div className="space-y-2">
              <Label>Nome / Apelido do Prédio (Opcional)</Label>
              <Input
                value={towerFormData.nickname}
                onChange={(e) => setTowerFormData({ ...towerFormData, nickname: e.target.value })}
                placeholder="Ex: Orquídea, Amarílis, Sul"
              />
              <p className="text-[11px] text-muted-foreground">
                Apelido do edifício. Será exibido entre parênteses caso preenchido.
              </p>
            </div>

            {towerFormData.identifier.trim() && (
              <div className="bg-slate-50 border rounded-md p-3 text-xs text-slate-700">
                <span className="text-muted-foreground">Pré-visualização do nome:</span>{' '}
                <strong className="text-primary font-semibold">
                  {towerFormData.nickname.trim()
                    ? `${towerFormData.identifier.trim()} (${towerFormData.nickname.trim()})`
                    : towerFormData.identifier.trim()}
                </strong>
              </div>
            )}

            <DialogFooter className="pt-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsTowerFormOpen(false)}
                disabled={submitting}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {editingTower ? 'Salvar Alterações' : 'Cadastrar Torre'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* DIALOG INLINE DE CRIAÇÃO RÁPIDA DE TORRE */}
      <Dialog open={isInlineTowerModalOpen} onOpenChange={setIsInlineTowerModalOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Criar Nova Torre</DialogTitle>
            <DialogDescription>
              Cadastre a torre para selecioná-la imediatamente nesta unidade.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSaveInlineTower} className="space-y-3 pt-2">
            <div className="space-y-2">
              <Label>Identificador da Torre ou Bloco *</Label>
              <Input
                required
                value={inlineTowerData.identifier}
                onChange={(e) =>
                  setInlineTowerData({ ...inlineTowerData, identifier: e.target.value })
                }
                placeholder="Ex: A, B, Bloco 1"
              />
            </div>
            <div className="space-y-2">
              <Label>Nome / Apelido do Prédio (Opcional)</Label>
              <Input
                value={inlineTowerData.nickname}
                onChange={(e) =>
                  setInlineTowerData({ ...inlineTowerData, nickname: e.target.value })
                }
                placeholder="Ex: Orquídea, Amarílis"
              />
            </div>
            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsInlineTowerModalOpen(false)}
                disabled={submitting}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Cadastrar e Selecionar
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ALERT EXCLUSÃO UNIDADE */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir unidade?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir a unidade{' '}
              <strong>
                {unitToDelete?.tower} - {unitToDelete?.apartment}
              </strong>
              ? Esta ação não pode ser desfeita e pode falhar se houver moradores ou encomendas
              vinculadas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={submitting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault()
                handleDeleteUnit()
              }}
              disabled={submitting}
              className="bg-destructive hover:bg-destructive/90"
            >
              {submitting ? 'Excluindo...' : 'Excluir'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ALERT EXCLUSÃO TORRE */}
      <AlertDialog open={isDeleteTowerDialogOpen} onOpenChange={setIsDeleteTowerDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir torre?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir a torre <strong>{towerToDelete?.display_name}</strong>?
              {towerToDelete && (unitsCountByTower.get(towerToDelete.id) || 0) > 0 ? (
                <span className="block mt-2 text-destructive font-semibold">
                  Atenção: Esta torre possui {unitsCountByTower.get(towerToDelete.id)} unidade(s)
                  vinculada(s). A exclusão será bloqueada até que todas as unidades vinculadas sejam
                  alteradas ou excluídas.
                </span>
              ) : (
                <span className="block mt-2 text-muted-foreground">
                  Esta torre não possui unidades vinculadas e pode ser removida com segurança.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={submitting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault()
                handleDeleteTower()
              }}
              disabled={submitting}
              className="bg-destructive hover:bg-destructive/90"
            >
              {submitting ? 'Excluindo...' : 'Excluir Torre'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
