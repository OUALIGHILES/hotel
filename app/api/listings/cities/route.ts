import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET() {
  try {
    const supabase = await createClient()

    // Get distinct cities and count of listings for each city
    const { data: listings, error } = await supabase
      .from("listings")
      .select("city")
      .eq("is_active", true)

    if (error) throw error

    // Group by city and count
    const cityCounts: Record<string, number> = {}
    listings.forEach((listing: any) => {
      if (listing.city) {
        cityCounts[listing.city] = (cityCounts[listing.city] || 0) + 1
      }
    })

    // Define city details with descriptions and images
    const cityDetails = [
      {
        name: "Riyadh",
        image: "/riyadh-saudi-arabia-modern-city-skyline.jpg",
        description: "Capital city",
        propertiesCount: cityCounts["Riyadh"] || 0,
      },
      {
        name: "Jeddah",
        image: "/jeddah-saudi-arabia-red-sea-coastal-city.jpg",
        description: "Red Sea coastal city",
        propertiesCount: cityCounts["Jeddah"] || 0,
      },
      {
        name: "Dammam",
        image: "/dammam-saudi-arabia-eastern-province.jpg",
        description: "Eastern Province",
        propertiesCount: cityCounts["Dammam"] || 0,
      },
      {
        name: "Abha",
        image: "/abha-saudi-arabia-mountain-city.jpg",
        description: "Mountain city",
        propertiesCount: cityCounts["Abha"] || 0,
      },
      {
        name: "Al Khobar",
        image: "/al-khobar-saudi-arabia.jpg",
        description: "Business hub",
        propertiesCount: cityCounts["Al Khobar"] || 0,
      },
      {
        name: "Madinah",
        image: "/madinah-saudi-arabia-holy-city.jpg",
        description: "Holy city",
        propertiesCount: cityCounts["Madinah"] || 0,
      },
    ]

    return NextResponse.json(cityDetails)
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}