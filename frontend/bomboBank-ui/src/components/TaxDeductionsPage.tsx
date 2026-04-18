import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
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
    accent: string      // border-l color class
    iconBg: string      // icon bg class
    iconColor: string   // icon text color class
    detectedMerchants: DetectedMerchant[]
    totalDetected: number
    maxDeductible: number | null
    estimatedTaxRate: number
    note: string
    status: "confirmed" | "review" | "manual"
}

const DEDUCTIONS: TaxDeduction[] = [
    {
        id: "transport",
        category: "Berufsfahrtkosten",
        description: "Kosten für den Arbeitsweg (ÖV / Bahn)",
        icon: <Train className="size-4" />,
        accent: "border-l-blue-500",
        iconBg: "bg-blue-50 dark:bg-blue-950/40",
        iconColor: "text-blue-600 dark:text-blue-400",
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
        icon: <HeartPulse className="size-4" />,
        accent: "border-l-rose-500",
        iconBg: "bg-rose-50 dark:bg-rose-950/40",
        iconColor: "text-rose-600 dark:text-rose-400",
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
        icon: <GraduationCap className="size-4" />,
        accent: "border-l-violet-500",
        iconBg: "bg-violet-50 dark:bg-violet-950/40",
        iconColor: "text-violet-600 dark:text-violet-400",
        detectedMerchants: [
            { name: "Udemy", amount: 180 },
            { name: "Coursera", amount: 240 },
            { name: "Orell Füssli", amount: 95 },
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
        icon: <Heart className="size-4" />,
        accent: "border-l-pink-500",
        iconBg: "bg-pink-50 dark:bg-pink-950/40",
        iconColor: "text-pink-600 dark:text-pink-400",
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
        icon: <Briefcase className="size-4" />,
        accent: "border-l-amber-500",
        iconBg: "bg-amber-50 dark:bg-amber-950/40",
        iconColor: "text-amber-600 dark:text-amber-400",
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
        category: "Säule 3a",
        description: "Einzahlungen in die gebundene Selbstvorsorge",
        icon: <PiggyBank className="size-4" />,
        accent: "border-l-emerald-500",
        iconBg: "bg-emerald-50 dark:bg-emerald-950/40",
        iconColor: "text-emerald-600 dark:text-emerald-400",
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
        icon: <ShieldCheck className="size-4" />,
        accent: "border-l-sky-500",
        iconBg: "bg-sky-50 dark:bg-sky-950/40",
        iconColor: "text-sky-600 dark:text-sky-400",
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
            <span className="inline-flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="size-3" />
                Automatisch erkannt
            </span>
        )
    if (status === "review")
        return (
            <span className="inline-flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400">
                <AlertCircle className="size-3" />
                Bitte prüfen
            </span>
        )
    return (
        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
            <Info className="size-3" />
            Manuell erfassen
        </span>
    )
}

// ─── Deduction Card ───────────────────────────────────────────────────────────

function DeductionCard({ d }: { d: TaxDeduction }) {
    const effectiveMax = d.maxDeductible ?? d.totalDetected
    const capped = Math.min(d.totalDetected, effectiveMax)
    const progress = Math.min((d.totalDetected / effectiveMax) * 100, 100)
    const savings = Math.round(capped * d.estimatedTaxRate)

    return (
        <Card className={`border-l-[3px] ${d.accent}`}>
            <CardContent className="flex flex-col gap-5 pt-5">

                {/* Header */}
                <div className="flex items-start gap-3">
                    <div className={`mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md ${d.iconBg} ${d.iconColor}`}>
                        {d.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold leading-tight">{d.category}</p>
                        <p className="mt-0.5 text-xs text-muted-foreground leading-snug">{d.description}</p>
                        <div className="mt-1.5">
                            <StatusBadge status={d.status} />
                        </div>
                    </div>
                </div>

                {/* Divider */}
                <div className="h-px bg-border" />

                {/* Amounts */}
                <div className="flex items-end justify-between">
                    <div>
                        <p className="text-xs text-muted-foreground">Erkannte Ausgaben</p>
                        <p className="mt-0.5 text-2xl font-bold tabular-nums tracking-tight">
                            {fmt(d.totalDetected)}
                        </p>
                    </div>
                    <div className="text-right">
                        <p className="text-xs text-muted-foreground">Abzugsfähig</p>
                        <p className="mt-0.5 text-xl font-semibold tabular-nums text-emerald-600">
                            {fmt(capped)}
                        </p>
                    </div>
                </div>

                {/* Progress bar (only when there's a cap) */}
                {d.maxDeductible !== null && (
                    <div className="space-y-1.5">
                        <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                            <div
                                className={`h-full rounded-full bg-foreground/20 transition-all`}
                                style={{ width: `${progress}%` }}
                            />
                        </div>
                        <div className="flex justify-between text-xs text-muted-foreground">
                            <span>{Math.round(progress)}% des Maximums genutzt</span>
                            <span>Max. {fmt(d.maxDeductible)}</span>
                        </div>
                    </div>
                )}

                {/* Merchants */}
                <div className="flex flex-wrap gap-1.5">
                    {d.detectedMerchants.map((m) => (
                        <Badge key={m.name} variant="secondary" className="gap-1.5 text-xs font-normal">
                            <span className="font-medium">{m.name}</span>
                            <span className="text-muted-foreground">{fmt(m.amount)}</span>
                        </Badge>
                    ))}
                </div>

                {/* Savings row */}
                <div className="flex items-center justify-between border-t pt-3">
                    <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <TrendingDown className="size-3.5" />
                        Geschätzte Steuerersparnis
                    </span>
                    <span className="text-sm font-bold tabular-nums text-emerald-600">
                        ~{fmt(savings)}
                    </span>
                </div>

                {/* Note */}
                <p className="text-xs text-muted-foreground leading-relaxed">
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
    const totalDeductible = DEDUCTIONS.reduce(
        (sum, d) => sum + Math.min(d.totalDetected, d.maxDeductible ?? d.totalDetected),
        0
    )
    const totalSavings = DEDUCTIONS.reduce((sum, d) => {
        const capped = Math.min(d.totalDetected, d.maxDeductible ?? d.totalDetected)
        return sum + Math.round(capped * d.estimatedTaxRate)
    }, 0)
    const confirmed = DEDUCTIONS.filter((d) => d.status === "confirmed").length
    const toReview = DEDUCTIONS.filter((d) => d.status !== "confirmed").length

    return (
        <div className="space-y-8 p-8">

            {/* Disclaimer */}
            <div className="flex items-start gap-3 rounded-lg border bg-muted/40 px-4 py-3">
                <Info className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                    <span className="font-medium text-foreground">Demo-Daten – </span>
                    Die Beträge basieren auf simulierten Transaktionen. Für eine verbindliche
                    Steuerberechnung konsultiere eine Fachperson.
                </p>
            </div>

            {/* KPI row */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <Card>
                    <CardContent className="pt-6">
                        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                            Gesamtabzüge {year}
                        </p>
                        <p className="mt-1 text-3xl font-bold tabular-nums">{fmt(totalDeductible)}</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                            aus {DEDUCTIONS.length} Kategorien
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                            Geschätzte Steuerersparnis
                        </p>
                        <p className="mt-1 text-3xl font-bold tabular-nums text-emerald-600">
                            ~{fmt(totalSavings)}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">bei ~25 % Grenzsteuersatz</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                            Prüfstatus
                        </p>
                        <div className="mt-2 flex flex-col gap-1">
                            <div className="flex items-center gap-2">
                                <CheckCircle2 className="size-4 text-emerald-500" />
                                <span className="text-sm">
                                    <span className="font-semibold">{confirmed}</span> automatisch erkannt
                                </span>
                            </div>
                            <div className="flex items-center gap-2">
                                <AlertCircle className="size-4 text-amber-500" />
                                <span className="text-sm">
                                    <span className="font-semibold">{toReview}</span> zu prüfen / manuell
                                </span>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Cards grid */}
            <div>
                <h2 className="mb-4 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
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
