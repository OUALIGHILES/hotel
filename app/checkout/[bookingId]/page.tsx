"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ArrowLeft } from "lucide-react"

interface BookingDetails {
  id: string
  check_in_date: string
  check_out_date: string
  total_price: number
  total_guests: number
  listings: {
    title: string
    city: string
    price_per_night: number
  }
}

export default function CheckoutPage() {
  const params = useParams()
  const router = useRouter()
  const bookingId = params.bookingId as string
  const supabase = createClient()

  const [booking, setBooking] = useState<BookingDetails | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isProcessing, setIsProcessing] = useState(false)

  const [cardData, setCardData] = useState({
    cardNumber: "",
    expiryDate: "",
    cvc: "",
    cardHolder: "",
  })

  useEffect(() => {
    const fetchBooking = async () => {
      try {
        const { data } = await supabase
          .from("bookings")
          .select("*, listings(title, city, price_per_night)")
          .eq("id", bookingId)
          .single()

        setBooking(data)
      } catch (error) {
        console.error("Error fetching booking:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchBooking()
  }, [bookingId])

  const handlePayment = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsProcessing(true)

    try {
      // Simulate payment processing
      await new Promise((resolve) => setTimeout(resolve, 2000))

      // Update booking status
      const { error } = await supabase
        .from("bookings")
        .update({
          payment_status: "paid",
          status: "confirmed",
        })
        .eq("id", bookingId)

      if (error) throw error

      router.push("/dashboard/bookings")
    } catch (error) {
      console.error("Payment failed:", error)
      alert("Payment failed. Please try again.")
    } finally {
      setIsProcessing(false)
    }
  }

  if (isLoading) {
    return <div className="container mx-auto px-4 py-8">Loading...</div>
  }

  if (!booking) {
    return <div className="container mx-auto px-4 py-8">Booking not found</div>
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <Button variant="ghost" onClick={() => router.back()} className="gap-2 mb-6">
        <ArrowLeft className="w-4 h-4" />
        Back
      </Button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 max-w-4xl">
        {/* Payment Form */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Payment Details</CardTitle>
              <CardDescription>Enter your card information to complete the booking</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handlePayment} className="space-y-6">
                <div className="grid gap-2">
                  <Label htmlFor="cardHolder">Cardholder Name</Label>
                  <Input
                    id="cardHolder"
                    placeholder="John Doe"
                    required
                    value={cardData.cardHolder}
                    onChange={(e) => setCardData((prev) => ({ ...prev, cardHolder: e.target.value }))}
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="cardNumber">Card Number</Label>
                  <Input
                    id="cardNumber"
                    placeholder="4111 1111 1111 1111"
                    required
                    value={cardData.cardNumber}
                    onChange={(e) => setCardData((prev) => ({ ...prev, cardNumber: e.target.value }))}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="expiry">Expiry Date</Label>
                    <Input
                      id="expiry"
                      placeholder="MM/YY"
                      required
                      value={cardData.expiryDate}
                      onChange={(e) => setCardData((prev) => ({ ...prev, expiryDate: e.target.value }))}
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="cvc">CVC</Label>
                    <Input
                      id="cvc"
                      placeholder="123"
                      required
                      value={cardData.cvc}
                      onChange={(e) => setCardData((prev) => ({ ...prev, cvc: e.target.value }))}
                    />
                  </div>
                </div>

                <Button className="w-full" disabled={isProcessing}>
                  {isProcessing ? "Processing Payment..." : "Complete Payment"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Order Summary */}
        <div>
          <Card className="sticky top-20">
            <CardHeader>
              <CardTitle>Order Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="font-semibold text-sm">{booking.listings.title}</p>
                <p className="text-sm text-gray-600">{booking.listings.city}</p>
              </div>

              <div className="border-t pt-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span>{booking.listings.price_per_night} x nights</span>
                  <span>${booking.total_price}</span>
                </div>
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Service fee</span>
                  <span>${Math.round(booking.total_price * 0.1)}</span>
                </div>
                <div className="border-t pt-2 flex justify-between font-bold">
                  <span>Total</span>
                  <span>${booking.total_price + Math.round(booking.total_price * 0.1)}</span>
                </div>
              </div>

              <div className="text-xs text-gray-600 bg-gray-50 p-3 rounded">
                This is a demo payment. Use card 4111 1111 1111 1111 to test.
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
