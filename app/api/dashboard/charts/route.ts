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

    const propertyIds = propertiesData?.map(prop => prop.id) || [];
    const chartData = [];
    
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
        // Get reservations for the last 7 days for chart data
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        const startDate = sevenDaysAgo.toISOString().split('T')[0];

        const { data: reservationsData, error: reservationsError } = await supabase
          .from("reservations")
          .select("*, check_in_date, total_price, status")
          .in("unit_id", unitIds)
          .gte("check_in_date", startDate)
          .order("check_in_date", { ascending: true });

        if (reservationsError) {
          return new Response(
            JSON.stringify({ error: "Database error fetching reservation data for charts" }),
            { status: 500, headers: { "Content-Type": "application/json" } }
          );
        }

        // Group reservations by date for chart data
        const reservationsByDate = {};
        reservationsData?.forEach(res => {
          const date = res.check_in_date.split('T')[0];
          if (!reservationsByDate[date]) {
            reservationsByDate[date] = { 
              date, 
              occupancy: 0, 
              revenue: 0,
              reservations: 0
            };
          }
          reservationsByDate[date].reservations += 1;
          reservationsByDate[date].revenue += Number(res.total_price) || 0;
          // Simplified occupancy calculation - in real app, you'd calculate this properly
          reservationsByDate[date].occupancy = Math.min(100, reservationsByDate[date].reservations * 10); 
        });

        // Create weekly data for charts
        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const today = new Date();
        const weeklyData = [];

        for (let i = 6; i >= 0; i--) {
          const date = new Date();
          date.setDate(today.getDate() - i);
          const dateString = date.toISOString().split('T')[0];
          const dayName = days[date.getDay()];
          
          const dayData = reservationsByDate[dateString] || { 
            date: dateString, 
            occupancy: 0, 
            revenue: 0,
            reservations: 0
          };
          
          weeklyData.push({
            day: dayName,
            occupancy: dayData.occupancy,
            revenue: dayData.revenue
          });
        }

        return new Response(
          JSON.stringify({ weeklyData }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }
    }

    // Return default data if no properties or units
    return new Response(
      JSON.stringify({ 
        weeklyData: [
          { day: "Mon", occupancy: 0, revenue: 0 },
          { day: "Tue", occupancy: 0, revenue: 0 },
          { day: "Wed", occupancy: 0, revenue: 0 },
          { day: "Thu", occupancy: 0, revenue: 0 },
          { day: "Fri", occupancy: 0, revenue: 0 },
          { day: "Sat", occupancy: 0, revenue: 0 },
          { day: "Sun", occupancy: 0, revenue: 0 }
        ] 
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error fetching dashboard chart data:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}