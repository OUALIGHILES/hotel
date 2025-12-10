"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { ArrowLeft, Loader2 } from "lucide-react"

interface Plan {
  id: string
  name: string
  price_sar: number
}

export default function CheckoutPage() {
  const [plan, setPlan] = useState<Plan | null>(null)
  const [user, setUser] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isProcessing, setIsProcessing] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()
  const planId = searchParams.get("plan")
  const supabase = createClient()

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Check custom auth instead of Supabase auth
        const response = await fetch("/api/auth/check");
        if (!response.ok) {
          router.push("/auth/login");
          return;
        }

        const result = await response.json();
        if (!result.user) {
          router.push("/auth/login");
          return;
        }

        setUser(result.user)

        if (!planId) {
          router.push("/packages")
          return
        }

        // Fetch plan details
        const { data, error } = await supabase.from("subscription_plans").select("*").eq("id", planId).single()

        if (error) throw error
        setPlan(data)
      } catch (error) {
        console.error("Error fetching plan:", error)
        router.push("/packages")
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [planId])

  const handleMoyasserPayment = async () => {
    if (!plan || !user) return

    setIsProcessing(true)

    try {
      // Call backend API to initiate Moyasser payment
      const response = await fetch("/api/payment/moyasser", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planId: plan.id,
          amount: plan.price_sar,
          email: user.email,
          name: user.user_metadata?.full_name || "Customer",
        }),
      })

      if (!response.ok) throw new Error("Payment initiation failed")

      const data = await response.json()

      // Redirect to Moyasser payment page
      if (data.paymentUrl) {
        window.location.href = data.paymentUrl
      }
    } catch (error) {
      console.error("Payment error:", error)
      alert("Failed to initiate payment. Please try again.")
    } finally {
      setIsProcessing(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">Loading checkout...</p>
        </div>
      </div>
    )
  }

  if (!plan) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <Card className="p-8 text-center">
          <p className="text-gray-600 mb-4">Plan not found</p>
          <Link href="/packages">
            <Button variant="outline">Back to Plans</Button>
          </Link>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white border-b">
        <div className="container mx-auto px-4 py-4 flex items-center gap-4">
          <Link href="/packages" className="flex items-center gap-2 hover:opacity-80">
            <ArrowLeft className="w-5 h-5" />
            <span className="text-sm font-medium">Back</span>
          </Link>
          <h1 className="text-2xl font-bold">Checkout</h1>
        </div>
      </header>

      {/* Checkout Content */}
      <section className="container mx-auto px-4 py-12">
        <div className="max-w-2xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Order Summary */}
            <div className="md:col-span-2">
              <Card className="p-8">
                <h2 className="text-2xl font-bold mb-8">Order Summary</h2>

                <div className="space-y-6">
                  {/* Plan Details */}
                  <div className="border-b pb-6">
                    <div className="flex justify-between items-center mb-4">
                      <div>
                        <h3 className="font-semibold text-lg">{plan.name} Plan</h3>
                        <p className="text-sm text-gray-600">Monthly Subscription</p>
                      </div>
                      <span className="text-2xl font-bold text-blue-600">{plan.price_sar.toLocaleString()} SAR</span>
                    </div>
                  </div>

                  {/* Total */}
                  <div className="flex justify-between items-center text-xl font-bold">
                    <span>Total</span>
                    <span className="text-blue-600">{plan.price_sar.toLocaleString()} SAR</span>
                  </div>

                  {/* Payment Button */}
                  <Button
                    onClick={handleMoyasserPayment}
                    disabled={isProcessing}
                    className="w-full bg-blue-600 hover:bg-blue-700 h-12 text-base"
                    size="lg"
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      "Pay with Moyasser"
                    )}
                  </Button>

                  <p className="text-xs text-gray-500 text-center">
                    Your subscription will automatically renew monthly. You can cancel anytime.
                  </p>
                </div>
              </Card>
            </div>

            {/* Sidebar */}
            <div>
              <Card className="p-6 bg-blue-50">
                <h3 className="font-semibold mb-4">What You Get</h3>
                <ul className="space-y-3 text-sm">
                  <li className="flex items-start gap-2">
                    <span className="text-green-600 font-bold">✓</span>
                    <span>Unlimited properties management</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-600 font-bold">✓</span>
                    <span>Advanced PMS dashboard</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-600 font-bold">✓</span>
                    <span>Booking management</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-600 font-bold">✓</span>
                    <span>Guest communication</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-600 font-bold">✓</span>
                    <span>Financial reports</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-600 font-bold">✓</span>
                    <span>Payment processing</span>
                  </li>
                </ul>
              </Card>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
