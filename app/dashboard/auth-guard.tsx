"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
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

        // For this implementation, we're just checking authentication
        // You can extend this to check for subscriptions if needed
        setIsAuthorized(true)
      } catch (error) {
        console.error("Error checking authentication:", error)
        setIsAuthorized(false)
      }
    }

    checkAuthorization()
  }, [])

  if (isAuthorized === null) {
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
