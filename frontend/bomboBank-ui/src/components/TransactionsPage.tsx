import { useState, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
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
import { getCategoryName, formatCHF } from "@/lib/types"
import { Search, AlertCircle, CircleDashed } from "lucide-react"
import { cn } from "@/lib/utils"

export function TransactionsPage() {
    const { transactions, categories, loading, error } = useTransactions()
    const [search, setSearch] = useState("")
    const [activeCategory, setActiveCategory] = useState("All")

    // Build category filter list from DB categories
    const categoryNames = useMemo(() => {
        const names = categories.map((c) => c.name)
        return ["All", ...names]
    }, [categories])

    const filtered = useMemo(() => {
        return transactions.filter((tx) => {
            const matchesSearch =
                search === "" ||
                (tx.description ?? "").toLowerCase().includes(search.toLowerCase()) ||
                (tx.purpose ?? "").toLowerCase().includes(search.toLowerCase())

            const matchesCategory =
                activeCategory === "All" || getCategoryName(tx) === activeCategory

            return matchesSearch && matchesCategory
        })
    }, [transactions, search, activeCategory])

    if (loading) {
        return (
            <div className="space-y-6 p-8">
                <div className="flex gap-4">
                    <Skeleton className="h-10 w-64" />
                    <div className="flex gap-1.5">
                        {[...Array(5)].map((_, i) => (
                            <Skeleton key={i} className="h-8 w-20 rounded-full" />
                        ))}
                    </div>
                </div>
                <Card>
                    <CardHeader>
                        <Skeleton className="h-5 w-32" />
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {[...Array(8)].map((_, i) => (
                            <Skeleton key={i} className="h-10 w-full" />
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
                        Upload a CSV to get started
                    </p>
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-6 p-8">
            {/* Filters */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="relative max-w-sm flex-1">
                    <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                        placeholder="Search transactions..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-9"
                    />
                </div>

                <div className="flex flex-wrap gap-1.5">
                    {categoryNames.map((cat) => (
                        <button
                            key={cat}
                            onClick={() => setActiveCategory(cat)}
                            className={cn(
                                "inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                                activeCategory === cat
                                    ? "border-foreground bg-foreground text-background"
                                    : "border-border text-muted-foreground hover:border-foreground hover:text-foreground"
                            )}
                        >
                            {cat}
                        </button>
                    ))}
                </div>
            </div>

            {/* Table */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-base">
                        {filtered.length} transaction{filtered.length !== 1 && "s"}
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[120px]">Date</TableHead>
                                <TableHead>Description</TableHead>
                                <TableHead>Category</TableHead>
                                <TableHead className="text-right w-[130px]">Amount</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filtered.length === 0 ? (
                                <TableRow>
                                    <TableCell
                                        colSpan={4}
                                        className="h-24 text-center text-muted-foreground"
                                    >
                                        No transactions found.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filtered.map((tx) => (
                                    <TableRow key={tx.id}>
                                        <TableCell className="text-muted-foreground tabular-nums">
                                            {tx.booked_at}
                                        </TableCell>
                                        <TableCell className="max-w-[250px] truncate font-medium">
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
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    )
}
