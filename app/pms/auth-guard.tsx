"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Loader2 } from "lucide-react"
import Link from "next/link"

interface AuthGuardProps {
  children: React.ReactNode
}

export function AuthGuard({ children }: AuthGuardProps) {
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const checkSubscription = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser()

        if (!user) {
          router.push("/auth/login")
          return
        }

        const { data: subscription, error } = await supabase
          .from("user_subscriptions")
          .select("id, status")
          .eq("user_id", user.id)
          .eq("is_active", true)
          .single()

        if (error || !subscription || subscription.status !== "active") {
          setIsAuthorized(false)
          return
        }

        setIsAuthorized(true)
      } catch (error) {
        console.error("Error checking subscription:", error)
        setIsAuthorized(false)
      }
    }

    checkSubscription()
  }, [])

  if (isAuthorized === null) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">Verifying subscription...</p>
        </div>
      </div>
    )
  }

  if (!isAuthorized) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
        <Card className="max-w-md w-full p-8 text-center">
          <h1 className="text-2xl font-bold mb-4">Premium Access Required</h1>
          <p className="text-gray-600 mb-6">
            You need an active premium subscription to access the PMS dashboard. Upgrade now to unlock unlimited
            property management features.
          </p>
          <div className="flex flex-col gap-3">
            <Link href="/packages">
              <Button className="w-full bg-blue-600 hover:bg-blue-700">View Subscription Plans</Button>
            </Link>
            <Link href="/">
              <Button variant="outline" className="w-full bg-transparent">
                Back to Home
              </Button>
            </Link>
          </div>
        </Card>
      </div>
    )
  }

  return <>{children}</>
}
