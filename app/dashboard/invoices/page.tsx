"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Plus, Download, Eye, Lock } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useRouter } from "next/navigation"

interface Invoice {
  id: string
  reservation_id: string
  property_id: string
  invoice_number: string
  amount: number
  tax_amount: number
  status: string
  issued_date: string
  due_date: string
  created_at: string
  property_name?: string
  guest_name?: string
}

interface Reservation {
  id: string;
  guest_name: string;
  check_in_date: string;
  check_out_date: string;
  unit_id: string;
}

interface Property {
  id: string;
  name: string;
}

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isAuthenticated, setIsAuthenticated] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [reservations, setReservations] = useState<Reservation[]>([])
  const [properties, setProperties] = useState<Property[]>([])
  const [newInvoice, setNewInvoice] = useState({
    reservation_id: "",
    invoice_number: "",
    amount: "",
    tax_amount: "",
    status: "draft",
    issued_date: "",
    due_date: ""
  })
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    fetchInvoices()
  }, [])

  const fetchInvoices = async () => {
    try {
      // Check if user is authenticated using the same method as other pages
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

      // Get invoices with property and reservation (guest) information using joins
      const { data, error } = await supabase
        .from("invoices")
        .select(`
          id,
          reservation_id,
          property_id,
          invoice_number,
          amount,
          tax_amount,
          status,
          issued_date,
          due_date,
          created_at,
          properties:name,
          reservations:guest_name
        `)
        .eq("properties.user_id", userId)
        .order("issued_date", { ascending: false })

      if (error) throw error

      // Transform the data to match our interface
      const transformedInvoices = (data || []).map(inv => ({
        id: inv.id,
        reservation_id: inv.reservation_id,
        property_id: inv.property_id,
        invoice_number: inv.invoice_number,
        amount: inv.amount,
        tax_amount: inv.tax_amount,
        status: inv.status,
        issued_date: inv.issued_date,
        due_date: inv.due_date,
        created_at: inv.created_at,
        property_name: inv.properties?.name,
        guest_name: inv.reservations?.guest_name
      }))

      setInvoices(transformedInvoices)
    } catch (error) {
      console.error("Error fetching invoices:", error)
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false)
    }
  }

  // Function to handle creating new invoices
  const navigateToCreateInvoice = () => {
    // This would navigate to an invoice creation form
    // For now, we'll show an alert, but in a real implementation
    // this would open a form with reservation selection, invoice details, etc.
    alert("Create Invoice functionality would be implemented here");
  }

  // Function to fetch reservations for the modal
  const fetchReservationsForInvoiceCreation = async () => {
    try {
      // Check if user is authenticated using the same method as other pages
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

      const { data, error } = await supabase
        .from("properties")
        .select(`
          id,
          name,
          units (
            id,
            reservations (
              id,
              guest_name,
              check_in_date,
              check_out_date,
              status
            )
          )
        `)
        .eq("user_id", userId);

      if (error) throw error;

      // Flatten reservations from the nested structure
      const allReservations: Reservation[] = [];
      const allProperties: Property[] = [];

      data?.forEach(property => {
        allProperties.push({
          id: property.id,
          name: property.name
        });

        property.units?.forEach(unit => {
          unit.reservations?.forEach(reservation => {
            allReservations.push({
              id: reservation.id,
              guest_name: reservation.guest_name,
              check_in_date: reservation.check_in_date,
              check_out_date: reservation.check_out_date,
              unit_id: unit.id
            });
          });
        });
      });

      setReservations(allReservations);
      setProperties(allProperties);
    } catch (error) {
      console.error("Error fetching reservations:", error);
      setIsAuthenticated(false);
    }
  };

  const handleCreateInvoice = async () => {
    // Validate required fields
    if (!newInvoice.reservation_id || !newInvoice.invoice_number || !newInvoice.amount) {
      alert("Please fill in all required fields (Reservation, Invoice Number, Amount)");
      return;
    }

    try {
      // Check if user is authenticated using the same method as other pages
      const response = await fetch("/api/auth/check");
      if (!response.ok) {
        setIsAuthenticated(false);
        alert("Authentication error. Please log in again.");
        return;
      }

      const result = await response.json();
      if (!result.user) {
        setIsAuthenticated(false);
        alert("Authentication error. Please log in again.");
        return;
      }

      const userId = result.user.id;
      if (!userId) {
        setIsAuthenticated(false);
        alert("Authentication error. Please log in again.");
        return;
      }

      // Verify that the reservation belongs to the user's properties
      const { data: reservationData, error: reservationError } = await supabase
        .from("reservations")
        .select(`
          id,
          unit_id
        `)
        .eq("id", newInvoice.reservation_id)
        .single();

      if (reservationError) throw reservationError;

      // Check if the unit belongs to a property owned by the user
      const { data: unitData, error: unitError } = await supabase
        .from("units")
        .select("property_id")
        .eq("id", reservationData.unit_id)
        .single();

      if (unitError) throw unitError;

      // Verify the property belongs to the user
      const { data: propertyData, error: propertyError } = await supabase
        .from("properties")
        .select("id")
        .eq("id", unitData.property_id)
        .eq("user_id", userId)
        .single();

      if (propertyError || !propertyData) {
        console.error("User does not own this property:", propertyError);
        alert("Invalid reservation selection. Please select a reservation for your property.");
        return;
      }

      // Create the invoice
      const invoiceToInsert = {
        reservation_id: newInvoice.reservation_id,
        property_id: unitData.property_id,
        invoice_number: newInvoice.invoice_number,
        amount: parseFloat(newInvoice.amount),
        tax_amount: newInvoice.tax_amount ? parseFloat(newInvoice.tax_amount) : 0,
        status: newInvoice.status,
        issued_date: newInvoice.issued_date || null,
        due_date: newInvoice.due_date || null,
      };

      const { error } = await supabase
        .from("invoices")
        .insert([invoiceToInsert]);

      if (error) throw error;

      // Reset form and close modal
      setNewInvoice({
        reservation_id: "",
        invoice_number: "",
        amount: "",
        tax_amount: "",
        status: "draft",
        issued_date: "",
        due_date: ""
      });
      setIsModalOpen(false);

      // Refetch invoices
      fetchInvoices();
    } catch (error) {
      console.error("Error creating invoice:", error);
      alert("Error creating invoice. Please try again.");
    }
  };

  // Handle modal open
  const handleModalOpenChange = (open: boolean) => {
    setIsModalOpen(open);
    if (open) {
      // Load reservations when modal opens
      fetchReservationsForInvoiceCreation();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Invoices</h1>
        <Dialog open={isModalOpen} onOpenChange={handleModalOpenChange}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              Create Invoice
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Create New Invoice</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="reservation">Reservation</Label>
                <Select value={newInvoice.reservation_id} onValueChange={(value) => setNewInvoice({...newInvoice, reservation_id: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select reservation" />
                  </SelectTrigger>
                  <SelectContent>
                    {reservations.map(reservation => (
                      <SelectItem key={reservation.id} value={reservation.id}>
                        {reservation.guest_name} - {reservation.check_in_date} to {reservation.check_out_date}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="invoice_number">Invoice Number</Label>
                <Input
                  id="invoice_number"
                  value={newInvoice.invoice_number}
                  onChange={(e) => setNewInvoice({...newInvoice, invoice_number: e.target.value})}
                  placeholder="INV-001"
                />
              </div>
              <div>
                <Label htmlFor="amount">Amount</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  value={newInvoice.amount}
                  onChange={(e) => setNewInvoice({...newInvoice, amount: e.target.value})}
                  placeholder="0.00"
                />
              </div>
              <div>
                <Label htmlFor="tax_amount">Tax Amount (Optional)</Label>
                <Input
                  id="tax_amount"
                  type="number"
                  step="0.01"
                  value={newInvoice.tax_amount}
                  onChange={(e) => setNewInvoice({...newInvoice, tax_amount: e.target.value})}
                  placeholder="0.00"
                />
              </div>
              <div>
                <Label htmlFor="status">Status</Label>
                <Select value={newInvoice.status} onValueChange={(value) => setNewInvoice({...newInvoice, status: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="sent">Sent</SelectItem>
                    <SelectItem value="paid">Paid</SelectItem>
                    <SelectItem value="overdue">Overdue</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="issued_date">Issued Date</Label>
                <Input
                  id="issued_date"
                  type="date"
                  value={newInvoice.issued_date}
                  onChange={(e) => setNewInvoice({...newInvoice, issued_date: e.target.value})}
                />
              </div>
              <div>
                <Label htmlFor="due_date">Due Date</Label>
                <Input
                  id="due_date"
                  type="date"
                  value={newInvoice.due_date}
                  onChange={(e) => setNewInvoice({...newInvoice, due_date: e.target.value})}
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
                Cancel
              </Button>
              <Button type="button" onClick={handleCreateInvoice}>
                Create Invoice
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
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
                    <th className="px-6 py-4 text-left font-medium">Invoice #</th>
                    <th className="px-6 py-4 text-left font-medium">Guest</th>
                    <th className="px-6 py-4 text-left font-medium">Property</th>
                    <th className="px-6 py-4 text-left font-medium">Amount</th>
                    <th className="px-6 py-4 text-left font-medium">Status</th>
                    <th className="px-6 py-4 text-left font-medium">Issued Date</th>
                    <th className="px-6 py-4 text-left font-medium">Due Date</th>
                    <th className="px-6 py-4 text-left font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.map((inv) => (
                    <tr key={inv.id} className="border-b hover:bg-slate-50">
                      <td className="px-6 py-4 font-semibold">{inv.invoice_number}</td>
                      <td className="px-6 py-4">{inv.guest_name || "N/A"}</td>
                      <td className="px-6 py-4">{inv.property_name || "N/A"}</td>
                      <td className="px-6 py-4 font-semibold">${inv.amount} {inv.tax_amount && inv.tax_amount > 0 ? `+ $${inv.tax_amount} tax` : ''}</td>
                      <td className="px-6 py-4">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-medium ${
                            inv.status === "paid"
                              ? "bg-green-100 text-green-800"
                              : inv.status === "sent"
                                ? "bg-blue-100 text-blue-800"
                                : inv.status === "pending"
                                  ? "bg-yellow-100 text-yellow-800"
                                  : inv.status === "overdue"
                                    ? "bg-red-100 text-red-800"
                                    : "bg-gray-100 text-gray-800"
                          }`}
                        >
                          {inv.status}
                        </span>
                      </td>
                      <td className="px-6 py-4">{inv.issued_date ? new Date(inv.issued_date).toLocaleDateString() : "N/A"}</td>
                      <td className="px-6 py-4">{inv.due_date ? new Date(inv.due_date).toLocaleDateString() : "N/A"}</td>
                      <td className="px-6 py-4 flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => router.push(`/dashboard/invoices/${inv.id}`)}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => downloadInvoice(inv.id)}
                        >
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

  // Function to handle downloading an invoice
  const downloadInvoice = async (invoiceId: string) => {
    // In a real implementation, this would:
    // 1. Generate a PDF of the invoice
    // 2. Provide a download link
    // For now, we'll simulate this by showing an alert
    alert(`Download functionality for invoice ${invoiceId} would be implemented here`);
  }

  // Show authentication error message if not authenticated
  if (!isAuthenticated) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6">
        <Lock className="w-12 h-12 text-amber-500" />
        <h2 className="text-2xl font-bold text-center">Access Denied</h2>
        <p className="text-gray-600 text-center max-w-md">
          You are not authenticated. Please log in to access your invoices.
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

}
