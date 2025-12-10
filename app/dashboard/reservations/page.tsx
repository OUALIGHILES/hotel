"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Plus, Edit, Trash2, Filter, Lock } from "lucide-react"
import { useRouter } from "next/navigation"

interface Reservation {
  id: string
  guest_name: string
  guest_email: string
  check_in_date: string
  check_out_date: string
  status: string
  payment_status: string
  total_price: number
}

export default function ReservationsPage() {
  const [reservations, setReservations] = useState<Reservation[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isAuthenticated, setIsAuthenticated] = useState(true) // Track authentication state
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    checkAuthenticationAndFetchReservations()
  }, [])

  const checkAuthenticationAndFetchReservations = async () => {
    try {
      // Check if user is authenticated using the same method as the header
      const response = await fetch("/api/auth/check");
      if (!response.ok) {
        console.error("User not authenticated via API check");
        setIsAuthenticated(false);
        return;
      }

      const result = await response.json();
      if (!result.user) {
        console.error("No user found in auth check");
        setIsAuthenticated(false);
        return;
      }

      const userId = result.user.id;
      if (!userId) {
        console.error("User ID not found in API response");
        setIsAuthenticated(false);
        return;
      }

      // Get the user's properties first
      const { data: propertiesData, error: propertiesError } = await supabase
        .from("properties")
        .select("id")
        .eq("user_id", userId);

      if (propertiesError) {
        console.error("Error fetching properties:", propertiesError);
        return;
      }

      if (!propertiesData || propertiesData.length === 0) {
        // If the user has no properties, return empty reservations
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
        // If the user has no units, return empty reservations
        setReservations([]);
        return;
      }

      const unitIds = unitsData.map(unit => unit.id);

      // Get reservations for the user's units
      const { data, error } = await supabase
        .from("reservations")
        .select("*")
        .in("unit_id", unitIds) // Filter by user's unit IDs
        .order("check_in_date", { ascending: false })

      if (error) throw error
      setReservations(data || [])
    } catch (error) {
      console.error("Error fetching reservations:", error)
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false)
    }
  }

  // Show authentication error message if not authenticated
  if (!isAuthenticated) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6">
        <Lock className="w-12 h-12 text-amber-500" />
        <h2 className="text-2xl font-bold text-center">Access Denied</h2>
        <p className="text-gray-600 text-center max-w-md">
          You are not authenticated. Please log in to access your reservations.
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

  const statusColors = {
    pending: "bg-yellow-100 text-yellow-800",
    confirmed: "bg-blue-100 text-blue-800",
    checked_in: "bg-green-100 text-green-800",
    checked_out: "bg-gray-100 text-gray-800",
    cancelled: "bg-red-100 text-red-800",
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Reservations</h1>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2 bg-transparent">
            <Filter className="w-4 h-4" />
            Filter
          </Button>
          <Button className="gap-2">
            <Plus className="w-4 h-4" />
            New Reservation
          </Button>
        </div>
      </div>

      {isLoading ? (
        <p>Loading reservations...</p>
      ) : reservations.length === 0 ? (
        <Card className="text-center py-12">
          <p className="text-muted-foreground">No reservations yet</p>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b">
                  <tr>
                    <th className="px-6 py-4 text-left font-medium">Guest Name</th>
                    <th className="px-6 py-4 text-left font-medium">Email</th>
                    <th className="px-6 py-4 text-left font-medium">Check In</th>
                    <th className="px-6 py-4 text-left font-medium">Check Out</th>
                    <th className="px-6 py-4 text-left font-medium">Price</th>
                    <th className="px-6 py-4 text-left font-medium">Status</th>
                    <th className="px-6 py-4 text-left font-medium">Payment</th>
                    <th className="px-6 py-4 text-left font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {reservations.map((res) => (
                    <tr key={res.id} className="border-b hover:bg-slate-50">
                      <td className="px-6 py-4">{res.guest_name}</td>
                      <td className="px-6 py-4">{res.guest_email}</td>
                      <td className="px-6 py-4">{new Date(res.check_in_date).toLocaleDateString()}</td>
                      <td className="px-6 py-4">{new Date(res.check_out_date).toLocaleDateString()}</td>
                      <td className="px-6 py-4">${res.total_price}</td>
                      <td className="px-6 py-4">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-medium ${statusColors[res.status as keyof typeof statusColors]}`}
                        >
                          {res.status}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-medium ${res.payment_status === "paid" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}
                        >
                          {res.payment_status}
                        </span>
                      </td>
                      <td className="px-6 py-4 flex gap-2">
                        <Button variant="ghost" size="sm">
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="sm">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
