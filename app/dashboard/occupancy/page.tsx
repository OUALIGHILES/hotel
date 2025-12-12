"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react"
import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

interface Reservation {
  id: string
  unit_id: string
  unit_name: string
  property_id: string
  property_name: string
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

  // Get detailed reservation information for the day
  const getDayReservations = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0] // Format as YYYY-MM-DD

    return reservations.filter(reservation => {
      const checkIn = new Date(reservation.check_in_date)
      const checkOut = new Date(reservation.check_out_date)

      // Include the check-out date as well (guest checkout day)
      return date >= checkIn && date <= checkOut && reservation.status !== 'checked_out'
    })
  }

  // Get the CSS class for the day based on its status
  const getDayClass = (date: Date) => {
    const status = getDayStatus(date)
    let baseClass = "p-4 rounded-lg border text-center"

    switch (status) {
      case 'available':
        return `${baseClass} bg-green-500/20 border-border hover:bg-green-500/30 cursor-pointer`
      case 'booked':
        return `${baseClass} bg-blue-500/20 border-border hover:bg-blue-500/30 cursor-pointer`
      case 'reserved':
        return `${baseClass} bg-yellow-500/20 border-border hover:bg-yellow-500/30 cursor-pointer`
      case 'occupied':
        return `${baseClass} bg-purple-500/20 border-border hover:bg-purple-500/30 cursor-pointer`
      case 'maintenance':
        return `${baseClass} bg-red-500/20 border-border hover:bg-red-500/30 cursor-pointer`
      default:
        return `${baseClass} bg-muted border-border hover:bg-muted/70 cursor-pointer`
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

        // Get reservations with associated unit and property information
        const firstDayOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1)
        const lastDayOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0)

        const { data, error } = await supabase
          .from("reservations")
          .select(`
            id,
            unit_id,
            check_in_date,
            check_out_date,
            status,
            units!inner (
              id,
              name,
              property_id,
              properties!inner (
                id,
                name
              )
            )
          `)
          .eq("units.properties.user_id", userId)
          .or(`and(check_in_date.lte.${lastDayOfMonth.toISOString().split('T')[0]},check_out_date.gte.${firstDayOfMonth.toISOString().split('T')[0]})`)
          .order("check_in_date", { ascending: true })

        if (error) {
          console.error("Error fetching reservations:", error);
          return;
        }

        // Transform the data to match our interface
        const transformedReservations: Reservation[] = (data || []).map(item => ({
          id: item.id,
          unit_id: item.unit_id,
          unit_name: item.units.name,
          property_id: item.units.property_id,
          property_name: item.units.properties.name,
          check_in_date: item.check_in_date,
          check_out_date: item.check_out_date,
          status: item.status
        }));

        setReservations(transformedReservations)
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
        <h2 className="text-2xl font-bold text-center text-foreground">Access Denied</h2>
        <p className="text-muted-foreground text-center max-w-md">
          You are not authenticated. Please log in to access the occupancy calendar.
        </p>
        <Button
          onClick={() => router.push("/auth/login")}
          variant="default"
        >
          Go to Login
        </Button>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-foreground">Occupancy Calendar</h1>
        <Card className="flex justify-center items-center h-64 border rounded-xl shadow-lg">
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="w-8 h-8 animate-spin text-foreground" />
            <span className="text-foreground">Loading occupancy data...</span>
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Occupancy Calendar</h1>

      <Card className="border rounded-xl shadow-lg">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-xl font-semibold">{currentMonth.toLocaleDateString("en-US", { month: "long", year: "numeric" })}</CardTitle>
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
              <div key={day} className="text-center font-semibold p-2 text-foreground">
                {day}
              </div>
            ))}
            {days.map((day, idx) => {
              if (!day) {
                return (
                  <div key={idx} className="p-4 rounded-lg border text-center bg-muted" />
                )
              }

              const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day)
              const dayReservations = getDayReservations(date);
              const status = getDayStatus(date);

              // Only show tooltip for booked/reserved/occupied days
              const hasReservation = dayReservations.length > 0;

              return (
                <TooltipProvider key={idx}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div
                        className={getDayClass(date)}
                      >
                        {day}
                      </div>
                    </TooltipTrigger>
                    {hasReservation && (
                      <TooltipContent>
                        <div className="p-2 max-w-xs">
                          <p className="font-semibold text-sm mb-1">
                            {date.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
                          </p>
                          <p className="text-xs mb-2">
                            <span className="font-medium">
                              {status === 'booked' ? 'Booked:' :
                               status === 'occupied' ? 'Occupied:' :
                               status === 'reserved' ? 'Reserved:' : 'Status:'}
                            </span> {dayReservations.length} unit{dayReservations.length !== 1 ? 's' : ''}
                          </p>
                          {dayReservations.map((reservation, index) => (
                            <div key={reservation.id} className="text-xs mb-1 last:mb-0">
                              <div className="font-medium">{reservation.unit_name}</div>
                              <div className="text-muted-foreground">{reservation.property_name}</div>
                            </div>
                          ))}
                        </div>
                      </TooltipContent>
                    )}
                  </Tooltip>
                </TooltipProvider>
              )
            })}
          </div>
        </CardContent>
      </Card>

      <Card className="border rounded-xl shadow-lg">
        <CardHeader>
          <CardTitle className="text-xl font-semibold">Legend</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-4">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-green-500/20 border border-border rounded" />
            <span className="text-sm text-foreground">Available</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-blue-500/20 border border-border rounded" />
            <span className="text-sm text-foreground">Booked</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-yellow-500/20 border border-border rounded" />
            <span className="text-sm text-foreground">Reserved</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-purple-500/20 border border-border rounded" />
            <span className="text-sm text-foreground">Occupied</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-red-500/20 border border-border rounded" />
            <span className="text-sm text-foreground">Maintenance</span>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
