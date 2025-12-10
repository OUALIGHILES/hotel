"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { LogOut, BarChart3, Users, Home, Calendar, User } from "lucide-react"
import { useLanguage } from "@/lib/language-context";
import LanguageSelector from "@/components/ui/language-selector";
import { ThemeToggle } from "@/components/ui/theme-toggle";

export default function AdminDashboard() {
  const router = useRouter()
  const supabase = createClient()
  const { t } = useLanguage(); // Get the translation function
  const [stats, setStats] = useState({
    totalListings: 0,
    totalBookings: 0,
    totalRevenue: 0,
    totalUsers: 0,
  })
  const [isLoading, setIsLoading] = useState(true)
  const [user, setUser] = useState<any>(null)

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        // Get current user with premium status
        const response = await fetch("/api/auth/check");
        if (response.ok) {
          const result = await response.json();
          if (result.user) {
            setUser(result.user);

            // If user is not premium, redirect to packages
            if (!result.user.is_premium) {
              router.push("/packages");
              return;
            }
          } else {
            // If not authenticated, redirect to login
            router.push("/auth/login");
            return;
          }
        } else {
          // If auth check fails, redirect to login
          router.push("/auth/login");
          return;
        }

        const { data: listings } = await supabase.from("listings").select("count")
        const { data: bookings } = await supabase.from("bookings").select("count")
        const { data: profiles } = await supabase.from("profiles").select("count")

        const { data: revenues } = await supabase.from("bookings").select("total_price")

        const totalRevenue = revenues?.reduce((sum: number, booking: any) => sum + (booking.total_price || 0), 0) || 0

        setStats({
          totalListings: listings?.length || 0,
          totalBookings: bookings?.length || 0,
          totalRevenue,
          totalUsers: profiles?.length || 0,
        })
      } catch (error) {
        console.error("Error fetching stats:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchUserData()
  }, [router])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push("/")
  }

  // Show loading state or redirect message if not premium
  if (isLoading) {
    return <div className="container mx-auto px-4 py-8">{t('loading')}...</div>
  }

  // If user is not premium, don't render the dashboard
  if (user && !user.is_premium) {
    return (
      <div className="container mx-auto px-4 py-8 flex flex-col items-center justify-center min-h-screen">
        <h2 className="text-2xl font-bold mb-4">{t('upgradeRequired')}</h2>
        <p className="text-gray-600 mb-6">{t('upgradeToAccessDashboard')}</p>
        <Button onClick={() => router.push("/packages")}>
          {t('upgradeToPremium')}
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="text-xl font-bold text-foreground">{t('adminDashboard')}</div>
          <div className="flex items-center space-x-2">
            <ThemeToggle />
            <LanguageSelector />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push("/profile")}
              className="flex items-center gap-2 p-2"
            >
              {user?.avatar_url ? (
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
              <span className="hidden md:inline">{user?.full_name || user?.email?.split('@')[0]}</span>
            </Button>
            <Button variant="ghost" size="sm" onClick={handleLogout}>
              <LogOut className="w-4 h-4 mr-2" />
              {t('logout')}
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">{t('totalUsers')}</p>
                <p className="text-2xl font-bold">{stats.totalUsers}</p>
              </div>
              <Users className="w-8 h-8 text-blue-500 opacity-20" />
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">{t('totalListings')}</p>
                <p className="text-2xl font-bold">{stats.totalListings}</p>
              </div>
              <Home className="w-8 h-8 text-green-500 opacity-20" />
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">{t('totalBookings')}</p>
                <p className="text-2xl font-bold">{stats.totalBookings}</p>
              </div>
              <Calendar className="w-8 h-8 text-yellow-500 opacity-20" />
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">{t('totalRevenue')}</p>
                <p className="text-2xl font-bold">${stats.totalRevenue}</p>
              </div>
              <BarChart3 className="w-8 h-8 text-red-500 opacity-20" />
            </div>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-4 mb-8">
            <TabsTrigger value="overview">{t('overview')}</TabsTrigger>
            <TabsTrigger value="users">{t('users')}</TabsTrigger>
            <TabsTrigger value="bookings">{t('bookings')}</TabsTrigger>
            <TabsTrigger value="units">{t('units')}</TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <Card className="p-6">
              <h2 className="text-xl font-bold mb-4">{t('platformOverview')}</h2>
              <div className="space-y-4">
                <div className="flex justify-between items-center py-3 border-b">
                  <span>{t('activeListings')}</span>
                  <span className="font-bold">{stats.totalListings}</span>
                </div>
                <div className="flex justify-between items-center py-3 border-b">
                  <span>{t('pendingBookings')}</span>
                  <span className="font-bold">{stats.totalBookings}</span>
                </div>
                <div className="flex justify-between items-center py-3">
                  <span>{t('platformRevenue')}</span>
                  <span className="font-bold">${stats.totalRevenue}</span>
                </div>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="users">
            <AdminUsersList />
          </TabsContent>

          <TabsContent value="bookings">
            <AdminBookingsList />
          </TabsContent>

          <TabsContent value="units">
            <AdminUnitsStats />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

function AdminUsersList() {
  const supabase = createClient()
  const { t } = useLanguage(); // Get the translation function
  const [users, setUsers] = useState<any[]>([])

  useEffect(() => {
    const fetchUsers = async () => {
      const { data } = await supabase.from("profiles").select("*").order("created_at", { ascending: false })

      setUsers(data || [])
    }

    fetchUsers()
  }, [])

  return (
    <Card>
      <div className="p-6">
        <h2 className="text-xl font-bold mb-4">{t('users')}</h2>
        {users.length === 0 ? (
          <p className="text-gray-600">{t('noUsersYet')}</p>
        ) : (
          <div className="space-y-2">
            {users.map((user) => (
              <div key={user.id} className="flex justify-between items-center py-3 border-b">
                <div>
                  <p className="font-semibold">{user.full_name || "Unnamed"}</p>
                  <p className="text-sm text-gray-600">{user.id}</p>
                </div>
                <span
                  className={`text-xs px-3 py-1 rounded-full ${user.is_host ? "bg-blue-100 text-blue-800" : "bg-gray-100"}`}
                >
                  {user.is_host ? t('host') : t('guest')}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </Card>
  )
}

function AdminBookingsList() {
  const supabase = createClient()
  const { t } = useLanguage(); // Get the translation function
  const [bookings, setBookings] = useState<any[]>([])

  useEffect(() => {
    const fetchBookings = async () => {
      const { data } = await supabase
        .from("bookings")
        .select("*, listings(title)")
        .order("created_at", { ascending: false })
        .limit(10)

      setBookings(data || [])
    }

    fetchBookings()
  }, [])

  return (
    <Card>
      <div className="p-6">
        <h2 className="text-xl font-bold mb-4">{t('recentBookings')}</h2>
        {bookings.length === 0 ? (
          <p className="text-gray-600">{t('noBookingsYet')}</p>
        ) : (
          <div className="space-y-2">
            {bookings.map((booking) => (
              <div key={booking.id} className="flex justify-between items-center py-3 border-b">
                <div>
                  <p className="font-semibold">{booking.listings.title}</p>
                  <p className="text-sm text-gray-600">
                    {booking.check_in_date} to {booking.check_out_date}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-bold">${booking.total_price}</p>
                  <span
                    className={`text-xs px-2 py-1 rounded ${
                      booking.status === "confirmed" ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"
                    }`}
                  >
                    {booking.status === "confirmed" ? t('confirmed') : t('pending')}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Card>
  )
}

function AdminUnitsStats() {
  const supabase = createClient()
  const { t } = useLanguage(); // Get the translation function
  const [unitStats, setUnitStats] = useState({
    totalUnits: 0,
    unitsOutOfService: 0,
    availableUnits: 0,
    unitsNoAccess: 0,
    upcomingDepartures: 0
  })
  const [units, setUnits] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchUnitStats = async () => {
      try {
        // Fetch all units from the listings table
        const { data: allUnits } = await supabase.from("listings").select("*")

        // Fetch all active bookings to determine availability
        const { data: allBookings } = await supabase
          .from("bookings")
          .select("*")
          .in("status", ["confirmed", "pending"]) // Include both confirmed and pending bookings

        // Calculate statistics based on units
        let total = 0
        let outOfService = 0
        let available = 0
        let noAccess = 0
        let departures = 0

        if (allUnits) {
          total = allUnits.length

          // Count units based on criteria
          for (const unit of allUnits) {
            // Units out of service - based on the schema, this could include inactive units
            // Since there's no status column in the schema, we'll use is_active and other checks
            if (unit.is_active === false) {
              outOfService++
            }
            // Check if the unit currently has any active bookings (occupied)
            else if (allBookings) {
              const currentDate = new Date().toISOString().split('T')[0]
              const currentBookings = allBookings.filter(booking =>
                booking.listing_id === unit.id &&
                booking.check_in_date <= currentDate &&
                booking.check_out_date >= currentDate
              )

              if (currentBookings.length > 0) {
                noAccess++ // Currently occupied
              } else {
                // Check if available for booking (no future bookings or only future bookings)
                const futureBookings = allBookings.filter(booking =>
                  booking.listing_id === unit.id &&
                  booking.check_in_date > currentDate
                )

                if (futureBookings.length > 0) {
                  noAccess++ // Reserved for future dates
                } else {
                  available++ // Available for booking
                }
              }
            } else {
              available++ // Default to available if no booking data
            }
          }

          // Calculate upcoming departures (check-outs in the next 7 days)
          if (allBookings) {
            const today = new Date()
            const nextWeek = new Date()
            nextWeek.setDate(today.getDate() + 7)

            // Count bookings that are ending in the next 7 days
            for (const booking of allBookings) {
              const checkOutDate = new Date(booking.check_out_date)
              if (checkOutDate >= today && checkOutDate <= nextWeek && booking.status === 'confirmed') {
                departures++
              }
            }
          }

          setUnits(allUnits)
        }

        setUnitStats({
          totalUnits: total,
          unitsOutOfService: outOfService,
          availableUnits: available,
          unitsNoAccess: noAccess,
          upcomingDepartures: departures
        })
      } catch (error) {
        console.error("Error fetching unit stats:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchUnitStats()
  }, [])

  if (isLoading) {
    return <div className="p-6">{t('loading')}...</div>
  }

  return (
    <div>
      {/* Unit Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        <Card className="p-4 text-center">
          <div className="text-3xl font-bold text-blue-600">{unitStats.totalUnits}</div>
          <div className="text-sm text-gray-600 mt-1">{t('totalUnits')}</div>
        </Card>

        <Card className="p-4 text-center">
          <div className="text-3xl font-bold text-red-600">{unitStats.unitsOutOfService}</div>
          <div className="text-sm text-gray-600 mt-1">{t('unitsOutOfService')}</div>
        </Card>

        <Card className="p-4 text-center">
          <div className="text-3xl font-bold text-green-600">{unitStats.availableUnits}</div>
          <div className="text-sm text-gray-600 mt-1">{t('availableUnits')}</div>
        </Card>

        <Card className="p-4 text-center">
          <div className="text-3xl font-bold text-yellow-600">{unitStats.unitsNoAccess}</div>
          <div className="text-sm text-gray-600 mt-1">{t('unitsNoAccess')}</div>
        </Card>

        <Card className="p-4 text-center">
          <div className="text-3xl font-bold text-purple-600">{unitStats.upcomingDepartures}</div>
          <div className="text-sm text-gray-600 mt-1">{t('upcomingDepartures')}</div>
        </Card>
      </div>

      <Card>
        <div className="p-6">
          <h2 className="text-xl font-bold mb-4">{t('unitsList')}</h2>
          {units.length === 0 ? (
            <p className="text-gray-600">{t('noUnitsYet')}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="py-2 text-left">{t('unitName')}</th>
                    <th className="py-2 text-left">{t('status')}</th>
                    <th className="py-2 text-left">{t('availability')}</th>
                    <th className="py-2 text-left">{t('location')}</th>
                    <th className="py-2 text-left">{t('actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {units.map((unit) => (
                    <tr key={unit.id} className="border-b hover:bg-gray-50">
                      <td className="py-3">{unit.title || 'N/A'}</td>
                      <td className="py-3">
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          unit.is_active === false
                            ? 'bg-red-100 text-red-800'
                            : 'bg-blue-100 text-blue-800'
                        }`}>
                          {unit.is_active ? t('active') : t('inactive')}
                        </span>
                      </td>
                      <td className="py-3">
                        {unit.is_active ?
                          <span className="text-green-600">{t('available')}</span> :
                          <span className="text-red-600">{t('notAvailable')}</span>
                        }
                      </td>
                      <td className="py-3">{unit.city || unit.country || 'N/A'}</td>
                      <td className="py-3">
                        <button className="text-blue-600 hover:underline text-sm">
                          {t('viewDetails')}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </Card>
    </div>
  )
}
