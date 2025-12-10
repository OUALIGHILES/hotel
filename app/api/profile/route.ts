import { type NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { getAuthCookie } from "@/lib/auth/cookies";

export async function GET(request: NextRequest) {
  try {
    // Get auth token from cookie
    const token = await getAuthCookie();

    if (!token) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // Decode the token to get user info
    let user;
    try {
      const decodedToken = Buffer.from(token, "base64").toString("utf-8");
      user = JSON.parse(decodedToken);
    } catch (error) {
      console.error("Error decoding token:", error);
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    // Get profile using service role client
    const supabase = createServiceRoleClient();
    const { data: profile, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') { // Row not found
        return NextResponse.json({ profile: null }, { status: 200 });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ profile });
  } catch (error: any) {
    console.error("Error fetching profile:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    // Get auth token from cookie
    const token = await getAuthCookie();

    if (!token) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // Decode the token to get user info
    let user;
    try {
      const decodedToken = Buffer.from(token, "base64").toString("utf-8");
      user = JSON.parse(decodedToken);
    } catch (error) {
      console.error("Error decoding token:", error);
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    // Get profile data from request body
    const profileData = await request.json();

    // Update profile using service role client
    const supabase = createServiceRoleClient();
    
    // Check if profile exists
    const { data: existingProfile } = await supabase
      .from("profiles")
      .select("id")
      .eq("id", user.id)
      .single();

    let result;
    if (existingProfile) {
      // Update existing profile
      const { data, error } = await supabase
        .from("profiles")
        .update({
          ...profileData,
          updated_at: new Date().toISOString(),
        })
        .eq("id", user.id)
        .select()
        .single();
      
      if (error) throw error;
      result = data;
    } else {
      // Create new profile
      const { data, error } = await supabase
        .from("profiles")
        .insert([{
          id: user.id,
          ...profileData,
          is_host: false,
          is_premium: user.is_premium || false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }])
        .select()
        .single();
      
      if (error) throw error;
      result = data;
    }

    return NextResponse.json({ profile: result });
  } catch (error: any) {
    console.error("Error updating profile:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}