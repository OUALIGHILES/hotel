"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { CheckCircle2, ArrowLeft } from "lucide-react"

interface Plan {
  id: string
  name: string
  price_sar: number
  description: string
  features: Record<string, any>
  billing_cycle: string
}

export default function PackagesPage() {
  const [plans, setPlans] = useState<Plan[]>([])
  const [user, setUser] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()
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

        // Fetch subscription plans
        const { data, error } = await supabase
          .from("subscription_plans")
          .select("*")
          .order("price_sar", { ascending: true })

        if (error) throw error
        setPlans(data || [])
      } catch (error) {
        console.error("Error fetching plans:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [])

  const handleSelectPlan = (planId: string) => {
    router.push(`/checkout?plan=${planId}`)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white border-b">
        <div className="container mx-auto px-4 py-4 flex items-center gap-4">
          <Link href="/" className="flex items-center gap-2 hover:opacity-80">
            <ArrowLeft className="w-5 h-5" />
            <span className="text-sm font-medium">Back</span>
          </Link>
          <h1 className="text-2xl font-bold">Premium Plans</h1>
        </div>
      </header>

      {/* Content */}
      <section className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold mb-4">Choose Your Plan</h2>
            <p className="text-xl text-gray-600">Unlock powerful property management features with our premium plans</p>
          </div>

          {isLoading ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">Loading plans...</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {plans.map((plan) => (
                <Card key={plan.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                  <div className="p-8">
                    <h3 className="text-2xl font-bold mb-2">{plan.name}</h3>
                    <p className="text-gray-600 mb-6">{plan.description}</p>

                    <div className="mb-8">
                      <div className="flex items-baseline gap-2">
                        <span className="text-4xl font-bold text-blue-600">{plan.price_sar.toLocaleString()}</span>
                        <span className="text-gray-600">SAR/month</span>
                      </div>
                    </div>

                    {/* Features List */}
                    <div className="space-y-4 mb-8">
                      <div className="flex items-start gap-3">
                        <CheckCircle2 className="w-5 h-5 text-green-600 mt-1 flex-shrink-0" />
                        <div>
                          <span className="font-semibold">Properties</span>
                          <p className="text-sm text-gray-600">
                            {typeof plan.features.properties === "number"
                              ? `Up to ${plan.features.properties} properties`
                              : plan.features.properties}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-start gap-3">
                        <CheckCircle2 className="w-5 h-5 text-green-600 mt-1 flex-shrink-0" />
                        <div>
                          <span className="font-semibold">Units</span>
                          <p className="text-sm text-gray-600">
                            {typeof plan.features.units === "number"
                              ? `Up to ${plan.features.units} units`
                              : plan.features.units}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-start gap-3">
                        <CheckCircle2 className="w-5 h-5 text-green-600 mt-1 flex-shrink-0" />
                        <div>
                          <span className="font-semibold">Team Members</span>
                          <p className="text-sm text-gray-600">
                            {typeof plan.features.users === "number"
                              ? `Up to ${plan.features.users} users`
                              : plan.features.users}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-start gap-3">
                        <CheckCircle2 className="w-5 h-5 text-green-600 mt-1 flex-shrink-0" />
                        <div>
                          <span className="font-semibold">Support</span>
                          <p className="text-sm text-gray-600">{plan.features.support}</p>
                        </div>
                      </div>

                      {plan.features.api_access && (
                        <div className="flex items-start gap-3">
                          <CheckCircle2 className="w-5 h-5 text-green-600 mt-1 flex-shrink-0" />
                          <div>
                            <span className="font-semibold">API Access</span>
                            <p className="text-sm text-gray-600">Full API access for integrations</p>
                          </div>
                        </div>
                      )}

                      {plan.features.custom_branding && (
                        <div className="flex items-start gap-3">
                          <CheckCircle2 className="w-5 h-5 text-green-600 mt-1 flex-shrink-0" />
                          <div>
                            <span className="font-semibold">Custom Branding</span>
                            <p className="text-sm text-gray-600">White label your dashboard</p>
                          </div>
                        </div>
                      )}
                    </div>

                    <Button
                      onClick={() => handleSelectPlan(plan.id)}
                      className="w-full bg-blue-600 hover:bg-blue-700"
                      size="lg"
                    >
                      Choose {plan.name}
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
