import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAuthCookie } from "@/lib/auth/cookies";

export async function GET(request: NextRequest) {
  try {
    const token = await getAuthCookie();

    if (!token) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }

    // Decode the token to get user ID
    let user;
    try {
      const decodedToken = Buffer.from(token, "base64").toString("utf-8");
      user = JSON.parse(decodedToken);
    } catch (error) {
      console.error("Error decoding token:", error);
      return new Response(
        JSON.stringify({ error: "Invalid token" }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }

    const supabase = await createClient();

    // First, check if user has an active or pending subscription
    const { data: subscriptionData, error: subscriptionError } = await supabase
      .from("user_subscriptions")
      .select("*, subscription_plans(name, price_sar)")
      .eq("user_id", user.id)
      .or("status.eq.active,status.eq.pending") // Check for active or pending subscriptions
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (subscriptionError && subscriptionError.code !== 'PGRST116') {
      // If there's an error other than "not found" (no subscription), return error
      console.error("Error fetching subscription data:", subscriptionError);
      return new Response(
        JSON.stringify({ error: "Database error fetching subscription" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    // Check if user has premium status directly set in their profile
    const { data: profileData, error: profileError } = await supabase
      .from("profiles")
      .select("is_premium")
      .eq("id", user.id)
      .single();

    if (profileError) {
      console.error("Error fetching profile data:", profileError);
      // If we can't fetch profile, only rely on subscription status
      const hasValidSubscription = !!subscriptionData &&
                                   (subscriptionData.status === 'active' || subscriptionData.status === 'pending');

      const subscriptionInfo = subscriptionData ? {
        plan_name: subscriptionData.subscription_plans?.name || "Basic Plan",
        price: subscriptionData.subscription_plans?.price_sar,
        status: subscriptionData.status,
        start_date: subscriptionData.start_date,
        end_date: subscriptionData.end_date,
      } : null;

      return new Response(
        JSON.stringify({
          hasValidSubscription: hasValidSubscription, // Only consider subscription if profile fetch failed
          hasValidSubscriptionOnly: hasValidSubscription,
          hasDirectPremium: false,
          subscription: subscriptionInfo
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }

    const hasValidSubscription = !!subscriptionData &&
                                 (subscriptionData.status === 'active' || subscriptionData.status === 'pending');

    // The user has access if they have either:
    // 1. An active/pending subscription OR
    // 2. Direct premium status set in their profile
    const hasValidAccess = hasValidSubscription || (profileData && profileData.is_premium);

    const subscriptionInfo = subscriptionData ? {
      plan_name: subscriptionData.subscription_plans?.name || "Basic Plan",
      price: subscriptionData.subscription_plans?.price_sar,
      status: subscriptionData.status,
      start_date: subscriptionData.start_date,
      end_date: subscriptionData.end_date,
    } : null;

    return new Response(
      JSON.stringify({
        hasValidSubscription: hasValidAccess, // Changed to include both subscription and direct premium status
        hasValidSubscriptionOnly: hasValidSubscription, // Keep original for reference
        hasDirectPremium: !!(profileData && profileData.is_premium), // For debugging
        subscription: subscriptionInfo
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error checking subscription:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}