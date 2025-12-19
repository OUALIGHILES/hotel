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
    let subscriptionData = null;
    let subscriptionError = null;

    try {
      const { data, error } = await supabase
        .from("user_subscriptions")
        .select("*, subscription_plans(name, price_sar)")
        .eq("user_id", user.id)
        .or("status.eq.active,status.eq.pending") // Check for active or pending subscriptions
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      subscriptionData = data;
      subscriptionError = error;
    } catch (error) {
      console.error("Error fetching subscription data:", error);
      subscriptionError = error;
    }

    // Check if user has premium status directly set in their profile
    let profileData = null;
    let profileError = null;

    try {
      const result = await supabase
        .from("profiles")
        .select("is_premium")
        .eq("id", user.id)
        .single();

      profileData = result.data;
      profileError = result.error;
    } catch (error) {
      console.error("Error fetching profile data:", error);
      profileError = error;
    }

    // Default to false if we can't fetch profile
    const hasDirectPremium = profileData && profileData.is_premium;

    // Determine subscription status
    let hasValidSubscription = false;
    let subscriptionInfo = null;

    if (!subscriptionError || subscriptionError.code === 'PGRST116') { // 'PGRST116' means no rows returned
      hasValidSubscription = !!subscriptionData &&
                           (subscriptionData.status === 'active' || subscriptionData.status === 'pending');

      if (subscriptionData) {
        subscriptionInfo = {
          plan_name: subscriptionData.subscription_plans?.name || "Basic Plan",
          price: subscriptionData.subscription_plans?.price_sar,
          status: subscriptionData.status,
          start_date: subscriptionData.start_date,
          end_date: subscriptionData.end_date,
        };
      }
    }

    // The user has access if they have either:
    // 1. An active/pending subscription OR
    // 2. Direct premium status set in their profile
    const hasValidAccess = hasValidSubscription || hasDirectPremium;

    return new Response(
      JSON.stringify({
        hasValidSubscription: hasValidAccess,
        hasValidSubscriptionOnly: hasValidSubscription,
        hasDirectPremium: hasDirectPremium,
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