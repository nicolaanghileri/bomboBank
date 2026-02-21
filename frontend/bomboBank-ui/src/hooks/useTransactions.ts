import { useEffect, useState } from "react"
import supabase from "@/utils/supabase"
import type { DbTransaction, DbCategory } from "@/lib/types"

interface UseTransactionsOptions {
    /** ISO date string, e.g. "2026-02-01" */
    startDate?: string
    /** ISO date string, e.g. "2026-02-28" */
    endDate?: string
}

interface UseTransactionsResult {
    transactions: DbTransaction[]
    categories: DbCategory[]
    loading: boolean
    error: string | null
    refetch: () => void
}

export function useTransactions(
    options?: UseTransactionsOptions
): UseTransactionsResult {
    const [transactions, setTransactions] = useState<DbTransaction[]>([])
    const [categories, setCategories] = useState<DbCategory[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    async function fetchAll() {
        setLoading(true)
        setError(null)

        try {
            // Fetch transactions with joined category data
            let query = supabase
                .from("transactions")
                .select("*, categories(name, icon, color)")
                .order("booked_at", { ascending: false })

            // Apply date-range filters when provided
            if (options?.startDate) {
                query = query.gte("booked_at", options.startDate)
            }
            if (options?.endDate) {
                query = query.lte("booked_at", options.endDate)
            }

            const { data: txData, error: txError } = await query

            if (txError) throw txError

            // Fetch all categories for filter pills
            const { data: catData, error: catError } = await supabase
                .from("categories")
                .select("*")
                .order("name")

            if (catError) throw catError

            setTransactions((txData as DbTransaction[]) ?? [])
            setCategories((catData as DbCategory[]) ?? [])
        } catch (err) {
            const message =
                err instanceof Error ? err.message : "Failed to load data"
            setError(message)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchAll()
    }, [options?.startDate, options?.endDate])

    return { transactions, categories, loading, error, refetch: fetchAll }
}
