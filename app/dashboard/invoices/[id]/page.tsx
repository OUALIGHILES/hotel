"use client"

import React, { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useRouter } from "next/navigation"
import { ArrowLeft, Download, Mail, Printer, User, Home, Calendar, DollarSign } from "lucide-react"

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
  guest_email?: string
  check_in_date?: string
  check_out_date?: string
  number_of_nights?: number
  nightly_rate?: number
  cleaning_fee?: number
  extra_guest_fee?: number
  additional_services?: string
  vat_percentage?: number
  tourism_fee?: number
  amount_paid?: number
  outstanding_balance?: number
  payment_method?: string
  // Payment tracking fields
  transaction_id?: string
  payment_gateway?: string
  account_number?: string
  transfer_reference?: string
  terminal_id?: string
  receipt_number?: string
  payment_notes?: string
  payment_reference?: string
}

export default function InvoiceDetailsPage({ params }: { params: { id: string } }) {
  const [invoice, setInvoice] = useState<Invoice | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [paymentFieldValues, setPaymentFieldValues] = useState({
    transaction_id: "",
    payment_gateway: "",
    account_number: "",
    transfer_reference: "",
    terminal_id: "",
    receipt_number: "",
    payment_notes: "",
    payment_reference: ""
  })
  const router = useRouter()
  const supabase = createClient()
  const id = React.use(params).id

  useEffect(() => {
    if (id) {
      fetchInvoice(id)
    }
  }, [id])

  const fetchInvoice = async (invoiceId: string) => {
    try {
      setLoading(true)

      // Check authentication
      const response = await fetch("/api/auth/check")
      if (!response.ok) {
        router.push("/auth/login")
        return
      }

      const result = await response.json()
      if (!result.user) {
        router.push("/auth/login")
        return
      }

      const userId = result.user.id
      if (!userId) {
        router.push("/auth/login")
        return
      }

      // Get user's properties
      const { data: propertiesData, error: propertiesError } = await supabase
        .from("properties")
        .select("id")
        .eq("user_id", userId)

      if (propertiesError) throw propertiesError

      if (!propertiesData || propertiesData.length === 0) {
        setError("No authorized properties found")
        return
      }

      const propertyIds = propertiesData.map(prop => prop.id)

      // Get the specific invoice
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
          amount_paid,
          outstanding_balance,
          payment_method,
          nightly_rate,
          number_of_nights,
          cleaning_fee,
          extra_guest_fee,
          additional_services,
          vat_percentage,
          tourism_fee,
          transaction_id,
          payment_gateway,
          account_number,
          transfer_reference,
          terminal_id,
          receipt_number,
          payment_notes,
          payment_reference,
          properties (name),
          reservations (guest_name, guest_email, check_in_date, check_out_date)
        `)
        .in("property_id", propertyIds)
        .eq("id", invoiceId)  // Use the function parameter instead of the component param
        .single()

      if (error) {
        console.error("Error fetching invoice:", error);
        setError("Error fetching invoice data. Please try again later.");
        return;
      }

      if (!data) {
        setError("Invoice not found");
        return;
      }

      // Calculate number of nights if not available
      let nights = data.number_of_nights
      if (!nights && data.reservations?.check_in_date && data.reservations?.check_out_date) {
        const checkIn = new Date(data.reservations.check_in_date)
        const checkOut = new Date(data.reservations.check_out_date)
        nights = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24))
      }

      // Calculate balance if not provided
      let balance = data.outstanding_balance
      if (balance === undefined && data.amount && data.amount_paid !== undefined) {
        balance = data.amount - data.amount_paid
      }

      // Set invoice with calculated values
      setInvoice({
        ...data,
        number_of_nights: nights,
        outstanding_balance: balance,
        property_name: data.properties?.name,
        guest_name: data.reservations?.guest_name,
        guest_email: data.reservations?.guest_email,
        check_in_date: data.reservations?.check_in_date,
        check_out_date: data.reservations?.check_out_date,
      })

      // Initialize payment field values
      setPaymentFieldValues({
        transaction_id: data.transaction_id || "",
        payment_gateway: data.payment_gateway || "",
        account_number: data.account_number || "",
        transfer_reference: data.transfer_reference || "",
        terminal_id: data.terminal_id || "",
        receipt_number: data.receipt_number || "",
        payment_notes: data.payment_notes || "",
        payment_reference: data.payment_reference || ""
      })
    } catch (error) {
      console.error("Error fetching invoice:", error)
      setError("Error fetching invoice")
    } finally {
      setLoading(false)
    }
  }

  const updatePaymentField = async (field: string, value: string) => {
    if (!invoice) return

    try {
      const updateObj: any = { [field]: value }
      const { error } = await supabase
        .from("invoices")
        .update(updateObj)
        .eq("id", invoice.id)

      if (error) throw error

      // Update local state
      setInvoice({ ...invoice, [field]: value })
    } catch (error) {
      console.error(`Error updating ${field}:`, error)
      alert(`Error updating ${field}`)
    }
  }

  const printInvoice = () => {
    if (!invoice) return
    
    const printWindow = window.open('', '_blank')
    if (printWindow && invoice) {
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Invoice ${invoice.invoice_number}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 20px; }
            .invoice-info { display: flex; justify-content: space-between; margin-bottom: 20px; }
            .billing-details { margin-bottom: 20px; }
            .table { width: 100%; border-collapse: collapse; margin: 20px 0; }
            .table th, .table td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            .table th { background-color: #f2f2f2; }
            .totals { text-align: right; margin-top: 20px; }
            .footer { margin-top: 40px; text-align: center; font-style: italic; }
            .status-badge { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 12px; }
            .paid { background-color: #d1fae5; color: #166534; }
            .unpaid { background-color: #fee2e2; color: #dc2626; }
            .partial { background-color: #fef3c7; color: #92400e; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>INVOICE</h1>
            <h2>${invoice.property_name || 'Property'}</h2>
          </div>

          <div class="invoice-info">
            <div>
              <h3>Bill To:</h3>
              <p>${invoice.guest_name || 'Guest Name'}</p>
              <p>${invoice.guest_email || 'Email not available'}</p>
            </div>
            <div>
              <p><strong>Invoice #: </strong>${invoice.invoice_number}</p>
              <p><strong>Date Issued: </strong>${new Date(invoice.issued_date).toLocaleDateString()}</p>
              <p><strong>Due Date: </strong>${invoice.due_date ? new Date(invoice.due_date).toLocaleDateString() : 'N/A'}</p>
              <p><strong>Status: </strong><span class="status-badge ${invoice.status === 'paid' ? 'paid' : invoice.status === 'partial' ? 'partial' : 'unpaid'}">${invoice.status}</span></p>
            </div>
          </div>

          <div class="billing-details">
            <h3>Stay Details:</h3>
            <p><strong>Check-in: </strong>${new Date(invoice.check_in_date).toLocaleDateString()}</p>
            <p><strong>Check-out: </strong>${new Date(invoice.check_out_date).toLocaleDateString()}</p>
            <p><strong>Nights: </strong>${invoice.number_of_nights || 'N/A'}</p>
          </div>

          <table class="table">
            <thead>
              <tr>
                <th>Description</th>
                <th>Qty</th>
                <th>Rate</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              ${invoice.nightly_rate && invoice.number_of_nights ? `
              <tr>
                <td>Accommodation (${invoice.number_of_nights} nights @ $${invoice.nightly_rate.toFixed(2)}/night)</td>
                <td>${invoice.number_of_nights}</td>
                <td>$${invoice.nightly_rate.toFixed(2)}</td>
                <td>$${(invoice.nightly_rate * invoice.number_of_nights).toFixed(2)}</td>
              </tr>` : ''}
              ${invoice.cleaning_fee ? `
              <tr>
                <td>Cleaning Fee</td>
                <td>1</td>
                <td>$${invoice.cleaning_fee.toFixed(2)}</td>
                <td>$${invoice.cleaning_fee.toFixed(2)}</td>
              </tr>` : ''}
              ${invoice.extra_guest_fee ? `
              <tr>
                <td>Extra Guest Fee</td>
                <td>1</td>
                <td>$${invoice.extra_guest_fee.toFixed(2)}</td>
                <td>$${invoice.extra_guest_fee.toFixed(2)}</td>
              </tr>` : ''}
              ${invoice.additional_services ? `
              <tr>
                <td>Additional Services</td>
                <td>1</td>
                <td>$${(parseFloat(invoice.additional_services) || 0).toFixed(2)}</td>
                <td>$${(parseFloat(invoice.additional_services) || 0).toFixed(2)}</td>
              </tr>` : ''}
            </tbody>
          </table>

          <div class="totals">
            <h3>Totals:</h3>
            <p>Subtotal: $${((invoice.nightly_rate * invoice.number_of_nights) + (invoice.cleaning_fee || 0) + (invoice.extra_guest_fee || 0) + (parseFloat(invoice.additional_services) || 0)).toFixed(2)}</p>
            ${invoice.vat_percentage ? `<p>VAT (${invoice.vat_percentage}%): $${((invoice.amount || 0) * invoice.vat_percentage / 100).toFixed(2)}</p>` : ''}
            ${invoice.tourism_fee ? `<p>Tourism Fee: $${invoice.tourism_fee?.toFixed(2) || '0.00'}</p>` : ''}
            <p><strong>Grand Total: $${(invoice.amount + (invoice.vat_percentage ? invoice.amount * invoice.vat_percentage / 100 : 0) + (invoice.tourism_fee || 0)).toFixed(2)}</strong></p>
            <p>Amount Paid: $${(invoice.amount_paid || 0).toFixed(2)}</p>
            <p><strong>Balance Due: $${(invoice.outstanding_balance || 0).toFixed(2)}</strong></p>
          </div>

          <div class="footer">
            <p>Thank you for your business!</p>
            <p>Generated on ${new Date().toLocaleString()}</p>
          </div>
        </body>
        </html>
      `)
      printWindow.document.close()
      printWindow.focus()
      printWindow.print()
      printWindow.close()
    }
  }

  const sendInvoiceToGuest = () => {
    if (invoice?.guest_email) {
      alert(`Invoice would be sent to: ${invoice.guest_email}`)
    } else {
      alert('No email address available for this guest.')
    }
  }

  const downloadInvoicePDF = () => {
    if (!invoice) return

    const content = `
INVOICE DETAILS
===============

INVOICE #: ${invoice.invoice_number}
PROPERTY: ${invoice.property_name || 'N/A'}
GUEST: ${invoice.guest_name || 'N/A'}

ISSUE DATE: ${new Date(invoice.issued_date).toLocaleDateString()}
DUE DATE: ${invoice.due_date ? new Date(invoice.due_date).toLocaleDateString() : 'N/A'}
STATUS: ${invoice.status.toUpperCase()}

STAY DETAILS:
- Check-in: ${new Date(invoice.check_in_date).toLocaleDateString()}
- Check-out: ${new Date(invoice.check_out_date).toLocaleDateString()}
- Nights: ${invoice.number_of_nights || 'N/A'}

CHARGES:
${invoice.nightly_rate && invoice.number_of_nights ? `- Accommodation (${invoice.number_of_nights} nights @ $${invoice.nightly_rate.toFixed(2)}/night): $${(invoice.nightly_rate * invoice.number_of_nights).toFixed(2)}\n` : ''}
${invoice.cleaning_fee ? `- Cleaning Fee: $${invoice.cleaning_fee.toFixed(2)}\n` : ''}
${invoice.extra_guest_fee ? `- Extra Guest Fee: $${invoice.extra_guest_fee.toFixed(2)}\n` : ''}
${invoice.additional_services ? `- Additional Services: $${(parseFloat(invoice.additional_services) || 0).toFixed(2)}\n` : ''}

TOTAL AMOUNT: $${invoice.amount?.toFixed(2) || '0.00'}
${invoice.vat_percentage ? `VAT (${invoice.vat_percentage}%): $${(invoice.amount * invoice.vat_percentage / 100).toFixed(2)}\n` : ''}
${invoice.tourism_fee ? `Tourism Fee: $${invoice.tourism_fee?.toFixed(2) || '0.00'}\n` : ''}
GRAND TOTAL: $${(invoice.amount + (invoice.vat_percentage ? invoice.amount * invoice.vat_percentage / 100 : 0) + (invoice.tourism_fee || 0)).toFixed(2)}

AMOUNT PAID: $${(invoice.amount_paid || 0).toFixed(2)}
BALANCE DUE: $${(invoice.outstanding_balance || 0).toFixed(2)}
PAYMENT METHOD: ${invoice.payment_method || 'N/A'}

PAYMENT DETAILS:
${invoice.payment_method === 'online' ? `- Transaction ID: ${invoice.transaction_id || 'N/A'}\n- Payment Gateway: ${invoice.payment_gateway || 'N/A'}\n` : ''}
${invoice.payment_method === 'bank_transfer' ? `- Account Number: ${invoice.account_number ? `****${invoice.account_number.slice(-4)}` : 'N/A'}\n- Reference: ${invoice.transfer_reference || 'N/A'}\n` : ''}
${invoice.payment_method === 'pos' ? `- Terminal ID: ${invoice.terminal_id || 'N/A'}\n- Receipt Number: ${invoice.receipt_number || 'N/A'}\n` : ''}
    `

    const blob = new Blob([content], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${invoice?.invoice_number || 'invoice'}_details.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6">
        <div className="w-8 h-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
        <span className="text-foreground">Loading invoice details...</span>
      </div>
    )
  }

  if (error || !invoice) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6">
        <div className="w-12 h-12 text-red-500">✗</div>
        <h2 className="text-2xl font-bold text-center text-foreground">Error</h2>
        <p className="text-muted-foreground text-center max-w-md">
          {error || "Invoice not found"}
        </p>
        <Button onClick={() => router.back()}>Go Back</Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" onClick={() => router.back()}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <h1 className="text-3xl font-bold text-foreground">Invoice #{invoice.invoice_number}</h1>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={sendInvoiceToGuest}>
            <Mail className="w-4 h-4 mr-2" />
            Send to Guest
          </Button>
          <Button variant="outline" size="sm" onClick={printInvoice}>
            <Printer className="w-4 h-4 mr-2" />
            Print
          </Button>
          <Button variant="outline" size="sm" onClick={downloadInvoicePDF}>
            <Download className="w-4 h-4 mr-2" />
            Download
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
                <p className="text-lg font-medium text-foreground">{invoice.guest_name}</p>
                <div className="mt-2 space-y-1">
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-muted-foreground" />
                    <span className="text-foreground">{invoice.guest_email || 'Email not available'}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="bg-primary/10 p-3 rounded-lg">
                <Home className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-foreground">Property Information</h2>
                <p className="text-lg font-medium text-foreground">{invoice.property_name || 'N/A'}</p>
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
                    <p className="font-medium text-foreground">{new Date(invoice.check_in_date).toLocaleDateString()}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Check-out</p>
                    <p className="font-medium text-foreground">{new Date(invoice.check_out_date).toLocaleDateString()}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Nights</p>
                    <p className="font-medium text-foreground">{invoice.number_of_nights || 'N/A'}</p>
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
                    <p className="font-medium text-foreground">${invoice.amount.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Payment Status</p>
                    <span
                      className={`px-3 py-1 rounded-full text-sm font-medium ${
                        invoice.status === "paid"
                          ? "bg-green-500/20 text-green-600 dark:text-green-400 border border-green-500/30"
                          : invoice.status === "partial"
                            ? "bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30"
                            : "bg-red-500/20 text-red-600 dark:text-red-400 border border-red-500/30"
                      }`}
                    >
                      {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
                    </span>
                  </div>
                  {invoice.payment_method && (
                    <>
                      <div>
                        <p className="text-sm text-muted-foreground">Payment Method</p>
                        <p className="font-medium text-foreground capitalize">{invoice.payment_method}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Amount Paid</p>
                        <p className="font-medium text-foreground">${(invoice.amount_paid || 0).toFixed(2)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Balance Due</p>
                        <p className={`font-medium ${invoice.outstanding_balance && invoice.outstanding_balance > 0 ? 'text-red-500' : 'text-foreground'}`}>
                          ${(invoice.outstanding_balance || 0).toFixed(2)}
                        </p>
                      </div>
                    </>
                  )}
                </div>
                
                {/* Payment Method Specific Fields */}
                {invoice.payment_method && (
                  <div className="mt-4 pt-4 border-t border-border">
                    <h3 className="text-lg font-semibold text-foreground mb-2">Payment Details</h3>
                    
                    {invoice.payment_method === "online" && (
                      <div className="space-y-3 p-4 bg-muted rounded-lg">
                        <div className="space-y-2">
                          <Label htmlFor="transaction_id" className="text-foreground">Transaction ID</Label>
                          <Input
                            id="transaction_id"
                            value={paymentFieldValues.transaction_id}
                            onChange={(e) => setPaymentFieldValues({...paymentFieldValues, transaction_id: e.target.value})}
                            onBlur={() => updatePaymentField('transaction_id', paymentFieldValues.transaction_id)}
                            placeholder="Transaction ID from payment processor"
                            className="bg-background"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="payment_gateway" className="text-foreground">Payment Gateway</Label>
                          <select
                            id="payment_gateway"
                            value={paymentFieldValues.payment_gateway}
                            onChange={(e) => setPaymentFieldValues({...paymentFieldValues, payment_gateway: e.target.value})}
                            onBlur={() => updatePaymentField('payment_gateway', paymentFieldValues.payment_gateway)}
                            className="w-full px-4 py-2.5 border rounded-lg bg-background text-foreground"
                          >
                            <option value="">Select Gateway</option>
                            <option value="stripe">Stripe</option>
                            <option value="paypal">PayPal</option>
                            <option value="razorpay">Razorpay</option>
                            <option value="other">Other</option>
                          </select>
                        </div>
                      </div>
                    )}
                    
                    {invoice.payment_method === "bank_transfer" && (
                      <div className="space-y-3 p-4 bg-muted rounded-lg">
                        <div className="space-y-2">
                          <Label htmlFor="account_number" className="text-foreground">Account Number</Label>
                          <Input
                            id="account_number"
                            value={paymentFieldValues.account_number}
                            onChange={(e) => setPaymentFieldValues({...paymentFieldValues, account_number: e.target.value})}
                            onBlur={() => updatePaymentField('account_number', paymentFieldValues.account_number)}
                            placeholder="Bank account number"
                            className="bg-background"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="transfer_reference" className="text-foreground">Transfer Reference</Label>
                          <Input
                            id="transfer_reference"
                            value={paymentFieldValues.transfer_reference}
                            onChange={(e) => setPaymentFieldValues({...paymentFieldValues, transfer_reference: e.target.value})}
                            onBlur={() => updatePaymentField('transfer_reference', paymentFieldValues.transfer_reference)}
                            placeholder="Bank transfer reference number"
                            className="bg-background"
                          />
                        </div>
                      </div>
                    )}
                    
                    {invoice.payment_method === "pos" && (
                      <div className="space-y-3 p-4 bg-muted rounded-lg">
                        <div className="space-y-2">
                          <Label htmlFor="terminal_id" className="text-foreground">Terminal ID</Label>
                          <Input
                            id="terminal_id"
                            value={paymentFieldValues.terminal_id}
                            onChange={(e) => setPaymentFieldValues({...paymentFieldValues, terminal_id: e.target.value})}
                            onBlur={() => updatePaymentField('terminal_id', paymentFieldValues.terminal_id)}
                            placeholder="POS terminal identifier"
                            className="bg-background"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="receipt_number" className="text-foreground">Receipt Number</Label>
                          <Input
                            id="receipt_number"
                            value={paymentFieldValues.receipt_number}
                            onChange={(e) => setPaymentFieldValues({...paymentFieldValues, receipt_number: e.target.value})}
                            onBlur={() => updatePaymentField('receipt_number', paymentFieldValues.receipt_number)}
                            placeholder="Receipt number"
                            className="bg-background"
                          />
                        </div>
                      </div>
                    )}
                    
                    {invoice.payment_method === "cash" && (
                      <div className="p-4 bg-muted rounded-lg">
                        <p className="text-sm text-muted-foreground">Cash payment received - no additional details required</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border rounded-xl shadow-lg">
          <CardHeader>
            <CardTitle className="text-xl font-semibold text-foreground">Invoice Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Invoice Number</span>
                <span className="font-medium text-foreground">{invoice.invoice_number}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Issued Date</span>
                <span className="text-foreground">{new Date(invoice.issued_date).toLocaleDateString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Due Date</span>
                <span className="text-foreground">{invoice.due_date ? new Date(invoice.due_date).toLocaleDateString() : 'N/A'}</span>
              </div>
              <div className="flex justify-between pt-2 mt-2 border-t border-border">
                <span className="text-foreground font-semibold">Total Amount</span>
                <span className="font-semibold text-foreground">${invoice.amount.toFixed(2)}</span>
              </div>
              {invoice.payment_method && (
                <>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Payment Method</span>
                    <span className="font-medium text-foreground capitalize">{invoice.payment_method}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Amount Paid</span>
                    <span className="font-medium text-foreground">${(invoice.amount_paid || 0).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Outstanding Balance</span>
                    <span className={`font-medium ${invoice.outstanding_balance && invoice.outstanding_balance > 0 ? 'text-red-500' : 'text-foreground'}`}>
                      ${(invoice.outstanding_balance || 0).toFixed(2)}
                    </span>
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}