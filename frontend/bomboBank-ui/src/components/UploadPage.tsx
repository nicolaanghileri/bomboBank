import { useState, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Upload, FileText, CheckCircle2, AlertCircle } from "lucide-react"
import { cn } from "@/lib/utils"
import supabase from "@/utils/supabase"

export function UploadPage() {
    const [dragActive, setDragActive] = useState(false)
    const [selectedFile, setSelectedFile] = useState<File | null>(null)
    const [uploading, setUploading] = useState(false)
    const [progress, setProgress] = useState(0)
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

    const [errorMsg, setErrorMsg] = useState<string | null>(null)

    const handleUpload = useCallback(async () => {
        if (!selectedFile) return
        setUploading(true)
        setProgress(10)
        setErrorMsg(null)

        const formData = new FormData()
        formData.append("file", selectedFile)

        try {
            setProgress(30)

            // Get a fresh access token from the current Supabase session
            const { data: { session } } = await supabase.auth.getSession()
            const token = session?.access_token ?? ""

            const response = await fetch(
                "http://localhost:8000/api/upload/bank-csv",
                {
                    method: "POST",
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                    body: formData,
                }
            )

            setProgress(80)

            if (!response.ok) {
                const err = await response.json().catch(() => null)
                throw new Error(
                    err?.detail ?? `Server error: ${response.status}`
                )
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
            const message =
                err instanceof Error ? err.message : "Upload failed"
            setErrorMsg(message)
            setResult({
                success: false,
                inserted: 0,
                skipped: 0,
                errors: 1,
            })
        } finally {
            setUploading(false)
        }
    }, [selectedFile])

    const reset = useCallback(() => {
        setSelectedFile(null)
        setProgress(0)
        setResult(null)
    }, [])

    return (
        <div className="mx-auto max-w-2xl space-y-8 p-8">
            {/* Upload Zone */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-base">Upload Bank CSV</CardTitle>
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

                    {/* Upload Button & Progress */}
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
                                <p className="text-2xl font-bold tabular-nums">
                                    {result.inserted}
                                </p>
                                <p className="text-xs text-muted-foreground">Imported</p>
                            </div>
                            <div>
                                <p className="text-2xl font-bold tabular-nums text-muted-foreground">
                                    {result.skipped}
                                </p>
                                <p className="text-xs text-muted-foreground">Duplicates</p>
                            </div>
                            <div>
                                <p className="text-2xl font-bold tabular-nums">
                                    {result.errors}
                                </p>
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
                Supported format: CSV export from Swiss e-banking portals
            </p>
        </div>
    )
}
