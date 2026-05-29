import { useEffect, useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from 'recharts'
import { Package, Clock, ShieldCheck, CalendarRange } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { getParcels, Parcel } from '@/services/api'
import { useRealtime } from '@/hooks/use-realtime'
import { format, subDays, isSameDay } from 'date-fns'

export default function GestorDashboard() {
  const [parcels, setParcels] = useState<Parcel[]>([])
  const [loading, setLoading] = useState(true)

  const loadData = async () => {
    try {
      const data = await getParcels()
      setParcels(data as Parcel[])
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  useRealtime('parcels', () => {
    loadData()
  })

  const stats = useMemo(() => {
    const today = new Date()
    const thisMonth = today.getMonth()

    let todayCount = 0
    let pendingCount = 0
    let monthCount = 0
    let totalRetrievalTime = 0
    let retrievedCount = 0

    parcels.forEach((p) => {
      const entry = new Date(p.entry_date)
      if (isSameDay(entry, today)) todayCount++
      if (entry.getMonth() === thisMonth) monthCount++

      if (
        ['RECEBIDO_PORTARIA', 'EM_SALA', 'CATALOGADO', 'DISPONIVEL_RETIRADA'].includes(p.status)
      ) {
        pendingCount++
      }

      if (p.status === 'RETIRADO' && p.exit_date) {
        const exit = new Date(p.exit_date)
        const diffHrs = (exit.getTime() - entry.getTime()) / (1000 * 60 * 60)
        totalRetrievalTime += diffHrs
        retrievedCount++
      }
    })

    const avgTime = retrievedCount > 0 ? (totalRetrievalTime / retrievedCount).toFixed(1) : '0'

    return { todayCount, pendingCount, avgTime, monthCount }
  }, [parcels])

  const chartData = useMemo(() => {
    const data = []
    const today = new Date()
    for (let i = 29; i >= 0; i--) {
      const date = subDays(today, i)
      const count = parcels.filter((p) => isSameDay(new Date(p.entry_date), date)).length
      data.push({
        date: format(date, 'dd/MM'),
        count,
      })
    }
    return data
  }, [parcels])

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
          <CardContent>
            <div className="text-2xl font-bold text-warning">{stats.pendingCount}</div>
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
