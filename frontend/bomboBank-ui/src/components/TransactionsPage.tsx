import { useState, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
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
import {
    Search,
    AlertCircle,
    CircleDashed,
    ChevronLeft,
    ChevronRight,
    Calendar,
    ArrowUpDown,
    ArrowUp,
    ArrowDown,
} from "lucide-react"
import { cn } from "@/lib/utils"

/** Get the first and last day of a given month (ISO date strings). */
function getMonthRange(year: number, month: number) {
    const start = new Date(year, month, 1)
    const end = new Date(year, month + 1, 0)
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

type SortField = "booked_at" | "amount" | "merchant" | "description"
type SortDir = "asc" | "desc"

export function TransactionsPage() {
    const now = new Date()
    const [year, setYear] = useState(now.getFullYear())
    const [month, setMonth] = useState(now.getMonth())
    const [allTime, setAllTime] = useState(false)

    const { startDate, endDate } = useMemo(
        () => getMonthRange(year, month),
        [year, month]
    )

    const { transactions, categories, loading, error } = useTransactions(
        allTime ? undefined : { startDate, endDate }
    )

    const [search, setSearch] = useState("")
    const [activeCategory, setActiveCategory] = useState("All")
    const [sortField, setSortField] = useState<SortField>("booked_at")
    const [sortDir, setSortDir] = useState<SortDir>("desc")

    // Build category filter list from DB categories
    const categoryNames = useMemo(() => {
        const names = categories.map((c) => c.name)
        return ["All", ...names]
    }, [categories])

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

    function toggleSort(field: SortField) {
        if (sortField === field) {
            setSortDir((d) => (d === "asc" ? "desc" : "asc"))
        } else {
            setSortField(field)
            setSortDir(field === "amount" ? "desc" : "asc")
        }
    }

    function SortIcon({ field }: { field: SortField }) {
        if (sortField !== field)
            return <ArrowUpDown className="ml-1 inline size-3 text-muted-foreground/50" />
        return sortDir === "asc" ? (
            <ArrowUp className="ml-1 inline size-3" />
        ) : (
            <ArrowDown className="ml-1 inline size-3" />
        )
    }

    const filtered = useMemo(() => {
        const result = transactions.filter((tx) => {
            const q = search.toLowerCase()
            const matchesSearch =
                search === "" ||
                (tx.description ?? "").toLowerCase().includes(q) ||
                (tx.purpose ?? "").toLowerCase().includes(q) ||
                (tx.merchant ?? "").toLowerCase().includes(q) ||
                (tx.iban ?? "").toLowerCase().includes(q)

            const matchesCategory =
                activeCategory === "All" ||
                getCategoryName(tx) === activeCategory

            return matchesSearch && matchesCategory
        })

        // Sort
        result.sort((a, b) => {
            let cmp = 0
            switch (sortField) {
                case "booked_at":
                    cmp = a.booked_at.localeCompare(b.booked_at)
                    break
                case "amount":
                    cmp = a.amount - b.amount
                    break
                case "merchant":
                    cmp = (a.merchant ?? "").localeCompare(b.merchant ?? "")
                    break
                case "description":
                    cmp = (a.description ?? "").localeCompare(
                        b.description ?? ""
                    )
                    break
            }
            return sortDir === "asc" ? cmp : -cmp
        })

        return result
    }, [transactions, search, activeCategory, sortField, sortDir])

    const monthLabel = `${MONTH_NAMES[month]} ${year}`

    if (loading) {
        return (
            <div className="space-y-6 p-8">
                <div className="flex gap-4">
                    <Skeleton className="h-10 w-64" />
                    <div className="flex gap-1.5">
                        {[...Array(5)].map((_, i) => (
                            <Skeleton
                                key={i}
                                className="h-8 w-20 rounded-full"
                            />
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

    return (
        <div className="space-y-6 p-8">
            {/* ─── Month Picker ──────────────────────────────────── */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    {!allTime && (
                        <>
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
                        </>
                    )}
                    {allTime && (
                        <div className="flex items-center gap-2">
                            <Calendar className="size-4 text-muted-foreground" />
                            <span className="text-lg font-semibold tracking-tight">
                                All Time
                            </span>
                        </div>
                    )}
                </div>

                <div className="flex items-center gap-2">
                    {!isCurrentMonth && !allTime && (
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={goToToday}
                        >
                            Today
                        </Button>
                    )}
                    <Button
                        variant={allTime ? "default" : "outline"}
                        size="sm"
                        onClick={() => setAllTime((v) => !v)}
                    >
                        {allTime ? "Show Month" : "Show All"}
                    </Button>
                </div>
            </div>

            {/* ─── Search + Category Filters ──────────────────────── */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="relative max-w-sm flex-1">
                    <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                        placeholder="Search description, merchant, purpose, IBAN..."
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

            {/* ─── Empty state ────────────────────────────────────── */}
            {transactions.length === 0 ? (
                <div className="flex items-center justify-center p-16">
                    <div className="flex flex-col items-center gap-3 text-center">
                        <CircleDashed className="size-8 text-muted-foreground" />
                        <p className="font-medium">
                            {allTime
                                ? "No transactions yet"
                                : `No transactions in ${monthLabel}`}
                        </p>
                        <p className="text-sm text-muted-foreground">
                            {allTime
                                ? "Upload a CSV to get started"
                                : "Try selecting a different month or show all"}
                        </p>
                    </div>
                </div>
            ) : (
                /* ─── Table ──────────────────────────────────────── */
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">
                            {filtered.length} transaction
                            {filtered.length !== 1 && "s"}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead
                                        className="w-[120px] cursor-pointer select-none"
                                        onClick={() =>
                                            toggleSort("booked_at")
                                        }
                                    >
                                        Date
                                        <SortIcon field="booked_at" />
                                    </TableHead>
                                    <TableHead
                                        className="cursor-pointer select-none"
                                        onClick={() =>
                                            toggleSort("description")
                                        }
                                    >
                                        Description
                                        <SortIcon field="description" />
                                    </TableHead>
                                    <TableHead
                                        className="cursor-pointer select-none"
                                        onClick={() =>
                                            toggleSort("merchant")
                                        }
                                    >
                                        Merchant
                                        <SortIcon field="merchant" />
                                    </TableHead>
                                    <TableHead>Category</TableHead>
                                    <TableHead
                                        className="w-[130px] cursor-pointer select-none text-right"
                                        onClick={() => toggleSort("amount")}
                                    >
                                        Amount
                                        <SortIcon field="amount" />
                                    </TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filtered.length === 0 ? (
                                    <TableRow>
                                        <TableCell
                                            colSpan={5}
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
                                            <TableCell className="max-w-[160px] truncate text-muted-foreground">
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
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            )}
        </div>
    )
}
