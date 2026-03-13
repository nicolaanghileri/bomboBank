import { useState, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Upload, FileText, CheckCircle2, AlertCircle, ChevronRight, RotateCcw } from "lucide-react"
import { cn } from "@/lib/utils"
import supabase from "@/utils/supabase"

// ── Bank definitions ──────────────────────────────────────────

type BankType = "migros_bank" | "raiffeisen" | "ubs"

interface Bank {
    id: BankType
    name: string
    description: string
    logoUrl: string
    color: string
    initial: string
}

const BANKS: Bank[] = [
    {
        id: "migros_bank",
        name: "Migros Bank",
        description: "CSV export from Migros Bank e-banking",
        logoUrl: "https://img.logo.dev/migrosbank.ch?token=pk_TrsAUhQbSR6o0QYmjPKmNQ&retina=true",
        color: "#FF6600",
        initial: "M",
    },
    {
        id: "raiffeisen",
        name: "Raiffeisen",
        description: "CSV export from Raiffeisen e-banking",
        logoUrl: "https://img.logo.dev/raiffeisen.ch?token=pk_TrsAUhQbSR6o0QYmjPKmNQ&retina=true",
        color: "#FFD400",
        initial: "R",
    },
    {
        id: "ubs",
        name: "UBS",
        description: "CSV export from UBS e-banking",
        logoUrl: "https://img.logo.dev/ubs.ch?token=pk_TrsAUhQbSR6o0QYmjPKmNQ&retina=true",
        color: "#E40613",
        initial: "U",
    },
]

function BankLogo({ bank, size = "lg" }: { bank: Bank; size?: "sm" | "lg" }) {
    const dim = size === "lg" ? "size-10" : "size-7"
    const fontSize = size === "lg" ? "text-sm" : "text-xs"
    return (
        <div
            className={`${dim} flex-shrink-0 overflow-hidden rounded-lg bg-white ring-1 ring-border`}
        >
            <img
                src={bank.logoUrl}
                alt={bank.name}
                className="h-full w-full object-contain p-0.5"
                onError={(e) => {
                    const img = e.currentTarget
                    img.style.display = "none"
                    const wrap = img.parentElement!
                    wrap.style.backgroundColor = bank.color
                    wrap.style.removeProperty("ring")
                    wrap.innerHTML = `<span class="flex h-full w-full items-center justify-center font-bold text-white ${fontSize}">${bank.initial}</span>`
                }}
            />
        </div>
    )
}

// ── Component ─────────────────────────────────────────────────

