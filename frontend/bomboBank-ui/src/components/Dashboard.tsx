import { useState, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { useTransactions } from "@/hooks/useTransactions"
import { getSummary, getCategoryName, formatCHF } from "@/lib/types"
import {
    TrendingDown,
    TrendingUp,
    Flame,
    CircleDashed,
    AlertCircle,
    ChevronLeft,
    ChevronRight,
    Calendar,
    Dices,
} from "lucide-react"

/** Get the first and last day of a given month (ISO date strings). */
function getMonthRange(year: number, month: number) {
    const start = new Date(year, month, 1)
    const end = new Date(year, month + 1, 0) // last day of the month
    const fmt = (d: Date) => d.toISOString().slice(0, 10)
    return { startDate: fmt(start), endDate: fmt(end) }
}

const MONTH_NAMES = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
]

export function Dashboard() {
    const now = new Date()
    const [year, setYear] = useState(now.getFullYear())
    const [month, setMonth] = useState(now.getMonth())

    const { startDate, endDate } = useMemo(
        () => getMonthRange(year, month),
        [year, month]
    )

    const { transactions, loading, error } = useTransactions({
        startDate,
        endDate,
    })

    const isCurrentMonth =
        year === now.getFullYear() && month === now.getMonth()

    function goToPrevMonth() {
        if (month === 0) {
            setMonth(11)
            setYear((y) => y - 1)
        } else {
            setMonth((m) => m - 1)
        }
    }

    function goToNextMonth() {
        if (month === 11) {
            setMonth(0)
            setYear((y) => y + 1)
        } else {
            setMonth((m) => m + 1)
        }
    }

    function goToToday() {
        setYear(now.getFullYear())
        setMonth(now.getMonth())
    }

    if (loading) {
        return (
            <div className="space-y-8 p-8">
                <div className="flex items-center justify-between">
                    <Skeleton className="h-9 w-60" />
                    <Skeleton className="h-9 w-24" />
                </div>
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
                    <CardHeader>
                        <Skeleton className="h-5 w-40" />
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {[...Array(4)].map((_, i) => (
                            <div key={i} className="space-y-2">
                                <Skeleton className="h-4 w-full" />
                                <Skeleton className="h-3 w-full rounded-full" />
                            </div>
                        ))}
                    </CardContent>
                </Card>
            </div>
        )
    }

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

    const summary = getSummary(transactions, startDate, endDate)

    const recentTransactions = transactions
        .filter((t) => getCategoryName(t) !== "Unassigned")
        .slice(0, 5)

    const sortedCategories = Object.entries(summary.categoryBreakdown).sort(
        ([, a], [, b]) => b - a
    )

    const maxCategoryAmount = sortedCategories[0]?.[1] ?? 1

    const monthLabel = `${MONTH_NAMES[month]} ${year}`

    // ── Casino Baden grouping ──────────────────────────────
    const casinoTransactions = transactions.filter((t) =>
        (t.description ?? "").toUpperCase().includes("CASINO BADEN")
    )
    const casinoTotal = casinoTransactions.reduce(
        (sum, t) => sum + Math.abs(t.amount),
        0
    )
    const casinoVisits = casinoTransactions.length
    const casinoAvg = casinoVisits > 0 ? casinoTotal / casinoVisits : 0

    return (
        <div className="space-y-8 p-8">
            {/* ─── Month Picker ──────────────────────────────────────── */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        size="icon"
                        className="size-9"
                        onClick={goToPrevMonth}
                    >
                        <ChevronLeft className="size-4" />
                    </Button>
                    <div className="flex min-w-[180px] items-center justify-center gap-2">
                        <Calendar className="size-4 text-muted-foreground" />
                        <span className="text-lg font-semibold tracking-tight">
                            {monthLabel}
                        </span>
                    </div>
                    <Button
                        variant="outline"
                        size="icon"
                        className="size-9"
                        onClick={goToNextMonth}
                    >
                        <ChevronRight className="size-4" />
                    </Button>
                </div>

                {!isCurrentMonth && (
                    <Button variant="outline" size="sm" onClick={goToToday}>
                        Today
                    </Button>
                )}
            </div>

            {/* Empty state */}
            {transactions.length === 0 ? (
                <div className="flex items-center justify-center p-16">
                    <div className="flex flex-col items-center gap-3 text-center">
                        <CircleDashed className="size-8 text-muted-foreground" />
                        <p className="font-medium">
                            No transactions in {monthLabel}
                        </p>
                        <p className="text-sm text-muted-foreground">
                            Try selecting a different month
                        </p>
                    </div>
                </div>
            ) : (
                <>
                    {/* ─── Quick Check Cards ────────────────────────────── */}
                    <div className="grid gap-4 sm:grid-cols-4">
                        {/* Total Income */}
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between pb-2">
                                <CardTitle className="text-sm font-medium text-muted-foreground">
                                    Total Income
                                </CardTitle>
                                <TrendingUp className="size-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold tabular-nums">
                                    {formatCHF(summary.totalIncome)}
                                </div>
                                <p className="mt-1 text-xs text-muted-foreground">
                                    Income in {monthLabel}
                                </p>
                            </CardContent>
                        </Card>

                        {/* Total Out */}
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between pb-2">
                                <CardTitle className="text-sm font-medium text-muted-foreground">
                                    Total Out
                                </CardTitle>
                                <TrendingDown className="size-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold tabular-nums">
                                    {formatCHF(summary.totalOut)}
                                </div>
                                <p className="mt-1 text-xs text-muted-foreground">
                                    Expenses in {monthLabel}
                                </p>
                            </CardContent>
                        </Card>

                        {/* Burn Rate */}
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between pb-2">
                                <CardTitle className="text-sm font-medium text-muted-foreground">
                                    Burn Rate
                                </CardTitle>
                                <Flame className="size-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold tabular-nums">
                                    {formatCHF(summary.burnRate)}
                                    <span className="ml-1 text-sm font-normal text-muted-foreground">
                                        /day
                                    </span>
                                </div>
                                <p className="mt-1 text-xs text-muted-foreground">
                                    Average daily spending
                                </p>
                            </CardContent>
                        </Card>

                        {/* Unassigned */}
                        <Card
                            className={
                                summary.unassignedCount > 0
                                    ? "border-foreground/30"
                                    : ""
                            }
                        >
                            <CardHeader className="flex flex-row items-center justify-between pb-2">
                                <CardTitle className="text-sm font-medium text-muted-foreground">
                                    Unassigned
                                </CardTitle>
                                <CircleDashed className="size-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="flex items-baseline gap-2">
                                    <span className="text-2xl font-bold tabular-nums">
                                        {summary.unassignedCount}
                                    </span>
                                    {summary.unassignedCount > 0 && (
                                        <Badge
                                            variant="secondary"
                                            className="text-xs font-normal"
                                        >
                                            needs review
                                        </Badge>
                                    )}
                                </div>
                                <p className="mt-1 text-xs text-muted-foreground">
                                    Transactions without categories
                                </p>
                            </CardContent>
                        </Card>
                    </div>

                    {/* ─── Casino Baden ────────────────────────────────── */}
                    {casinoVisits > 0 && (
                        <Card className="border-amber-500/30 bg-gradient-to-br from-amber-50/50 to-background dark:from-amber-950/20">
                            <CardHeader className="flex flex-row items-center justify-between pb-2">
                                <CardTitle className="text-base">
                                    🎰 Casino Baden
                                </CardTitle>
                                <Dices className="size-5 text-amber-600 dark:text-amber-400" />
                            </CardHeader>
                            <CardContent>
                                <div className="grid gap-4 sm:grid-cols-3">
                                    <div>
                                        <p className="text-2xl font-bold tabular-nums">
                                            {formatCHF(casinoTotal)}
                                        </p>
                                        <p className="mt-1 text-xs text-muted-foreground">
                                            Total spent
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-2xl font-bold tabular-nums">
                                            {casinoVisits}
                                        </p>
                                        <p className="mt-1 text-xs text-muted-foreground">
                                            {casinoVisits === 1 ? "Visit" : "Visits"}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-2xl font-bold tabular-nums">
                                            {formatCHF(casinoAvg)}
                                        </p>
                                        <p className="mt-1 text-xs text-muted-foreground">
                                            Avg per visit
                                        </p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* ─── Spending by Category ─────────────────────────── */}
                    {sortedCategories.length > 0 && (
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-base">
                                    Spending by Category
                                </CardTitle>
                                <p className="text-sm text-muted-foreground">
                                    Breakdown of your categorised expenses
                                </p>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                {sortedCategories.map(
                                    ([category, amount]) => {
                                        const widthPercent =
                                            (amount / maxCategoryAmount) * 100
                                        const color =
                                            summary.categoryColors[category]

                                        return (
                                            <div
                                                key={category}
                                                className="space-y-1"
                                            >
                                                <div className="flex items-center justify-between text-sm">
                                                    <span className="font-medium">
                                                        {category}
                                                    </span>
                                                    <span className="w-24 text-right tabular-nums text-muted-foreground">
                                                        {formatCHF(amount)}
                                                    </span>
                                                </div>
                                                <div className="h-3 w-full overflow-hidden rounded-full bg-muted">
                                                    <div
                                                        className="h-full rounded-full transition-all"
                                                        style={{
                                                            width: `${widthPercent}%`,
                                                            backgroundColor:
                                                                color ??
                                                                undefined,
                                                        }}
                                                    />
                                                </div>
                                            </div>
                                        )
                                    }
                                )}
                            </CardContent>
                        </Card>
                    )}

                    {/* ─── Recent Transactions ─────────────────────────── */}
                    {recentTransactions.length > 0 && (
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-base">
                                    Recent Transactions
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Date</TableHead>
                                            <TableHead>Description</TableHead>
                                            <TableHead>Merchant</TableHead>
                                            <TableHead>Category</TableHead>
                                            <TableHead className="text-right">
                                                Amount
                                            </TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {recentTransactions.map((tx) => (
                                            <TableRow key={tx.id}>
                                                <TableCell className="text-muted-foreground tabular-nums">
                                                    {tx.booked_at}
                                                </TableCell>
                                                <TableCell className="max-w-[200px] truncate font-medium">
                                                    {tx.description ?? "—"}
                                                </TableCell>
                                                <TableCell className="max-w-[140px] truncate text-muted-foreground">
                                                    {tx.merchant ?? "—"}
                                                </TableCell>
                                                <TableCell>
                                                    <Badge
                                                        variant="secondary"
                                                        className="font-normal"
                                                    >
                                                        {getCategoryName(tx)}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-right tabular-nums font-medium">
                                                    <span
                                                        className={
                                                            tx.amount > 0
                                                                ? "text-foreground"
                                                                : "text-muted-foreground"
                                                        }
                                                    >
                                                        {tx.amount > 0
                                                            ? "+"
                                                            : ""}
                                                        {formatCHF(tx.amount)}
                                                    </span>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                    )}

                    <Separator />

                    <p className="text-center text-xs text-muted-foreground">
                        Showing {transactions.length} transactions in{" "}
                        {monthLabel}
                    </p>
                </>
            )}
        </div>
    )
}
