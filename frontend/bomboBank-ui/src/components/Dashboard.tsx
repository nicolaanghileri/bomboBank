import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
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
import { getSummary, getCategoryName, formatCHF } from "@/lib/types"
import {
    TrendingDown,
    Flame,
    CircleDashed,
    AlertCircle,
} from "lucide-react"

export function Dashboard() {
    const { transactions, loading, error } = useTransactions()

    if (loading) {
        return (
            <div className="space-y-8 p-8">
                <div className="grid gap-4 sm:grid-cols-3">
                    {[...Array(3)].map((_, i) => (
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

    if (transactions.length === 0) {
        return (
            <div className="flex items-center justify-center p-16">
                <div className="flex flex-col items-center gap-3 text-center">
                    <CircleDashed className="size-8 text-muted-foreground" />
                    <p className="font-medium">No transactions yet</p>
                    <p className="text-sm text-muted-foreground">
                        Upload a CSV to see your financial overview
                    </p>
                </div>
            </div>
        )
    }

    const summary = getSummary(transactions)

    const recentTransactions = transactions
        .filter((t) => getCategoryName(t) !== "Unassigned")
        .slice(0, 5)

    const sortedCategories = Object.entries(summary.categoryBreakdown).sort(
        ([, a], [, b]) => b - a
    )

    const maxCategoryAmount = sortedCategories[0]?.[1] ?? 1

    return (
        <div className="space-y-8 p-8">
            {/* ─── Quick Check Cards ──────────────────────────────────── */}
            <div className="grid gap-4 sm:grid-cols-3">
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
                            All expenses this month
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

            {/* ─── Spending by Category ───────────────────────────────── */}
            {sortedCategories.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">Spending by Category</CardTitle>
                        <p className="text-sm text-muted-foreground">
                            Breakdown of your categorised expenses
                        </p>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {sortedCategories.map(([category, amount]) => {
                            const widthPercent = (amount / maxCategoryAmount) * 100

                            return (
                                <div key={category} className="space-y-1">
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="font-medium">{category}</span>
                                        <span className="w-24 text-right tabular-nums text-muted-foreground">
                                            {formatCHF(amount)}
                                        </span>
                                    </div>
                                    <div className="h-3 w-full overflow-hidden rounded-full bg-muted">
                                        <div
                                            className="h-full rounded-full bg-foreground/80 transition-all"
                                            style={{ width: `${widthPercent}%` }}
                                        />
                                    </div>
                                </div>
                            )
                        })}
                    </CardContent>
                </Card>
            )}

            {/* ─── Recent Transactions ───────────────────────────────── */}
            {recentTransactions.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">Recent Transactions</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Date</TableHead>
                                    <TableHead>Description</TableHead>
                                    <TableHead>Category</TableHead>
                                    <TableHead className="text-right">Amount</TableHead>
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
                                        <TableCell>
                                            <Badge variant="secondary" className="font-normal">
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
                                                {tx.amount > 0 ? "+" : ""}
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
                Showing {transactions.length} transactions from your account
            </p>
        </div>
    )
}
