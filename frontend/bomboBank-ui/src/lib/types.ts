// ── Supabase row types ──────────────────────────────────────

export interface DbCategory {
    id: string
    name: string
    icon: string | null
    color: string | null
    user_id: string
    created_at: string
}

/** Row returned from `transactions` with a joined `categories` relation. */
export interface DbTransaction {
    id: string
    user_id: string
    category_id: string | null
    amount: number
    currency: string | null
    booked_at: string
    description: string | null
    purpose: string | null
    iban: string | null
    import_hash: string | null
    created_at: string
    merchant: string | null
    raw_text: string | null
    categories: Pick<DbCategory, "name" | "icon" | "color"> | null
}

// ── Helpers ─────────────────────────────────────────────────

export function formatCHF(amount: number) {
    return new Intl.NumberFormat("de-CH", {
        style: "currency",
        currency: "CHF",
    }).format(amount)
}

export function getCategoryName(tx: DbTransaction): string {
    return tx.categories?.name ?? "Unassigned"
}

export function getCategoryColor(tx: DbTransaction): string | null {
    return tx.categories?.color ?? null
}

export function isExpense(tx: DbTransaction): boolean {
    return tx.amount < 0
}

export interface Summary {
    totalIncome: number
    totalExpenses: number
    totalOut: number
    net: number
    transactionCount: number
    burnRate: number
    runway: number
    unassignedCount: number
    categoryBreakdown: Record<string, number>
    /** Maps category name → color from DB */
    categoryColors: Record<string, string | null>
}

/**
 * Compute summary stats for the given transactions.
 * @param startDate – period start (ISO string), used for burn-rate calculation
 * @param endDate   – period end (ISO string), used for burn-rate calculation
 */
export function getSummary(
    data: DbTransaction[],
    startDate?: string,
    endDate?: string
): Summary {
    const expenses = data.filter(isExpense)

    const totalIncome = data
        .filter((t) => t.amount > 0)
        .reduce((sum, t) => sum + t.amount, 0)

    const totalExpenses = expenses
        .filter((t) => getCategoryName(t) !== "Unassigned")
        .reduce((sum, t) => sum + Math.abs(t.amount), 0)

    const totalOut = expenses.reduce((sum, t) => sum + Math.abs(t.amount), 0)

    // Compute days elapsed within the period for burn-rate
    let daysElapsed: number
    if (startDate && endDate) {
        const start = new Date(startDate)
        const end = new Date(endDate)
        const now = new Date()
        // If the period hasn't ended yet, use today as the endpoint
        const effectiveEnd = now < end ? now : end
        daysElapsed = Math.max(
            1,
            Math.ceil(
                (effectiveEnd.getTime() - start.getTime()) /
                    (1000 * 60 * 60 * 24)
            )
        )
    } else {
        daysElapsed = Math.max(1, new Date().getDate())
    }
    const burnRate = totalOut / daysElapsed

    const unassignedCount = data.filter(
        (t) => getCategoryName(t) === "Unassigned"
    ).length

    const categoryColors: Record<string, string | null> = {}
    const categoryBreakdown = expenses
        .filter((t) => getCategoryName(t) !== "Unassigned")
        .reduce(
            (acc, t) => {
                const cat = getCategoryName(t)
                acc[cat] = (acc[cat] || 0) + Math.abs(t.amount)
                if (!(cat in categoryColors)) {
                    categoryColors[cat] = getCategoryColor(t)
                }
                return acc
            },
            {} as Record<string, number>
        )

    // Runway: how many months of balance left at current avg monthly burn
    const monthlyAgg = getMonthlyAggregates(data)
    const avgMonthlyBurn =
        monthlyAgg.length > 0
            ? monthlyAgg.reduce((s, m) => s + m.expense, 0) / monthlyAgg.length
            : 0
    const netBalance = totalIncome - totalOut
    const runway = avgMonthlyBurn > 0 ? netBalance / avgMonthlyBurn : Infinity

    return {
        totalIncome,
        totalExpenses,
        totalOut,
        net: totalIncome - totalOut,
        transactionCount: data.length,
        burnRate,
        runway,
        unassignedCount,
        categoryBreakdown,
        categoryColors,
    }
}

// ── Monthly aggregates (for charts) ─────────────────────────

export interface MonthlyAggregate {
    /** e.g. "2025-03" */
    month: string
    /** Display label, e.g. "Mar 25" */
    label: string
    income: number
    expense: number
    net: number
    cumulativeBalance: number
}

