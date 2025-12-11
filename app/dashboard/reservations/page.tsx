"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Plus, Edit, Trash2, Filter, Lock } from "lucide-react"
import { useRouter } from "next/navigation"

interface Reservation {
  id: string
  unit_id: string
  guest_id: string
  guest_name: string
  guest_email: string
  guest_phone: string
  check_in_date: string
  check_out_date: string
  status: string
  special_requests: string
  total_price: number
  payment_status: string
  created_at: string
}

export default function ReservationsPage() {
  const [reservations, setReservations] = useState<Reservation[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isAuthenticated, setIsAuthenticated] = useState(true) // Track authentication state
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [editingReservation, setEditingReservation] = useState<Reservation | null>(null)
  const [units, setUnits] = useState<{id: string, name: string, property_id: string}[]>([])
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    checkAuthenticationAndFetchReservations()
    fetchUnits()
  }, [])

  const fetchUnits = async () => {
    try {
      const response = await fetch("/api/auth/check");
      if (!response.ok) {
        setIsAuthenticated(false);
        return;
      }

      const result = await response.json();
      if (!result.user) {
        setIsAuthenticated(false);
        return;
      }

      const userId = result.user.id;
      if (!userId) {
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
        setUnits([]);
        return;
      }

      const propertyIds = propertiesData.map(prop => prop.id);

      // Get units for the user's properties
      const { data, error } = await supabase
        .from("units")
        .select("id, name, property_id")
        .in("property_id", propertyIds);

      if (error) {
        console.error("Error fetching units:", error);
        return;
      }

      setUnits(data || []);
    } catch (error) {
      console.error("Error fetching units:", error);
    }
  }

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
        .select(`
          id,
          unit_id,
          guest_id,
          guest_name,
          guest_email,
          guest_phone,
          check_in_date,
          check_out_date,
          status,
          special_requests,
          total_price,
          payment_status,
          created_at
        `)
        .in("unit_id", unitIds) // Filter by user's unit IDs
        .order("check_in_date", { ascending: false })

      if (error) {
        console.error("Error fetching reservations:", error);
        throw error;
      }
      setReservations(data || [])
    } catch (error) {
      console.error("Error fetching reservations:", error)
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeleteReservation = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this reservation?")) {
      return;
    }

    try {
      const { error } = await supabase
        .from("reservations")
        .delete()
        .eq("id", id);

      if (error) throw error;

      // Refresh reservations list
      checkAuthenticationAndFetchReservations();
    } catch (error) {
      console.error("Error deleting reservation:", error);
      alert("Error deleting reservation. Please try again.");
    }
  }

  const handleStatusChange = async (id: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from("reservations")
        .update({ status: newStatus })
        .eq("id", id);

      if (error) throw error;

      // Refresh reservations list
      checkAuthenticationAndFetchReservations();
    } catch (error) {
      console.error("Error updating reservation status:", error);
      alert("Error updating reservation status. Please try again.");
    }
  }

  const handleSubmitReservation = async (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);

    const reservationData = {
      unit_id: formData.get('unit_id') as string,
      guest_name: formData.get('guest_name') as string,
      guest_email: formData.get('guest_email') as string,
      guest_phone: formData.get('guest_phone') as string,
      check_in_date: formData.get('check_in_date') as string,
      check_out_date: formData.get('check_out_date') as string,
      total_price: parseFloat(formData.get('total_price') as string),
      status: formData.get('status') as string,
      special_requests: formData.get('special_requests') as string,
      payment_status: formData.get('payment_status') as string,
    };

    // Validate dates
    if (new Date(reservationData.check_out_date) <= new Date(reservationData.check_in_date)) {
      alert('Check-out date must be after check-in date.');
      return;
    }

    try {
      if (editingReservation) {
        // Update existing reservation
        const { error, status } = await supabase
          .from('reservations')
          .update(reservationData)
          .eq('id', editingReservation.id);

        if (error) {
          console.error('Error updating reservation:', error);
          // More specific error message
          alert(`Error updating reservation: ${error.message || 'Please try again.'}`);
          return;
        }

        console.log('Reservation updated successfully!');
        alert('Reservation updated successfully!');
      } else {
        // Create new reservation
        const { error, status } = await supabase
          .from('reservations')
          .insert(reservationData);

        if (error) {
          console.error('Error creating reservation:', error);
          // More specific error message
          alert(`Error creating reservation: ${error.message || 'Please try again.'}`);
          return;
        }

        console.log('Reservation created successfully!');
        alert('Reservation created successfully!');
      }

      // Refresh reservations and close form
      setShowCreateForm(false);
      setEditingReservation(null);
      checkAuthenticationAndFetchReservations();
    } catch (error: any) {
      console.error('Unexpected error saving reservation:', error);
      alert(`Unexpected error saving reservation: ${error.message || 'Please try again.'}`);
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
          <Button 
            className="gap-2"
            onClick={() => {
              setEditingReservation(null);
              setShowCreateForm(true);
            }}
          >
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
                    <th className="px-6 py-4 text-left font-medium">Phone</th>
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
                      <td className="px-6 py-4">{res.guest_phone}</td>
                      <td className="px-6 py-4">{new Date(res.check_in_date).toLocaleDateString()}</td>
                      <td className="px-6 py-4">{new Date(res.check_out_date).toLocaleDateString()}</td>
                      <td className="px-6 py-4">${res.total_price?.toFixed(2)}</td>
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
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => setEditingReservation(res)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleDeleteReservation(res.id)}
                        >
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

      {/* Create Reservation Form */}
      {showCreateForm && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-background border rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-foreground">
                  {editingReservation ? "Edit Reservation" : "Create New Reservation"}
                </h2>
                <button
                  onClick={() => {
                    setShowCreateForm(false);
                    setEditingReservation(null);
                  }}
                  className="text-muted-foreground hover:text-foreground"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleSubmitReservation}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Guest Name</label>
                    <input
                      name="guest_name"
                      type="text"
                      defaultValue={editingReservation?.guest_name || ''}
                      className="w-full px-4 py-2.5 border rounded-lg bg-muted text-foreground focus:ring-2 focus:ring-primary focus:border-transparent transition-colors"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Guest Email</label>
                    <input
                      name="guest_email"
                      type="email"
                      defaultValue={editingReservation?.guest_email || ''}
                      className="w-full px-4 py-2.5 border rounded-lg bg-muted text-foreground focus:ring-2 focus:ring-primary focus:border-transparent transition-colors"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Guest Phone</label>
                    <input
                      name="guest_phone"
                      type="tel"
                      defaultValue={editingReservation?.guest_phone || ''}
                      className="w-full px-4 py-2.5 border rounded-lg bg-muted text-foreground focus:ring-2 focus:ring-primary focus:border-transparent transition-colors"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Unit</label>
                    <select
                      name="unit_id"
                      className="w-full px-4 py-2.5 border rounded-lg bg-muted text-foreground focus:ring-2 focus:ring-primary focus:border-transparent transition-colors"
                      defaultValue={editingReservation?.unit_id || ''}
                      required
                    >
                      <option value="">Select a unit</option>
                      {units.map(unit => (
                        <option key={unit.id} value={unit.id}>
                          {unit.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Check-in Date</label>
                    <input
                      name="check_in_date"
                      type="date"
                      defaultValue={editingReservation?.check_in_date || ''}
                      className="w-full px-4 py-2.5 border rounded-lg bg-muted text-foreground focus:ring-2 focus:ring-primary focus:border-transparent transition-colors"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Check-out Date</label>
                    <input
                      name="check_out_date"
                      type="date"
                      defaultValue={editingReservation?.check_out_date || ''}
                      className="w-full px-4 py-2.5 border rounded-lg bg-muted text-foreground focus:ring-2 focus:ring-primary focus:border-transparent transition-colors"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Total Price</label>
                    <input
                      name="total_price"
                      type="number"
                      step="0.01"
                      defaultValue={editingReservation?.total_price || 0}
                      className="w-full px-4 py-2.5 border rounded-lg bg-muted text-foreground focus:ring-2 focus:ring-primary focus:border-transparent transition-colors"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Status</label>
                    <select
                      name="status"
                      className="w-full px-4 py-2.5 border rounded-lg bg-muted text-foreground focus:ring-2 focus:ring-primary focus:border-transparent transition-colors"
                      defaultValue={editingReservation?.status || 'pending'}
                    >
                      <option value="pending">Pending</option>
                      <option value="confirmed">Confirmed</option>
                      <option value="checked_in">Checked In</option>
                      <option value="checked_out">Checked Out</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </div>

                  <div className="md:col-span-2 space-y-2">
                    <label className="text-sm font-medium text-foreground">Special Requests</label>
                    <textarea
                      name="special_requests"
                      defaultValue={editingReservation?.special_requests || ''}
                      className="w-full px-4 py-2.5 border rounded-lg bg-muted text-foreground focus:ring-2 focus:ring-primary focus:border-transparent transition-colors min-h-[100px]"
                      rows={3}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Payment Status</label>
                    <select
                      name="payment_status"
                      className="w-full px-4 py-2.5 border rounded-lg bg-muted text-foreground focus:ring-2 focus:ring-primary focus:border-transparent transition-colors"
                      defaultValue={editingReservation?.payment_status || 'unpaid'}
                    >
                      <option value="unpaid">Unpaid</option>
                      <option value="paid">Paid</option>
                    </select>
                  </div>
                </div>

                <div className="flex justify-end gap-3 mt-8 pt-6 border-t border-border">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowCreateForm(false);
                      setEditingReservation(null);
                    }}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" className="px-6">
                    {editingReservation ? "Update Reservation" : "Create Reservation"}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}