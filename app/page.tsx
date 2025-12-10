"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Heart, MapPin, Star, LogOut, User } from "lucide-react"
import Image from "next/image"
import { useLanguage } from "@/lib/language-context";
import LanguageSelector from "@/components/ui/language-selector";
import { ThemeToggle } from "@/components/ui/theme-toggle";

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
}

interface CityData {
  name: string
  image: string
  description: string
  propertiesCount: number
}

export default function HomePage() {
  const [listings, setListings] = useState<Listing[]>([])
  const [cities, setCities] = useState<CityData[]>([])
  const [user, setUser] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [citiesLoading, setCitiesLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Get current user from our custom auth API
        const response = await fetch("/api/auth/check");
        if (response.ok) {
          const result = await response.json();
          if (result.user) {
            setUser(result.user);
          }
        }

        // Fetch real listings from the API
        const listingsResponse = await fetch("/api/listings?limit=8");
        if (listingsResponse.ok) {
          const fetchedListings = await listingsResponse.json();
          setListings(fetchedListings);
        } else {
          console.error("Error fetching listings:", listingsResponse.status);
        }
      } catch (error) {
        console.error("Error fetching data:", error)
      } finally {
        setIsLoading(false)
      }
    }

    const fetchCities = async () => {
      try {
        // Fetch real city data with property counts from the API
        const citiesResponse = await fetch("/api/listings/cities");
        if (citiesResponse.ok) {
          const fetchedCities = await citiesResponse.json();
          setCities(fetchedCities);
        } else {
          console.error("Error fetching cities:", citiesResponse.status);
        }
      } catch (error) {
        console.error("Error fetching cities data:", error)
      } finally {
        setCitiesLoading(false)
      }
    }

    fetchData()
    fetchCities()
  }, [])

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      setUser(null);
      router.push("/");
    } catch (error) {
      console.error("Error logging out:", error);
    }
  }

  const { t } = useLanguage(); // Get the translation function

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="text-2xl font-bold text-red-500">Airbnb</div>
          </Link>

          <div className="hidden md:flex items-center gap-8">
            <button className="text-sm font-medium hover:text-gray-600">{t('stays')}</button>
            <button className="text-sm font-medium hover:text-gray-600">{t('experiences')}</button>
            <button className="text-sm font-medium hover:text-gray-600">{t('onlineExperiences')}</button>
            {user && (
              <Link href="/packages" className="text-sm font-medium hover:text-gray-600">
                {t('packagesOffers')}
              </Link>
            )}
          </div>

          <div className="flex items-center gap-4">
            <LanguageSelector />
            <ThemeToggle />
            {user ? (
              <>
                {/* Profile button with avatar */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => router.push("/profile")}
                  className="flex items-center gap-2 p-2"
                >
                  {user.avatar_url ? (
                    <div className="w-8 h-8 rounded-full overflow-hidden">
                      <img
                        src={user.avatar_url}
                        alt={user.full_name || user.email}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          // If image fails to load, show a placeholder
                          (e.target as HTMLImageElement).src = "/placeholder-avatar.png";
                        }}
                      />
                    </div>
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                      <User className="w-4 h-4 text-gray-600" />
                    </div>
                  )}
                  <span className="hidden md:inline">{user.full_name || user.email.split('@')[0]}</span>
                </Button>

                {/* Dashboard button with premium indicator */}
                {user.is_premium ? (
                  <Button variant="outline" size="sm" onClick={() => router.push("/dashboard")}>
                    {t('dashboard')}
                  </Button>
                ) : (
                  <Button variant="outline" size="sm" onClick={() => router.push("/packages")}>
                    <span className="text-yellow-600 font-bold">{t('upgradeToPremium')}</span>
                  </Button>
                )}
                <Button variant="ghost" size="sm" onClick={handleLogout}>
                  <LogOut className="w-4 h-4 mr-2" />
                  {t('logout')}
                </Button>
              </>
            ) : (
              <>
                <Button variant="outline" size="sm" onClick={() => router.push("/auth/login")}>
                  {t('login')}
                </Button>
                <Button size="sm" onClick={() => router.push("/auth/sign-up")}>
                  {t('signUp')}
                </Button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="bg-gradient-to-r from-red-500 to-rose-500 text-white py-12 md:py-24">
        <div className="container mx-auto px-4">
          <div className="max-w-2xl">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">{t('findYourNextStay')}</h1>
            <p className="text-lg md:text-xl opacity-90">{t('explorePropertiesWorld')}</p>
          </div>
        </div>
      </section>

      <section className="container mx-auto px-4 py-16">
        <h2 className="text-3xl font-bold mb-2">{t('exploreKSA')}</h2>
        <p className="text-gray-600 mb-8">{t('discoverDestinations')}</p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {cities.map((city) => (
            <Link key={city.name} href={`/listings?city=${city.name.toLowerCase()}`}>
              <Card className="overflow-hidden hover:shadow-xl transition-shadow cursor-pointer h-full group">
                <div className="relative w-full h-64 bg-gray-200 overflow-hidden">
                  <Image
                    src={city.image || "/placeholder.svg"}
                    alt={city.name}
                    fill
                    className="object-cover group-hover:scale-110 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex flex-col justify-end p-4">
                    <h3 className="text-2xl font-bold text-white mb-1">{city.name}</h3>
                    <p className="text-white/90 text-sm mb-2">{city.description}</p>
                    <p className="text-white/70 text-xs">{city.propertiesCount} {t('properties')}</p>
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      </section>

      <section className="container mx-auto px-4 py-16 bg-gray-50 -mx-4 px-4">
        <div className="container mx-auto">
          <h2 className="text-3xl font-bold mb-2">{t('popularStays')}</h2>
          <p className="text-gray-600 mb-8">{t('highlyRatedProperties')}</p>

          {isLoading ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">{t('loadingListings')}...</p>
            </div>
          ) : listings.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">{t('noListingsYet')}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {listings.map((listing) => (
                <Link key={listing.id} href={`/listings/${listing.id}`}>
                  <Card className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer h-full">
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
                        <div className="w-full h-full flex items-center justify-center text-gray-400">{t('noImage')}</div>
                      )}
                      <button className="absolute top-3 right-3 bg-white rounded-full p-2 hover:bg-gray-100">
                        <Heart className="w-5 h-5 text-red-500" fill="currentColor" />
                      </button>
                    </div>

                    {/* Content */}
                    <div className="p-4">
                      <p className="text-xs text-gray-500 mb-1">{listing.property_type}</p>
                      <h3 className="font-bold text-sm mb-2 line-clamp-2">{listing.title}</h3>

                      <div className="flex items-center gap-1 mb-3">
                        <Star className="w-4 h-4 fill-black" />
                        <span className="text-sm font-medium">{listing.rating?.toFixed(2) || t('new')}</span>
                        {listing.review_count > 0 && (
                          <span className="text-xs text-gray-600">({listing.review_count})</span>
                        )}
                      </div>

                      <div className="flex items-center gap-1 text-xs text-gray-600 mb-3">
                        <MapPin className="w-3 h-3" />
                        {listing.city}
                      </div>

                      <p className="font-bold">
                        ${listing.price_per_night}
                        <span className="text-sm font-normal text-gray-600"> {t('perNight')}</span>
                      </p>
                    </div>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
