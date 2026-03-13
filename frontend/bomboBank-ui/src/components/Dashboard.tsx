import { useState, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useTransactions } from "@/hooks/useTransactions"
import {
    getSummary,
    getMonthlyAggregates,
    formatCHF,
} from "@/lib/types"
import {
    TrendingDown,
    TrendingUp,
    AlertCircle,
    CircleDashed,
    RotateCcw,
    Dices,
    Trophy,
} from "lucide-react"
import { MerchantLogo } from "@/lib/merchantLogo"
import {
    ResponsiveContainer,
    LineChart,
    Line,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ReferenceLine,
    Cell,
} from "recharts"

/* ── Median helper ───────────────────────────────────────────── */
function median(values: number[]): number {
    if (values.length === 0) return 0
    const sorted = [...values].sort((a, b) => a - b)
    const mid = Math.floor(sorted.length / 2)
    return sorted.length % 2 === 0
        ? (sorted[mid - 1] + sorted[mid]) / 2
        : sorted[mid]
}

/* ── Default range: last 12 months ──────────────────────────── */
function defaultRange() {
    const end = new Date()
    const start = new Date(end.getFullYear() - 1, end.getMonth(), end.getDate())
    const fmt = (d: Date) => d.toISOString().slice(0, 10)
    return { startDate: fmt(start), endDate: fmt(end) }
}

/* ── Custom tooltip for charts ──────────────────────────────── */
function ChartTooltip({
    active,
    payload,
    label,
    valueKey,
    valueLabel,
}: {
    active?: boolean
    payload?: { value: number }[]
    label?: string
    valueKey?: number
    valueLabel?: string
}) {
    if (!active || !payload?.length) return null
    const val = payload[valueKey ?? 0]?.value ?? 0
    return (
        <div className="rounded-lg border bg-background px-3 py-2 shadow-lg">
            <p className="text-xs font-medium text-muted-foreground">{label}</p>
            <p className="text-sm font-semibold tabular-nums">
                {valueLabel && (
                    <span className="mr-1 text-muted-foreground">
                        {valueLabel}:
                    </span>
                )}
                {formatCHF(val)}
            </p>
        </div>
    )
}

