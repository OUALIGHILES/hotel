"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Loader2, Lock, AlertCircle } from "lucide-react"
import Link from "next/link"

interface AuthGuardProps {
  children: React.ReactNode
}

export default function DashboardAuthGuard({ children }: AuthGuardProps) {
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null)
  const [hasSubscription, setHasSubscription] = useState<boolean | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const checkAuthorization = async () => {
      try {
        // Check if user is authenticated by checking the auth cookie via API
        const response = await fetch("/api/auth/check")

        if (!response.ok) {
          // If not authenticated, redirect to login
          router.push("/auth/login")
          return
        }

        const userData = await response.json()

        if (!userData.user) {
          router.push("/auth/login")
          return
        }

        // User is authenticated
        setIsAuthorized(true)

        // Check if user has a valid subscription using the dedicated API
        const subscriptionResponse = await fetch("/api/dashboard/subscription")
        if (subscriptionResponse.ok) {
          const subscriptionData = await subscriptionResponse.json()
          setHasSubscription(subscriptionData.hasValidSubscription)
        } else {
          // If subscription API fails, assume no subscription
          setHasSubscription(false)
        }
      } catch (error) {
        console.error("Error checking authentication:", error)
        setIsAuthorized(false)
        setHasSubscription(false)
      } finally {
        setLoading(false)
      }
    }

    checkAuthorization()
  }, [router])

  // If user is authenticated but doesn't have a subscription, redirect to packages
  useEffect(() => {
    if (isAuthorized && hasSubscription === false) {
      router.push("/packages")
    }
  }, [isAuthorized, hasSubscription, router])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">Verifying access...</p>
        </div>
      </div>
    )
  }

  if (!isAuthorized) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
        <Card className="max-w-md w-full p-8 text-center">
          <Lock className="w-12 h-12 mx-auto mb-4 text-red-500" />
          <h2 className="text-2xl font-bold mb-2">Access Denied</h2>
          <p className="text-gray-600 mb-6">
            You are not authenticated. Please log in to access your properties.
          </p>
          <div className="flex flex-col gap-3">
            <Link href="/auth/login">
              <Button className="w-full bg-blue-600 hover:bg-blue-700">Go to Login</Button>
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

  // This case should rarely happen since we redirect in the useEffect, but included for completeness
  if (isAuthorized && hasSubscription === false) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
        <Card className="max-w-md w-full p-8 text-center">
          <AlertCircle className="w-12 h-12 mx-auto mb-4 text-yellow-500" />
          <h2 className="text-2xl font-bold mb-2">Subscription Required</h2>
          <p className="text-gray-600 mb-6">
            You need an active subscription to access the dashboard. Please upgrade your plan.
          </p>
          <div className="flex flex-col gap-3">
            <Link href="/packages">
              <Button className="w-full bg-blue-600 hover:bg-blue-700">Go to Packages</Button>
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
