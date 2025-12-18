import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const city = searchParams.get("city")
    const limit = searchParams.get("limit") || "12"

    const supabase = await createClient()

    let query = supabase.from("listings").select("*").eq("is_active", true).limit(Number.parseInt(limit))

    if (city) {
      query = query.ilike("city", `%${city}%`)
    }

    const { data: listings, error } = await query

    if (error) throw error

    return NextResponse.json(listings)
  } catch (error) {
    console.error("Error fetching listings:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
