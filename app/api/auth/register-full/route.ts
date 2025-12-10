import { type NextRequest, NextResponse } from "next/server"
import { createServiceRoleClient } from "@/lib/supabase/service"
import { setAuthCookie } from "@/lib/auth/cookies"
import bcryptjs from "bcryptjs"

export async function POST(request: NextRequest) {
  try {
    const { email, password, fullName } = await request.json()

    if (!email || !password || !fullName) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    if (password.length < 6) {
      return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 })
    }

    const supabase = createServiceRoleClient()

    // Create user through Supabase Auth (this automatically triggers the profile creation via the trigger)
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      user_metadata: { full_name: fullName },
      email_confirm: true // Auto-confirm so users can log in immediately
    });

    if (authError) {
      return NextResponse.json({ error: authError.message }, { status: 400 })
    }

    // Get the user ID from the created user
    const userId = authData.user.id;

    // Update the user's full name in the auth table
    const { error: updateError } = await supabase.auth.admin.updateUserById(userId, {
      user_metadata: { full_name: fullName }
    });

    if (updateError) {
      console.error("Error updating user metadata:", updateError);
    }

    // Create a user record in the custom auth_users table for local password verification
    const salt = await bcryptjs.genSalt(10);
    const passwordHash = await bcryptjs.hash(password, salt);

    const { data: customUserData, error: customUserError } = await supabase
      .from("auth_users")
      .insert([
        {
          id: userId, // Use the same ID as Supabase Auth
          email,
          password_hash: passwordHash,
          full_name: fullName,
        }
      ])
      .select()
      .single();

    if (customUserError) {
      console.error("Error creating custom user record:", customUserError);
      // Don't fail the whole operation if custom user creation fails
    }

    // Create a simple JWT-like token
    // Initially set premium status to false; it will be updated by auth check API
    const token = Buffer.from(JSON.stringify({ 
      id: userId, 
      email,
      full_name: fullName,
      is_premium: false
    })).toString("base64")
    await setAuthCookie(token)

    return NextResponse.json({ 
      user: { 
        id: userId, 
        email, 
        fullName 
      }, 
      success: true 
    })
  } catch (error: any) {
    console.error("Error in registration API:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}