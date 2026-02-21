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
import { Landmark, Loader2, AlertCircle, CheckCircle2 } from "lucide-react"

interface RegisterPageProps {
    onSwitchToLogin: () => void
}

export function RegisterPage({ onSwitchToLogin }: RegisterPageProps) {
    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const [confirmPassword, setConfirmPassword] = useState("")
    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState(false)
    const [loading, setLoading] = useState(false)

    async function handleSubmit(e: FormEvent) {
        e.preventDefault()
        setError(null)

        // Client-side validation
        if (password !== confirmPassword) {
            setError("Passwords do not match")
            return
        }

        if (password.length < 6) {
            setError("Password must be at least 6 characters")
            return
        }

        setLoading(true)

        const { error } = await supabase.auth.signUp({
            email,
            password,
        })

        if (error) {
            setError(error.message)
            setLoading(false)
        } else {
            setSuccess(true)
            setLoading(false)
        }
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
                        Create your account to get started
                    </p>
                </div>

                <Card className="border-border/50 shadow-xl shadow-black/5">
                    {success ? (
                        <>
                            <CardHeader className="items-center pb-4">
                                <div className="mb-2 flex size-12 items-center justify-center rounded-full bg-emerald-500/10">
                                    <CheckCircle2 className="size-6 text-emerald-500" />
                                </div>
                                <CardTitle className="text-lg">Check your email</CardTitle>
                                <CardDescription className="text-center">
                                    We sent a confirmation link to{" "}
                                    <span className="font-medium text-foreground">{email}</span>.
                                    Click the link to activate your account.
                                </CardDescription>
                            </CardHeader>
                            <CardFooter className="pt-2">
                                <Button
                                    variant="outline"
                                    className="w-full"
                                    onClick={onSwitchToLogin}
                                >
                                    Back to sign in
                                </Button>
                            </CardFooter>
                        </>
                    ) : (
                        <form onSubmit={handleSubmit}>
                            <CardHeader className="pb-4">
                                <CardTitle className="text-lg">Create account</CardTitle>
                                <CardDescription>
                                    Fill in your details to register
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
                                    <Label htmlFor="register-email">Email</Label>
                                    <Input
                                        id="register-email"
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
                                    <Label htmlFor="register-password">Password</Label>
                                    <Input
                                        id="register-password"
                                        type="password"
                                        placeholder="••••••••"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        required
                                        autoComplete="new-password"
                                        minLength={6}
                                    />
                                    <p className="text-xs text-muted-foreground">
                                        Must be at least 6 characters
                                    </p>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="register-confirm">Confirm password</Label>
                                    <Input
                                        id="register-confirm"
                                        type="password"
                                        placeholder="••••••••"
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        required
                                        autoComplete="new-password"
                                        minLength={6}
                                    />
                                </div>
                            </CardContent>

                            <CardFooter className="flex flex-col gap-4 pt-2">
                                <Button type="submit" className="w-full" disabled={loading}>
                                    {loading && <Loader2 className="mr-2 size-4 animate-spin" />}
                                    Create account
                                </Button>

                                <p className="text-center text-sm text-muted-foreground">
                                    Already have an account?{" "}
                                    <button
                                        type="button"
                                        onClick={onSwitchToLogin}
                                        className="font-medium text-foreground underline-offset-4 hover:underline"
                                    >
                                        Sign in
                                    </button>
                                </p>
                            </CardFooter>
                        </form>
                    )}
                </Card>
            </div>
        </div>
    )
}
