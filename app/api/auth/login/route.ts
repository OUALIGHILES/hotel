import { type NextRequest, NextResponse } from "next/server"
import { getUserByEmail, verifyPassword } from "@/lib/auth/db"
import { setAuthCookie } from "@/lib/auth/cookies"
import { createPublicDirectClient } from "@/lib/supabase/direct"
import { createClientForRoute } from "@/lib/supabase/server"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, password } = body

    if (!email || !password) {
      return NextResponse.json({ error: "Missing email or password" }, { status: 400 })
    }

    const user = await getUserByEmail(email)
    if (!user) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 })
    }

    // Verify the password against the hash stored in our custom auth_users table
    const isPasswordValid = await verifyPassword(password, user.password_hash)
    if (!isPasswordValid) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 })
    }

    // Get current premium status from database using direct client
    const directSupabase = createPublicDirectClient();
    const { data: profileData } = await directSupabase
      .from("profiles")
      .select("is_premium")
      .eq("id", user.id)
      .single()

    const isPremium = profileData?.is_premium || false;

    // Create Supabase session to properly authenticate the user across all API routes
    // For users created via admin API, we can use signInWithOtp with the email
    const supabase = createClientForRoute(request.cookies);

    // Try to sign in using the email (for users created via admin API)
    // Use signInWithOtp to send a temporary login link, then exchange it
    // Actually, for users created via admin API with confirmed emails, maybe we can use sign in with email and password
    const { data, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (signInError) {
      // If this fails, it means the user was created via admin API without a password in Supabase Auth
      // The custom auth token will still work with our updated API routes
      console.warn("Supabase sign-in failed (user may have been created via admin API):", signInError.message);
    }

    // Create a simple JWT-like token for custom auth system
    const token = Buffer.from(JSON.stringify({
      id: user.id,
      email: user.email,
      full_name: user.full_name, // Include full name for display purposes
      is_premium: isPremium
    })).toString("base64")
    await setAuthCookie(token)

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        fullName: user.full_name
      },
      success: true,
      supabaseSignInSuccess: !signInError
    })
  } catch (error: any) {
    console.error("Error in login API:", error);
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
