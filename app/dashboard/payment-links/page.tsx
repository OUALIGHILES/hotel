"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Plus, Copy, Trash2, Eye } from "lucide-react"

// Payment links might be related to reservations or invoices
// Since there's no payment_links table in the schema, I'll create a structure based on reservations
interface PaymentLink {
  id: string
  reservation_id: string
  payment_link: string
  amount: number
  status: string
  created_at: string
}

export default function PaymentLinksPage() {
  const [links, setLinks] = useState<PaymentLink[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    fetchPaymentLinks()
  }, [])

  const fetchPaymentLinks = async () => {
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
        // If the user has no properties, return empty links
        setLinks([]);
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
        // If the user has no units, return empty links
        setLinks([]);
        return;
      }

      const unitIds = unitsData.map(unit => unit.id);

      // Get reservations for the user's units
      const { data: reservationsData, error: reservationsError } = await supabase
        .from("reservations")
        .select("id, total_price, status, created_at")
        .in("unit_id", unitIds);

      if (reservationsError) {
        console.error("Error fetching reservations:", reservationsError);
        return;
      }

      // Since there's no payment_links table in the schema, I'll simulate payment links
      // based on reservations that need payment
      if (reservationsData) {
        const simulatedLinks = reservationsData
          .filter(res => res.status === 'pending') // Only create links for pending reservations
          .map((res, index) => ({
            id: res.id,
            reservation_id: res.id,
            payment_link: `https://pay.pms.com/link/${res.id.substring(0, 8)}`,
            amount: res.total_price,
            status: res.status === 'pending' ? 'pending' : 'paid',
            created_at: res.created_at
          }));

        setLinks(simulatedLinks);
      }
    } catch (error) {
      console.error("Error fetching payment links:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Payment Links</h1>
        <Button className="gap-2">
          <Plus className="w-4 h-4" />
          Create Payment Link
        </Button>
      </div>

      {isLoading ? (
        <p>Loading payment links...</p>
      ) : links.length === 0 ? (
        <Card className="text-center py-12">
          <p className="text-muted-foreground">No payment links created yet</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {links.map((link) => (
            <Card key={link.id} className="hover:shadow-lg transition-shadow">
              <CardContent className="p-6 flex items-center justify-between">
                <div className="flex-1">
                  <p className="font-semibold">Reservation {link.reservation_id.substring(0, 8)}</p>
                  <p
                    className="text-sm text-muted-foreground font-mono text-xs mt-1 truncate cursor-pointer"
                    onClick={() => copyToClipboard(link.payment_link)}
                  >
                    {link.payment_link}
                  </p>
                  <p className="text-sm mt-2">Amount: ${link.amount}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-medium ${
                      link.status === "paid" ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"
                    }`}
                  >
                    {link.status}
                  </span>
                  <Button variant="ghost" size="sm" onClick={() => copyToClipboard(link.payment_link)}>
                    <Copy className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="sm">
                    <Eye className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="sm">
                    <Trash2 className="w-4 h-4 text-red-500" />
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
