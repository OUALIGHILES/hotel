import { createClientForRoute } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"

const MOYASSER_API_KEY = process.env.MOYASSER_API_KEY || ""
const MOYASSER_PUBLISHABLE_KEY = process.env.MOYASSER_PUBLISHABLE_KEY || ""
const MOYASSER_API_URL = "https://api.moyasar.com/v1"

// Helper function to get user from custom auth token
async function getUserFromCustomAuthToken(request: NextRequest) {
  const authCookie = request.cookies.get('auth_token')?.value;
  if (!authCookie) {
    return null;
  }

  try {
    const decodedToken = Buffer.from(authCookie, 'base64').toString('utf-8');
    const user = JSON.parse(decodedToken);
    return user;
  } catch (error) {
    console.error('Error decoding custom auth token:', error);
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    const { planId, amount, email, name } = await request.json()

    if (!planId || !amount || !email || !name) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const supabase = await createClientForRoute(request.cookies);

    // Try to get the authenticated user from Supabase first
    let {
      data: { user: supabaseUser },
      error: userError
    } = await supabase.auth.getUser();

    let user = supabaseUser;

    // If Supabase auth failed, try custom auth system
    if (!user) {
      const customUser = await getUserFromCustomAuthToken(request);
      if (customUser) {
        // Create a minimal user object that matches what Supabase returns
        user = {
          id: customUser.id,
          email: customUser.email,
          user_metadata: {
            full_name: customUser.full_name
          }
        };
      }
    }

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Create payment with Moyasser
    const paymentResponse = await fetch(`${MOYASSER_API_URL}/payments`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${MOYASSER_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        amount: Math.round(amount * 100), // Convert to fils (cents)
        currency: "SAR",
        description: `Premium Subscription Plan - ${planId}`,
        callback_url: `${process.env.NEXT_PUBLIC_APP_URL}/api/payment/callback`,
        metadata: {
          userId: user.id,
          planId: planId,
          email: email,
          name: name,
        },
      }),
    })

    if (!paymentResponse.ok) {
      throw new Error("Failed to create payment with Moyasser")
    }

    const paymentData = await paymentResponse.json()

    // Store pending subscription in database
    const { error: subscriptionError } = await supabase.from("user_subscriptions").insert({
      user_id: user.id,
      plan_id: planId,
      status: "pending",
      moyasser_payment_id: paymentData.id,
    })

    if (subscriptionError) {
      console.error("Failed to store subscription:", subscriptionError)
    }

    // Return the payment source URL for redirection
    return NextResponse.json({
      success: true,
      paymentUrl: paymentData.source.redirect_url,
      paymentId: paymentData.id,
    })
  } catch (error) {
    console.error("Payment API error:", error)
    return NextResponse.json({ error: "Payment processing failed" }, { status: 500 })
  }
}
