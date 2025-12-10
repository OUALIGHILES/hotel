"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Download, Eye } from "lucide-react"

interface Receipt {
  id: string
  reservation_id: string
  amount: number
  paid_at: string
  payment_method: string
}

export default function ReceiptsPage() {
  const [receipts, setReceipts] = useState<Receipt[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    fetchReceipts()
  }, [])

  const fetchReceipts = async () => {
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
        // If the user has no properties, return empty receipts
        setReceipts([]);
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
        // If the user has no units, return empty receipts
        setReceipts([]);
        return;
      }

      const unitIds = unitsData.map(unit => unit.id);

      // Get reservations for the user's units
      const { data: reservationsData, error: reservationsError } = await supabase
        .from("reservations")
        .select("id")
        .in("unit_id", unitIds);

      if (reservationsError) {
        console.error("Error fetching reservations:", reservationsError);
        return;
      }

      if (!reservationsData || reservationsData.length === 0) {
        // If the user has no reservations, return empty receipts
        setReceipts([]);
        return;
      }

      const reservationIds = reservationsData.map(res => res.id);

      // Get payments for the user's reservations (these are the receipts)
      const { data, error } = await supabase
        .from("payments")
        .select("*")
        .in("reservation_id", reservationIds) // Filter by user's reservation IDs
        .eq("status", "completed") // Only completed payments are receipts
        .order("paid_at", { ascending: false })

      if (error) throw error
      setReceipts(data || [])
    } catch (error) {
      console.error("Error fetching receipts:", error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Receipts</h1>

      {isLoading ? (
        <p>Loading receipts...</p>
      ) : receipts.length === 0 ? (
        <Card className="text-center py-12">
          <p className="text-muted-foreground">No receipts yet</p>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b">
                  <tr>
                    <th className="px-6 py-4 text-left font-medium">Receipt ID</th>
                    <th className="px-6 py-4 text-left font-medium">Reservation</th>
                    <th className="px-6 py-4 text-left font-medium">Amount</th>
                    <th className="px-6 py-4 text-left font-medium">Payment Method</th>
                    <th className="px-6 py-4 text-left font-medium">Date</th>
                    <th className="px-6 py-4 text-left font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {receipts.map((receipt) => (
                    <tr key={receipt.id} className="border-b hover:bg-slate-50">
                      <td className="px-6 py-4 font-semibold">{receipt.id.substring(0, 8)}</td>
                      <td className="px-6 py-4">Reservation {receipt.reservation_id.substring(0, 6)}</td>
                      <td className="px-6 py-4 font-semibold">${receipt.amount}</td>
                      <td className="px-6 py-4">{receipt.payment_method || 'N/A'}</td>
                      <td className="px-6 py-4">{receipt.paid_at ? new Date(receipt.paid_at).toLocaleDateString() : 'N/A'}</td>
                      <td className="px-6 py-4 flex gap-2">
                        <Button variant="ghost" size="sm">
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="sm">
                          <Download className="w-4 h-4" />
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
