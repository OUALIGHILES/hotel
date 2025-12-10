import { type NextRequest, NextResponse } from "next/server"
import { getAuthCookie } from "@/lib/auth/cookies"
import { createPublicDirectClient } from "@/lib/supabase/direct"

export async function GET(request: NextRequest) {
  try {
    const token = await getAuthCookie()

    if (!token) {
      return NextResponse.json({ user: null }, { status: 401 })
    }

    // Decode the token to get user info
    let user;
    try {
      const decodedToken = Buffer.from(token, "base64").toString("utf-8")
      user = JSON.parse(decodedToken)
    } catch (error) {
      console.error("Error decoding token:", error)
      return NextResponse.json({ user: null }, { status: 401 })
    }

    // Get fresh user data from the database including premium status and profile info
    const supabase = createPublicDirectClient()

    const { data: profileData, error } = await supabase
      .from('profiles')
      .select('is_premium, avatar_url, full_name')
      .eq('id', user.id)
      .single()

    if (error) {
      console.error("Error fetching user profile:", error)
      // If there's an error fetching profile, continue with existing user data
      return NextResponse.json({ user }, { status: 200 })
    }

    // Add profile data to the user object
    const userWithProfileData = {
      ...user,
      is_premium: profileData.is_premium,
      avatar_url: profileData.avatar_url,
      full_name: profileData.full_name
    }

    return NextResponse.json({ user: userWithProfileData }, { status: 200 })
  } catch (error: any) {
    console.error("Error checking auth:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}