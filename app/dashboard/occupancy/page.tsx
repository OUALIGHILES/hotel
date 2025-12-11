"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react"
import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"

interface Reservation {
  id: string
  unit_id: string
  check_in_date: string
  check_out_date: string
  status: string
}

export default function OccupancyPage() {
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [reservations, setReservations] = useState<Reservation[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isAuthenticated, setIsAuthenticated] = useState(true)
  const supabase = createClient()
  const router = useRouter()

  // Check if the date falls within a reservation period
  const getDayStatus = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0] // Format as YYYY-MM-DD

    for (const reservation of reservations) {
      const checkIn = new Date(reservation.check_in_date)
      const checkOut = new Date(reservation.check_out_date)

      // Include the check-out date as well (guest checkout day)
      if (date >= checkIn && date <= checkOut) {
        if (reservation.status === 'checked_out') {
          return 'available'
        }
        return reservation.status === 'confirmed' || reservation.status === 'pending' ? 'booked' :
               reservation.status === 'checked_in' ? 'occupied' : 'reserved'
      }
    }

    return 'available' // Default to available if no reservation exists
  }

  // Get the CSS class for the day based on its status
  const getDayClass = (date: Date) => {
    const status = getDayStatus(date)
    let baseClass = "p-4 rounded-lg border text-center"

    switch (status) {
      case 'available':
        return `${baseClass} bg-green-50 border-green-200 hover:bg-green-100 cursor-pointer`
      case 'booked':
        return `${baseClass} bg-blue-100 border-blue-300 hover:bg-blue-200 cursor-pointer`
      case 'reserved':
        return `${baseClass} bg-yellow-100 border-yellow-300 hover:bg-yellow-200 cursor-pointer`
      case 'occupied':
        return `${baseClass} bg-purple-100 border-purple-300 hover:bg-purple-200 cursor-pointer`
      case 'maintenance':
        return `${baseClass} bg-red-100 border-red-300 hover:bg-red-200 cursor-pointer`
      default:
        return `${baseClass} bg-slate-50 hover:bg-slate-100 cursor-pointer`
    }
  }

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Check if user is authenticated
        const response = await fetch("/api/auth/check");
        if (!response.ok) {
          setIsAuthenticated(false);
          router.push("/auth/login");
          return;
        }

        const result = await response.json();
        if (!result.user) {
          setIsAuthenticated(false);
          router.push("/auth/login");
          return;
        }

        const userId = result.user.id;
        if (!userId) {
          setIsAuthenticated(false);
          router.push("/auth/login");
          return;
        }

        // Get the user's properties
        const { data: propertiesData, error: propertiesError } = await supabase
          .from("properties")
          .select("id")
          .eq("user_id", userId);

        if (propertiesError) {
          console.error("Error fetching properties:", propertiesError);
          return;
        }

        if (!propertiesData || propertiesData.length === 0) {
          setReservations([]);
          return;
        }

        const propertyIds = propertiesData.map(prop => prop.id);

        // Get units for the user's properties
        const { data: unitsData, error: unitsError } = await supabase
          .from("units")
          .select("id")
          .in("property_id", propertyIds);

        if (unitsError) {
          console.error("Error fetching units:", unitsError);
          return;
        }

        if (!unitsData || unitsData.length === 0) {
          setReservations([]);
          return;
        }

        const unitIds = unitsData.map(unit => unit.id);

        // Get reservations for the user's units during the current month
        const firstDayOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1)
        const lastDayOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0)

        const { data, error } = await supabase
          .from("reservations")
          .select("id, unit_id, check_in_date, check_out_date, status")
          .in("unit_id", unitIds)
          .or(`and(check_in_date.lte.${lastDayOfMonth.toISOString().split('T')[0]},check_out_date.gte.${firstDayOfMonth.toISOString().split('T')[0]})`)
          .order("check_in_date", { ascending: true })

        if (error) {
          console.error("Error fetching reservations:", error);
          return;
        }

        setReservations(data || [])
      } catch (error) {
        console.error("Error in fetchData:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [currentMonth, router, supabase])

  const daysInMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate()
  const firstDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).getDay()

  const days = Array(firstDay)
    .fill(null)
    .concat(Array.from({ length: daysInMonth }, (_, i) => i + 1))

  // Show authentication error message if not authenticated
  if (!isAuthenticated) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6">
        <h2 className="text-2xl font-bold text-center">Access Denied</h2>
        <p className="text-gray-600 text-center max-w-md">
          You are not authenticated. Please log in to access the occupancy calendar.
        </p>
        <Button
          onClick={() => router.push("/auth/login")}
          className="bg-amber-500 hover:bg-amber-600"
        >
          Go to Login
        </Button>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Occupancy Calendar</h1>
        <div className="flex justify-center items-center h-64">
          <Loader2 className="w-8 h-8 animate-spin" />
          <span className="ml-2">Loading occupancy data...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Occupancy Calendar</h1>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>{currentMonth.toLocaleDateString("en-US", { month: "long", year: "numeric" })}</CardTitle>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-7 gap-2">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
              <div key={day} className="text-center font-semibold p-2">
                {day}
              </div>
            ))}
            {days.map((day, idx) => {
              if (!day) {
                return (
                  <div key={idx} className="p-4 rounded-lg border text-center bg-white" />
                )
              }

              const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day)
              return (
                <div
                  key={idx}
                  className={getDayClass(date)}
                >
                  {day}
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Legend</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-4">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-green-50 border border-green-200 rounded" />
            <span className="text-sm">Available</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-blue-100 border border-blue-300 rounded" />
            <span className="text-sm">Booked</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-yellow-100 border border-yellow-300 rounded" />
            <span className="text-sm">Reserved</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-purple-100 border border-purple-300 rounded" />
            <span className="text-sm">Occupied</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-red-100 border border-red-300 rounded" />
            <span className="text-sm">Maintenance</span>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
