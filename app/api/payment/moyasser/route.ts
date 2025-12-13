import { createClientForRoute } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"

const MOYASSER_API_KEY = process.env.MOYASSER_API_KEY || ""
const MOYASSER_PUBLISHABLE_KEY = process.env.MOYASSER_PUBLISHABLE_KEY || ""
const MOYASSER_API_URL = "https://api.moyasar.com/v1"

// Validate that required environment variables are set
if (!MOYASSER_API_KEY) {
  console.error("MOYASSER_API_KEY is not set in environment variables");
}

if (!MOYASSER_PUBLISHABLE_KEY) {
  console.error("MOYASSER_PUBLISHABLE_KEY is not set in environment variables");
}

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
    // Validate that required environment variables are set
    if (!MOYASSER_API_KEY || !MOYASSER_PUBLISHABLE_KEY) {
      return NextResponse.json({
        error: "Payment system not configured properly. Contact administrator."
      }, { status: 500 });
    }

    // Ensure callback URL is available
    const callbackUrl = process.env.NEXT_PUBLIC_APP_URL;
    if (!callbackUrl) {
      return NextResponse.json({
        error: "Application URL is not configured. Contact administrator."
      }, { status: 500 });
    }

    const { planId, amount, email, name, reservationId } = await request.json()

    if (!amount || !email || !name) {
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

    // For reservation payments, we might not need authentication if it's for a guest
    if (!user && !reservationId) {
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
        description: reservationId ? `Reservation Payment - ${reservationId}` : `Premium Subscription Plan - ${planId}`,
        callback_url: `${process.env.NEXT_PUBLIC_APP_URL}/api/payment/callback`,
        metadata: {
          userId: user?.id,
          planId: planId,
          reservationId: reservationId,
          email: email,
          name: name,
        },
      }),
    })

    if (!paymentResponse.ok) {
      const errorText = await paymentResponse.text();
      console.error(`Moyasser API Error: ${paymentResponse.status} - ${errorText}`);

      // Return proper error response
      return NextResponse.json({
        error: `Payment service error: ${paymentResponse.status} - ${errorText.substring(0, 100)}`
      }, { status: paymentResponse.status });
    }

    const paymentData = await paymentResponse.json()

    // Store pending payment in database based on type (subscription vs reservation)
    if (planId) {
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
    } else if (reservationId) {
      // For reservation payments, we could store payment transaction
      const { error: transactionError } = await supabase.from("payment_transactions").insert({
        reservation_id: reservationId,
        amount: amount,
        currency: "SAR",
        payment_method: "credit_card", // Using credit_card as Moyasser processes card payments
        status: "pending",
        transaction_id: paymentData.id,
        user_id: user?.id,
        email: email,
        guest_name: name,
      })

      if (transactionError) {
        console.error("Failed to store payment transaction:", transactionError)
        // We don't want to fail the payment just because we couldn't store the transaction
      }
    }

    // If this is a subscription purchase (planId exists), send notification to support
    if (planId && user) {
      try {
        // Get plan details for the notification
        const { data: planData } = await supabase
          .from("subscription_plans")
          .select("*")
          .eq("id", planId)
          .single();

        // Prepare invoice details
        const invoiceDetails = {
          userId: user.id,
          userEmail: user.email,
          userName: user.user_metadata?.full_name || user.email.split('@')[0],
          planName: planData?.name || 'Unknown Plan',
          amount: amount,
          currency: "SAR",
          paymentId: paymentData.id,
          timestamp: new Date().toISOString(),
        };

        // Send notification to support - this could be via email, WhatsApp, or internal system
        // For now, let's use a webhook to send the notification to support
        await sendSupportNotification(invoiceDetails);
      } catch (notificationError) {
        console.error("Failed to send support notification:", notificationError);
        // Don't fail the payment if notification fails - just log the error
      }
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

// Helper function to send invoice notification to support
async function sendSupportNotification(invoiceDetails: {
  userId: string;
  userEmail: string;
  userName: string;
  planName: string;
  amount: number;
  currency: string;
  paymentId: string;
  timestamp: string;
}) {
  // Send invoice notification to support via email or WhatsApp
  // For this implementation, we'll send a webhook to a notification service
  // In a real implementation, you'd integrate with an email service or WhatsApp API

  const supportContact = {
    email: "welhost.sa@gmail.com", // This should come from support page settings
    whatsapp: "+96650862900"       // This should come from support page settings
  };

  // Prepare the notification payload
  const notificationPayload = {
    type: "invoice_notification",
    invoice: invoiceDetails,
    supportContact,
    message: `New payment received!\n\nUser: ${invoiceDetails.userName} (${invoiceDetails.userEmail})\nPlan: ${invoiceDetails.planName}\nAmount: ${invoiceDetails.amount} ${invoiceDetails.currency}\nPayment ID: ${invoiceDetails.paymentId}\nTime: ${invoiceDetails.timestamp}\n\nPlease prepare and send invoice to customer.`
  };

  // Send both email and WhatsApp notifications to support
  try {
    // Send email notification to support
    await fetch('/api/notifications/send-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: supportContact.email,
        subject: `New Invoice: ${invoiceDetails.planName} Purchase`,
        text: notificationPayload.message
      })
    });

    // Send WhatsApp notification to support
    await fetch('/api/notifications/send-whatsapp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: supportContact.whatsapp,
        message: notificationPayload.message
      })
    });
  } catch (notificationError) {
    console.error("Failed to send one or more support notifications:", notificationError);
    // Don't fail the process if notifications fail - just log the error
  }
}
