"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts"
import { TrendingUp, Users, Home, DollarSign, Calendar, Zap, Building2, MapPin, Star } from "lucide-react"

interface Stats {
  totalUnits: number
  newBookings: number
  activeBookings: number
  currentGuests: number
  todayRevenue: number
}

interface SubscriptionInfo {
  plan_name: string
  renewal_date: string
}

interface UnitStatus {
  id: string;
  name: string;
  status: string;
  property_city: string;  // Added to track city of the unit
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats>({
    totalUnits: 0,
    newBookings: 0,
    activeBookings: 0,
    currentGuests: 0,
    todayRevenue: 0,
  })
  const [subscription, setSubscription] = useState<SubscriptionInfo | null>(null)
  const [weeklyData, setWeeklyData] = useState<any[]>([]);
  const [unitStatus, setUnitStatus] = useState<UnitStatus[]>([]);
  const [isLoading, setIsLoading] = useState(true)
  const [popularStays, setPopularStays] = useState<any[]>([]);
  const router = useRouter()

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Get dashboard stats from API
        const statsResponse = await fetch("/api/dashboard/stats");
        if (!statsResponse.ok) {
          if (statsResponse.status === 401) {
            router.push("/auth/login");
            return;
          }
          throw new Error(`Stats API error: ${statsResponse.status}`);
        }
        const statsResult = await statsResponse.json();
        if (statsResult.error) {
          console.error("Error from stats API:", statsResult.error);
          return;
        }

        // Get chart data from API
        const chartResponse = await fetch("/api/dashboard/charts");
        if (!chartResponse.ok) {
          if (chartResponse.status === 401) {
            router.push("/auth/login");
            return;
          }
          throw new Error(`Charts API error: ${chartResponse.status}`);
        }
        const chartResult = await chartResponse.json();
        if (chartResult.error) {
          console.error("Error from charts API:", chartResult.error);
          return;
        }

        // Get unit status data from API
        const unitsResponse = await fetch("/api/dashboard/units");
        if (!unitsResponse.ok) {
          if (unitsResponse.status === 401) {
            router.push("/auth/login");
            return;
          }
          throw new Error(`Units API error: ${unitsResponse.status}`);
        }
        const unitsResult = await unitsResponse.json();
        if (unitsResult.error) {
          console.error("Error from units API:", unitsResult.error);
          return;
        }

        // Get popular stays (most booked units)
        const popularResponse = await fetch("/api/dashboard/popular");
        if (popularResponse.ok) {
          const popularResult = await popularResponse.json();
          if (popularResult.units) {
            setPopularStays(popularResult.units);
          }
        } else {
          // If the endpoint doesn't exist, use unitStatus as fallback
          setPopularStays(unitsResult.units.slice(0, 6)); // Get first 6 units
        }