export function Dashboard() {
    const defaults = useMemo(defaultRange, [])
    const [startDate, setStartDate] = useState(defaults.startDate)
    const [endDate, setEndDate] = useState(defaults.endDate)

    const { transactions, loading, error } = useTransactions({
        startDate,
        endDate,
    })

    const summary = useMemo(
        () => getSummary(transactions, startDate, endDate),
        [transactions, startDate, endDate]
    )

    const monthlyData = useMemo(
        () => getMonthlyAggregates(transactions),
        [transactions]
    )

    /* ── Casino transactions ──────────────────────────────────── */
    const casinoData = useMemo(() => {
        const isCasino = (t: (typeof transactions)[0]) =>
            [t.description, t.purpose, t.merchant, t.raw_text].some((f) =>
                f?.toLowerCase().includes("casino")
            )

        const casinoTxs = transactions.filter(isCasino)

        // Group by month label (same shape as monthlyData)
        const byMonth: Record<string, number> = {}
        for (const t of casinoTxs) {
            const d = new Date(t.booked_at)
            const label = d.toLocaleString("default", {
                month: "short",
                year: "2-digit",
            })
            byMonth[label] = (byMonth[label] ?? 0) + Math.abs(t.amount)
        }

        const monthly = Object.entries(byMonth)
            .map(([label, total]) => ({ label, total }))
            .sort((a, b) => {
                // keep chronological order from monthlyData labels
                const ai = monthlyData.findIndex((m) => m.label === a.label)
                const bi = monthlyData.findIndex((m) => m.label === b.label)
                return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi)
            })

        const totalSpent = casinoTxs.reduce(
            (s, t) => s + Math.abs(t.amount),
            0
        )
        const count = casinoTxs.length
        const avgPerVisit = count > 0 ? totalSpent / count : 0
        const worstMonth =
            monthly.length > 0
                ? monthly.reduce((a, b) => (a.total > b.total ? a : b))
                : null

        return { monthly, totalSpent, count, avgPerVisit, worstMonth }
    }, [transactions, monthlyData])

    /* ── Top 10 merchants ─────────────────────────────────────── */
    const topMerchants = useMemo(() => {
        const map = new Map<string, number[]>()
        for (const tx of transactions) {
            if (tx.amount >= 0) continue
            const name =
                tx.merchant?.trim() || tx.description?.trim() || "Unknown"
            const arr = map.get(name) ?? []
            arr.push(Math.abs(tx.amount))
            map.set(name, arr)
        }
        const rows = [...map.entries()]
            .map(([name, amounts]) => ({
                name,
                total: amounts.reduce((s, a) => s + a, 0),
                median: median(amounts),
                count: amounts.length,
            }))
            .sort((a, b) => b.total - a.total)
            .slice(0, 10)
        const max = rows[0]?.total ?? 1
        return rows.map((r) => ({ ...r, pct: (r.total / max) * 100 }))
    }, [transactions])

    const isDefault =
        startDate === defaults.startDate && endDate === defaults.endDate

    function resetRange() {
        setStartDate(defaults.startDate)
        setEndDate(defaults.endDate)
    }

    /* ── Loading ───────────────────────────────────────────────── */
    if (loading) {
        return (
            <div className="space-y-8 p-8">
                <Skeleton className="h-9 w-72" />
                <div className="grid gap-4 sm:grid-cols-2">
                    {[...Array(2)].map((_, i) => (
                        <Card key={i}>
                            <CardHeader className="pb-2">
                                <Skeleton className="h-4 w-24" />
                            </CardHeader>
                            <CardContent>
                                <Skeleton className="h-8 w-32" />
                                <Skeleton className="mt-2 h-3 w-40" />
                            </CardContent>
                        </Card>
                    ))}
                </div>
                <Card>
                    <CardContent className="pt-6">
                        <Skeleton className="h-[280px] w-full rounded-lg" />
                    </CardContent>
                </Card>
            </div>
        )
    }

    /* ── Error ────────────────────────────────────────────────── */
    if (error) {
        return (
            <div className="flex items-center justify-center p-16">
                <div className="flex flex-col items-center gap-3 text-center">
                    <AlertCircle className="size-8 text-destructive" />
                    <p className="text-sm text-muted-foreground">{error}</p>
                </div>
            </div>
        )
    }

    /* ── KPI values ───────────────────────────────────────────── */
    const kpiCards = [
        {
            title: "Income",
            value: formatCHF(summary.totalIncome),
            icon: <TrendingUp className="size-4" />,
            color: "text-emerald-600 dark:text-emerald-400",
        },
        {
            title: "Expenses",
            value: formatCHF(summary.totalOut),
            icon: <TrendingDown className="size-4" />,
            color: "text-rose-600 dark:text-rose-400",
        },
    ]

    return (
        <div className="space-y-8 p-8">
            {/* ─── Date Range Picker ──────────────────────────────── */}
            <div className="flex flex-wrap items-end gap-4">
                <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground">
                        From
                    </label>
                    <Input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="w-40"
                    />
                </div>
                <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground">
                        To
                    </label>
                    <Input
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="w-40"
                    />
                </div>
                {!isDefault && (
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={resetRange}
                        className="mb-0.5"
                    >
                        <RotateCcw className="mr-1.5 size-3.5" />
                        Reset
                    </Button>
                )}
                <span className="mb-1 text-xs text-muted-foreground">
                    {transactions.length} transactions
                </span>
            </div>

            {/* Empty state */}
            {transactions.length === 0 ? (
                <div className="flex items-center justify-center p-16">
                    <div className="flex flex-col items-center gap-3 text-center">
                        <CircleDashed className="size-8 text-muted-foreground" />
                        <p className="font-medium">
                            No transactions in this period
                        </p>
                        <p className="text-sm text-muted-foreground">
                            Try widening the date range
                        </p>
                    </div>
                </div>
            ) : (
                <>
                    {/* ─── KPI Cards ──────────────────────────────────── */}
                    <div className="grid gap-4 sm:grid-cols-2">
                        {kpiCards.map((kpi) => (
                            <Card key={kpi.title}>
                                <CardHeader className="flex flex-row items-center justify-between pb-2">
                                    <CardTitle className="text-sm font-medium text-muted-foreground">
                                        {kpi.title}
                                    </CardTitle>
                                    <span className={kpi.color}>
                                        {kpi.icon}
                                    </span>
                                </CardHeader>
                                <CardContent>
                                    <div
                                        className={`text-2xl font-bold tabular-nums ${kpi.color}`}
                                    >
                                        {kpi.value}
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>

                    {/* ─── Top 10 Merchants ────────────────────────────── */}
                    {topMerchants.length > 0 && (
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between pb-2">
                                <div className="flex items-center gap-2">
                                    <Trophy className="size-4 text-muted-foreground" />
                                    <CardTitle className="text-base">
                                        Top Merchants
                                    </CardTitle>
                                </div>
                                <span className="text-xs text-muted-foreground">
                                    by total spend · selected period
                                </span>
                            </CardHeader>
                            <CardContent className="px-0">
                                <div className="divide-y">
                                    {topMerchants.map((m, i) => (
                                        <div
                                            key={m.name}
                                            className="flex items-center gap-4 px-6 py-3"
                                        >
                                            {/* Rank */}
                                            <span className="w-5 flex-shrink-0 text-right text-xs font-medium text-muted-foreground">
                                                {i + 1}
                                            </span>

                                            {/* Logo + name */}
                                            <div className="flex min-w-0 flex-1 items-center gap-3">
                                                <MerchantLogo merchant={m.name} size="md" />
                                                <div className="min-w-0 flex-1">
                                                    <p className="truncate text-sm font-medium">
                                                        {m.name}
                                                    </p>
                                                    {/* Progress bar */}
                                                    <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                                                        <div
                                                            className="h-full rounded-full bg-foreground/70 transition-all"
                                                            style={{ width: `${m.pct}%` }}
                                                        />
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Stats */}
                                            <div className="flex flex-shrink-0 items-center gap-6 text-right">
                                                <div>
                                                    <p className="text-[10px] text-muted-foreground">
                                                        Median
                                                    </p>
                                                    <p className="text-sm tabular-nums">
                                                        {formatCHF(m.median)}
                                                    </p>
                                                </div>
                                                <div>
                                                    <p className="text-[10px] text-muted-foreground">
                                                        {m.count} payment{m.count !== 1 ? "s" : ""}
                                                    </p>
                                                    <p className="text-sm font-semibold tabular-nums">
                                                        {formatCHF(m.total)}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* ─── Balance Over Time (Line Chart) ─────────────── */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">
                                Cumulative Balance
                            </CardTitle>
                            <p className="text-sm text-muted-foreground">
                                Running net balance over time
                            </p>
                        </CardHeader>
                        <CardContent>
                            <ResponsiveContainer width="100%" height={300}>
                                <LineChart data={monthlyData}>
                                    <CartesianGrid
                                        strokeDasharray="3 3"
                                        className="stroke-muted"
                                    />
                                    <XAxis
                                        dataKey="label"
                                        tick={{ fontSize: 12 }}
                                        className="fill-muted-foreground"
                                    />
                                    <YAxis
                                        tick={{ fontSize: 12 }}
                                        className="fill-muted-foreground"
                                        tickFormatter={(v: number) =>
                                            `${(v / 1000).toFixed(0)}k`
                                        }
                                    />
                                    <Tooltip
                                        content={
                                            <ChartTooltip valueLabel="Balance" />
                                        }
                                    />
                                    <ReferenceLine
                                        y={0}
                                        className="stroke-muted-foreground/40"
                                    />
                                    <Line
                                        type="monotone"
                                        dataKey="cumulativeBalance"
                                        stroke="var(--chart-1)"
                                        strokeWidth={2.5}
                                        dot={false}
                                        activeDot={{ r: 5 }}
                                    />
                                </LineChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>

                    {/* ─── Net Cashflow per Month (Bar Chart) ─────────── */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">
                                Net Cashflow per Month
                            </CardTitle>
                            <p className="text-sm text-muted-foreground">
                                Monthly income minus expenses
                            </p>
                        </CardHeader>
                        <CardContent>
                            <ResponsiveContainer width="100%" height={300}>
                                <BarChart data={monthlyData}>
                                    <CartesianGrid
                                        strokeDasharray="3 3"
                                        className="stroke-muted"
                                    />
                                    <XAxis
                                        dataKey="label"
                                        tick={{ fontSize: 12 }}
                                        className="fill-muted-foreground"
                                    />
                                    <YAxis
                                        tick={{ fontSize: 12 }}
                                        className="fill-muted-foreground"
                                        tickFormatter={(v: number) =>
                                            `${(v / 1000).toFixed(0)}k`
                                        }
                                    />
                                    <Tooltip
                                        content={
                                            <ChartTooltip valueLabel="Net" />
                                        }
                                    />
                                    <ReferenceLine
                                        y={0}
                                        className="stroke-muted-foreground/40"
                                    />
                                    <Bar
                                        dataKey="net"
                                        radius={[4, 4, 0, 0]}
                                        maxBarSize={48}
                                    >
                                        {monthlyData.map((entry, idx) => (
                                            <Cell
                                                key={idx}
                                                fill={
                                                    entry.net >= 0
                                                        ? "hsl(152 60% 45%)"
                                                        : "hsl(0 72% 55%)"
                                                }
                                            />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>
                    {/* ─── Casino Spending Overview ────────────────────── */}
                    {casinoData.count > 0 && (
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between pb-2">
                                <div className="flex items-center gap-2">
                                    <Dices className="size-4 text-amber-500" />
                                    <CardTitle className="text-base">
                                        Casino Spending
                                    </CardTitle>
                                </div>
                                <span className="text-xs text-muted-foreground">
                                    {casinoData.count}{" "}
                                    {casinoData.count === 1 ? "transaction" : "transactions"}
                                </span>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                {/* KPI row */}
                                <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                                    {[
                                        {
                                            label: "Total Spent",
                                            value: formatCHF(casinoData.totalSpent),
                                        },
                                        {
                                            label: "Avg per Visit",
                                            value: formatCHF(casinoData.avgPerVisit),
                                        },
                                        {
                                            label: "Worst Month",
                                            value: casinoData.worstMonth
                                                ? formatCHF(casinoData.worstMonth.total)
                                                : "—",
                                        },
                                        {
                                            label: "% of Expenses",
                                            value:
                                                summary.totalOut > 0
                                                    ? `${((casinoData.totalSpent / summary.totalOut) * 100).toFixed(1)}%`
                                                    : "—",
                                        },
                                    ].map((kpi) => (
                                        <div key={kpi.label}>
                                            <p className="text-xs font-medium text-muted-foreground">
                                                {kpi.label}
                                            </p>
                                            <p className="mt-1 text-xl font-bold tabular-nums text-amber-500">
                                                {kpi.value}
                                            </p>
                                        </div>
                                    ))}
                                </div>

                                {/* Bar chart */}
                                {casinoData.monthly.length > 1 && (
                                    <ResponsiveContainer width="100%" height={200}>
                                        <BarChart
                                            data={casinoData.monthly}
                                            margin={{ top: 4, right: 4, left: 0, bottom: 0 }}
                                        >
                                            <CartesianGrid
                                                strokeDasharray="3 3"
                                                className="stroke-muted"
                                            />
                                            <XAxis
                                                dataKey="label"
                                                tick={{ fontSize: 12 }}
                                                className="fill-muted-foreground"
                                            />
                                            <YAxis
                                                tick={{ fontSize: 12 }}
                                                className="fill-muted-foreground"
                                                tickFormatter={(v: number) =>
                                                    v >= 1000
                                                        ? `${(v / 1000).toFixed(0)}k`
                                                        : String(v)
                                                }
                                            />
                                            <Tooltip
                                                content={
                                                    <ChartTooltip valueLabel="Spent" />
                                                }
                                            />
                                            <Bar
                                                dataKey="total"
                                                radius={[4, 4, 0, 0]}
                                                maxBarSize={48}
                                            >
                                                {casinoData.monthly.map((entry, idx) => (
                                                    <Cell
                                                        key={idx}
                                                        fill={
                                                            entry.label === casinoData.worstMonth?.label
                                                                ? "hsl(38 90% 52%)"
                                                                : "hsl(38 70% 65%)"
                                                        }
                                                    />
                                                ))}
                                            </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                )}
                            </CardContent>
                        </Card>
                    )}

                </>
            )}
        </div>
    )
}
