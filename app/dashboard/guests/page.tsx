"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Plus, Edit, Trash2, Mail, Phone, Lock, X } from "lucide-react"
import { useRouter } from "next/navigation"

interface Guest {
  id: string
  full_name: string
  email: string
  phone: string
  id_type: string
  id_number: string
}

export default function GuestsPage() {
  const [guests, setGuests] = useState<Guest[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isAuthenticated, setIsAuthenticated] = useState(true) // Track authentication state
  const [showAddGuestForm, setShowAddGuestForm] = useState(false)
  const [editingGuest, setEditingGuest] = useState<Guest | null>(null)
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    phone: '',
    id_type: '',
    id_number: ''
  })
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    checkAuthenticationAndFetchGuests()
  }, [])

  const checkAuthenticationAndFetchGuests = async () => {
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

      // Get the user's properties, units, and reservations in the proper sequence

      // Instead, get properties, then units, then reservations
      const { data: propertiesData, error: propertiesError } = await supabase
        .from("properties")
        .select("id")
        .eq("user_id", userId);

      if (propertiesError) {
        console.error("Error fetching properties:", propertiesError);
        return;
      }

      if (!propertiesData || propertiesData.length === 0) {
        // If the user has no properties, return empty guests
        setGuests([]);
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
        // If the user has no units, return empty guests
        setGuests([]);
        return;
      }

      const unitIds = unitsData.map(unit => unit.id);

      // Get all reservations for the user's units to find guest IDs
      const { data: reservationsData, error: reservationsFetchError } = await supabase
        .from("reservations")
        .select("guest_id, guest_name, guest_email")
        .in("unit_id", unitIds);

      if (reservationsFetchError) {
        console.error("Error fetching reservations:", reservationsFetchError);
        return;
      }

      // Get guest IDs from reservations
      const guestIds = [...new Set(reservationsData.map(res => res.guest_id).filter(id => id))];

      // Get all guests if they exist in the guests table
      let allGuests: Guest[] = [];
      if (guestIds.length > 0) {
        const { data: guestsData, error: guestsError } = await supabase
          .from("guests")
          .select("*")
          .in("id", guestIds);

        if (guestsError) {
          console.error("Error fetching guests:", guestsError);
        } else {
          allGuests = guestsData || [];
        }
      }

      // Also add any reservations that have guest information but might not be in the guests table
      reservationsData.forEach(res => {
        if (res.guest_name && !allGuests.some(g => g.full_name === res.guest_name)) {
          const newGuest: Guest = {
            id: `temp-${res.guest_name}`,
            full_name: res.guest_name,
            email: res.guest_email || '',
            phone: '',
            id_type: '',
            id_number: ''
          };
          allGuests.push(newGuest);
        }
      });

      setGuests(allGuests);
    } catch (error) {
      console.error("Error fetching guests:", error)
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false)
    }
  }

  const handleAddGuest = () => {
    setEditingGuest(null);
    setFormData({
      full_name: '',
      email: '',
      phone: '',
      id_type: '',
      id_number: ''
    });
    setShowAddGuestForm(true);
  }

  const handleEditGuest = (guest: Guest) => {
    setEditingGuest(guest);
    setFormData({
      full_name: guest.full_name,
      email: guest.email,
      phone: guest.phone,
      id_type: guest.id_type || '',
      id_number: guest.id_number || ''
    });
    setShowAddGuestForm(true);
  }

  const handleDeleteGuest = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this guest?")) {
      return;
    }

    try {
      const { error } = await supabase
        .from("guests")
        .delete()
        .eq("id", id);

      if (error) throw error;

      // Refresh the guest list
      checkAuthenticationAndFetchGuests();
    } catch (error) {
      console.error("Error deleting guest:", error);
      alert("Error deleting guest: " + (error as Error).message);
    }
  }

  const handleSubmitGuest = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      // Get the current user to associate with the guest
      const { data: { user }, error: userError } = await supabase.auth.getUser();

      if (userError || !user) {
        console.error("Error getting user:", userError);
        alert("Authentication error. Please log in again.");
        return;
      }

      if (editingGuest) {
        // Update existing guest
        const { error } = await supabase
          .from("guests")
          .update({
            full_name: formData.full_name,
            email: formData.email,
            phone: formData.phone,
            id_type: formData.id_type,
            id_number: formData.id_number,
            user_id: user.id
          })
          .eq("id", editingGuest.id);

        if (error) {
          console.error("Error updating guest:", error);
          throw error;
        }

        alert("Guest updated successfully!");
      } else {
        // Create new guest
        const { error } = await supabase
          .from("guests")
          .insert([{
            full_name: formData.full_name,
            email: formData.email,
            phone: formData.phone,
            id_type: formData.id_type,
            id_number: formData.id_number,
            user_id: user.id
          }]);

        if (error) {
          console.error("Error inserting guest:", error);
          throw error;
        }

        alert("Guest added successfully!");
      }

      // Close form and refresh list
      setShowAddGuestForm(false);
      setEditingGuest(null);
      checkAuthenticationAndFetchGuests();
    } catch (error: any) {
      console.error("Error saving guest:", error);
      alert(`Error saving guest: ${error.message || 'Please try again.'}`);
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  }

  // Show authentication error message if not authenticated
  if (!isAuthenticated) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6">
        <Lock className="w-12 h-12 text-amber-500" />
        <h2 className="text-2xl font-bold text-center">Access Denied</h2>
        <p className="text-gray-600 text-center max-w-md">
          You are not authenticated. Please log in to access your guests.
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Guests</h1>
        <Button className="gap-2" onClick={handleAddGuest}>
          <Plus className="w-4 h-4" />
          Add Guest
        </Button>
      </div>

      {isLoading ? (
        <p>Loading guests...</p>
      ) : guests.length === 0 ? (
        <Card className="text-center py-12">
          <p className="text-muted-foreground">No guests registered yet</p>
          <Button
            className="mt-4 gap-2"
            onClick={handleAddGuest}
          >
            <Plus className="w-4 h-4" />
            Add Your First Guest
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {guests.map((guest) => (
            <Card key={guest.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle className="text-lg flex justify-between items-start">
                  <span>{guest.full_name}</span>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0"
                      onClick={() => handleEditGuest(guest)}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                      onClick={() => handleDeleteGuest(guest.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="w-4 h-4 text-muted-foreground" />
                    <span className="text-muted-foreground truncate">{guest.email}</span>
                  </div>
                  {guest.phone && (
                    <div className="flex items-center gap-2 text-sm">
                      <Phone className="w-4 h-4 text-muted-foreground" />
                      <span className="text-muted-foreground">{guest.phone}</span>
                    </div>
                  )}
                  {guest.id_type && (
                    <div className="text-sm">
                      <span className="text-muted-foreground">ID: {guest.id_type} {guest.id_number}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add/Edit Guest Modal */}
      {showAddGuestForm && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-background border rounded-xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-foreground">
                  {editingGuest ? "Edit Guest" : "Add New Guest"}
                </h2>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                  onClick={() => {
                    setShowAddGuestForm(false);
                    setEditingGuest(null);
                  }}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>

              <form onSubmit={handleSubmitGuest}>
                <div className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="full_name" className="text-foreground">Full Name *</Label>
                    <Input
                      id="full_name"
                      name="full_name"
                      value={formData.full_name}
                      onChange={handleChange}
                      required
                      placeholder="John Doe"
                      className="bg-muted focus:ring-2 focus:ring-primary focus:border-transparent"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-foreground">Email</Label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      value={formData.email}
                      onChange={handleChange}
                      placeholder="john@example.com"
                      className="bg-muted focus:ring-2 focus:ring-primary focus:border-transparent"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone" className="text-foreground">Phone</Label>
                    <Input
                      id="phone"
                      name="phone"
                      type="tel"
                      value={formData.phone}
                      onChange={handleChange}
                      placeholder="+1 (555) 123-4567"
                      className="bg-muted focus:ring-2 focus:ring-primary focus:border-transparent"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="id_type" className="text-foreground">ID Type</Label>
                      <Input
                        id="id_type"
                        name="id_type"
                        value={formData.id_type}
                        onChange={handleChange}
                        placeholder="Passport, ID, etc."
                        className="bg-muted focus:ring-2 focus:ring-primary focus:border-transparent"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="id_number" className="text-foreground">ID Number</Label>
                      <Input
                        id="id_number"
                        name="id_number"
                        value={formData.id_number}
                        onChange={handleChange}
                        placeholder="ID Number"
                        className="bg-muted focus:ring-2 focus:ring-primary focus:border-transparent"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-3 mt-8 pt-6 border-t border-border">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowAddGuestForm(false);
                      setEditingGuest(null);
                    }}
                  >
                    Cancel
                  </Button>
                  <Button type="submit">
                    {editingGuest ? "Update Guest" : "Add Guest"}
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