        setStats(statsResult.stats);
        setSubscription(statsResult.subscription);
        setWeeklyData(chartResult.weeklyData);
        setUnitStatus(unitsResult.units);
      } catch (error) {
        console.error("Error fetching dashboard data:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [])

  const kpiData = [
    { label: "Total Units", value: stats.totalUnits, icon: Home, color: "bg-blue-500" },
    { label: "New Bookings", value: stats.newBookings, icon: Calendar, color: "bg-green-500" },
    { label: "Active Bookings", value: stats.activeBookings, icon: TrendingUp, color: "bg-purple-500" },
    { label: "Current Guests", value: stats.currentGuests, icon: Users, color: "bg-orange-500" },
    {
      label: "Today's Revenue",
      value: `${stats.todayRevenue.toLocaleString()} SAR`,
      icon: DollarSign,
      color: "bg-pink-500",
    },
  ]

  // City options for navigation
  const cities = [
    { value: "Riyadh", name: "Riyadh", description: "Capital city" },
    { value: "Jeddah", name: "Jeddah", description: "Red Sea coastal city" },
    { value: "Dammam", name: "Dammam", description: "Eastern Province" },
    { value: "Abha", name: "Abha", description: "Mountain city" },
    { value: "Al Khobar", name: "Al Khobar", description: "Business hub" },
    { value: "Madinah", name: "Madinah", description: "Holy city" },
  ];

  // Function to navigate to units page filtered by city
  const navigateToCityUnits = (city: string) => {
    // Since the units page already has city filtering, we'll update the units page URL
    // and pass the city parameter to filter
    router.push(`/dashboard/units?city=${encodeURIComponent(city)}`);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        {subscription && (
          <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 rounded-lg border border-blue-200">
            <Zap className="w-4 h-4 text-blue-600" />
            <div className="text-sm">
              <p className="font-semibold text-blue-900">{subscription.plan_name} Plan</p>
              <p className="text-xs text-blue-700">
                Renews: {subscription.renewal_date ? new Date(subscription.renewal_date).toLocaleDateString() : 'N/A'}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {kpiData.map((kpi) => {
          const Icon = kpi.icon
          return (
            <Card key={kpi.label}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">{kpi.label}</p>
                    <p className="text-2xl font-bold mt-2">{kpi.value}</p>
                  </div>
                  <div className={`${kpi.color} p-3 rounded-lg text-white`}>
                    <Icon className="w-5 h-5" />
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* City Navigation Cards */}
      <div>
        <h2 className="text-xl font-bold mb-4">Cities</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {cities.map((city) => (
            <Card
              key={city.value}
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => navigateToCityUnits(city.value)}
            >
              <CardContent className="p-4 text-center">
                <MapPin className="w-6 h-6 mx-auto text-blue-500 mb-2" />
                <h3 className="font-semibold">{city.name}</h3>
                <p className="text-xs text-muted-foreground mt-1">{city.description}</p>
                {/* Count units in this city */}
                <p className="text-xs mt-2">
                  {unitStatus.filter(unit => unit.property_city === city.value).length} units
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Popular Stays (Units by City) */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Star className="w-5 h-5 text-yellow-500" />
            Popular Stays
          </h2>
          <p className="text-sm text-muted-foreground">Highly-rated properties loved by guests</p>
        </div>

        {popularStays.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {popularStays.slice(0, 6).map((unit, index) => {
              // Find the property for this unit to get city info
              const property = unit.properties; // This is now available from the API
              return (
                <Card
                  key={unit.id}
                  className="cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => navigateToCityUnits(unit.property_city || "Riyadh")}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-semibold">{unit.name}</h3>
                        <p className="text-sm text-muted-foreground mt-1">
                          {property?.city || unit.property_city || "N/A"}, {property?.country || "Saudi Arabia"}
                        </p>
                        <div className="flex items-center gap-1 mt-2">
                          <Star className="w-4 h-4 text-yellow-500 fill-current" />
                          <span className="text-sm">4.8</span>
                          {unit.status && (
                            <span className="ml-2 text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-800">
                              {unit.status}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <Card className="text-center py-8">
            <p className="text-muted-foreground">No listings available yet</p>
          </Card>
        )}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Occupancy Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Weekly Occupancy</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={weeklyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="day" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="occupancy" stroke="#3b82f6" name="Occupancy %" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Revenue Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Weekly Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={weeklyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="day" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="revenue" fill="#10b981" name="Revenue (SAR)" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Unit Status Grid */}
      <Card>
        <CardHeader>
          <CardTitle>Unit Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {unitStatus.map((unit, i) => {
              let statusColor = "text-gray-600";
              if (unit.status === "occupied") statusColor = "text-red-600";
              else if (unit.status === "vacant") statusColor = "text-green-600";
              else if (unit.status === "reserved") statusColor = "text-yellow-600";
              else if (unit.status === "maintenance") statusColor = "text-orange-600";

              return (
                <div key={unit.id} className="p-4 rounded-lg bg-slate-50 border text-center">
                  <p className="font-semibold">{unit.name}</p>
                  <p className={`text-sm mt-2 ${statusColor}`}>
                    {unit.status.charAt(0).toUpperCase() + unit.status.slice(1)}
                  </p>
                </div>
              );
            })}
            {unitStatus.length === 0 && stats.totalUnits > 0 && (
              <div className="col-span-full text-center py-8 text-gray-500">
                Loading unit status...
              </div>
            )}
            {stats.totalUnits === 0 && (
              <div className="col-span-full text-center py-8 text-gray-500">
                No units found. Add properties and units to see status here.
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
