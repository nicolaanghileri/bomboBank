import { cn } from "@/lib/utils"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
import {
    LayoutDashboard,
    ArrowUpDown,
    Upload,
    LogOut,
    Landmark,
} from "lucide-react"

type Page = "dashboard" | "transactions" | "upload"

interface SidebarProps {
    currentPage: Page
    onNavigate: (page: Page) => void
    userEmail: string
    onSignOut: () => void
}

const navItems: { page: Page; label: string; icon: React.ReactNode }[] = [
    {
        page: "dashboard",
        label: "Dashboard",
        icon: <LayoutDashboard className="size-4" />,
    },
    {
        page: "transactions",
        label: "Transactions",
        icon: <ArrowUpDown className="size-4" />,
    },
    {
        page: "upload",
        label: "Upload",
        icon: <Upload className="size-4" />,
    },
]

export function Sidebar({ currentPage, onNavigate, userEmail, onSignOut }: SidebarProps) {
    const initials = userEmail
        .split("@")[0]
        .slice(0, 2)
        .toUpperCase()

    return (
        <aside className="fixed inset-y-0 left-0 z-30 flex w-64 flex-col border-r bg-background">
            {/* Logo / Brand */}
            <div className="flex h-16 items-center gap-2.5 px-6">
                <div className="flex size-8 items-center justify-center rounded-lg bg-foreground">
                    <Landmark className="size-4 text-background" />
                </div>
                <span className="text-lg font-semibold tracking-tight">BomboBank</span>
            </div>

            <Separator />

            {/* Navigation */}
            <nav className="flex-1 space-y-1 px-3 py-4">
                {navItems.map((item) => (
                    <button
                        key={item.page}
                        onClick={() => onNavigate(item.page)}
                        className={cn(
                            "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                            currentPage === item.page
                                ? "bg-foreground text-background"
                                : "text-muted-foreground hover:bg-muted hover:text-foreground"
                        )}
                    >
                        {item.icon}
                        {item.label}
                    </button>
                ))}
            </nav>

            <Separator />

            {/* User section */}
            <div className="flex items-center gap-3 px-6 py-4">
                <Avatar className="size-8">
                    <AvatarFallback className="bg-muted text-xs font-medium">
                        {initials}
                    </AvatarFallback>
                </Avatar>
                <div className="flex-1 truncate">
                    <p className="truncate text-sm font-medium leading-none">{userEmail}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">Personal</p>
                </div>
                <button
                    onClick={onSignOut}
                    title="Sign out"
                    className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                    <LogOut className="size-4" />
                </button>
            </div>
        </aside>
    )
}
