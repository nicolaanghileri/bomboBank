import { useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { useTransactions } from "@/hooks/useTransactions"
import { getRecurringPayments, formatCHF } from "@/lib/types"
import { RefreshCw, TrendingDown, CreditCard, AlertCircle } from "lucide-react"

// ── Helpers ───────────────────────────────────────────────────

const MONTH_NAMES = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
]

function monthLabel(yyyymm: string): string {
    const [yyyy, mm] = yyyymm.split("-")
    return `${MONTH_NAMES[parseInt(mm, 10) - 1]} ${yyyy.slice(2)}`
}

/** Returns the last 12 calendar months as YYYY-MM strings, oldest first. */
function getLast12Months(): string[] {
    const now = new Date()
    return Array.from({ length: 12 }, (_, i) => {
        const d = new Date(now.getFullYear(), now.getMonth() - (11 - i), 1)
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
    })
}

// ── Component ─────────────────────────────────────────────────

export function RecurringPage() {
    const { transactions, loading, error } = useTransactions()

    const last12 = useMemo(() => getLast12Months(), [])

    const allRecurring = useMemo(
        () => getRecurringPayments(transactions),
        [transactions]
    )

    // Filter: amount ≥ CHF 20 per occurrence OR appeared in 4+ months, sorted by total paid desc
    const recurring = useMemo(
        () =>
            allRecurring
                .filter((r) => Math.abs(r.amount) >= 20 || r.months.length >= 4)
                .sort((a, b) => b.totalPaid - a.totalPaid),
        [allRecurring]
    )

    // "Active" = appeared in the current or previous month
    const currentMonth = last12[last12.length - 1]
    const prevMonth = last12[last12.length - 2]

    const activeNow = useMemo(
        () =>
            recurring.filter(
                (r) =>
                    r.months.includes(currentMonth) ||
                    r.months.includes(prevMonth)
            ),
        [recurring, currentMonth, prevMonth]
    )

    const monthlyTotal = activeNow.reduce((s, r) => s + Math.abs(r.amount), 0)
    const totalPaid = recurring.reduce((s, r) => s + r.totalPaid, 0)

    // ── Loading ───────────────────────────────────────────────
    if (loading) {
        return (
            <div className="space-y-6 p-6">
                <div className="grid gap-4 sm:grid-cols-3">
                    {[0, 1, 2].map((i) => (
                        <Card key={i}>
                            <CardHeader className="pb-2">
                                <Skeleton className="h-4 w-32" />
                            </CardHeader>
                            <CardContent>
                                <Skeleton className="h-8 w-24" />
                                <Skeleton className="mt-1.5 h-3 w-40" />
                            </CardContent>
                        </Card>
                    ))}
                </div>
                <Card>
                    <CardHeader>
                        <Skeleton className="h-5 w-48" />
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {[0, 1, 2, 3, 4].map((i) => (
                            <Skeleton key={i} className="h-12 w-full rounded-lg" />
                        ))}
                    </CardContent>
                </Card>
            </div>
        )
    }

    // ── Error ─────────────────────────────────────────────────
    if (error) {
        return (
            <div className="flex flex-col items-center justify-center gap-3 p-16 text-muted-foreground">
                <AlertCircle className="size-8" />
                <p className="text-sm">{error}</p>
            </div>
        )
    }

    // ── Main render ───────────────────────────────────────────
    return (
        <div className="space-y-6 p-6">
            {/* ── Stat cards ── */}
            <div className="grid gap-4 sm:grid-cols-3">
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                            <RefreshCw className="size-4" />
                            Active Subscriptions
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-3xl font-bold">{activeNow.length}</p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                            seen in the last 2 months
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                            <TrendingDown className="size-4" />
                            Monthly Cost
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-3xl font-bold tabular-nums text-destructive">
                            {formatCHF(monthlyTotal)}
                        </p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                            active subscriptions only
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                            <CreditCard className="size-4" />
                            Total Paid
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-3xl font-bold tabular-nums">
                            {formatCHF(totalPaid)}
                        </p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                            across all detected recurring payments
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* ── Table ── */}
            <Card>
                <CardHeader>
                    <CardTitle>Detected Recurring Payments</CardTitle>
                    <p className="text-sm text-muted-foreground">
                        Same amount recurring in multiple months — showing payments ≥ CHF 20 or appearing 4+ times.
                    </p>
                </CardHeader>
                <CardContent className="px-0">
                    {recurring.length === 0 ? (
                        <div className="flex flex-col items-center gap-2 py-14 text-muted-foreground">
                            <RefreshCw className="size-8" />
                            <p className="text-sm font-medium">No recurring payments detected</p>
                            <p className="text-xs">Upload more transactions to reveal patterns</p>
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="pl-6">Description</TableHead>
                                    <TableHead className="w-36 text-right">Amount / mo</TableHead>
                                    <TableHead className="w-52">
                                        <span className="flex items-center gap-1">
                                            Activity
                                            <span className="text-[10px] font-normal text-muted-foreground">
                                                (last 12 months)
                                            </span>
                                        </span>
                                    </TableHead>
                                    <TableHead className="w-32 text-right">Total Paid</TableHead>
                                    <TableHead className="w-24 pr-6 text-right">Times</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {recurring.map((r) => {
                                    const isActive =
                                        r.months.includes(currentMonth) ||
                                        r.months.includes(prevMonth)
                                    const monthSet = new Set(r.months)

                                    return (
                                        <TableRow key={r.key}>
                                            {/* Description + category */}
                                            <TableCell className="pl-6">
                                                <div className="flex items-center gap-2.5">
                                                    <span
                                                        className={`mt-0.5 size-2 flex-shrink-0 rounded-full ${
                                                            isActive
                                                                ? "bg-emerald-500"
                                                                : "bg-muted-foreground"
                                                        }`}
                                                    />
                                                    <div>
                                                        <p className="font-medium leading-snug">
                                                            {r.description}
                                                        </p>
                                                        {r.category && (
                                                            <Badge
                                                                variant="outline"
                                                                className="mt-0.5 h-4 px-1.5 text-[10px]"
                                                                style={
                                                                    r.categoryColor
                                                                        ? {
                                                                              borderColor:
                                                                                  r.categoryColor,
                                                                              color: r.categoryColor,
                                                                          }
                                                                        : undefined
                                                                }
                                                            >
                                                                {r.category}
                                                            </Badge>
                                                        )}
                                                    </div>
                                                </div>
                                            </TableCell>

                                            {/* Amount */}
                                            <TableCell className="text-right font-semibold tabular-nums text-destructive">
                                                {formatCHF(Math.abs(r.amount))}
                                            </TableCell>

                                            {/* Activity dots */}
                                            <TableCell>
                                                <div
                                                    className="flex items-end gap-0.5"
                                                    title={r.months.map(monthLabel).join(", ")}
                                                >
                                                    {last12.map((m) => (
                                                        <div
                                                            key={m}
                                                            title={monthLabel(m)}
                                                            className={`h-4 w-2.5 rounded-sm transition-colors ${
                                                                monthSet.has(m)
                                                                    ? "bg-foreground"
                                                                    : "bg-muted"
                                                            }`}
                                                        />
                                                    ))}
                                                </div>
                                            </TableCell>

                                            {/* Total paid */}
                                            <TableCell className="text-right tabular-nums text-muted-foreground">
                                                {formatCHF(r.totalPaid)}
                                            </TableCell>

                                            {/* Occurrence count */}
                                            <TableCell className="pr-6 text-right">
                                                <Badge variant="secondary">
                                                    {r.months.length}×
                                                </Badge>
                                            </TableCell>
                                        </TableRow>
                                    )
                                })}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
