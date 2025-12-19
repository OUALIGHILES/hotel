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

    // Get user's units with property information (including city)
    const { data: unitsData, error: unitsError } = await supabase
      .from("units")
      .select(`
        id,
        name,
        status,
        property_id,
        properties!inner (
          id,
          city
        )
      `)
      .eq("properties.user_id", user.id)
      .is("is_deleted", false) // Exclude soft-deleted units
      .order("name", { ascending: true });

    if (unitsError) {
      return new Response(
        JSON.stringify({ error: "Database error fetching units" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    // For each unit, check if it has any active reservations that would affect status
    const unitsWithStatus = await Promise.all(unitsData?.map(async (unit) => {
      // Check if unit has any active reservations (checked_in, confirmed, or reserved for today)
      const { data: reservationsData, error: reservationsError } = await supabase
        .from("reservations")
        .select("status, check_in_date, check_out_date")
        .eq("unit_id", unit.id)
        .or(`status.eq.checked_in,status.eq.confirmed`);

      if (reservationsError) {
        console.error("Error fetching reservations for unit:", unit.id, reservationsError);
      }

      let finalStatus = unit.status; // Default to the unit's status from the database

      if (reservationsData && reservationsData.length > 0) {
        // If there are active reservations, update status accordingly
        const today = new Date().toISOString().split('T')[0];

        const activeReservation = reservationsData.find(res => {
          // Check if today is between check_in and check_out dates
          const checkInDate = new Date(res.check_in_date).toISOString().split('T')[0];
          const checkOutDate = new Date(res.check_out_date).toISOString().split('T')[0];
          return today >= checkInDate && today <= checkOutDate;
        });

        if (activeReservation) {
          finalStatus = "occupied"; // Unit is currently in use
        } else if (reservationsData.some(res => res.status === "reserved")) {
          finalStatus = "reserved"; // Unit is reserved for the future
        }
      }

      return {
        id: unit.id,
        name: unit.name,
        status: finalStatus,
        property_city: unit.properties?.city // Include the city from properties
      };
    }) || []);

    return new Response(
      JSON.stringify({ units: unitsWithStatus }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error fetching unit status data:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}