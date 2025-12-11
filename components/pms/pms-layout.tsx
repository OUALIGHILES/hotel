"use client"

import type React from "react"

import { useState, useEffect } from "react"
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
  User,
  Home,
  Bell,
  DollarSign,
} from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { useLanguage } from "@/lib/language-context";
import LanguageSelector from "@/components/ui/language-selector";
import { useTheme } from "@/lib/theme-context";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import NotificationDropdown from "@/components/notifications/notification-dropdown";

interface PMSLayoutProps {
  children: React.ReactNode
}

export function PMSLayout({ children }: PMSLayoutProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [user, setUser] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [unreadMessageCount, setUnreadMessageCount] = useState(0)
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const { t } = useLanguage(); // Get the translation function

  // Fetch unread messages count
  useEffect(() => {
    if (!user?.id) {
      // Reset count if no user
      setUnreadMessageCount(0);
      return;
    }

    const fetchUnreadMessageCount = async () => {
      try {
        // Count unread messages for the user - messages are sent directly to the user
        const { count, error } = await supabase
          .from("messages")
          .select("id", { count: "exact" })
          .eq("recipient_id", user.id)
          .eq("is_read", false);

        if (error) {
          console.error("Error fetching unread messages count:", error);
          setUnreadMessageCount(0);
        } else {
          setUnreadMessageCount(count || 0);
        }
      } catch (error) {
        console.error("Error in fetchUnreadMessageCount:", error);
        setUnreadMessageCount(0);
      }
    };

    fetchUnreadMessageCount();
  }, [user, supabase]);

  // Navigation items must be defined inside the component to access the t function
  const navItems = [
    { label: t('dashboard'), href: "/dashboard/home", icon: LayoutDashboard },
    { label: t('properties'), href: "/dashboard/properties", icon: Building2 },
    { label: t('units'), href: "/dashboard/units", icon: DoorOpen },
    { label: t('occupancy'), href: "/dashboard/occupancy", icon: Calendar },
    { label: t('reservations'), href: "/dashboard/reservations", icon: BookOpen },
    { label: t('guests'), href: "/dashboard/guests", icon: Users },
    ...(user?.is_premium ? [{ label: t('messages'), href: "/dashboard/messages", icon: MessageSquare }] : []),
    { label: t('channels'), href: "/dashboard/channels", icon: Radio },
    { label: t('smartLocks'), href: "/dashboard/smart-locks", icon: Lock },
    { label: t('tasks'), href: "/dashboard/tasks", icon: CheckSquare2 },
    { label: t('invoices'), href: "/dashboard/invoices", icon: FileText },
    { label: t('receipts'), href: "/dashboard/receipts", icon: ReceiptText },
    { label: t('expenses'), href: "/dashboard/expenses", icon: DollarSign },
    { label: t('reports'), href: "/dashboard/reports", icon: TrendingUp },
    { label: t('ownerStatements'), href: "/owner-statements", icon: FileText },
    { label: t('paymentTracking'), href: "/payment-tracking", icon: DollarSign },
    { label: t('paymentLinks'), href: "/dashboard/payment-links", icon: Link2 },
    { label: t('settings'), href: "/dashboard/settings", icon: Settings },
  ]

  // Generate nav items that need badges separately
  const messagesNavItem = user?.is_premium ? {
    label: t('messages'),
    href: "/dashboard/messages",
    icon: MessageSquare,
    badge: unreadMessageCount > 0 ? unreadMessageCount : null
  } : null;

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await fetch("/api/auth/check");
        if (response.ok) {
          const result = await response.json();
          if (result.user) {
            setUser(result.user);
          } else {
            // If no user found, redirect to login
            router.push("/auth/login");
          }
        } else {
          // If auth check fails, redirect to login
          router.push("/auth/login");
        }
      } catch (error) {
        console.error("Error fetching user:", error);
        router.push("/auth/login");
      } finally {
        setIsLoading(false);
      }
    };

    fetchUser();
  }, [router]);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
  }

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <aside
        className={cn(
          "fixed left-0 top-0 z-40 h-full w-64 bg-sidebar text-sidebar-foreground transition-transform duration-300 lg:static lg:translate-x-0",
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
              // Skip the messages item as we'll render it separately if needed
              if (item.label === t('messages')) {
                return null;
              }

              const Icon = item.icon
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 px-4 py-2 rounded-lg transition-colors",
                    isActive ? "bg-sidebar-accent text-sidebar-accent-foreground" : "text-sidebar-foreground hover:bg-sidebar-accent/50",
                  )}
                  onClick={() => setIsOpen(false)}
                >
                  <Icon className="w-5 h-5" />
                  <span className="text-sm font-medium">{item.label}</span>
                </Link>
              )
            })}

            {/* Render Messages item separately with badge if needed */}
            {messagesNavItem && (
              <Link
                key={messagesNavItem.href}
                href={messagesNavItem.href}
                className={cn(
                  "flex items-center gap-3 px-4 py-2 rounded-lg transition-colors",
                  pathname === messagesNavItem.href ? "bg-sidebar-accent text-sidebar-accent-foreground" : "text-sidebar-foreground hover:bg-sidebar-accent/50",
                )}
                onClick={() => setIsOpen(false)}
              >
                <div className="relative">
                  <MessageSquare className="w-5 h-5" />
                  {messagesNavItem.badge && (
                    <span className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground text-xs rounded-full h-5 w-5 flex items-center justify-center">
                      {messagesNavItem.badge}
                    </span>
                  )}
                </div>
                <span className="text-sm font-medium">{messagesNavItem.label}</span>
              </Link>
            )}
          </nav>

          {/* Logout */}
          <div className="p-4 border-t border-border">
            <Button variant="destructive" className="w-full" onClick={handleLogout}>
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </aside>

      {/* Overlay */}
      {isOpen && <div className="fixed inset-0 z-30 bg-black/30 lg:hidden" onClick={() => setIsOpen(false)} />}

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar */}
        <header className="bg-background border-b h-16 flex items-center justify-between px-6 z-20">
          <button onClick={() => setIsOpen(!isOpen)} className="lg:hidden">
            <Menu className="w-5 h-5" />
          </button>
          <div className="text-sm text-foreground">{t('welcomeToPMS')}</div>
          <div className="flex items-center space-x-4">
            <Link href="/" className="p-2 rounded-full hover:bg-accent">
              <Home className="w-5 h-5 text-foreground" />
            </Link>
            <NotificationDropdown />
            {user && (
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                  <User className="w-4 h-4 text-muted-foreground" />
                </div>
                <div className="hidden md:block">
                  <div className="text-sm font-medium text-foreground">{user.full_name || user.email?.split('@')[0]}</div>
                  <div className="text-xs text-muted-foreground">{user.email}</div>
                </div>
              </div>
            )}
            <div className="flex items-center space-x-2">
              <ThemeToggle />
              <LanguageSelector />
            </div>
            {user && (
              <Button variant="outline" size="sm" onClick={handleLogout}>
                <LogOut className="w-4 h-4 mr-2" />
                {t('logout')}
              </Button>
            )}
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