export function getMonthlyAggregates(
    data: DbTransaction[]
): MonthlyAggregate[] {
    const map = new Map<string, { income: number; expense: number }>()

    for (const tx of data) {
        const key = tx.booked_at.slice(0, 7) // "YYYY-MM"
        const entry = map.get(key) ?? { income: 0, expense: 0 }
        if (tx.amount > 0) {
            entry.income += tx.amount
        } else {
            entry.expense += Math.abs(tx.amount)
        }
        map.set(key, entry)
    }

    // Sort chronologically
    const sortedKeys = [...map.keys()].sort()

    let cumulative = 0
    return sortedKeys.map((key) => {
        const { income, expense } = map.get(key)!
        const net = income - expense
        cumulative += net
        const [yyyy, mm] = key.split("-")
        const monthNames = [
            "Jan",
            "Feb",
            "Mar",
            "Apr",
            "May",
            "Jun",
            "Jul",
            "Aug",
            "Sep",
            "Oct",
            "Nov",
            "Dec",
        ]
        const label = `${monthNames[parseInt(mm, 10) - 1]} ${yyyy.slice(2)}`
        return { month: key, label, income, expense, net, cumulativeBalance: cumulative }
    })
}

// ── Recurring payments detection ─────────────────────────────

export interface RecurringPayment {
    /** Unique key: normalised description + "|" + amount */
    key: string
    /** Original description string */
    description: string
    /** Amount per occurrence (always negative – expense) */
    amount: number
    /** Sorted YYYY-MM strings of every month the payment appeared */
    months: string[]
    /** Sum of Math.abs(amount) across all occurrences */
    totalPaid: number
    category: string | null
    categoryColor: string | null
    /** ISO date of the most recent occurrence */
    latestDate: string
}

export function getRecurringPayments(data: DbTransaction[]): RecurringPayment[] {
    const map = new Map<
        string,
        {
            description: string
            amount: number
            months: Set<string>
            totalPaid: number
            category: string | null
            categoryColor: string | null
            latestDate: string
        }
    >()

    for (const tx of data) {
        if (tx.amount >= 0) continue // expenses only

        const rawDesc =
            tx.description?.trim() ||
            tx.purpose?.trim() ||
            tx.merchant?.trim() ||
            "Unknown"
        const norm = rawDesc.toLowerCase().replace(/\s+/g, " ")
        // Round to 2 dp so floating-point noise doesn't create duplicate keys
        const amt = Math.round(tx.amount * 100) / 100
        const key = `${norm}|${amt}`
        const month = tx.booked_at.slice(0, 7) // YYYY-MM

        const entry = map.get(key)
        if (entry) {
            entry.months.add(month)
            entry.totalPaid += Math.abs(tx.amount)
            if (tx.booked_at > entry.latestDate) entry.latestDate = tx.booked_at
        } else {
            const catName = getCategoryName(tx)
            map.set(key, {
                description: rawDesc,
                amount: amt,
                months: new Set([month]),
                totalPaid: Math.abs(tx.amount),
                category: catName !== "Unassigned" ? catName : null,
                categoryColor: getCategoryColor(tx),
                latestDate: tx.booked_at,
            })
        }
    }

    const result: RecurringPayment[] = []
    for (const [key, entry] of map.entries()) {
        if (entry.months.size >= 2) {
            result.push({
                key,
                description: entry.description,
                amount: entry.amount,
                months: [...entry.months].sort(),
                totalPaid: entry.totalPaid,
                category: entry.category,
                categoryColor: entry.categoryColor,
                latestDate: entry.latestDate,
            })
        }
    }

    // Most-recurring first, then by highest total paid
    return result.sort(
        (a, b) => b.months.length - a.months.length || b.totalPaid - a.totalPaid
    )
}

// ── Merchant stats (for Spending page) ──────────────────────

export interface MerchantStat {
    merchant: string
    totalSpent: number
    txCount: number
    avgSpent: number
}

export function getMerchantStats(data: DbTransaction[]): MerchantStat[] {
    const map = new Map<string, { total: number; count: number }>()

    for (const tx of data) {
        if (tx.amount >= 0) continue // only expenses
        const name = tx.merchant?.trim() || tx.description?.trim() || "Unknown"
        const entry = map.get(name) ?? { total: 0, count: 0 }
        entry.total += Math.abs(tx.amount)
        entry.count += 1
        map.set(name, entry)
    }

    return [...map.entries()]
        .map(([merchant, { total, count }]) => ({
            merchant,
            totalSpent: total,
            txCount: count,
            avgSpent: total / count,
        }))
        .sort((a, b) => b.totalSpent - a.totalSpent)
}
