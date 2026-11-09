import { useEffect, useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from 'recharts'
import { Package, Clock, ShieldCheck, CalendarRange, PackageCheck } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { RecebimentoAuditoria, getUnits, Unit } from '@/services/api'
import { useRealtime } from '@/hooks/use-realtime'
import { format, subDays, isSameDay } from 'date-fns'
import pb from '@/lib/pocketbase/client'
import { useAuth } from '@/hooks/use-auth'
import { cn } from '@/lib/utils'

const TODAS = '__TODAS__'

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
    loadUnits()
  }, [])

  useRealtime('recebimentos_auditoria', () => {
    loadData()
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

    const matchTorreUnidade = (
      p: RecebimentoAuditoria,
      torre: string,
      unidade: string,
    ): boolean => {
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
