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
    Sigma,
    Timer,
    AlertCircle,
    CircleDashed,
    RotateCcw,
} from "lucide-react"
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
                <div className="grid gap-4 sm:grid-cols-4">
                    {[...Array(4)].map((_, i) => (
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
    const runwayLabel =
        summary.runway === Infinity
            ? "∞"
            : summary.runway < 0
              ? "—"
              : `${summary.runway.toFixed(1)} mo`

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
        {
            title: "Net",
            value: formatCHF(summary.net),
            icon: <Sigma className="size-4" />,
            color:
                summary.net >= 0
                    ? "text-emerald-600 dark:text-emerald-400"
                    : "text-rose-600 dark:text-rose-400",
        },
        {
            title: "Runway",
            value: runwayLabel,
            icon: <Timer className="size-4" />,
            color: "text-blue-600 dark:text-blue-400",
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
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
                                        stroke="hsl(var(--chart-1, 220 70% 50%))"
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
                </>
            )}
        </div>
    )
}
