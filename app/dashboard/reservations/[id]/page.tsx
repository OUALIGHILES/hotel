"use client";

import { useState, useEffect, use } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { ArrowLeft, Check, X, Calendar, User, Mail, Phone, CreditCard, DollarSign, Eye, Printer } from "lucide-react";

interface Reservation {
  id: string;
  unit_id: string;
  guest_id: string;
  guest_name: string;
  guest_email: string;
  guest_phone: string;
  check_in_date: string;
  check_out_date: string;
  status: string;
  special_requests: string;
  total_price: number;
  payment_status: string;
  created_at: string;
}

export default function ReservationDetailsPage({ params }: { params: { id: string } }) {
  const [reservation, setReservation] = useState<Reservation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();
  const id = use(params).id;

  useEffect(() => {
    if (id) {
      fetchReservation(id);
    }
  }, [id]);

  const fetchReservation = async (reservationId: string) => {
    try {
      setLoading(true);

      // First, verify the user is authenticated
      const response = await fetch("/api/auth/check");
      if (!response.ok) {
        router.push("/auth/login");
        return;
      }

      const result = await response.json();
      if (!result.user) {
        router.push("/auth/login");
        return;
      }

      const userId = result.user.id;
      if (!userId) {
        router.push("/auth/login");
        return;
      }

      // Get the user's properties first
      const { data: propertiesData, error: propertiesError } = await supabase
        .from("properties")
        .select("id")
        .eq("user_id", userId);

      if (propertiesError) {
        console.error("Error fetching properties:", propertiesError);
        setError("Error fetching reservation");
        return;
      }

      if (!propertiesData || propertiesData.length === 0) {
        setError("No properties found for user");
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
        setError("Error fetching reservation");
        return;
      }

      if (!unitsData || unitsData.length === 0) {
        setError("No units found for user");
        return;
      }

      const unitIds = unitsData.map(unit => unit.id);

      // Get the specific reservation
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
        .in("unit_id", unitIds) // Ensure it's for the user's units
        .eq("id", reservationId)
        .single();

      if (error) {
        console.error("Error fetching reservation:", error);
        setError("Reservation not found");
        return;
      }

      setReservation(data);
    } catch (err) {
      console.error("Unexpected error:", err);
      setError("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  const updateReservationStatus = async (newStatus: string) => {
    if (!reservation) return;

    try {
      const { error } = await supabase
        .from("reservations")
        .update({ status: newStatus })
        .eq("id", reservation.id);

      if (error) throw error;

      // Update local state
      setReservation({ ...reservation, status: newStatus });
      
      // Show success message
      alert(`Reservation status updated to ${newStatus}`);
    } catch (error) {
      console.error("Error updating reservation status:", error);
      alert("Error updating reservation status. Please try again.");
    }
  };

  const printReservation = (reservation: Reservation) => {
    // Create a new window with printable reservation details
    const printWindow = window.open('', '_blank');
    if (printWindow && reservation) {
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Reservation Details - ${reservation.id.slice(0, 8)}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 20px; }
            .details { margin: 15px 0; }
            .label { font-weight: bold; display: inline-block; width: 150px; }
            .value { display: inline-block; }
            .footer { margin-top: 30px; text-align: center; font-style: italic; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Reservation Details</h1>
          </div>

          <div class="details">
            <div><span class="label">Reservation ID:</span> <span class="value">${reservation.id}</span></div>
            <div><span class="label">Guest Name:</span> <span class="value">${reservation.guest_name}</span></div>
            <div><span class="label">Email:</span> <span class="value">${reservation.guest_email}</span></div>
            <div><span class="label">Phone:</span> <span class="value">${reservation.guest_phone}</span></div>
            <div><span class="label">Check-in Date:</span> <span class="value">${new Date(reservation.check_in_date).toLocaleDateString()}</span></div>
            <div><span class="label">Check-out Date:</span> <span class="value">${new Date(reservation.check_out_date).toLocaleDateString()}</span></div>
            <div><span class="label">Total Price:</span> <span class="value">$${reservation.total_price.toFixed(2)}</span></div>
            <div><span class="label">Status:</span> <span class="value">${reservation.status}</span></div>
            <div><span class="label">Payment Status:</span> <span class="value">${reservation.payment_status}</span></div>
            <div><span class="label">Special Requests:</span> <span class="value">${reservation.special_requests || 'None'}</span></div>
          </div>

          <div class="footer">
            <p>Generated on ${new Date().toLocaleString()}</p>
          </div>
        </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.focus();
      printWindow.print();
      printWindow.close();
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6">
        <div className="w-8 h-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
        <span className="text-foreground">Loading reservation details...</span>
      </div>
    );
  }

  if (error || !reservation) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6">
        <X className="w-12 h-12 text-red-500" />
        <h2 className="text-2xl font-bold text-center text-foreground">Error</h2>
        <p className="text-muted-foreground text-center max-w-md">
          {error || "Reservation not found"}
        </p>
        <Button onClick={() => router.back()}>Go Back</Button>
      </div>
    );
  }

  const statusColors = {
    pending: "bg-yellow-100 text-yellow-800",
    confirmed: "bg-blue-100 text-blue-800",
    checked_in: "bg-green-100 text-green-800",
    checked_out: "bg-gray-100 text-gray-800",
    cancelled: "bg-red-100 text-red-800",
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" onClick={() => router.back()}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <h1 className="text-3xl font-bold text-foreground">Reservation Details</h1>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => printReservation(reservation)}
          >
            <Printer className="w-4 h-4 mr-2" />
            Print
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => {
              // View reservation details (placeholder - already on details page)
              console.log('View reservation details');
            }}
          >
            <Eye className="w-4 h-4 mr-2" />
            View
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 border rounded-xl shadow-lg">
          <CardContent className="p-6 space-y-6">
            <div className="flex items-start gap-4">
              <div className="bg-primary/10 p-3 rounded-lg">
                <User className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-foreground">Guest Information</h2>
                <p className="text-lg font-medium text-foreground">{reservation.guest_name}</p>
                <div className="mt-2 space-y-1">
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-muted-foreground" />
                    <span className="text-foreground">{reservation.guest_email}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-muted-foreground" />
                    <span className="text-foreground">{reservation.guest_phone}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="bg-primary/10 p-3 rounded-lg">
                <Calendar className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-foreground">Stay Details</h2>
                <div className="mt-2 grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Check-in</p>
                    <p className="font-medium text-foreground">{new Date(reservation.check_in_date).toLocaleDateString()}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Check-out</p>
                    <p className="font-medium text-foreground">{new Date(reservation.check_out_date).toLocaleDateString()}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="bg-primary/10 p-3 rounded-lg">
                <DollarSign className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-foreground">Payment Information</h2>
                <div className="mt-2 grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Price</p>
                    <p className="font-medium text-foreground">${reservation.total_price.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Payment Status</p>
                    <span
                      className={`px-3 py-1 rounded-full text-sm font-medium ${
                        reservation.payment_status === "paid"
                          ? "bg-green-500/20 text-green-600 dark:text-green-400 border border-green-500/30"
                          : "bg-red-500/20 text-red-600 dark:text-red-400 border border-red-500/30"
                      }`}
                    >
                      {reservation.payment_status}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {reservation.special_requests && (
              <div className="flex items-start gap-4">
                <div className="bg-primary/10 p-3 rounded-lg">
                  <User className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-foreground">Special Requests</h2>
                  <p className="text-foreground mt-2">{reservation.special_requests}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="border rounded-xl shadow-lg">
            <CardContent className="p-6">
              <h2 className="text-xl font-semibold text-foreground mb-4">Reservation ID</h2>
              <p className="font-mono text-foreground break-all">{reservation.id}</p>
            </CardContent>
          </Card>

          <Card className="border rounded-xl shadow-lg">
            <CardContent className="p-6">
              <h2 className="text-xl font-semibold text-foreground mb-4">Status</h2>
              <div className="flex items-center justify-between">
                <span
                  className={`px-3 py-1 rounded-full text-sm font-medium ${
                    reservation.status === "pending"
                      ? "bg-yellow-500/20 text-yellow-600 dark:text-yellow-400 border border-yellow-500/30"
                      : reservation.status === "confirmed"
                        ? "bg-blue-500/20 text-blue-600 dark:text-blue-400 border border-blue-500/30"
                        : reservation.status === "checked_in"
                          ? "bg-green-500/20 text-green-600 dark:text-green-400 border border-green-500/30"
                          : reservation.status === "checked_out"
                            ? "bg-gray-500/20 text-gray-600 dark:text-gray-400 border border-gray-500/30"
                            : "bg-red-500/20 text-red-600 dark:text-red-400 border border-red-500/30"
                  }`}
                >
                  {reservation.status}
                </span>
              </div>
            </CardContent>
          </Card>

          <Card className="border rounded-xl shadow-lg">
            <CardContent className="p-6">
              <h2 className="text-xl font-semibold text-foreground mb-4">Update Status</h2>
              <div className="space-y-3">
                {reservation.status !== 'checked_in' && (
                  <Button
                    className="w-full"
                    variant={reservation.status === 'checked_in' ? 'default' : 'outline'}
                    onClick={() => updateReservationStatus('checked_in')}
                  >
                    <Check className="w-4 h-4 mr-2" />
                    Check In
                  </Button>
                )}
                {reservation.status !== 'checked_out' && (
                  <Button
                    className="w-full"
                    variant={reservation.status === 'checked_out' ? 'default' : 'outline'}
                    onClick={() => updateReservationStatus('checked_out')}
                  >
                    <Check className="w-4 h-4 mr-2" />
                    Check Out
                  </Button>
                )}
                {reservation.status !== 'confirmed' && reservation.status !== 'checked_in' && reservation.status !== 'checked_out' && (
                  <Button
                    className="w-full"
                    variant={reservation.status === 'confirmed' ? 'default' : 'outline'}
                    onClick={() => updateReservationStatus('confirmed')}
                  >
                    <Check className="w-4 h-4 mr-2" />
                    Confirm
                  </Button>
                )}
                {reservation.status !== 'cancelled' && (
                  <Button
                    className="w-full"
                    variant="destructive"
                    onClick={() => {
                      if (window.confirm("Are you sure you want to cancel this reservation?")) {
                        updateReservationStatus('cancelled');
                      }
                    }}
                  >
                    <X className="w-4 h-4 mr-2" />
                    Cancel
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}