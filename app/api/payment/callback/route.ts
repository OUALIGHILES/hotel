import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"

const MOYASSER_API_KEY = process.env.MOYASSER_API_KEY || ""
const MOYASSER_API_URL = "https://api.moyasar.com/v1"

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const paymentId = searchParams.get("id")

    if (!paymentId) {
      return NextResponse.redirect(new URL("/checkout?error=missing_payment_id", request.url))
    }

    // Verify payment with Moyasser
    const paymentResponse = await fetch(`${MOYASSER_API_URL}/payments/${paymentId}`, {
      headers: {
        Authorization: `Bearer ${MOYASSER_API_KEY}`,
      },
    })

    if (!paymentResponse.ok) {
      return NextResponse.redirect(new URL("/checkout?error=payment_verification_failed", request.url))
    }

    const payment = await paymentResponse.json()

    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)

    if (payment.status === "paid") {
      const userId = payment.metadata?.userId;
      const reservationId = payment.metadata?.reservationId;

      if (reservationId) {
        // Handle reservation payment
        // Update reservation status in database
        const { error: reservationUpdateError } = await supabase
          .from("reservations")
          .update({
            payment_status: "paid",
            payment_method: "credit_card", // Using credit_card as Moyasser processes card payments
            amount_paid: payment.amount ? payment.amount / 100 : null, // Convert from fils to whole currency
          })
          .eq("id", reservationId);

        if (reservationUpdateError) {
          console.error("Failed to update reservation:", reservationUpdateError);
        }

        // Update the payment transaction status
        const { error: transactionUpdateError } = await supabase
          .from("payment_transactions")
          .update({
            status: "completed",
            reference_number: payment.id,
          })
          .eq("transaction_id", paymentId);

        if (transactionUpdateError) {
          console.error("Failed to update payment transaction:", transactionUpdateError);
        }

        // Redirect to reservation details
        return NextResponse.redirect(new URL(`/dashboard/reservations/${reservationId}`, request.url));
      } else {
        // Handle subscription payment
        const { error: updateError } = await supabase
          .from("user_subscriptions")
          .update({
            status: "active",
            start_date: new Date().toISOString(),
            // Set end_date based on billing cycle (assuming monthly for now)
            end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days from now
          })
          .eq("moyasser_payment_id", paymentId)
          .eq("user_id", userId)

        if (updateError) {
          console.error("Failed to update subscription:", updateError)
        }

        // Update user profile to set premium status
        const { error: profileError } = await supabase
          .from("profiles")
          .update({
            is_premium: true,
            is_host: true
          })
          .eq("id", userId)

        if (profileError) {
          console.error("Failed to update profile:", profileError)
        }

        // Redirect to dashboard
        return NextResponse.redirect(new URL("/dashboard", request.url));
      }
    } else if (payment.status === "failed") {
      const reservationId = payment.metadata?.reservationId;
      if (reservationId) {
        return NextResponse.redirect(new URL(`/dashboard/reservations/${reservationId}?error=payment_failed`, request.url));
      }
      return NextResponse.redirect(new URL("/checkout?error=payment_failed", request.url));
    }

    const reservationId = payment.metadata?.reservationId;
    if (reservationId) {
      return NextResponse.redirect(new URL(`/dashboard/reservations/${reservationId}?error=payment_pending`, request.url));
    }
    return NextResponse.redirect(new URL("/checkout?error=payment_pending", request.url));
  } catch (error) {
    console.error("Callback error:", error)
    return NextResponse.redirect(new URL("/checkout?error=callback_error", request.url))
  }
}
