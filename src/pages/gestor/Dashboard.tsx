import { useEffect, useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from 'recharts'
import {
  Package,
  Clock,
  ShieldCheck,
  CalendarRange,
  PackageCheck,
  ClipboardCheck,
} from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { RecebimentoAuditoria, getUnits, Unit } from '@/services/api'
import { useRealtime } from '@/hooks/use-realtime'
import { format, subDays, isSameDay } from 'date-fns'
import pb from '@/lib/pocketbase/client'
import { useAuth } from '@/hooks/use-auth'
import { cn } from '@/lib/utils'

const TODAS = '__TODAS__'

// O status nas coleções é TEXTO LIVRE (ex.: "Aprovação Manual", "EM_TRIAGEM",
// "LIBERADO_RETIRADA", "Liberado para Retirada"): normaliza para comparação
// case-insensitive, ignorando espaços/underscores/hífens.
const normStatus = (s?: string | null) =>
  (s || '')
    .toString()
    .trim()
    .toUpperCase()
    .replace(/[\s_-]+/g, '')
const STATUS_LIBERADO = 'LIBERADORETIRADA'

const matchTorreUnidade = (p: RecebimentoAuditoria, torre: string, unidade: string): boolean => {
  const rec = p as RecebimentoAuditoria & {
    expand?: { unidade_id?: { tower?: string; tower_id?: string; apartment?: string } }
  }
  const expanded = rec.expand?.unidade_id
  // Fonte primária: relação unidade_id expandida; fallback: texto da unidade
  const recTorre = expanded?.tower || p.unidade?.split(' - ')[0]?.trim() || ''
  const recApt = expanded?.apartment || p.unidade?.split(' - ')[1]?.trim() || ''

  if (torre !== TODAS && recTorre !== torre) return false
  if (unidade !== TODAS && recApt !== unidade) return false
  return true
}

export default function GestorDashboard() {
  const { user } = useAuth()
  const [recebimentos, setRecebimentos] = useState<RecebimentoAuditoria[]>([])
  const [units, setUnits] = useState<Unit[]>([])
  const [loading, setLoading] = useState(true)

  // Filtros Torre/Unidade dos cards de retirada
  const [torrePendentes, setTorrePendentes] = useState(TODAS)
  const [unidadePendentes, setUnidadePendentes] = useState(TODAS)
  const [torreRetiradas, setTorreRetiradas] = useState(TODAS)
  const [unidadeRetiradas, setUnidadeRetiradas] = useState(TODAS)

  // Card "Triagens Concluídas": período e filtros próprios
  const [triagensPeriodo, setTriagensPeriodo] = useState<'hoje' | 'ontem' | 'custom'>('hoje')
  const [triagensDataCustom, setTriagensDataCustom] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [torreTriagens, setTorreTriagens] = useState(TODAS)
  const [unidadeTriagens, setUnidadeTriagens] = useState(TODAS)
  const [historico, setHistorico] = useState<any[]>([])

  const loadData = async () => {
    try {
      const filter =
        user?.role !== 'master' && user?.condo_id ? `condo_id = "${user.condo_id}"` : ''
      const data = await pb.collection('recebimentos_auditoria').getFullList({
        filter,
        sort: '-created',
      })
      setRecebimentos(data as RecebimentoAuditoria[])
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  // Histórico de Validações: eventos de transição de status (fonte do card
  // "Triagens Concluídas" — conta o EVENTO do dia, não o status atual).
  const loadHistorico = async () => {
    try {
      const filter =
        user?.role !== 'master' && user?.condo_id ? `condo_id = "${user.condo_id}"` : ''
      const data = await pb.collection('historico_andamento').getFullList({
        filter,
        expand: 'recebimento_id.unidade_id',
        sort: '-created',
      })
      setHistorico(data as any[])
    } catch (e) {
      console.error(e)
    }
  }

  const loadUnits = async () => {
    try {
      const data = await getUnits()
      setUnits(data as Unit[])
    } catch (e) {
      console.error(e)
    }
  }

  useEffect(() => {
    loadData()
    loadHistorico()
    loadUnits()
  }, [])

  useRealtime('recebimentos_auditoria', () => {
    loadData()
  })

  useRealtime('historico_andamento', () => {
    loadHistorico()
  })

  const towers = useMemo(() => {
    const seen = new Map<string, string>()
    units.forEach((u) => {
      if (u.tower && !seen.has(u.tower)) seen.set(u.tower, u.tower)
    })
    return Array.from(seen.keys()).sort((a, b) => a.localeCompare(b, 'pt-BR'))
  }, [units])

  const unitsOfTower = (torre: string) =>
    units
      .filter((u) => u.tower === torre)
      .map((u) => u.apartment)
      .filter((apt, i, arr) => apt && arr.indexOf(apt) === i)
      .sort((a, b) => a.localeCompare(b, 'pt-BR', { numeric: true }))

  const stats = useMemo(() => {
    const today = new Date()
    const thisMonth = today.getMonth()

    let todayCount = 0
    let pendingCount = 0
    let monthCount = 0
    let totalRetrievalTime = 0
    let retrievedCount = 0
    let entreguesHojeCount = 0

    recebimentos.forEach((p) => {
      const entryStr = p.data_criacao || p.created
      if (!entryStr) return
      const entry = new Date(entryStr)

      if (isSameDay(entry, today)) todayCount++
      if (entry.getMonth() === thisMonth) monthCount++

      const status = p.status?.toUpperCase() || ''

      if (status === 'LIBERADO_RETIRADA') {
        pendingCount++
      }

      if (status === 'ENTREGUE') {
        // A retirada é concluída via update (status -> ENTREGUE), então `updated`
        // marca o momento da retirada (o próprio fluxo de Retirada segue essa lógica).
        const exitStr = p.updated
        if (exitStr) {
          const exit = new Date(exitStr)
          if (isSameDay(exit, today)) entreguesHojeCount++
          const diffHrs = (exit.getTime() - entry.getTime()) / (1000 * 60 * 60)
          totalRetrievalTime += Math.max(0, diffHrs)
          retrievedCount++
        }
      }
    })

    const pendingFiltered = recebimentos.filter(
      (p) =>
        p.status?.toUpperCase() === 'LIBERADO_RETIRADA' &&
        matchTorreUnidade(p, torrePendentes, unidadePendentes),
    ).length

    const entreguesHojeFiltered = recebimentos.filter(
      (p) =>
        p.status?.toUpperCase() === 'ENTREGUE' &&
        p.updated &&
        isSameDay(new Date(p.updated), today) &&
        matchTorreUnidade(p, torreRetiradas, unidadeRetiradas),
    ).length

    const avgTime = retrievedCount > 0 ? (totalRetrievalTime / retrievedCount).toFixed(1) : '0'

    return {
      todayCount,
      pendingCount,
      avgTime,
      monthCount,
      entreguesHojeCount,
      pendingFiltered,
      entreguesHojeFiltered,
    }
  }, [recebimentos, torrePendentes, unidadePendentes, torreRetiradas, unidadeRetiradas])

  // Triagens Concluídas: liberações para retirada CONCLUÍDAS na data selecionada.
  // Fonte primária: eventos de "LIBERADO_RETIRADA" no Histórico de Validações
  // (historico_andamento) na data alvo — o evento do dia, sem acúmulo entre dias.
  // FALLBACK: encomendas liberadas antes de existir o Histórico usam a data de
  // liberação da própria encomenda (updated, quando o status atual é liberado).
  const triagens = useMemo(() => {
    const hoje = new Date()
    let target: Date
    if (triagensPeriodo === 'ontem') {
      target = subDays(hoje, 1)
    } else if (triagensPeriodo === 'custom') {
      // Valor do input de data é "yyyy-MM-dd": monta a data LOCAL (new Date com
      // string interpretaria como UTC e deslocaria o dia no fuso de Brasília).
      const [y, m, d] = (triagensDataCustom || '').split('-').map(Number)
      target = y && m && d ? new Date(y, m - 1, d) : hoje
    } else {
      target = hoje
    }

    const mesmoDia = (dateStr?: string | null) => {
      if (!dateStr) return false
      const dt = new Date(dateStr)
      if (isNaN(dt.getTime())) return false
      return (
        dt.getFullYear() === target.getFullYear() &&
        dt.getMonth() === target.getMonth() &&
        dt.getDate() === target.getDate()
      )
    }

    // Eventos de liberação registrados no Histórico de Validações na data alvo
    const liberacoesNoDia = historico.filter(
      (h) => normStatus(h.status) === STATUS_LIBERADO && mesmoDia(h.created || h.data_atualizacao),
    )

    // Encomendas que JÁ possuem registro de liberação no Histórico (qualquer dia)
    // nunca caem no fallback — evita contar a mesma triagem duas vezes.
    const comLiberacaoNoHistorico = new Set<string>(
      historico
        .filter((h) => normStatus(h.status) === STATUS_LIBERADO)
        .map((h) => h.recebimento_id as string),
    )

    const fallbackNoDia = recebimentos.filter(
      (p) =>
        normStatus(p.status) === STATUS_LIBERADO &&
        !comLiberacaoNoHistorico.has(p.id) &&
        mesmoDia(p.updated),
    )

    const eventos: (RecebimentoAuditoria | undefined)[] = [
      ...liberacoesNoDia.map((h) => h.expand?.recebimento_id as RecebimentoAuditoria | undefined),
      ...fallbackNoDia,
    ]

    const total = eventos.length
    const filtradas = eventos.filter(
      (rec) => rec && matchTorreUnidade(rec, torreTriagens, unidadeTriagens),
    ).length

    return { total, filtradas, target }
  }, [historico, recebimentos, triagensPeriodo, triagensDataCustom, torreTriagens, unidadeTriagens])

  const chartData = useMemo(() => {
    const data = []
    const today = new Date()
    for (let i = 29; i >= 0; i--) {
      const date = subDays(today, i)
      const count = recebimentos.filter((p) => {
        const entryStr = p.data_criacao || p.created
        return entryStr && isSameDay(new Date(entryStr), date)
      }).length
      data.push({
        date: format(date, 'dd/MM'),
        count,
      })
    }
    return data
  }, [recebimentos])

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-4 md:grid-cols-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
        <Skeleton className="h-[300px] w-full" />
      </div>
    )
  }

  const pendentesFiltrado = stats.pendingFiltered !== stats.pendingCount
  const retiradasFiltrado = stats.entreguesHojeFiltered !== stats.entreguesHojeCount
  const triagensFiltrado = triagens.filtradas !== triagens.total

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-primary">Dashboard de KPIs</h2>
        <p className="text-muted-foreground">Visão em tempo real das operações de encomendas.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Encomendas Hoje</CardTitle>
            <Package className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.todayCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pendentes Retirada</CardTitle>
            <Clock className="h-4 w-4 text-warning" />
          </CardHeader>
          <CardContent className="space-y-3">
            <div
              className={cn('text-2xl font-bold text-warning', pendentesFiltrado && 'text-base')}
            >
              {stats.pendingFiltered}
              {pendentesFiltrado && (
                <span className="ml-1 text-sm font-normal text-muted-foreground">
                  de {stats.pendingCount}
                </span>
              )}
            </div>
            <div className="flex gap-2">
              <Select
                value={torrePendentes}
                onValueChange={(v) => {
                  setTorrePendentes(v)
                  setUnidadePendentes(TODAS)
                }}
              >
                <SelectTrigger className="h-8 w-full text-xs">
                  <SelectValue placeholder="Todas as torres" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={TODAS}>Todas as torres</SelectItem>
                  {towers.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={unidadePendentes}
                onValueChange={setUnidadePendentes}
                disabled={torrePendentes === TODAS}
              >
                <SelectTrigger className="h-8 w-full text-xs">
                  <SelectValue placeholder="Todas as unidades" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={TODAS}>Todas as unidades</SelectItem>
                  {unitsOfTower(torrePendentes).map((apt) => (
                    <SelectItem key={apt} value={apt}>
                      {apt}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tempo Médio Retirada</CardTitle>
            <ShieldCheck className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">{stats.avgTime}h</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Encomendas no Mês</CardTitle>
            <CalendarRange className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.monthCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Encomendas Retiradas Hoje</CardTitle>
            <PackageCheck className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent className="space-y-3">
            <div
              className={cn('text-2xl font-bold text-success', retiradasFiltrado && 'text-base')}
            >
              {stats.entreguesHojeFiltered}
              {retiradasFiltrado && (
                <span className="ml-1 text-sm font-normal text-muted-foreground">
                  de {stats.entreguesHojeCount}
                </span>
              )}
            </div>
            <div className="flex gap-2">
              <Select
                value={torreRetiradas}
                onValueChange={(v) => {
                  setTorreRetiradas(v)
                  setUnidadeRetiradas(TODAS)
                }}
              >
                <SelectTrigger className="h-8 w-full text-xs">
                  <SelectValue placeholder="Todas as torres" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={TODAS}>Todas as torres</SelectItem>
                  {towers.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={unidadeRetiradas}
                onValueChange={setUnidadeRetiradas}
                disabled={torreRetiradas === TODAS}
              >
                <SelectTrigger className="h-8 w-full text-xs">
                  <SelectValue placeholder="Todas as unidades" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={TODAS}>Todas as unidades</SelectItem>
                  {unitsOfTower(torreRetiradas).map((apt) => (
                    <SelectItem key={apt} value={apt}>
                      {apt}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Triagens Concluídas</CardTitle>
            <ClipboardCheck className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent className="space-y-3">
            <div className={cn('text-2xl font-bold text-primary', triagensFiltrado && 'text-base')}>
              {triagens.filtradas}
              {triagensFiltrado && (
                <span className="ml-1 text-sm font-normal text-muted-foreground">
                  de {triagens.total}
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {triagensPeriodo === 'hoje'
                ? 'Hoje'
                : triagensPeriodo === 'ontem'
                  ? 'Ontem'
                  : 'Dia escolhido'}
              : {format(triagens.target, 'dd/MM/yyyy')}
            </p>
            <Select
              value={triagensPeriodo}
              onValueChange={(v) => setTriagensPeriodo(v as 'hoje' | 'ontem' | 'custom')}
            >
              <SelectTrigger className="h-8 w-full text-xs" aria-label="Período das triagens">
                <SelectValue placeholder="Período" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="hoje">Hoje</SelectItem>
                <SelectItem value="ontem">Ontem</SelectItem>
                <SelectItem value="custom">Escolher data</SelectItem>
              </SelectContent>
            </Select>
            {triagensPeriodo === 'custom' && (
              <Input
                type="date"
                value={triagensDataCustom}
                onChange={(e) => setTriagensDataCustom(e.target.value)}
                className="h-8 text-xs"
                aria-label="Escolher data das triagens"
              />
            )}
            <div className="flex gap-2">
              <Select
                value={torreTriagens}
                onValueChange={(v) => {
                  setTorreTriagens(v)
                  setUnidadeTriagens(TODAS)
                }}
              >
                <SelectTrigger className="h-8 w-full text-xs">
                  <SelectValue placeholder="Todas as torres" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={TODAS}>Todas as torres</SelectItem>
                  {towers.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={unidadeTriagens}
                onValueChange={setUnidadeTriagens}
                disabled={torreTriagens === TODAS}
              >
                <SelectTrigger className="h-8 w-full text-xs">
                  <SelectValue placeholder="Todas as unidades" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={TODAS}>Todas as unidades</SelectItem>
                  {unitsOfTower(torreTriagens).map((apt) => (
                    <SelectItem key={apt} value={apt}>
                      {apt}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="col-span-4">
        <CardHeader>
          <CardTitle>Volume de Encomendas (Últimos 30 dias)</CardTitle>
        </CardHeader>
        <CardContent className="h-[300px]">
          <ChartContainer config={{ count: { label: 'Encomendas', color: 'hsl(var(--primary))' } }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                <XAxis
                  dataKey="date"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  fontSize={12}
                />
                <YAxis tickLine={false} axisLine={false} tickMargin={8} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="count" fill="var(--color-count)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartContainer>
        </CardContent>
      </Card>
    </div>
  )
}
