"use client"

import type React from "react"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  LayoutDashboard,
  Building2,
  DoorOpen,
  Calendar,
  BookOpen,
  Users,
  MessageSquare,
  Radio,
  Lock,
  CheckSquare2,
  FileText,
  ReceiptText,
  TrendingUp,
  Link2,
  Settings,
  Menu,
  X,
  LogOut,
} from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { useLanguage } from "@/lib/language-context";
import LanguageSelector from "@/components/ui/language-selector";
import { useTheme } from "@/lib/theme-context";
import { ThemeToggle } from "@/components/ui/theme-toggle";

interface PMSLayoutProps {
  children: React.ReactNode
}

const navItems = [
  { label: "Dashboard", href: "/dashboard/home", icon: LayoutDashboard },
  { label: "Properties", href: "/dashboard/properties", icon: Building2 },
  { label: "Units", href: "/dashboard/units", icon: DoorOpen },
  { label: "Occupancy", href: "/dashboard/occupancy", icon: Calendar },
  { label: "Reservations", href: "/dashboard/reservations", icon: BookOpen },
  { label: "Guests", href: "/dashboard/guests", icon: Users },
  { label: "Messages", href: "/dashboard/messages", icon: MessageSquare },
  { label: "Channels", href: "/dashboard/channels", icon: Radio },
  { label: "Smart Locks", href: "/dashboard/smart-locks", icon: Lock },
  { label: "Tasks", href: "/dashboard/tasks", icon: CheckSquare2 },
  { label: "Invoices", href: "/dashboard/invoices", icon: FileText },
  { label: "Receipts", href: "/dashboard/receipts", icon: ReceiptText },
  { label: "Reports", href: "/dashboard/reports", icon: TrendingUp },
  { label: "Payment Links", href: "/dashboard/payment-links", icon: Link2 },
  { label: "Settings", href: "/dashboard/settings", icon: Settings },
]

export function PMSLayout({ children }: PMSLayoutProps) {
  const [isOpen, setIsOpen] = useState(false)
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const { t } = useLanguage(); // Get the translation function

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push("/")
  }

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <aside
        className={cn(
          "fixed left-0 top-0 z-40 h-full w-64 bg-slate-900 text-white transition-transform duration-300 lg:static lg:translate-x-0",
          isOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center justify-between p-6 border-b border-slate-700">
            <Link href="/dashboard/home" className="font-bold text-xl">
              PMS
            </Link>
            <button onClick={() => setIsOpen(false)} className="lg:hidden">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto p-4 space-y-2">
            {navItems.map((item) => {
              const Icon = item.icon
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 px-4 py-2 rounded-lg transition-colors",
                    isActive ? "bg-blue-600 text-white" : "text-slate-300 hover:bg-slate-800",
                  )}
                  onClick={() => setIsOpen(false)}
                >
                  <Icon className="w-5 h-5" />
                  <span className="text-sm font-medium">{item.label}</span>
                </Link>
              )
            })}
          </nav>

          {/* Logout */}
          <div className="p-4 border-t border-slate-700">
            <Button variant="destructive" className="w-full" onClick={handleLogout}>
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </aside>

      {/* Overlay */}
      {isOpen && <div className="fixed inset-0 z-30 bg-black/50 lg:hidden" onClick={() => setIsOpen(false)} />}

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar */}
        <header className="bg-background border-b h-16 flex items-center justify-between px-6 z-20">
          <button onClick={() => setIsOpen(!isOpen)} className="lg:hidden">
            <Menu className="w-5 h-5" />
          </button>
          <div className="text-sm text-foreground">{t('welcomeToPMS')}</div>
          <div className="flex items-center space-x-2">
            <ThemeToggle />
            <LanguageSelector />
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto">
          <div className="p-6">{children}</div>
        </main>
      </div>
    </div>
  )
}
