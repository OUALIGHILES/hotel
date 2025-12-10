"use client"

import { useState, useEffect } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Heart, MapPin, Star, ArrowLeft, Users, Bed, Bath } from "lucide-react"
import Image from "next/image"

interface Listing {
  id: string
  title: string
  image_url: string
  price_per_night: number
  city: string
  rating: number
  review_count: number
  property_type: string
  bedrooms: number
  bathrooms: number
  guests: number
  address: string
}

export default function ListingsPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const city = searchParams.get("city")

  const [listings, setListings] = useState<Listing[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    const fetchListings = async () => {
      try {
        if (!city) {
          setListings([])
          return
        }

        const { data, error } = await supabase
          .from("listings")
          .select("*")
          .eq("is_active", true)
          .ilike("city", `%${city}%`)
          .order("rating", { ascending: false })

        if (error) throw error
        setListings(data || [])
      } catch (error) {
        console.error("Error fetching listings:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchListings()
  }, [city])

  const capitalizedCity = city ? city.charAt(0).toUpperCase() + city.slice(1).toLowerCase() : "Listings"

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="text-2xl font-bold text-red-500">Airbnb</div>
          </Link>
          <div className="flex items-center gap-4">
            <Button variant="outline" onClick={() => router.back()} className="gap-2">
              <ArrowLeft className="w-4 h-4" />
              Back
            </Button>
          </div>
        </div>
      </header>

      {/* Results Section */}
      <section className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Properties in {capitalizedCity}</h1>
          <p className="text-gray-600">{isLoading ? "Loading..." : `${listings.length} property(ies) available`}</p>
        </div>

        {isLoading ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Loading listings...</p>
          </div>
        ) : listings.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground text-lg">No listings found in {capitalizedCity}</p>
            <Button onClick={() => router.push("/")} className="mt-4">
              Back to Home
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {listings.map((listing) => (
              <Link key={listing.id} href={`/listings/${listing.id}`}>
                <Card className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer h-full flex flex-col">
                  {/* Image */}
                  <div className="relative w-full h-48 bg-gray-200">
                    {listing.image_url ? (
                      <Image
                        src={listing.image_url || "/placeholder.svg"}
                        alt={listing.title}
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400">No image</div>
                    )}
                    <button className="absolute top-3 right-3 bg-white rounded-full p-2 hover:bg-gray-100">
                      <Heart className="w-5 h-5 text-red-500" fill="currentColor" />
                    </button>
                  </div>

                  {/* Content */}
                  <div className="p-4 flex-1 flex flex-col">
                    <p className="text-xs text-gray-500 mb-1">{listing.property_type}</p>
                    <h3 className="font-bold text-sm mb-2 line-clamp-2">{listing.title}</h3>

                    {/* Features */}
                    <div className="flex items-center gap-3 text-xs text-gray-600 mb-3">
                      <div className="flex items-center gap-1">
                        <Bed className="w-3 h-3" />
                        {listing.bedrooms}
                      </div>
                      <div className="flex items-center gap-1">
                        <Bath className="w-3 h-3" />
                        {listing.bathrooms}
                      </div>
                      <div className="flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        {listing.guests}
                      </div>
                    </div>

                    <div className="flex items-center gap-1 mb-3">
                      <Star className="w-4 h-4 fill-black" />
                      <span className="text-sm font-medium">{listing.rating?.toFixed(2) || "New"}</span>
                      {listing.review_count > 0 && (
                        <span className="text-xs text-gray-600">({listing.review_count})</span>
                      )}
                    </div>

                    <div className="flex items-center gap-1 text-xs text-gray-600 mb-3">
                      <MapPin className="w-3 h-3" />
                      {listing.address}
                    </div>

                    <p className="font-bold mt-auto">
                      ${listing.price_per_night}
                      <span className="text-sm font-normal text-gray-600"> / night</span>
                    </p>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
