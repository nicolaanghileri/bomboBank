import { useState, type FormEvent } from "react"
import supabase from "@/utils/supabase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"
import { Landmark, Loader2, AlertCircle } from "lucide-react"

interface LoginPageProps {
    onSwitchToRegister: () => void
}

export function LoginPage({ onSwitchToRegister }: LoginPageProps) {
    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const [error, setError] = useState<string | null>(null)
    const [loading, setLoading] = useState(false)

    async function handleSubmit(e: FormEvent) {
        e.preventDefault()
        setError(null)
        setLoading(true)

        const { error } = await supabase.auth.signInWithPassword({
            email,
            password,
        })

        if (error) {
            setError(error.message)
            setLoading(false)
        }
        // On success, AuthContext picks up the session change automatically
    }

    return (
        <div className="flex min-h-svh items-center justify-center bg-gradient-to-br from-background via-background to-muted/40 px-4">
            {/* Subtle background decoration */}
            <div className="pointer-events-none absolute inset-0 overflow-hidden">
                <div className="absolute -left-40 -top-40 h-[500px] w-[500px] rounded-full bg-primary/[0.03] blur-3xl" />
                <div className="absolute -bottom-40 -right-40 h-[500px] w-[500px] rounded-full bg-primary/[0.03] blur-3xl" />
            </div>

            <div className="relative w-full max-w-sm">
                {/* Branding */}
                <div className="mb-8 flex flex-col items-center gap-3">
                    <div className="flex size-12 items-center justify-center rounded-2xl bg-foreground shadow-lg">
                        <Landmark className="size-6 text-background" />
                    </div>
                    <h1 className="text-2xl font-bold tracking-tight">BomboBank</h1>
                    <p className="text-sm text-muted-foreground">
                        Sign in to manage your finances
                    </p>
                </div>

                <Card className="border-border/50 shadow-xl shadow-black/5">
                    <form onSubmit={handleSubmit}>
                        <CardHeader className="pb-4">
                            <CardTitle className="text-lg">Welcome back</CardTitle>
                            <CardDescription>
                                Enter your credentials to continue
                            </CardDescription>
                        </CardHeader>

                        <CardContent className="space-y-4">
                            {error && (
                                <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2.5 text-sm text-destructive">
                                    <AlertCircle className="size-4 shrink-0" />
                                    {error}
                                </div>
                            )}

                            <div className="space-y-2">
                                <Label htmlFor="login-email">Email</Label>
                                <Input
                                    id="login-email"
                                    type="email"
                                    placeholder="you@example.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                    autoComplete="email"
                                    autoFocus
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="login-password">Password</Label>
                                <Input
                                    id="login-password"
                                    type="password"
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    autoComplete="current-password"
                                    minLength={6}
                                />
                            </div>
                        </CardContent>

                        <CardFooter className="flex flex-col gap-4 pt-2">
                            <Button type="submit" className="w-full" disabled={loading}>
                                {loading && <Loader2 className="mr-2 size-4 animate-spin" />}
                                Sign in
                            </Button>

                            <p className="text-center text-sm text-muted-foreground">
                                Don't have an account?{" "}
                                <button
                                    type="button"
                                    onClick={onSwitchToRegister}
                                    className="font-medium text-foreground underline-offset-4 hover:underline"
                                >
                                    Create account
                                </button>
                            </p>
                        </CardFooter>
                    </form>
                </Card>
            </div>
        </div>
    )
}
