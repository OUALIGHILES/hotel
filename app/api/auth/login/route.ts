import { type NextRequest, NextResponse } from "next/server"
import { getUserByEmail, verifyPassword } from "@/lib/auth/db"
import { setAuthCookie } from "@/lib/auth/cookies"
import { createPublicDirectClient } from "@/lib/supabase/direct"

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

    // Create a simple JWT-like token
    const token = Buffer.from(JSON.stringify({
      id: user.id,
      email: user.email,
      full_name: user.full_name, // Include full name for display purposes
      is_premium: isPremium
    })).toString("base64")
    await setAuthCookie(token)

    return NextResponse.json({ user: { id: user.id, email: user.email, fullName: user.full_name }, success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
