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

    // Get current date for filtering today's data
    const today = new Date().toISOString().split('T')[0];

    // Get user's properties first (since units are linked to properties)
    const { data: propertiesData, error: propertiesError } = await supabase
      .from("properties")
      .select("id")
      .eq("user_id", user.id);

    if (propertiesError) {
      return new Response(
        JSON.stringify({ error: "Database error fetching properties" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    // Get units for user's properties
    const propertyIds = propertiesData?.map(prop => prop.id) || [];
    let totalUnits = 0;
    if (propertyIds.length > 0) {
      const { data: unitsData, error: unitsError } = await supabase
        .from("units")
        .select("id", { count: "exact" })
        .in("property_id", propertyIds);

      if (unitsError) {
        return new Response(
          JSON.stringify({ error: "Database error fetching units" }),
          { status: 500, headers: { "Content-Type": "application/json" } }
        );
      }

      totalUnits = unitsData?.length || 0;
    }

    // Get reservations for user's units/properties
    let newBookings = 0;
    let activeBookings = 0;
    let currentGuests = 0;
    let todayRevenue = 0;

    if (propertyIds.length > 0) {
      // First get all units for user's properties
      const { data: unitsData, error: unitsError } = await supabase
        .from("units")
        .select("id")
        .in("property_id", propertyIds);

      if (unitsError) {
        return new Response(
          JSON.stringify({ error: "Database error fetching units" }),
          { status: 500, headers: { "Content-Type": "application/json" } }
        );
      }

      const unitIds = unitsData?.map(unit => unit.id) || [];

      if (unitIds.length > 0) {
        // Get today's reservations for user's units
        const { data: todayReservations, error: todayReservationsError } = await supabase
          .from("reservations")
          .select("*")
          .in("unit_id", unitIds)
          .or(`status.eq.confirmed,status.eq.checked_in`)
          .eq("check_in_date", today);

        if (todayReservationsError) {
          return new Response(
            JSON.stringify({ error: "Database error fetching today's reservations" }),
            { status: 500, headers: { "Content-Type": "application/json" } }
          );
        }

        // Get all active bookings for user's units
        const { data: activeReservations, error: activeReservationsError } = await supabase
          .from("reservations")
          .select("*")
          .in("unit_id", unitIds)
          .or(`status.eq.confirmed,status.eq.checked_in`);

        if (activeReservationsError) {
          return new Response(
            JSON.stringify({ error: "Database error fetching active reservations" }),
            { status: 500, headers: { "Content-Type": "application/json" } }
          );
        }

        // Count current guests (those who are checked in)
        const { data: currentGuestsData, error: currentGuestsError } = await supabase
          .from("reservations")
          .select("*")
          .in("unit_id", unitIds)
          .eq("status", "checked_in");

        if (currentGuestsError) {
          return new Response(
            JSON.stringify({ error: "Database error fetching current guests" }),
            { status: 500, headers: { "Content-Type": "application/json" } }
          );
        }

        newBookings = todayReservations?.length || 0;
        activeBookings = activeReservations?.length || 0;
        currentGuests = currentGuestsData?.length || 0;

        // Calculate today's revenue
        if (todayReservations) {
          todayRevenue = todayReservations.reduce((sum, reservation) => {
            return sum + (Number(reservation.total_price) || 0);
          }, 0);
        }
      }
    }

    // Get user subscription info
    const { data: subscriptionData, error: subscriptionError } = await supabase
      .from("user_subscriptions")
      .select("*, subscription_plans(name)")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    const subscriptionInfo = subscriptionData ? {
      plan_name: subscriptionData.subscription_plans?.name || "Basic Plan",
      renewal_date: subscriptionData.renewal_date || null,
    } : null;

    // Calculate stats
    const stats = {
      totalUnits,
      newBookings,
      activeBookings,
      currentGuests,
      todayRevenue: Math.round(todayRevenue),
    };

    return new Response(
      JSON.stringify({ stats, subscription: subscriptionInfo }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error fetching dashboard stats:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}