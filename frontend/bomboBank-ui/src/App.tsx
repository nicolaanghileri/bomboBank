import { useState } from "react"
import { useAuth } from "@/contexts/AuthContext"
import { Sidebar } from "@/components/Sidebar"
import { Header } from "@/components/Header"
import { Dashboard } from "@/components/Dashboard"
import { SpendingPage } from "@/components/SpendingPage"
import { TransactionsPage } from "@/components/TransactionsPage"
import { UploadPage } from "@/components/UploadPage"
import { RecurringPage } from "@/components/RecurringPage"
import { TaxDeductionsPage } from "@/components/TaxDeductionsPage"
import { ProfilePage } from "@/components/ProfilePage"
import { LoginPage } from "@/components/LoginPage"
import { RegisterPage } from "@/components/RegisterPage"
import { Loader2 } from "lucide-react"

type AppPage = "dashboard" | "spending" | "transactions" | "recurring" | "upload" | "tax" | "profile"
type AuthPage = "login" | "register"

const pageConfig: Record<AppPage, { title: string; description: string }> = {
  dashboard: {
    title: "Dashboard",
    description: "Your financial overview at a glance",
  },
  spending: {
    title: "Spending",
    description: "Deep dive into your spending patterns",
  },
  transactions: {
    title: "Transactions",
    description: "Browse and filter all your transactions",
  },
  recurring: {
    title: "Recurring",
    description: "Subscriptions and payments that repeat every month",
  },
  upload: {
    title: "Upload",
    description: "Import transactions from your bank CSV export",
  },
  tax: {
    title: "Steuerabzüge",
    description: "Mögliche Steuerabzüge basierend auf deinen Transaktionen",
  },
  profile: {
    title: "Profil",
    description: "Persönliche Einstellungen und Kanton",
  },
}

function App() {
  const { user, loading, signOut } = useAuth()
  const [currentPage, setCurrentPage] = useState<AppPage>("dashboard")
  const [authPage, setAuthPage] = useState<AuthPage>("login")

  // Loading state while checking session
  if (loading) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="size-8 animate-spin text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Loading…</p>
        </div>
      </div>
    )
  }

  // Not authenticated → show Login or Register
  if (!user) {
    if (authPage === "register") {
      return <RegisterPage onSwitchToLogin={() => setAuthPage("login")} />
    }
    return <LoginPage onSwitchToRegister={() => setAuthPage("register")} />
  }

  // Authenticated → show the app
  const { title, description } = pageConfig[currentPage]

  return (
    <div className="flex min-h-svh bg-background font-sans antialiased">
      <Sidebar
        currentPage={currentPage}
        onNavigate={setCurrentPage}
        userEmail={user.email ?? "User"}
        onSignOut={signOut}
      />

      <div className="flex flex-1 flex-col pl-64">
        <Header title={title} description={description} />

        <main className="flex-1">
          {currentPage === "dashboard" && <Dashboard />}
          {currentPage === "spending" && <SpendingPage />}
          {currentPage === "transactions" && <TransactionsPage />}
          {currentPage === "recurring" && <RecurringPage />}
          {currentPage === "upload" && <UploadPage />}
          {currentPage === "tax" && <TaxDeductionsPage />}
          {currentPage === "profile" && <ProfilePage />}
        </main>
      </div>
    </div>
  )
}

export default App