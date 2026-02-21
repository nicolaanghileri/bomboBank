import { useEffect, useState } from "react"
import supabase from "@/utils/supabase"
import type { DbTransaction, DbCategory } from "@/lib/types"

interface UseTransactionsResult {
    transactions: DbTransaction[]
    categories: DbCategory[]
    loading: boolean
    error: string | null
    refetch: () => void
}

export function useTransactions(): UseTransactionsResult {
    const [transactions, setTransactions] = useState<DbTransaction[]>([])
    const [categories, setCategories] = useState<DbCategory[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    async function fetchAll() {
        setLoading(true)
        setError(null)

        try {
            // Fetch transactions with joined category data
            const { data: txData, error: txError } = await supabase
                .from("transactions")
                .select("*, categories(name, icon, color)")
                .order("booked_at", { ascending: false })

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
            const message = err instanceof Error ? err.message : "Failed to load data"
            setError(message)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchAll()
    }, [])

    return { transactions, categories, loading, error, refetch: fetchAll }
}
