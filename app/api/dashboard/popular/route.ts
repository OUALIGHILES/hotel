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

    // Get units with property information (including city)
    const { data: unitsData, error: unitsError } = await supabase
      .from("units")
      .select(`
        id,
        name,
        status,
        property_id,
        main_picture_url,
        properties!inner (
          id,
          city,
          country
        )
      `)
      .eq("properties.user_id", user.id)
      .order("name", { ascending: true });

    if (unitsError) {
      return new Response(
        JSON.stringify({ error: "Database error fetching units" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    // Calculate "popularity" - for now just return all units as popular
    // In a real app, you would calculate this based on bookings, reviews, etc.
    const popularUnits = unitsData?.map(unit => ({
      id: unit.id,
      name: unit.name,
      status: unit.status,
      property_city: unit.properties?.city,
      property_country: unit.properties?.country,
      main_picture_url: unit.main_picture_url,
      rating: 4.8 // Default high rating
    })) || [];

    return new Response(
      JSON.stringify({ units: popularUnits }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error fetching popular units data:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}