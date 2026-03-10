import { useState, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { useTransactions } from "@/hooks/useTransactions"
import {
    getSummary,
    getMerchantStats,
    formatCHF,
} from "@/lib/types"
import {
    AlertCircle,
    CircleDashed,
    RotateCcw,
} from "lucide-react"
import {
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell,
    Tooltip,
    Legend,
    ComposedChart,
    Bar,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
} from "recharts"

/* ── Default range: last 12 months ──────────────────────────── */
function defaultRange() {
    const end = new Date()
    const start = new Date(end.getFullYear() - 1, end.getMonth(), end.getDate())
    const fmt = (d: Date) => d.toISOString().slice(0, 10)
    return { startDate: fmt(start), endDate: fmt(end) }
}

/* ── Donut palette ──────────────────────────────────────────── */
const PALETTE = [
    "hsl(220 70% 50%)",
    "hsl(152 60% 45%)",
    "hsl(30 90% 55%)",
    "hsl(0 72% 55%)",
    "hsl(280 60% 55%)",
    "hsl(190 70% 45%)",
    "hsl(45 95% 50%)",
    "hsl(330 65% 50%)",
    "hsl(160 50% 40%)",
    "hsl(10 80% 50%)",
    "hsl(250 55% 55%)",
    "hsl(80 60% 45%)",
]

/* ── Build category data for donut ──────────────────────────── */
function getCategoryData(
    categoryBreakdown: Record<string, number>,
    categoryColors: Record<string, string | null>
) {
    const entries = Object.entries(categoryBreakdown).sort(
        ([, a], [, b]) => b - a
    )
    return entries.map(([name, value], idx) => ({
        name,
        value,
        fill: categoryColors[name] ?? PALETTE[idx % PALETTE.length],
    }))
}

/* ── Build Pareto data ──────────────────────────────────────── */
function getParetoData(categoryBreakdown: Record<string, number>) {
    const sorted = Object.entries(categoryBreakdown).sort(
        ([, a], [, b]) => b - a
    )
    const total = sorted.reduce((s, [, v]) => s + v, 0)
    let cumulative = 0
    return sorted.map(([name, value]) => {
        cumulative += value
        return {
            name,
            amount: value,
            cumulativePercent: total > 0 ? (cumulative / total) * 100 : 0,
        }
    })
}

/* ── Custom tooltip ─────────────────────────────────────────── */
function DonutTooltip({
    active,
    payload,
}: {
    active?: boolean
    payload?: { name: string; value: number }[]
}) {
    if (!active || !payload?.length) return null
    const { name, value } = payload[0]
    return (
        <div className="rounded-lg border bg-background px-3 py-2 shadow-lg">
            <p className="text-xs font-medium text-muted-foreground">{name}</p>
            <p className="text-sm font-semibold tabular-nums">
                {formatCHF(value)}
            </p>
        </div>
    )
}

function ParetoTooltip({
    active,
    payload,
    label,
}: {
    active?: boolean
    payload?: { value: number; dataKey: string }[]
    label?: string
}) {
    if (!active || !payload?.length) return null
    return (
        <div className="rounded-lg border bg-background px-3 py-2 shadow-lg">
            <p className="text-xs font-medium text-muted-foreground">{label}</p>
            {payload.map((p) => (
                <p key={p.dataKey} className="text-sm tabular-nums">
                    {p.dataKey === "amount"
                        ? formatCHF(p.value)
                        : `${p.value.toFixed(1)}%`}
                </p>
            ))}
        </div>
    )
}

export function SpendingPage() {
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

    const merchantStats = useMemo(
        () => getMerchantStats(transactions),
        [transactions]
    )

    const categoryData = useMemo(
        () =>
            getCategoryData(
                summary.categoryBreakdown,
                summary.categoryColors
            ),
        [summary]
    )

    const paretoData = useMemo(
        () => getParetoData(summary.categoryBreakdown),
        [summary]
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
                <div className="grid gap-6 lg:grid-cols-2">
                    <Card>
                        <CardContent className="pt-6">
                            <Skeleton className="mx-auto size-64 rounded-full" />
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="pt-6">
                            <Skeleton className="h-64 w-full rounded-lg" />
                        </CardContent>
                    </Card>
                </div>
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
                    {/* ─── Donut + Pareto side by side ────────────────── */}
                    <div className="grid gap-6 lg:grid-cols-2">
                        {/* Donut: Categories */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-base">
                                    Spending by Category
                                </CardTitle>
                                <p className="text-sm text-muted-foreground">
                                    Breakdown of categorised expenses
                                </p>
                            </CardHeader>
                            <CardContent>
                                {categoryData.length === 0 ? (
                                    <p className="py-12 text-center text-sm text-muted-foreground">
                                        No categorised expenses
                                    </p>
                                ) : (
                                    <ResponsiveContainer
                                        width="100%"
                                        height={320}
                                    >
                                        <PieChart>
                                            <Pie
                                                data={categoryData}
                                                dataKey="value"
                                                nameKey="name"
                                                cx="50%"
                                                cy="50%"
                                                innerRadius={65}
                                                outerRadius={110}
                                                paddingAngle={2}
                                                strokeWidth={0}
                                            >
                                                {categoryData.map(
                                                    (entry, idx) => (
                                                        <Cell
                                                            key={idx}
                                                            fill={entry.fill}
                                                        />
                                                    )
                                                )}
                                            </Pie>
                                            <Tooltip
                                                content={<DonutTooltip />}
                                            />
                                            <Legend
                                                verticalAlign="bottom"
                                                height={36}
                                                iconType="circle"
                                                iconSize={8}
                                                formatter={(value: string) => (
                                                    <span className="text-xs text-foreground">
                                                        {value}
                                                    </span>
                                                )}
                                            />
                                        </PieChart>
                                    </ResponsiveContainer>
                                )}
                            </CardContent>
                        </Card>

                        {/* Pareto Chart */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-base">
                                    Pareto Analysis
                                </CardTitle>
                                <p className="text-sm text-muted-foreground">
                                    Which categories drive most of your spending
                                </p>
                            </CardHeader>
                            <CardContent>
                                {paretoData.length === 0 ? (
                                    <p className="py-12 text-center text-sm text-muted-foreground">
                                        No data available
                                    </p>
                                ) : (
                                    <ResponsiveContainer
                                        width="100%"
                                        height={320}
                                    >
                                        <ComposedChart data={paretoData}>
                                            <CartesianGrid
                                                strokeDasharray="3 3"
                                                className="stroke-muted"
                                            />
                                            <XAxis
                                                dataKey="name"
                                                tick={{ fontSize: 11 }}
                                                className="fill-muted-foreground"
                                                angle={-35}
                                                textAnchor="end"
                                                height={60}
                                            />
                                            <YAxis
                                                yAxisId="amount"
                                                orientation="left"
                                                tick={{ fontSize: 12 }}
                                                className="fill-muted-foreground"
                                                tickFormatter={(v: number) =>
                                                    `${(v / 1000).toFixed(0)}k`
                                                }
                                            />
                                            <YAxis
                                                yAxisId="percent"
                                                orientation="right"
                                                domain={[0, 100]}
                                                tick={{ fontSize: 12 }}
                                                className="fill-muted-foreground"
                                                tickFormatter={(v: number) =>
                                                    `${v}%`
                                                }
                                            />
                                            <Tooltip
                                                content={<ParetoTooltip />}
                                            />
                                            <Bar
                                                yAxisId="amount"
                                                dataKey="amount"
                                                fill="hsl(220 70% 50%)"
                                                radius={[4, 4, 0, 0]}
                                                maxBarSize={40}
                                                opacity={0.8}
                                            />
                                            <Line
                                                yAxisId="percent"
                                                type="monotone"
                                                dataKey="cumulativePercent"
                                                stroke="hsl(0 72% 55%)"
                                                strokeWidth={2}
                                                dot={{ r: 3 }}
                                            />
                                        </ComposedChart>
                                    </ResponsiveContainer>
                                )}
                            </CardContent>
                        </Card>
                    </div>

                    {/* ─── Top Merchants Table ────────────────────────── */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">
                                Top Merchants
                            </CardTitle>
                            <p className="text-sm text-muted-foreground">
                                Where your money goes — sorted by total spent
                            </p>
                        </CardHeader>
                        <CardContent>
                            {merchantStats.length === 0 ? (
                                <p className="py-8 text-center text-sm text-muted-foreground">
                                    No expense transactions found
                                </p>
                            ) : (
                                <div className="max-h-[480px] overflow-auto">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead className="w-8">
                                                    #
                                                </TableHead>
                                                <TableHead>Merchant</TableHead>
                                                <TableHead className="text-right">
                                                    Total
                                                </TableHead>
                                                <TableHead className="text-right">
                                                    # Tx
                                                </TableHead>
                                                <TableHead className="text-right">
                                                    Avg
                                                </TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {merchantStats.map(
                                                (row, idx) => (
                                                    <TableRow key={row.merchant}>
                                                        <TableCell className="text-muted-foreground tabular-nums">
                                                            {idx + 1}
                                                        </TableCell>
                                                        <TableCell className="max-w-[240px] truncate font-medium">
                                                            {row.merchant}
                                                        </TableCell>
                                                        <TableCell className="text-right tabular-nums font-medium">
                                                            {formatCHF(
                                                                row.totalSpent
                                                            )}
                                                        </TableCell>
                                                        <TableCell className="text-right tabular-nums text-muted-foreground">
                                                            {row.txCount}
                                                        </TableCell>
                                                        <TableCell className="text-right tabular-nums text-muted-foreground">
                                                            {formatCHF(
                                                                row.avgSpent
                                                            )}
                                                        </TableCell>
                                                    </TableRow>
                                                )
                                            )}
                                        </TableBody>
                                    </Table>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </>
            )}
        </div>
    )
}
