"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Plus, Download, Eye } from "lucide-react"

interface Invoice {
  id: string
  reservation_id: string
  invoice_number: string
  amount: number
  status: string
  issued_date: string
}

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    fetchInvoices()
  }, [])

  const fetchInvoices = async () => {
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
        // If the user has no properties, return empty invoices
        setInvoices([]);
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
        // If the user has no units, return empty invoices
        setInvoices([]);
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
        // If the user has no reservations, return empty invoices
        setInvoices([]);
        return;
      }

      const reservationIds = reservationsData.map(res => res.id);

      // Get invoices for the user's reservations
      const { data, error } = await supabase
        .from("invoices")
        .select("*")
        .in("reservation_id", reservationIds) // Filter by user's reservation IDs
        .order("issued_date", { ascending: false })

      if (error) throw error
      setInvoices(data || [])
    } catch (error) {
      console.error("Error fetching invoices:", error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Invoices</h1>
        <Button className="gap-2">
          <Plus className="w-4 h-4" />
          Create Invoice
        </Button>
      </div>

      {isLoading ? (
        <p>Loading invoices...</p>
      ) : invoices.length === 0 ? (
        <Card className="text-center py-12">
          <p className="text-muted-foreground">No invoices yet</p>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b">
                  <tr>
                    <th className="px-6 py-4 text-left font-medium">Invoice ID</th>
                    <th className="px-6 py-4 text-left font-medium">Reservation</th>
                    <th className="px-6 py-4 text-left font-medium">Amount</th>
                    <th className="px-6 py-4 text-left font-medium">Status</th>
                    <th className="px-6 py-4 text-left font-medium">Date</th>
                    <th className="px-6 py-4 text-left font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.map((inv) => (
                    <tr key={inv.id} className="border-b hover:bg-slate-50">
                      <td className="px-6 py-4 font-semibold">{inv.invoice_number}</td>
                      <td className="px-6 py-4">Reservation {inv.reservation_id.substring(0, 6)}</td>
                      <td className="px-6 py-4 font-semibold">${inv.amount}</td>
                      <td className="px-6 py-4">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-medium ${
                            inv.status === "paid"
                              ? "bg-green-100 text-green-800"
                              : inv.status === "pending"
                                ? "bg-yellow-100 text-yellow-800"
                                : "bg-red-100 text-red-800"
                          }`}
                        >
                          {inv.status}
                        </span>
                      </td>
                      <td className="px-6 py-4">{new Date(inv.issued_date).toLocaleDateString()}</td>
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
