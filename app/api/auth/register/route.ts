import { type NextRequest, NextResponse } from "next/server"
import { createUser } from "@/lib/auth/db"
import { setAuthCookie } from "@/lib/auth/cookies"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, password, fullName } = body

    if (!email || !password || !fullName) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    if (password.length < 6) {
      return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 })
    }

    const user = await createUser(email, password, fullName)

    // Create a simple JWT-like token
    // Initially new users are not premium
    const token = Buffer.from(JSON.stringify({
      id: user.id,
      email: user.email,
      is_premium: false  // New users start as non-premium
    })).toString("base64")
    await setAuthCookie(token)

    return NextResponse.json({ user, success: true })
  } catch (error: any) {
    if (error.message.includes("duplicate")) {
      return NextResponse.json({ error: "Email already exists" }, { status: 400 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
