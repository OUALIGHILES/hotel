"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Plus, Edit, Trash2, Mail, Phone } from "lucide-react"

interface Guest {
  id: string
  full_name: string
  email: string
  phone: string
  id_type: string
}

export default function GuestsPage() {
  const [guests, setGuests] = useState<Guest[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    fetchGuests()
  }, [])

  const fetchGuests = async () => {
    try {
      // First get the authenticated user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.error("User not authenticated");
        return;
      }

      // Get the user's properties first
      const { data: propertiesData, error: propertiesError } = await supabase
        .from("properties")
        .select("id")
        .eq("user_id", user.id);

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

      // Get reservations for the user's units
      const { data: reservationsData, error: reservationsError } = await supabase
        .from("reservations")
        .select("guest_id, guest_name, guest_email")
        .in("unit_id", unitIds);

      if (reservationsError) {
        console.error("Error fetching reservations:", reservationsError);
        return;
      }

      if (!reservationsData || reservationsData.length === 0) {
        // If the user has no reservations, return empty guests
        setGuests([]);
        return;
      }

      // Extract unique guest IDs from reservations
      const guestIds = [...new Set(reservationsData.map(res => res.guest_id).filter(id => id))];

      // Get guest details if there are guest IDs
      let guestDetails = [];
      if (guestIds.length > 0) {
        const { data: guestsData, error: guestsError } = await supabase
          .from("guests")
          .select("*")
          .in("id", guestIds);

        if (guestsError) {
          console.error("Error fetching guest details:", guestsError);
        } else {
          guestDetails = guestsData || [];
        }
      }

      // If no guests found in the guests table, use guest info from reservations
      if (guestDetails.length === 0) {
        // Create guest-like objects from reservation data
        const guestsFromReservations = [...new Set(reservationsData.map(res => res.guest_name).filter(name => name))]
          .map((name, index) => {
            const res = reservationsData.find(r => r.guest_name === name);
            return {
              id: `res-${index}`, // Create a temporary ID
              full_name: res?.guest_name || name,
              email: res?.guest_email || '',
              phone: '',
              id_type: ''
            };
          });

        setGuests(guestsFromReservations);
      } else {
        setGuests(guestDetails);
      }
    } catch (error) {
      console.error("Error fetching guests:", error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Guests</h1>
        <Button className="gap-2">
          <Plus className="w-4 h-4" />
          Add Guest
        </Button>
      </div>

      {isLoading ? (
        <p>Loading guests...</p>
      ) : guests.length === 0 ? (
        <Card className="text-center py-12">
          <p className="text-muted-foreground">No guests registered yet</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {guests.map((guest) => (
            <Card key={guest.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle className="text-lg">{guest.full_name}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="w-4 h-4 text-muted-foreground" />
                    <span className="text-muted-foreground">{guest.email}</span>
                  </div>
                  {guest.phone && (
                    <div className="flex items-center gap-2 text-sm">
                      <Phone className="w-4 h-4 text-muted-foreground" />
                      <span className="text-muted-foreground">{guest.phone}</span>
                    </div>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="flex-1 gap-1 bg-transparent">
                    <Edit className="w-3 h-3" />
                    Edit
                  </Button>
                  <Button variant="destructive" size="sm" className="flex-1 gap-1">
                    <Trash2 className="w-3 h-3" />
                    Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
