import { useState } from "react"
import { useAuth } from "@/contexts/AuthContext"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { CheckCircle2 } from "lucide-react"
import { cn } from "@/lib/utils"

// ─── Canton data ──────────────────────────────────────────────────────────────

interface Canton {
    id: string
    name: string
    wappen: string // Wikimedia Commons filename
}

const BASE = "https://commons.wikimedia.org/wiki/Special:FilePath/"

const CANTONS: Canton[] = [
    { id: "ZH", name: "Zürich",                   wappen: "Wappen_Zürich_matt.svg" },
    { id: "BE", name: "Bern",                      wappen: "Wappen_Bern_matt.svg" },
    { id: "LU", name: "Luzern",                    wappen: "Wappen_Luzern_matt.svg" },
    { id: "UR", name: "Uri",                       wappen: "Wappen_Uri_matt.svg" },
    { id: "SZ", name: "Schwyz",                    wappen: "Wappen_Schwyz_matt.svg" },
    { id: "OW", name: "Obwalden",                  wappen: "Wappen_Obwalden_matt.svg" },
    { id: "NW", name: "Nidwalden",                 wappen: "Wappen_Nidwalden_matt.svg" },
    { id: "GL", name: "Glarus",                    wappen: "Wappen_Glarus_matt.svg" },
    { id: "ZG", name: "Zug",                       wappen: "Wappen_Zug_matt.svg" },
    { id: "FR", name: "Fribourg",                  wappen: "Wappen_Freiburg_matt.svg" },
    { id: "SO", name: "Solothurn",                 wappen: "Wappen_Solothurn_matt.svg" },
    { id: "BS", name: "Basel-Stadt",               wappen: "Wappen_Basel-Stadt_matt.svg" },
    { id: "BL", name: "Basel-Landschaft",          wappen: "Wappen_Basel-Landschaft_matt.svg" },
    { id: "SH", name: "Schaffhausen",              wappen: "Wappen_Schaffhausen_matt.svg" },
    { id: "AR", name: "Appenzell A.Rh.",           wappen: "Wappen_Appenzell_Ausserrhoden_matt.svg" },
    { id: "AI", name: "Appenzell I.Rh.",           wappen: "Wappen_Appenzell_Innerrhoden_matt.svg" },
    { id: "SG", name: "St. Gallen",                wappen: "Wappen_St._Gallen_matt.svg" },
    { id: "GR", name: "Graubünden",                wappen: "Wappen_Graubünden_matt.svg" },
    { id: "AG", name: "Aargau",                    wappen: "Wappen_Aargau_matt.svg" },
    { id: "TG", name: "Thurgau",                   wappen: "Wappen_Thurgau_matt.svg" },
    { id: "TI", name: "Ticino",                    wappen: "Wappen_Tessin_matt.svg" },
    { id: "VD", name: "Vaud",                      wappen: "Wappen_Waadt_matt.svg" },
    { id: "VS", name: "Valais",                    wappen: "Wappen_Wallis_matt.svg" },
    { id: "NE", name: "Neuchâtel",                 wappen: "Wappen_Neuenburg_matt.svg" },
    { id: "GE", name: "Genève",                    wappen: "Wappen_Genf_matt.svg" },
    { id: "JU", name: "Jura",                      wappen: "Wappen_Jura_matt.svg" },
]

// ─── Canton Card ──────────────────────────────────────────────────────────────

function CantonCard({
    canton,
    selected,
    onSelect,
}: {
    canton: Canton
    selected: boolean
    onSelect: () => void
}) {
    return (
        <button
            onClick={onSelect}
            className={cn(
                "group relative flex flex-col items-center gap-2 rounded-xl border p-3 text-center transition-all duration-150",
                "hover:border-foreground/40 hover:bg-muted/50 hover:shadow-sm",
                selected
                    ? "border-foreground bg-muted shadow-sm ring-2 ring-foreground ring-offset-2"
                    : "border-border bg-card"
            )}
        >
            <img
                src={`${BASE}${encodeURIComponent(canton.wappen)}`}
                alt={`Wappen ${canton.name}`}
                width={48}
                height={48}
                className={cn(
                    "object-contain transition-transform duration-150",
                    selected ? "scale-110" : "group-hover:scale-105"
                )}
            />

            <div>
                <p className="text-[11px] font-bold tracking-wide">{canton.id}</p>
                <p className="text-[10px] leading-tight text-muted-foreground">{canton.name}</p>
            </div>

            {selected && (
                <span className="absolute -right-1.5 -top-1.5 flex size-5 items-center justify-center rounded-full bg-foreground text-background shadow">
                    <CheckCircle2 className="size-3" />
                </span>
            )}
        </button>
    )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function ProfilePage() {
    const { user } = useAuth()
    const [selectedCanton, setSelectedCanton] = useState<string | null>(null)

    const email = user?.email ?? "—"
    const initials = email.split("@")[0].slice(0, 2).toUpperCase()
    const selected = CANTONS.find((c) => c.id === selectedCanton)

    return (
        <div className="space-y-8 p-8">

            {/* Profile card */}
            <Card>
                <CardHeader>
                    <CardTitle>Profil</CardTitle>
                </CardHeader>
                <CardContent className="flex items-center gap-5 pb-6">
                    <Avatar className="size-14">
                        <AvatarFallback className="bg-muted text-lg font-semibold">
                            {initials}
                        </AvatarFallback>
                    </Avatar>
                    <div className="space-y-0.5">
                        <p className="font-semibold">{email.split("@")[0]}</p>
                        <p className="text-sm text-muted-foreground">{email}</p>
                        {selected && (
                            <div className="mt-2 flex items-center gap-2">
                                <img
                                    src={`${BASE}${encodeURIComponent(selected.wappen)}`}
                                    alt={selected.name}
                                    width={20}
                                    height={20}
                                    className="object-contain"
                                />
                                <span className="text-xs text-muted-foreground">
                                    Kanton {selected.name} ({selected.id})
                                </span>
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* Canton selector */}
            <Card>
                <CardHeader>
                    <div>
                        <CardTitle>Wohnkanton</CardTitle>
                        <p className="mt-1 text-sm text-muted-foreground">
                            Wähle deinen Kanton für kantonsabhängige Steuerabzüge.
                        </p>
                    </div>
                </CardHeader>
                <CardContent className="pb-6">
                    <div className="grid grid-cols-5 gap-2 sm:grid-cols-6 lg:grid-cols-9 xl:grid-cols-13">
                        {CANTONS.map((canton) => (
                            <CantonCard
                                key={canton.id}
                                canton={canton}
                                selected={selectedCanton === canton.id}
                                onSelect={() =>
                                    setSelectedCanton(selectedCanton === canton.id ? null : canton.id)
                                }
                            />
                        ))}
                    </div>

                    {selected && (
                        <div className="mt-6 flex items-center gap-4 rounded-lg border bg-muted/40 px-4 py-3">
                            <img
                                src={`${BASE}${encodeURIComponent(selected.wappen)}`}
                                alt={selected.name}
                                width={36}
                                height={36}
                                className="object-contain"
                            />
                            <div>
                                <p className="text-sm font-semibold">{selected.name} ({selected.id})</p>
                                <p className="text-xs text-muted-foreground">
                                    Steuerabzüge werden für Kanton {selected.id} berechnet.
                                </p>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

        </div>
    )
}
