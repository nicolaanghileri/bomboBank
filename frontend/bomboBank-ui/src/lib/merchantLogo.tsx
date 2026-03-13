/**
 * Shared merchant logo utilities used across pages.
 */

export const LOGO_TOKEN = "pk_TrsAUhQbSR6o0QYmjPKmNQ"

export const MERCHANT_DOMAINS: Record<string, string> = {
    // Swiss banks / finance
    "migros bank": "migrosbank.ch",
    "raiffeisen": "raiffeisen.ch",
    "ubs": "ubs.ch",
    "postfinance": "postfinance.ch",
    "zkb": "zkb.ch",
    "revolut": "revolut.com",
    "wise": "wise.com",
    "paypal": "paypal.com",
    // Swiss retail / services
    "migros": "migros.ch",
    "coop": "coop.ch",
    "denner": "denner.ch",
    "lidl": "lidl.ch",
    "aldi": "aldi.ch",
    "spar": "spar.ch",
    "manor": "manor.ch",
    "globus": "globus.ch",
    "digitec": "digitec.ch",
    "galaxus": "galaxus.ch",
    "brack": "brack.ch",
    "ochsner": "ochsnersport.ch",
    "ikea": "ikea.com",
    "h&m": "hm.com",
    "zara": "zara.com",
    // Transport
    "sbb": "sbb.ch",
    "uber": "uber.com",
    "flixbus": "flixbus.com",
    "swiss": "swiss.com",
    "easyjet": "easyjet.com",
    // Telecom / tech
    "swisscom": "swisscom.ch",
    "sunrise": "sunrise.ch",
    "salt": "salt.ch",
    "apple": "apple.com",
    "google": "google.com",
    "microsoft": "microsoft.com",
    "amazon": "amazon.com",
    "zalando": "zalando.com",
    // Streaming / entertainment
    "netflix": "netflix.com",
    "spotify": "spotify.com",
    "disney": "disneyplus.com",
    "youtube": "youtube.com",
    "dazn": "dazn.com",
    // Food
    "mcdonalds": "mcdonalds.com",
    "burger king": "burgerking.com",
    "kfc": "kfc.com",
    "doordash": "doordash.com",
    "uber eats": "ubereats.com",
    // Travel
    "airbnb": "airbnb.com",
    "booking": "booking.com",
    "expedia": "expedia.com",
}

export function getMerchantDomain(merchant: string | null): string | null {
    if (!merchant) return null
    const lower = merchant.toLowerCase().trim()
    for (const [key, domain] of Object.entries(MERCHANT_DOMAINS)) {
        if (lower.includes(key)) return domain
    }
    const clean = lower.replace(/[^a-z0-9]/g, "")
    return clean.length > 1 ? `${clean}.com` : null
}

export function MerchantLogo({
    merchant,
    size = "md",
}: {
    merchant: string | null
    size?: "sm" | "md" | "lg"
}) {
    const domain = getMerchantDomain(merchant)
    const initial = (merchant ?? "?")[0].toUpperCase()
    const dim =
        size === "sm" ? "size-6" : size === "lg" ? "size-10" : "size-8"

    return (
        <div
            className={`${dim} flex-shrink-0 overflow-hidden rounded-lg bg-white ring-1 ring-border`}
        >
            <img
                src={`https://img.logo.dev/${domain ?? "example.com"}?token=${LOGO_TOKEN}&retina=true`}
                alt={merchant ?? ""}
                className="h-full w-full object-contain p-0.5"
                onError={(e) => {
                    const img = e.currentTarget
                    img.style.display = "none"
                    const wrap = img.parentElement!
                    wrap.className = `${dim} flex-shrink-0 flex items-center justify-center rounded-full bg-muted text-xs font-semibold text-muted-foreground`
                    wrap.textContent = initial
                }}
            />
        </div>
    )
}
