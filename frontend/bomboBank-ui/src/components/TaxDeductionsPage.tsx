import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
    Train,
    HeartPulse,
    GraduationCap,
    Heart,
    Briefcase,
    PiggyBank,
    ShieldCheck,
    TrendingDown,
    Info,
    CheckCircle2,
    AlertCircle,
} from "lucide-react"

// ─── Mock Data ───────────────────────────────────────────────────────────────

interface DetectedMerchant {
    name: string
    amount: number
}

interface TaxDeduction {
    id: string
    category: string
    description: string
    icon: React.ReactNode
    color: string
    detectedMerchants: DetectedMerchant[]
    totalDetected: number
    maxDeductible: number | null // null = unlimited
    estimatedTaxRate: number // marginal rate used for savings estimate
    note: string
    status: "confirmed" | "review" | "manual"
}

const DEDUCTIONS: TaxDeduction[] = [
    {
        id: "transport",
        category: "Berufsfahrtkosten",
        description: "Kosten für den Arbeitsweg (ÖV / Bahn)",
        icon: <Train className="size-5" />,
        color: "bg-blue-500",
        detectedMerchants: [
            { name: "SBB", amount: 2240 },
            { name: "ZVV", amount: 420 },
            { name: "PostAuto", amount: 140 },
        ],
        totalDetected: 2800,
        maxDeductible: 3000,
        estimatedTaxRate: 0.25,
        note: "Bundessteuer max. CHF 3'000. Kantonalsteuern oft unbegrenzt.",
        status: "confirmed",
    },
    {
        id: "health",
        category: "Krankheits- & Unfallkosten",
        description: "Selbst getragene Gesundheitsausgaben über der Franchise",
        icon: <HeartPulse className="size-5" />,
        color: "bg-rose-500",
        detectedMerchants: [
            { name: "Apotheke Zur Rose", amount: 480 },
            { name: "Praxis Dr. Müller", amount: 320 },
            { name: "Helsana Selbstbehalt", amount: 700 },
        ],
        totalDetected: 1500,
        maxDeductible: null,
        estimatedTaxRate: 0.25,
        note: "Abzugsfähig soweit 5 % des Reineinkommens übersteigend.",
        status: "review",
    },
    {
        id: "education",
        category: "Berufsbedingte Weiterbildung",
        description: "Kurse, Zertifikate und Fachliteratur",
        icon: <GraduationCap className="size-5" />,
        color: "bg-violet-500",
        detectedMerchants: [
            { name: "Udemy", amount: 180 },
            { name: "Coursera", amount: 240 },
            { name: "Orell Füssli (Fachbücher)", amount: 95 },
        ],
        totalDetected: 515,
        maxDeductible: 12000,
        estimatedTaxRate: 0.25,
        note: "Bundessteuer max. CHF 12'000 pro Jahr (ab 2023).",
        status: "confirmed",
    },
    {
        id: "donations",
        category: "Spenden",
        description: "Zuwendungen an gemeinnützige Organisationen",
        icon: <Heart className="size-5" />,
        color: "bg-pink-500",
        detectedMerchants: [
            { name: "Caritas Schweiz", amount: 200 },
            { name: "SRK / Rotes Kreuz", amount: 150 },
            { name: "WWF", amount: 100 },
        ],
        totalDetected: 450,
        maxDeductible: null,
        estimatedTaxRate: 0.25,
        note: "Max. 20 % des Nettoeinkommens. Mindestbetrag CHF 100.",
        status: "confirmed",
    },
    {
        id: "homeoffice",
        category: "Homeoffice / Arbeitszimmer",
        description: "Anteilige Raumkosten bei regelmässiger Heimarbeit",
        icon: <Briefcase className="size-5" />,
        color: "bg-amber-500",
        detectedMerchants: [
            { name: "Galaxus (Büromaterial)", amount: 320 },
            { name: "IKEA (Büromöbel)", amount: 480 },
        ],
        totalDetected: 800,
        maxDeductible: null,
        estimatedTaxRate: 0.25,
        note: "Alternativabzug zu Berufsfahrtkosten – kann nicht kombiniert werden.",
        status: "manual",
    },
    {
        id: "pillar3a",
        category: "Säule 3a (Gebundene Vorsorge)",
        description: "Einzahlungen in die gebundene Selbstvorsorge",
        icon: <PiggyBank className="size-5" />,
        color: "bg-emerald-500",
        detectedMerchants: [
            { name: "VIAC Vorsorge", amount: 4000 },
            { name: "Finpension", amount: 3056 },
        ],
        totalDetected: 7056,
        maxDeductible: 7056,
        estimatedTaxRate: 0.25,
        note: "Maximalbeitrag 2025 für Angestellte: CHF 7'056.",
        status: "confirmed",
    },
    {
        id: "insurance",
        category: "Versicherungsprämien",
        description: "Krankenkasse, Lebensversicherung & Co.",
        icon: <ShieldCheck className="size-5" />,
        color: "bg-sky-500",
        detectedMerchants: [
            { name: "Helsana", amount: 2640 },
            { name: "CSS Versicherung", amount: 880 },
        ],
        totalDetected: 3520,
        maxDeductible: 3500,
        estimatedTaxRate: 0.25,
        note: "Pauschale: CHF 3'500 (verheiratet CHF 7'000) oder effektive Prämien.",
        status: "confirmed",
    },
]

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmt(amount: number) {
    return new Intl.NumberFormat("de-CH", {
        style: "currency",
        currency: "CHF",
        maximumFractionDigits: 0,
    }).format(amount)
}

