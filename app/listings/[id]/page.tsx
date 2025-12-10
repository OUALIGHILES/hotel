"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ArrowLeft, MapPin, Users, Bed, Bath, Star, Heart } from "lucide-react"
import Image from "next/image"

interface Listing {
  id: string
  title: string
  description: string
  image_url: string
  price_per_night: number
  property_type: string
  bedrooms: number
  bathrooms: number
  guests: number
  address: string
  city: string
  country: string
  rating: number
  review_count: number
  host_id: string
}

interface HostProfile {
  id: string
  full_name: string
  avatar_url: string
}

export default function ListingDetailPage() {
  const params = useParams()
  const router = useRouter()
  const listingId = params.id as string
  const supabase = createClient()

  const [listing, setListing] = useState<Listing | null>(null)
  const [host, setHost] = useState<HostProfile | null>(null)
  const [checkInDate, setCheckInDate] = useState("")
  const [checkOutDate, setCheckOutDate] = useState("")
  const [guests, setGuests] = useState(1)
  const [isLoading, setIsLoading] = useState(true)
  const [isBooking, setIsBooking] = useState(false)

  useEffect(() => {
    const fetchListing = async () => {
      try {
        const { data, error } = await supabase.from("listings").select("*").eq("id", listingId).single()

        if (error) throw error
        setListing(data)

        // Fetch host profile
        const { data: profileData } = await supabase.from("profiles").select("*").eq("id", data.host_id).single()

        setHost(profileData)
      } catch (error) {
        console.error("Error fetching listing:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchListing()
  }, [listingId])

  const handleBooking = async () => {
    if (!checkInDate || !checkOutDate) {
      alert("Please select check-in and check-out dates")
      return
    }

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      router.push("/auth/login")
      return
    }

    setIsBooking(true)
    try {
      const checkIn = new Date(checkInDate)
      const checkOut = new Date(checkOutDate)
      const nights = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24))
      const totalPrice = nights * (listing?.price_per_night || 0)

      const { error } = await supabase.from("bookings").insert({
        listing_id: listingId,
        guest_id: user.id,
        check_in_date: checkInDate,
        check_out_date: checkOutDate,
        total_guests: guests,
        total_price: totalPrice,
        status: "pending",
        payment_status: "unpaid",
      })

      if (error) throw error
      router.push("/dashboard/bookings")
    } catch (error) {
      console.error("Error booking:", error)
      alert("Error creating booking. Please try again.")
    } finally {
      setIsBooking(false)
    }
  }

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <p>Loading...</p>
      </div>
    )
  }

  if (!listing) {
    return (
      <div className="container mx-auto px-4 py-8">
        <p>Listing not found</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="container mx-auto px-4 py-4">
        <Button variant="ghost" onClick={() => router.back()} className="gap-2">
          <ArrowLeft className="w-4 h-4" />
          Back
        </Button>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 pb-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Listing Details */}
          <div className="lg:col-span-2">
            {/* Image */}
            <div className="relative w-full h-96 rounded-xl overflow-hidden mb-6 bg-gray-200">
              {listing.image_url ? (
                <Image
                  src={listing.image_url || "/placeholder.svg"}
                  alt={listing.title}
                  fill
                  className="object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-400">No image available</div>
              )}
            </div>

            {/* Details */}
            <div className="mb-8">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <p className="text-sm text-gray-600 mb-2">{listing.property_type}</p>
                  <h1 className="text-3xl font-bold mb-2">{listing.title}</h1>
                  <div className="flex items-center gap-4 text-sm">
                    <div className="flex items-center gap-1">
                      <Star className="w-4 h-4 fill-black" />
                      <span>
                        {listing.rating?.toFixed(2) || "New"} ({listing.review_count} reviews)
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <MapPin className="w-4 h-4" />
                      {listing.city}, {listing.country}
                    </div>
                  </div>
                </div>
                <Button variant="ghost" size="icon">
                  <Heart className="w-6 h-6" />
                </Button>
              </div>
            </div>

            {/* Host Info */}
            {host && (
              <Card className="p-6 mb-8">
                <h3 className="font-bold text-lg mb-4">Hosted by {host.full_name}</h3>
                <div className="flex items-center gap-4">
                  {host.avatar_url && (
                    <Image
                      src={host.avatar_url || "/placeholder.svg"}
                      alt={host.full_name}
                      width={48}
                      height={48}
                      className="rounded-full"
                    />
                  )}
                  <div>
                    <p className="font-medium">{host.full_name}</p>
                    <p className="text-sm text-gray-600">Superhost</p>
                  </div>
                </div>
              </Card>
            )}

            {/* Property Features */}
            <Card className="p-6 mb-8">
              <h3 className="font-bold text-lg mb-4">What this place offers</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-3">
                  <Bed className="w-5 h-5 text-gray-600" />
                  <span>{listing.bedrooms} Bedrooms</span>
                </div>
                <div className="flex items-center gap-3">
                  <Bath className="w-5 h-5 text-gray-600" />
                  <span>{listing.bathrooms} Bathrooms</span>
                </div>
                <div className="flex items-center gap-3">
                  <Users className="w-5 h-5 text-gray-600" />
                  <span>Guests: {listing.guests}</span>
                </div>
              </div>
            </Card>

            {/* Description */}
            <Card className="p-6">
              <h3 className="font-bold text-lg mb-4">About this listing</h3>
              <p className="text-gray-700 leading-relaxed">{listing.description || "No description provided"}</p>
            </Card>
          </div>

          {/* Right Column - Booking Widget */}
          <div className="lg:col-span-1">
            <Card className="p-6 sticky top-20">
              <div className="mb-6">
                <p className="text-2xl font-bold">
                  ${listing.price_per_night}
                  <span className="text-base font-normal text-gray-600"> / night</span>
                </p>
              </div>

              <div className="space-y-4 mb-6">
                <div>
                  <Label htmlFor="check-in" className="text-sm">
                    Check In
                  </Label>
                  <Input
                    id="check-in"
                    type="date"
                    value={checkInDate}
                    onChange={(e) => setCheckInDate(e.target.value)}
                  />
                </div>

                <div>
                  <Label htmlFor="check-out" className="text-sm">
                    Check Out
                  </Label>
                  <Input
                    id="check-out"
                    type="date"
                    value={checkOutDate}
                    onChange={(e) => setCheckOutDate(e.target.value)}
                  />
                </div>

                <div>
                  <Label htmlFor="guests" className="text-sm">
                    Guests
                  </Label>
                  <Input
                    id="guests"
                    type="number"
                    min="1"
                    max={listing.guests}
                    value={guests}
                    onChange={(e) => setGuests(Number.parseInt(e.target.value))}
                  />
                </div>
              </div>

              <Button className="w-full mb-4" disabled={isBooking} onClick={handleBooking}>
                {isBooking ? "Booking..." : "Book Now"}
              </Button>

              {/* Send Message to Owner Button */}
              <Button
                className="w-full mb-4"
                variant="outline"
                onClick={() => {
                  // Don't check authentication on button click, just show the form
                  document.getElementById('message-form')?.classList.toggle('hidden');
                }}
              >
                Send Message to Owner
              </Button>

              {/* Message Form - initially hidden */}
              <div id="message-form" className="hidden mb-4 p-4 border rounded-lg bg-gray-50">
                <h3 className="font-medium mb-3">Send Message to Owner</h3>
                <div className="space-y-3">
                  <textarea
                    id="message-content"
                    placeholder="Write your message here..."
                    className="w-full px-3 py-2 border rounded-lg bg-background text-foreground min-h-[100px]"
                  />
                  <Button
                    className="w-full"
                    onClick={async () => {
                      const messageContent = (document.getElementById('message-content') as HTMLTextAreaElement)?.value;
                      if (!messageContent || messageContent.trim() === '') {
                        alert('Please enter a message');
                        return;
                      }

                      // Check if user is logged in - first try Supabase auth, then fallback to custom auth check
                      let userId = null;

                      // Try getting user from Supabase auth first
                      const { data: { user: supaUser }, error: userError } = await supabase.auth.getUser();
                      if (supaUser && !userError) {
                        userId = supaUser.id;
                      } else {
                        // If Supabase auth fails, check with our custom auth system
                        try {
                          const authCheckResponse = await fetch('/api/auth/check');
                          if (authCheckResponse.ok) {
                            const { user } = await authCheckResponse.json();
                            if (user) {
                              userId = user.id;
                            }
                          }
                        } catch (error) {
                          console.error('Error checking auth via API:', error);
                        }
                      }

                      if (!userId) {
                        alert('Please log in to send a message');
                        router.push('/auth/login');
                        return;
                      }

                      // Send message to owner
                      const { error: messageError } = await supabase
                        .from('messages')
                        .insert({
                          sender_id: userId,
                          recipient_id: listing?.host_id,
                          subject: `Inquiry about ${listing?.title}`,
                          body: messageContent,
                          reservation_id: null // Not linked to a specific reservation
                        });

                      if (messageError) {
                        console.error('Error sending message:', messageError);
                        alert('There was an issue sending your message. Please try again.');
                        return;
                      }

                      alert('Message sent successfully! The owner will contact you soon.');

                      // Reset form and hide it
                      (document.getElementById('message-content') as HTMLTextAreaElement).value = '';
                      document.getElementById('message-form')?.classList.add('hidden');
                    }}
                  >
                    Send Message
                  </Button>
                </div>
              </div>

              <p className="text-xs text-gray-600 text-center">You won't be charged yet</p>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