export function UploadPage() {
    const [selectedBank, setSelectedBank] = useState<BankType | null>(null)
    const [dragActive, setDragActive] = useState(false)
    const [selectedFile, setSelectedFile] = useState<File | null>(null)
    const [uploading, setUploading] = useState(false)
    const [progress, setProgress] = useState(0)
    const [errorMsg, setErrorMsg] = useState<string | null>(null)
    const [result, setResult] = useState<{
        success: boolean
        inserted: number
        skipped: number
        errors: number
    } | null>(null)

    const handleDrag = useCallback((e: React.DragEvent) => {
        e.preventDefault()
        e.stopPropagation()
        if (e.type === "dragenter" || e.type === "dragover") {
            setDragActive(true)
        } else if (e.type === "dragleave") {
            setDragActive(false)
        }
    }, [])

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault()
        e.stopPropagation()
        setDragActive(false)
        const file = e.dataTransfer.files?.[0]
        if (file?.name.endsWith(".csv")) {
            setSelectedFile(file)
            setResult(null)
        }
    }, [])

    const handleFileSelect = useCallback(
        (e: React.ChangeEvent<HTMLInputElement>) => {
            const file = e.target.files?.[0]
            if (file) {
                setSelectedFile(file)
                setResult(null)
            }
        },
        []
    )

    const handleUpload = useCallback(async () => {
        if (!selectedFile || !selectedBank) return
        setUploading(true)
        setProgress(10)
        setErrorMsg(null)

        const formData = new FormData()
        formData.append("file", selectedFile)
        formData.append("bank_type", selectedBank)

        try {
            setProgress(30)

            const { data: { session } } = await supabase.auth.getSession()
            const token = session?.access_token ?? ""

            const apiBase = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000"
            const response = await fetch(`${apiBase}/api/upload/bank-csv`, {
                method: "POST",
                headers: { Authorization: `Bearer ${token}` },
                body: formData,
            })

            setProgress(80)

            if (!response.ok) {
                const err = await response.json().catch(() => null)
                throw new Error(err?.detail ?? `Server error: ${response.status}`)
            }

            const data = await response.json()
            setProgress(100)
            setResult({
                success: data.success ?? true,
                inserted: data.summary?.inserted ?? 0,
                skipped: data.summary?.duplicates_skipped ?? 0,
                errors: data.summary?.errors?.length ?? 0,
            })
        } catch (err) {
            const message = err instanceof Error ? err.message : "Upload failed"
            setErrorMsg(message)
            setResult({ success: false, inserted: 0, skipped: 0, errors: 1 })
        } finally {
            setUploading(false)
        }
    }, [selectedFile, selectedBank])

    const reset = useCallback(() => {
        setSelectedFile(null)
        setProgress(0)
        setResult(null)
        setErrorMsg(null)
    }, [])

    const resetAll = useCallback(() => {
        reset()
        setSelectedBank(null)
    }, [reset])

    const bank = BANKS.find((b) => b.id === selectedBank)

    // ── Step 1: Bank selection ────────────────────────────────
    if (!selectedBank) {
        return (
            <div className="mx-auto max-w-2xl space-y-8 p-8">
                <div className="space-y-1">
                    <h2 className="text-lg font-semibold">Select your bank</h2>
                    <p className="text-sm text-muted-foreground">
                        Choose the bank that issued the CSV file you want to import.
                    </p>
                </div>

                <div className="grid gap-3">
                    {BANKS.map((b) => (
                        <button
                            key={b.id}
                            onClick={() => setSelectedBank(b.id)}
                            className="flex w-full items-center gap-4 rounded-xl border bg-card px-5 py-4 text-left transition-colors hover:bg-muted/50 hover:border-foreground/30"
                        >
                            <BankLogo bank={b} size="lg" />

                            <div className="flex-1">
                                <p className="font-medium">{b.name}</p>
                                <p className="text-sm text-muted-foreground">{b.description}</p>
                            </div>

                            <ChevronRight className="size-4 text-muted-foreground" />
                        </button>
                    ))}
                </div>

                <p className="text-center text-xs text-muted-foreground">
                    More banks coming soon
                </p>
            </div>
        )
    }

    // ── Step 2: Upload ────────────────────────────────────────
    return (
        <div className="mx-auto max-w-2xl space-y-6 p-8">
            {/* Selected bank pill + change */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                    <BankLogo bank={bank!} size="sm" />
                    <span className="text-sm font-medium">{bank!.name}</span>
                </div>
                <button
                    onClick={resetAll}
                    className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                    <RotateCcw className="size-3" />
                    Change bank
                </button>
            </div>

            {/* Upload Zone */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-base">Upload CSV File</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div
                        onDragEnter={handleDrag}
                        onDragLeave={handleDrag}
                        onDragOver={handleDrag}
                        onDrop={handleDrop}
                        className={cn(
                            "relative flex flex-col items-center justify-center rounded-lg border-2 border-dashed px-6 py-16 text-center transition-colors",
                            dragActive
                                ? "border-foreground bg-muted"
                                : "border-border hover:border-muted-foreground",
                            selectedFile && "border-foreground bg-muted/50"
                        )}
                    >
                        {selectedFile ? (
                            <>
                                <FileText className="mb-3 size-10 text-foreground" />
                                <p className="text-sm font-medium">{selectedFile.name}</p>
                                <p className="mt-1 text-xs text-muted-foreground">
                                    {(selectedFile.size / 1024).toFixed(1)} KB
                                </p>
                                <button
                                    onClick={reset}
                                    className="mt-3 text-xs text-muted-foreground underline underline-offset-4 hover:text-foreground"
                                >
                                    Remove file
                                </button>
                            </>
                        ) : (
                            <>
                                <Upload className="mb-3 size-10 text-muted-foreground" />
                                <p className="text-sm font-medium">
                                    Drag & drop your CSV file here
                                </p>
                                <p className="mt-1 text-xs text-muted-foreground">
                                    or click to browse
                                </p>
                            </>
                        )}
                        <input
                            type="file"
                            accept=".csv"
                            onChange={handleFileSelect}
                            className="absolute inset-0 cursor-pointer opacity-0"
                        />
                    </div>

                    {selectedFile && !result && (
                        <div className="space-y-3">
                            {uploading && <Progress value={Math.min(progress, 100)} />}
                            <Button
                                onClick={handleUpload}
                                disabled={uploading}
                                className="w-full"
                            >
                                {uploading ? "Uploading..." : "Upload & Process"}
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Result */}
            {result && (
                <Card>
                    <CardHeader className="flex flex-row items-center gap-3">
                        {result.success ? (
                            <CheckCircle2 className="size-5 text-foreground" />
                        ) : (
                            <AlertCircle className="size-5 text-destructive" />
                        )}
                        <CardTitle className="text-base">
                            {result.success ? "Upload Complete" : "Upload Failed"}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {errorMsg && (
                            <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                                {errorMsg}
                            </p>
                        )}
                        <div className="grid grid-cols-3 gap-4 text-center">
                            <div>
                                <p className="text-2xl font-bold tabular-nums">{result.inserted}</p>
                                <p className="text-xs text-muted-foreground">Imported</p>
                            </div>
                            <div>
                                <p className="text-2xl font-bold tabular-nums text-muted-foreground">
                                    {result.skipped}
                                </p>
                                <p className="text-xs text-muted-foreground">Duplicates</p>
                            </div>
                            <div>
                                <p className="text-2xl font-bold tabular-nums">{result.errors}</p>
                                <p className="text-xs text-muted-foreground">Errors</p>
                            </div>
                        </div>

                        <Separator />

                        <div className="flex items-center justify-between">
                            <Badge variant="secondary">
                                {result.inserted + result.skipped} rows processed
                            </Badge>
                            <Button variant="outline" size="sm" onClick={reset}>
                                Upload another
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}

            <p className="text-center text-xs text-muted-foreground">
                Supported format: CSV export from {bank!.name} e-banking
            </p>
        </div>
    )
}