function StatusBadge({ status }: { status: TaxDeduction["status"] }) {
    if (status === "confirmed")
        return (
            <Badge className="gap-1 bg-emerald-100 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400">
                <CheckCircle2 className="size-3" />
                Automatisch erkannt
            </Badge>
        )
    if (status === "review")
        return (
            <Badge className="gap-1 bg-amber-100 text-amber-700 hover:bg-amber-100 dark:bg-amber-900/30 dark:text-amber-400">
                <AlertCircle className="size-3" />
                Bitte prüfen
            </Badge>
        )
    return (
        <Badge className="gap-1 bg-muted text-muted-foreground hover:bg-muted">
            <Info className="size-3" />
            Manuell erfassen
        </Badge>
    )
}

// ─── Deduction Card ───────────────────────────────────────────────────────────

function DeductionCard({ d }: { d: TaxDeduction }) {
    const effectiveMax = d.maxDeductible ?? d.totalDetected
    const capped = Math.min(d.totalDetected, effectiveMax)
    const progress = Math.min((d.totalDetected / effectiveMax) * 100, 100)
    const savings = Math.round(capped * d.estimatedTaxRate)

    return (
        <Card className="flex flex-col gap-0 overflow-hidden">
            {/* Coloured top strip */}
            <div className={`h-1 w-full ${d.color}`} />

            <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div
                            className={`flex size-9 shrink-0 items-center justify-center rounded-lg text-white ${d.color}`}
                        >
                            {d.icon}
                        </div>
                        <div>
                            <CardTitle className="text-sm font-semibold leading-tight">
                                {d.category}
                            </CardTitle>
                            <p className="mt-0.5 text-xs text-muted-foreground">{d.description}</p>
                        </div>
                    </div>
                    <StatusBadge status={d.status} />
                </div>
            </CardHeader>

            <CardContent className="flex flex-col gap-4">
                {/* Amounts row */}
                <div className="flex items-end justify-between">
                    <div>
                        <p className="text-xs text-muted-foreground">Erkannte Ausgaben</p>
                        <p className="text-2xl font-bold tabular-nums">{fmt(d.totalDetected)}</p>
                    </div>
                    <div className="text-right">
                        <p className="text-xs text-muted-foreground">Abzugsfähig</p>
                        <p className="text-lg font-semibold tabular-nums text-emerald-600">
                            {fmt(capped)}
                        </p>
                    </div>
                </div>

                {/* Progress bar */}
                {d.maxDeductible !== null && (
                    <div className="space-y-1">
                        <div className="flex justify-between text-xs text-muted-foreground">
                            <span>{fmt(d.totalDetected)} genutzt</span>
                            <span>Max. {fmt(d.maxDeductible)}</span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-muted">
                            <div
                                className={`h-full rounded-full transition-all ${d.color}`}
                                style={{ width: `${progress}%` }}
                            />
                        </div>
                    </div>
                )}

                {/* Merchants */}
                <div>
                    <p className="mb-1.5 text-xs font-medium text-muted-foreground">
                        Erkannte Händler
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                        {d.detectedMerchants.map((m) => (
                            <Badge key={m.name} variant="secondary" className="gap-1 text-xs">
                                {m.name}
                                <span className="text-muted-foreground">{fmt(m.amount)}</span>
                            </Badge>
                        ))}
                    </div>
                </div>

                {/* Tax saving chip + note */}
                <div className="flex items-center justify-between rounded-lg bg-emerald-50 px-3 py-2 dark:bg-emerald-950/30">
                    <div className="flex items-center gap-1.5 text-xs text-emerald-700 dark:text-emerald-400">
                        <TrendingDown className="size-3.5" />
                        <span>Geschätzte Steuerersparnis</span>
                    </div>
                    <span className="text-sm font-bold tabular-nums text-emerald-700 dark:text-emerald-400">
                        ~{fmt(savings)}
                    </span>
                </div>

                {/* Note */}
                <p className="text-xs text-muted-foreground">
                    <Info className="mr-1 inline size-3 align-middle" />
                    {d.note}
                </p>
            </CardContent>
        </Card>
    )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function TaxDeductionsPage() {
    const year = 2025
    const totalDetected = DEDUCTIONS.reduce(
        (sum, d) => sum + Math.min(d.totalDetected, d.maxDeductible ?? d.totalDetected),
        0
    )
    const totalSavings = DEDUCTIONS.reduce((sum, d) => {
        const capped = Math.min(d.totalDetected, d.maxDeductible ?? d.totalDetected)
        return sum + Math.round(capped * d.estimatedTaxRate)
    }, 0)

    const confirmed = DEDUCTIONS.filter((d) => d.status === "confirmed").length
    const toReview = DEDUCTIONS.filter((d) => d.status === "review" || d.status === "manual").length

    return (
        <div className="space-y-8 p-8">
            {/* Disclaimer banner */}
            <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-800 dark:bg-amber-950/30">
                <Info className="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-400" />
                <p className="text-sm text-amber-800 dark:text-amber-300">
                    <span className="font-semibold">Demo-Daten – </span>
                    Die Beträge basieren auf simulierten Transaktionen und dienen als Illustration.
                    Konsultiere für eine definitive Steuerberechnung eine Fachperson.
                </p>
            </div>

            {/* Summary KPI row */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <Card>
                    <CardContent className="pt-6">
                        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                            Gesamtabzüge {year}
                        </p>
                        <p className="mt-1 text-3xl font-bold tabular-nums">{fmt(totalDetected)}</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                            aus {DEDUCTIONS.length} Kategorien
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                            Gesch. Steuerersparnis
                        </p>
                        <p className="mt-1 text-3xl font-bold tabular-nums text-emerald-600">
                            ~{fmt(totalSavings)}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                            bei ~25 % Grenzsteuersatz
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                            Status
                        </p>
                        <div className="mt-2 flex items-center gap-3">
                            <div className="flex items-center gap-1.5">
                                <CheckCircle2 className="size-4 text-emerald-500" />
                                <span className="text-sm font-semibold">{confirmed} bestätigt</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <AlertCircle className="size-4 text-amber-500" />
                                <span className="text-sm font-semibold">{toReview} zu prüfen</span>
                            </div>
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">
                            Basierend auf deinen Transaktionen
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Deduction cards grid */}
            <div>
                <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                    Erkannte Abzüge
                </h2>
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
                    {DEDUCTIONS.map((d) => (
                        <DeductionCard key={d.id} d={d} />
                    ))}
                </div>
            </div>
        </div>
    )
}
