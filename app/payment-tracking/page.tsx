"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { 
  Plus, 
  Download, 
  DollarSign,
  Receipt,
  FileText,
  Filter,
  Eye,
  Printer,
  X,
  Search,
  TrendingUp,
  TrendingDown
} from "lucide-react"
import { useRouter } from "next/navigation"

// Define interfaces for our data
interface PaymentTransaction {
  id: string
  transaction_id: string
  type: string
  amount: number
  currency: string
  payment_method: string
  description: string
  reference_number: string
  date: string
  status: string
  owner_id?: string
  guest_id?: string
  property_id?: string
  unit_id?: string
  reservation_id?: string
  invoice_id?: string
  notes: string
  attachment_url?: string
  property_name?: string
}

interface DisbursementRecord {
  id: string
  transaction_id: string
  type: string
  amount: number
  currency: string
  payment_method: string
  date: string
  status: string
  owner_id?: string
  guest_id?: string
  staff_id?: string
  supplier_id?: string
  property_id?: string
  invoice_id?: string
  expense_id?: string
  notes: string
  attachment_url?: string
  property_name?: string
}

interface OwnerBalance {
  id: string
  owner_id: string
  property_id?: string
  current_balance: number
  currency: string
  last_updated: string
  notes: string
  created_at?: string
  property_name?: string
}

export default function PaymentTrackingPage() {
  const [transactions, setTransactions] = useState<PaymentTransaction[]>([])
  const [disbursements, setDisbursements] = useState<DisbursementRecord[]>([])
  const [balances, setBalances] = useState<OwnerBalance[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isAuthenticated, setIsAuthenticated] = useState(true)
  const [filters, setFilters] = useState({
    type: "",
    payment_method: "",
    status: "",
    date_from: "",
    date_to: ""
  })
  const [activeTab, setActiveTab] = useState<'transactions' | 'disbursements' | 'balances'>('transactions')
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [formType, setFormType] = useState<'transaction' | 'disbursement'>('transaction')
  const [showDetailsModal, setShowDetailsModal] = useState(false)
  const [selectedItem, setSelectedItem] = useState<PaymentTransaction | DisbursementRecord | OwnerBalance | null>(null)
  const [detailsType, setDetailsType] = useState<'transaction' | 'disbursement' | 'balance' | null>(null)

  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    checkAuthenticationAndFetchData()
  }, [filters, activeTab])

  const checkAuthenticationAndFetchData = async () => {
    try {
      const response = await fetch("/api/auth/check")
      if (!response.ok) {
        setIsAuthenticated(false)
        return
      }

      const result = await response.json()
      if (!result.user) {
        setIsAuthenticated(false)
        return
      }

      const userId = result.user.id
      if (!userId) {
        setIsAuthenticated(false)
        return
      }

      // Fetch data based on active tab
      if (activeTab === 'transactions') {
        await fetchTransactions(userId)
      } else if (activeTab === 'disbursements') {
        await fetchDisbursements(userId)
      } else if (activeTab === 'balances') {
        await fetchBalances(userId)
      }
    } catch (error) {
      console.error("Error fetching data:", error)
      setIsAuthenticated(false)
    } finally {
      setIsLoading(false)
    }
  }

  const fetchTransactions = async (userId: string) => {
    let query = supabase
      .from("payment_transactions")
      .select(`
        id,
        transaction_id,
        type,
        amount,
        currency,
        payment_method,
        description,
        reference_number,
        date,
        status,
        owner_id,
        guest_id,
        property_id,
        notes,
        attachment_url,
        properties(name)
      `)
      .or(`owner_id.eq.${userId},guest_id.eq.${userId}`)
      .order("date", { ascending: false })

    // Apply filters
    if (filters.type) {
      query = query.eq("type", filters.type)
    }
    if (filters.payment_method) {
      query = query.eq("payment_method", filters.payment_method)
    }
    if (filters.status) {
      query = query.eq("status", filters.status)
    }
    if (filters.date_from) {
      query = query.gte("date", filters.date_from)
    }
    if (filters.date_to) {
      query = query.lte("date", filters.date_to)
    }

    const { data, error } = await query

    if (error) {
      console.error("Error fetching transactions:", error)
      return
    }

    // Format the data to include property names
    const transactionsWithPropertyNames = data.map(trans => ({
      ...trans,
      property_name: trans.properties?.name || "Unknown Property"
    }))

    setTransactions(transactionsWithPropertyNames || [])
  }

  const fetchDisbursements = async (userId: string) => {
    let query = supabase
      .from("disbursement_records")
      .select(`
        id,
        transaction_id,
        type,
        amount,
        currency,
        payment_method,
        date,
        status,
        owner_id,
        guest_id,
        staff_id,
        supplier_id,
        property_id,
        notes,
        attachment_url,
        properties(name)
      `)
      .or(`owner_id.eq.${userId},guest_id.eq.${userId}`)
      .order("date", { ascending: false })

    // Apply filters
    if (filters.type) {
      query = query.eq("type", filters.type)
    }
    if (filters.payment_method) {
      query = query.eq("payment_method", filters.payment_method)
    }
    if (filters.status) {
      query = query.eq("status", filters.status)
    }
    if (filters.date_from) {
      query = query.gte("date", filters.date_from)
    }
    if (filters.date_to) {
      query = query.lte("date", filters.date_to)
    }

    const { data, error } = await query

    if (error) {
      console.error("Error fetching disbursements:", error)
      return
    }

    // Format the data to include property names
    const disbursementsWithPropertyNames = data.map(disp => ({
      ...disp,
      property_name: disp.properties?.name || "Unknown Property"
    }))

    setDisbursements(disbursementsWithPropertyNames || [])
  }

  const fetchBalances = async (userId: string) => {
    // First, get the stored balances from the database
    const { data: storedBalances, error: storedBalancesError } = await supabase
      .from("owner_balances")
      .select(`
        id,
        owner_id,
        property_id,
        current_balance,
        currency,
        last_updated,
        properties(name)
      `)
      .eq("owner_id", userId)

    if (storedBalancesError) {
      console.error("Error fetching stored balances:", storedBalancesError)
    }

    // Calculate real-time balance based on transactions and disbursements
    const realTimeBalance = await calculateBalance(userId);

    // If we have stored balances, use them, otherwise create a default one
    let balancesWithPropertyNames = [];

    if (storedBalances && storedBalances.length > 0) {
      balancesWithPropertyNames = storedBalances.map(bal => ({
        ...bal,
        property_name: bal.properties?.name || "All Properties"
      }));
    } else {
      // Create a default balance entry using calculated balance
      balancesWithPropertyNames = [{
        id: userId,
        owner_id: userId,
        property_id: undefined,
        current_balance: realTimeBalance,
        currency: 'SAR',
        last_updated: new Date().toISOString(),
        property_name: "All Properties"
      }];
    }

    setBalances(balancesWithPropertyNames);
  }

  // Calculate real-time balance based on transactions and disbursements
  const calculateBalance = async (userId: string) => {
    try {
      // Get all payment transactions for this user
      const { data: transactions, error: transactionError } = await supabase
        .from('payment_transactions')
        .select('amount, type, status')
        .or(`owner_id.eq.${userId},guest_id.eq.${userId}`)
        .eq('status', 'completed');

      if (transactionError) {
        console.error("Error fetching transactions:", transactionError);
        return 0; // Return 0 if there's an error
      }

      // Get all disbursement records for this user
      const { data: disbursements, error: disbursementError } = await supabase
        .from('disbursement_records')
        .select('amount, type, status')
        .or(`owner_id.eq.${userId},guest_id.eq.${userId}`)
        .eq('status', 'completed');

      if (disbursementError) {
        console.error("Error fetching disbursements:", disbursementError);
        return 0; // Return 0 if there's an error
      }

      // Calculate balance from transactions (payments received)
      const totalReceived = transactions?.reduce((sum, trans) => {
        // Only count payment_received types as positive amounts
        if (trans.type === 'payment_received' && trans.status === 'completed') {
          return sum + trans.amount;
        }
        // For other types like charges, subtract from balance
        if (trans.type === 'charge' && trans.status === 'completed') {
          return sum - trans.amount;
        }
        return sum;
      }, 0) || 0;

      // Calculate balance from disbursements (payouts/expenses)
      const totalPaidOut = disbursements?.reduce((sum, disp) => {
        // All disbursement types reduce the balance
        if (disp.status === 'completed') {
          return sum + disp.amount;
        }
        return sum;
      }, 0) || 0;

      // Actual balance is received - paid out
      return totalReceived - totalPaidOut;
    } catch (error) {
      console.error("Error calculating balance:", error);
      return 0;
    }
  };

  // Handle form submission for creating a transaction or disbursement
  const handleCreateTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);

    try {
      // Get the current user
      const authResponse = await fetch("/api/auth/check");
      if (!authResponse.ok) {
        throw new Error("Authentication required");
      }

      const authResult = await authResponse.json();
      if (!authResult.user) {
        throw new Error("User not authenticated");
      }

      const userId = authResult.user.id;

      // Extract form data
      const amount = parseFloat(formData.get('amount') as string);
      const type = formData.get('type') as string;
      const paymentMethod = formData.get('payment_method') as string;
      const date = formData.get('date') as string;
      const status = formData.get('status') as string;
      const description = formData.get('description') as string;
      const notes = formData.get('notes') as string;
      const referenceNumber = formData.get('reference_number') as string;

      // Generate a unique transaction ID automatically to avoid conflicts
      const transactionId = `TXN_${Date.now()}_${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

      if (formType === 'transaction') {
        // Create a payment transaction
        const { data: newTransaction, error: transactionError } = await supabase
          .from('payment_transactions')
          .insert([{
            transaction_id: transactionId,
            type,
            amount,
            payment_method: paymentMethod,
            date,
            status,
            description,
            reference_number: referenceNumber,
            notes,
            owner_id: type.includes('payout') ? userId : null,
            guest_id: type.includes('refund') ? userId : null,
          }])
          .select()
          .single();

        if (transactionError) {
          throw new Error(`Error creating transaction: ${transactionError.message}`);
        }

        // Add the new transaction to the list
        setTransactions(prev => [newTransaction, ...prev]);
        alert('Payment transaction created successfully');
      } else {
        // Create a disbursement record
        const { data: newDisbursement, error: disbursementError } = await supabase
          .from('disbursement_records')
          .insert([{
            transaction_id: transactionId,
            type,
            amount,
            payment_method: paymentMethod,
            date,
            status,
            notes,
            owner_id: type === 'payout_to_owner' ? userId : null,
            guest_id: type === 'refund_to_guest' ? userId : null,
          }])
          .select()
          .single();

        if (disbursementError) {
          throw new Error(`Error creating disbursement: ${disbursementError.message}`);
        }

        // Add the new disbursement to the list
        setDisbursements(prev => [newDisbursement, ...prev]);
        alert('Disbursement record created successfully');
      }

      // Reset form and close modal
      setShowCreateForm(false);
      // Refresh all data to show the new record and updated balance
      checkAuthenticationAndFetchData();
    } catch (error: any) {
      console.error(`Error creating ${formType}:`, error);
      alert(`Error creating ${formType}: ${error.message || "Please try again."}`);
    }
  }

  const handleViewDetails = (item: PaymentTransaction | DisbursementRecord | OwnerBalance, type: 'transaction' | 'disbursement' | 'balance') => {
    setSelectedItem(item);
    setDetailsType(type);
    setShowDetailsModal(true);
  }

  const handleFilterChange = (field: keyof typeof filters, value: string) => {
    setFilters(prev => ({ ...prev, [field]: value }))
  }

  // Payment method options
  const paymentMethods = [
    { value: 'cash', label: 'Cash' },
    { value: 'bank_transfer', label: 'Bank Transfer' },
    { value: 'pos', label: 'POS' },
    { value: 'credit_card', label: 'Credit Card' },
    { value: 'debit_card', label: 'Debit Card' },
    { value: 'apple_pay', label: 'Apple Pay' },
    { value: 'stc_pay', label: 'STC Pay' },
    { value: 'internal_wallet', label: 'Internal Wallet' },
    { value: 'hyperpay', label: 'HyperPay' },
    { value: 'tap', label: 'Tap' },
    { value: 'stripe', label: 'Stripe' },
  ]

  // Transaction types
  const transactionTypes = [
    { value: 'payout_to_owner', label: 'Payout to Owner' },
    { value: 'refund_to_guest', label: 'Refund to Guest' },
    { value: 'staff_payment', label: 'Staff Payment' },
    { value: 'supplier_payment', label: 'Supplier Payment' },
    { value: 'payment_received', label: 'Payment Received' },
    { value: 'charge', label: 'Charge' },
  ]

  // Status options
  const statusOptions = [
    { value: 'pending', label: 'Pending' },
    { value: 'completed', label: 'Completed' },
    { value: 'failed', label: 'Failed' },
    { value: 'refunded', label: 'Refunded' },
    { value: 'cancelled', label: 'Cancelled' },
  ]

  // Export as PDF
  const exportAsPdf = (data: any[], title: string) => {
    // Create a new window with printable statement details
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      let content = `<h1>${title}</h1>`;
      content += `<table><thead><tr>`;
      
      // Add headers based on data type
      if (data.length > 0) {
        const keys = Object.keys(data[0]).filter(key => 
          !['id', 'property_id', 'owner_id', 'guest_id', 'attachment_url'].includes(key)
        );
        
        keys.forEach(key => {
          content += `<th>${key.replace('_', ' ').toUpperCase()}</th>`;
        });
        content += `</tr></thead><tbody>`;
        
        data.forEach(item => {
          content += `<tr>`;
          keys.forEach(key => {
            content += `<td>${item[key]}</td>`;
          });
          content += `</tr>`;
        });
        content += `</tbody></table>`;
      }
      
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>${title}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            table { width: 100%; border-collapse: collapse; margin: 15px 0; }
            th, td { border: 1px solid #000; padding: 8px; text-align: left; }
            th { background-color: #f0f0f0; }
          </style>
        </head>
        <body>
          ${content}
        </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.focus();
      printWindow.print();
      printWindow.close();
    }
  }

  // Export as CSV
  const exportAsCsv = (data: any[], filename: string) => {
    if (!data || data.length === 0) return;
    
    const headers = Object.keys(data[0]).filter(key => 
      !['id', 'property_id', 'owner_id', 'guest_id', 'attachment_url'].includes(key)
    );
    
    const csvContent = [
      headers.join(','),
      ...data.map(row => headers.map(header => `"${row[header] || ''}"`).join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  // Show authentication error message if not authenticated
  if (!isAuthenticated) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6">
        <div className="w-12 h-12 text-foreground opacity-50 flex items-center justify-center">
          <DollarSign className="w-12 h-12" />
        </div>
        <h2 className="text-2xl font-bold text-center text-foreground">Access Denied</h2>
        <p className="text-muted-foreground text-center max-w-md">
          You are not authenticated. Please log in to access payment tracking.
        </p>
        <Button
          onClick={() => router.push("/auth/login")}
          variant="default"
        >
          Go to Login
        </Button>
      </div>
    )
  }

  // Status badge colors
  const statusColors = {
    pending: "bg-yellow-100 text-yellow-800 border border-yellow-200",
    completed: "bg-green-100 text-green-800 border border-green-200",
    failed: "bg-red-100 text-red-800 border border-red-200",
    refunded: "bg-blue-100 text-blue-800 border border-blue-200",
    cancelled: "bg-gray-100 text-gray-800 border border-gray-200",
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Payment Tracking (تتبع الدفع)</h1>
          <p className="text-muted-foreground mt-1">Track all payments received and disbursed</p>
        </div>
        
        <div className="flex gap-2 w-full md:w-auto">
          <Button 
            variant="outline" 
            className="gap-2 flex-1 md:flex-none"
            onClick={() => {
              setFormType('transaction');
              setShowCreateForm(true);
            }}
          >
            <Plus className="w-4 h-4" />
            New Transaction
          </Button>
          <Button 
            variant="outline" 
            className="gap-2 flex-1 md:flex-none"
            onClick={() => {
              setFormType('disbursement');
              setShowCreateForm(true);
            }}
          >
            <Plus className="w-4 h-4" />
            New Disbursement
          </Button>
        </div>
      </div>

      {/* Tabs for different data views */}
      <Card className="border rounded-xl shadow-lg">
        <CardContent className="p-0">
          <div className="flex border-b">
            <button
              className={`flex-1 py-4 px-6 text-center font-medium ${
                activeTab === 'transactions'
                  ? 'text-foreground border-b-2 border-primary'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
              onClick={() => setActiveTab('transactions')}
            >
              Payment Transactions
            </button>
            <button
              className={`flex-1 py-4 px-6 text-center font-medium ${
                activeTab === 'disbursements'
                  ? 'text-foreground border-b-2 border-primary'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
              onClick={() => setActiveTab('disbursements')}
            >
              Disbursements
            </button>
            <button
              className={`flex-1 py-4 px-6 text-center font-medium ${
                activeTab === 'balances'
                  ? 'text-foreground border-b-2 border-primary'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
              onClick={() => setActiveTab('balances')}
            >
              Balances
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      <Card className="border rounded-xl shadow-lg">
        <CardHeader>
          <CardTitle className="text-lg">Filters</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="space-y-2">
            <Label htmlFor="type-filter">Type</Label>
            <Select 
              value={filters.type}
              onValueChange={(value) => handleFilterChange('type', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                {transactionTypes.map(type => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="method-filter">Payment Method</Label>
            <Select 
              value={filters.payment_method}
              onValueChange={(value) => handleFilterChange('payment_method', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="All Methods" />
              </SelectTrigger>
              <SelectContent>
                {paymentMethods.map(method => (
                  <SelectItem key={method.value} value={method.value}>
                    {method.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="status-filter">Status</Label>
            <Select 
              value={filters.status}
              onValueChange={(value) => handleFilterChange('status', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                {statusOptions.map(status => (
                  <SelectItem key={status.value} value={status.value}>
                    {status.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="date-from-filter">From Date</Label>
            <Input
              id="date-from-filter"
              type="date"
              value={filters.date_from}
              onChange={(e) => handleFilterChange('date_from', e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="date-to-filter">To Date</Label>
            <Input
              id="date-to-filter"
              type="date"
              value={filters.date_to}
              onChange={(e) => handleFilterChange('date_to', e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <Card className="flex justify-center items-center h-64 border rounded-xl shadow-lg">
          <div className="flex flex-col items-center gap-2">
            <div className="w-8 h-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
            <span className="text-foreground">Loading payment data...</span>
          </div>
        </Card>
      ) : activeTab === 'transactions' ? (
        <>
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold text-foreground">Payment Transactions</h2>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => exportAsCsv(transactions, 'payment-transactions.csv')}
            >
              <Download className="w-4 h-4 mr-2" />
              Export CSV
            </Button>
          </div>

          {transactions.length === 0 ? (
            <Card className="text-center py-12 border rounded-xl shadow-lg">
              <p className="text-muted-foreground">No payment transactions found</p>
            </Card>
          ) : (
            <Card className="border rounded-xl shadow-lg">
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted border-b">
                      <tr>
                        <th className="px-6 py-4 text-left font-semibold text-foreground">Transaction ID</th>
                        <th className="px-6 py-4 text-left font-semibold text-foreground">Type</th>
                        <th className="px-6 py-4 text-left font-semibold text-foreground">Amount</th>
                        <th className="px-6 py-4 text-left font-semibold text-foreground">Method</th>
                        <th className="px-6 py-4 text-left font-semibold text-foreground">Date</th>
                        <th className="px-6 py-4 text-left font-semibold text-foreground">Status</th>
                        <th className="px-6 py-4 text-left font-semibold text-foreground">Property</th>
                        <th className="px-6 py-4 text-left font-semibold text-foreground">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {transactions.map((trans) => (
                        <tr key={trans.id} className="border-b hover:bg-muted transition-colors">
                          <td className="px-6 py-4 font-mono text-foreground">{trans.transaction_id}</td>
                          <td className="px-6 py-4 font-medium text-foreground capitalize">{trans.type.replace('_', ' ')}</td>
                          <td className="px-6 py-4 font-semibold text-foreground">
                            {trans.amount?.toFixed(2)} {trans.currency}
                            {trans.type.includes('payment') ? (
                              <TrendingDown className="inline w-4 h-4 ml-1 text-red-500" />
                            ) : (
                              <TrendingUp className="inline w-4 h-4 ml-1 text-green-500" />
                            )}
                          </td>
                          <td className="px-6 py-4 text-foreground capitalize">{trans.payment_method.replace('_', ' ')}</td>
                          <td className="px-6 py-4 text-foreground">{new Date(trans.date).toLocaleDateString()}</td>
                          <td className="px-6 py-4">
                            <span
                              className={`px-3 py-1 rounded-full text-xs font-medium ${
                                statusColors[trans.status as keyof typeof statusColors] || "bg-gray-100 text-gray-800"
                              }`}
                            >
                              {trans.status.replace('_', ' ')}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-foreground">{trans.property_name}</td>
                          <td className="px-6 py-4 flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              title="View Details"
                              onClick={() => handleViewDetails(trans, 'transaction')}
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              title="Export as PDF"
                              onClick={() => exportAsPdf([trans], `Transaction-${trans.transaction_id}`)}
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
        </>
      ) : activeTab === 'disbursements' ? (
        <>
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold text-foreground">Disbursement Records (الصرف)</h2>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => exportAsCsv(disbursements, 'disbursements.csv')}
            >
              <Download className="w-4 h-4 mr-2" />
              Export CSV
            </Button>
          </div>

          {disbursements.length === 0 ? (
            <Card className="text-center py-12 border rounded-xl shadow-lg">
              <p className="text-muted-foreground">No disbursement records found</p>
            </Card>
          ) : (
            <Card className="border rounded-xl shadow-lg">
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted border-b">
                      <tr>
                        <th className="px-6 py-4 text-left font-semibold text-foreground">Transaction ID</th>
                        <th className="px-6 py-4 text-left font-semibold text-foreground">Type</th>
                        <th className="px-6 py-4 text-left font-semibold text-foreground">Amount</th>
                        <th className="px-6 py-4 text-left font-semibold text-foreground">Method</th>
                        <th className="px-6 py-4 text-left font-semibold text-foreground">Date</th>
                        <th className="px-6 py-4 text-left font-semibold text-foreground">Status</th>
                        <th className="px-6 py-4 text-left font-semibold text-foreground">Property</th>
                        <th className="px-6 py-4 text-left font-semibold text-foreground">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {disbursements.map((disp) => (
                        <tr key={disp.id} className="border-b hover:bg-muted transition-colors">
                          <td className="px-6 py-4 font-mono text-foreground">{disp.transaction_id}</td>
                          <td className="px-6 py-4 font-medium text-foreground capitalize">{disp.type.replace('_', ' ')}</td>
                          <td className="px-6 py-4 font-semibold text-foreground">
                            {disp.amount?.toFixed(2)} {disp.currency}
                            <TrendingDown className="inline w-4 h-4 ml-1 text-red-500" />
                          </td>
                          <td className="px-6 py-4 text-foreground capitalize">{disp.payment_method.replace('_', ' ')}</td>
                          <td className="px-6 py-4 text-foreground">{new Date(disp.date).toLocaleDateString()}</td>
                          <td className="px-6 py-4">
                            <span
                              className={`px-3 py-1 rounded-full text-xs font-medium ${
                                statusColors[disp.status as keyof typeof statusColors] || "bg-gray-100 text-gray-800"
                              }`}
                            >
                              {disp.status.replace('_', ' ')}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-foreground">{disp.property_name}</td>
                          <td className="px-6 py-4 flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              title="View Details"
                              onClick={() => handleViewDetails(disp, 'disbursement')}
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              title="Export as PDF"
                              onClick={() => exportAsPdf([disp], `Disbursement-${disp.transaction_id}`)}
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
        </>
      ) : activeTab === 'balances' ? (
        <>
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold text-foreground">Owner Balances</h2>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => exportAsCsv(balances, 'owner-balances.csv')}
            >
              <Download className="w-4 h-4 mr-2" />
              Export CSV
            </Button>
          </div>

          {balances.length === 0 ? (
            <Card className="text-center py-12 border rounded-xl shadow-lg">
              <p className="text-muted-foreground">No balances found</p>
            </Card>
          ) : (
            <Card className="border rounded-xl shadow-lg">
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted border-b">
                      <tr>
                        <th className="px-6 py-4 text-left font-semibold text-foreground">Property</th>
                        <th className="px-6 py-4 text-left font-semibold text-foreground">Current Balance</th>
                        <th className="px-6 py-4 text-left font-semibold text-foreground">Currency</th>
                        <th className="px-6 py-4 text-left font-semibold text-foreground">Last Updated</th>
                        <th className="px-6 py-4 text-left font-semibold text-foreground">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {balances.map((bal) => (
                        <tr key={bal.id} className="border-b hover:bg-muted transition-colors">
                          <td className="px-6 py-4 font-medium text-foreground">{bal.property_name}</td>
                          <td className="px-6 py-4 font-semibold text-foreground">
                            {bal.current_balance?.toFixed(2)} {bal.currency}
                            {bal.current_balance !== undefined && bal.current_balance >= 0 ? (
                              <TrendingUp className="inline w-4 h-4 ml-1 text-green-500" />
                            ) : (
                              <TrendingDown className="inline w-4 h-4 ml-1 text-red-500" />
                            )}
                          </td>
                          <td className="px-6 py-4 text-foreground">{bal.currency}</td>
                          <td className="px-6 py-4 text-foreground">{new Date(bal.last_updated).toLocaleDateString()}</td>
                          <td className="px-6 py-4 flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              title="View Details"
                              onClick={() => handleViewDetails(bal, 'balance')}
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              title="Export as PDF"
                              onClick={() => exportAsPdf([bal], `Balance-${bal.id}`)}
                            >
                              <Download className="w-4 h-4" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Summary Card for Total Balance */}
                {balances.length > 0 && (
                  <div className="p-6 border-t">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="bg-muted/50 p-4 rounded-lg">
                        <p className="text-sm text-muted-foreground">Total Balance</p>
                        <p className="font-bold text-xl">
                          {balances.reduce((sum, bal) => sum + (bal.current_balance || 0), 0).toFixed(2)} SAR
                        </p>
                      </div>
                      <div className="bg-muted/50 p-4 rounded-lg">
                        <p className="text-sm text-muted-foreground">Properties</p>
                        <p className="font-bold text-xl">{balances.length}</p>
                      </div>
                      <div className="bg-muted/50 p-4 rounded-lg">
                        <p className="text-sm text-muted-foreground">Last Updated</p>
                        <p className="font-bold text-xl">
                          {new Date(Math.max(...balances.map(bal => new Date(bal.last_updated).getTime()))).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </>
      ) : null}

      {/* Create Transaction/Disbursement Form Modal */}
      {showCreateForm && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-background border rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-foreground">
                  {formType === 'transaction' ? 'New Payment Transaction' : 'New Disbursement'}
                </h2>
                <button
                  onClick={() => setShowCreateForm(false)}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <form onSubmit={handleCreateTransaction}>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="transaction-id">Transaction ID (Auto-generated)</Label>
                      <Input
                        id="transaction-id"
                        name="transaction_id"
                        placeholder="Auto-generated"
                        disabled
                      />
                    </div>
                    <div>
                      <Label htmlFor="amount">Amount</Label>
                      <Input 
                        id="amount" 
                        name="amount" 
                        type="number" 
                        step="0.01" 
                        placeholder="0.00" 
                        required 
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="type">Type</Label>
                      <Select name="type" required>
                        <SelectTrigger>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent>
                          {transactionTypes
                            .filter(type => 
                              formType === 'transaction' || 
                              (formType === 'disbursement' && ['payout_to_owner', 'refund_to_guest', 'staff_payment', 'supplier_payment'].includes(type.value))
                            )
                            .map(type => (
                              <SelectItem key={type.value} value={type.value}>
                                {type.label}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="payment-method">Payment Method</Label>
                      <Select name="payment_method" required>
                        <SelectTrigger>
                          <SelectValue placeholder="Select method" />
                        </SelectTrigger>
                        <SelectContent>
                          {paymentMethods.map(method => (
                            <SelectItem key={method.value} value={method.value}>
                              {method.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="date">Date</Label>
                      <Input 
                        id="date" 
                        name="date" 
                        type="date" 
                        required 
                      />
                    </div>
                    <div>
                      <Label htmlFor="status">Status</Label>
                      <Select name="status" defaultValue="completed">
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {statusOptions.map(status => (
                            <SelectItem key={status.value} value={status.value}>
                              {status.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  <div>
                    <Label htmlFor="description">Description</Label>
                    <Input 
                      id="description" 
                      name="description" 
                      placeholder="Enter description" 
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="notes">Notes</Label>
                    <textarea 
                      id="notes" 
                      name="notes" 
                      className="w-full px-3 py-2 border rounded-md" 
                      rows={3}
                      placeholder="Enter any additional notes"
                    ></textarea>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {formType === 'transaction' && (
                      <div>
                        <Label htmlFor="reference-number">Reference Number</Label>
                        <Input
                          id="reference-number"
                          name="reference_number"
                          placeholder="Reference number"
                        />
                      </div>
                    )}
                    <div>
                      <Label htmlFor="attachment">Attachment</Label>
                      <Input
                        id="attachment"
                        type="file"
                        accept="image/*,application/pdf"
                      />
                    </div>
                  </div>
                  
                  <div className="flex justify-end gap-2 pt-4 border-t">
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => setShowCreateForm(false)}
                    >
                      Cancel
                    </Button>
                    <Button type="submit">
                      {formType === 'transaction' ? 'Create Transaction' : 'Create Disbursement'}
                    </Button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Details Modal */}
      {showDetailsModal && selectedItem && (
        <div className="fixed inset-0 bg-black bg-opacity-30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-background rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto border">
            <div className="flex justify-between items-center border-b p-6">
              <h3 className="text-xl font-semibold">
                {detailsType === 'transaction' && 'Transaction Details'}
                {detailsType === 'disbursement' && 'Disbursement Details'}
                {detailsType === 'balance' && 'Balance Details'}
              </h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowDetailsModal(false)}
              >
                <X className="w-5 h-5" />
              </Button>
            </div>

            <div className="p-6 space-y-4">
              {detailsType === 'transaction' && selectedItem && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Transaction ID</p>
                    <p className="font-medium">{(selectedItem as PaymentTransaction).transaction_id}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Type</p>
                    <p className="font-medium capitalize">{(selectedItem as PaymentTransaction).type.replace('_', ' ')}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Amount</p>
                    <p className="font-medium">{(selectedItem as PaymentTransaction).amount?.toFixed(2)} {(selectedItem as PaymentTransaction).currency}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Payment Method</p>
                    <p className="font-medium capitalize">{(selectedItem as PaymentTransaction).payment_method.replace('_', ' ')}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Date</p>
                    <p className="font-medium">{new Date((selectedItem as PaymentTransaction).date).toLocaleDateString()}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Status</p>
                    <p className="font-medium">
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        statusColors[(selectedItem as PaymentTransaction).status as keyof typeof statusColors] || "bg-gray-100 text-gray-800"
                      }`}>
                        {(selectedItem as PaymentTransaction).status.replace('_', ' ')}
                      </span>
                    </p>
                  </div>
                  <div className="md:col-span-2">
                    <p className="text-muted-foreground">Description</p>
                    <p className="font-medium">{(selectedItem as PaymentTransaction).description || 'N/A'}</p>
                  </div>
                  <div className="md:col-span-2">
                    <p className="text-muted-foreground">Reference Number</p>
                    <p className="font-medium">{(selectedItem as PaymentTransaction).reference_number || 'N/A'}</p>
                  </div>
                  <div className="md:col-span-2">
                    <p className="text-muted-foreground">Notes</p>
                    <p className="font-medium">{(selectedItem as PaymentTransaction).notes || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Owner ID</p>
                    <p className="font-medium">{(selectedItem as PaymentTransaction).owner_id || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Guest ID</p>
                    <p className="font-medium">{(selectedItem as PaymentTransaction).guest_id || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Property</p>
                    <p className="font-medium">{(selectedItem as PaymentTransaction).property_name || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Created At</p>
                    <p className="font-medium">{(selectedItem as PaymentTransaction).created_at ? new Date((selectedItem as PaymentTransaction).created_at).toLocaleString() : 'N/A'}</p>
                  </div>
                </div>
              )}

              {detailsType === 'disbursement' && selectedItem && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Transaction ID</p>
                    <p className="font-medium">{(selectedItem as DisbursementRecord).transaction_id}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Type</p>
                    <p className="font-medium capitalize">{(selectedItem as DisbursementRecord).type.replace('_', ' ')}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Amount</p>
                    <p className="font-medium">{(selectedItem as DisbursementRecord).amount?.toFixed(2)} {(selectedItem as DisbursementRecord).currency}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Payment Method</p>
                    <p className="font-medium capitalize">{(selectedItem as DisbursementRecord).payment_method.replace('_', ' ')}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Date</p>
                    <p className="font-medium">{new Date((selectedItem as DisbursementRecord).date).toLocaleDateString()}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Status</p>
                    <p className="font-medium">
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        statusColors[(selectedItem as DisbursementRecord).status as keyof typeof statusColors] || "bg-gray-100 text-gray-800"
                      }`}>
                        {(selectedItem as DisbursementRecord).status.replace('_', ' ')}
                      </span>
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Owner ID</p>
                    <p className="font-medium">{(selectedItem as DisbursementRecord).owner_id || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Guest ID</p>
                    <p className="font-medium">{(selectedItem as DisbursementRecord).guest_id || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Staff ID</p>
                    <p className="font-medium">{(selectedItem as DisbursementRecord).staff_id || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Supplier ID</p>
                    <p className="font-medium">{(selectedItem as DisbursementRecord).supplier_id || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Property</p>
                    <p className="font-medium">{(selectedItem as DisbursementRecord).property_name || 'N/A'}</p>
                  </div>
                  <div className="md:col-span-2">
                    <p className="text-muted-foreground">Notes</p>
                    <p className="font-medium">{(selectedItem as DisbursementRecord).notes || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Created At</p>
                    <p className="font-medium">{(selectedItem as DisbursementRecord).created_at ? new Date((selectedItem as DisbursementRecord).created_at).toLocaleString() : 'N/A'}</p>
                  </div>
                </div>
              )}

              {detailsType === 'balance' && selectedItem && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Owner ID</p>
                    <p className="font-medium">{(selectedItem as OwnerBalance).owner_id}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Property</p>
                    <p className="font-medium">{(selectedItem as OwnerBalance).property_name || 'All Properties'}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Current Balance</p>
                    <p className="font-medium text-lg">{(selectedItem as OwnerBalance).current_balance?.toFixed(2)} {(selectedItem as OwnerBalance).currency}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Currency</p>
                    <p className="font-medium">{(selectedItem as OwnerBalance).currency}</p>
                  </div>
                  <div className="md:col-span-2">
                    <p className="text-muted-foreground">Last Updated</p>
                    <p className="font-medium">{new Date((selectedItem as OwnerBalance).last_updated).toLocaleString()}</p>
                  </div>
                  <div className="md:col-span-2">
                    <p className="text-muted-foreground">Notes</p>
                    <p className="font-medium">{(selectedItem as OwnerBalance).notes || 'N/A'}</p>
                  </div>
                  <div className="md:col-span-2">
                    <p className="text-muted-foreground">Created At</p>
                    <p className="font-medium">{(selectedItem as OwnerBalance).created_at ? new Date((selectedItem as OwnerBalance).created_at).toLocaleString() : 'N/A'}</p>
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end p-6 border-t">
              <Button onClick={() => setShowDetailsModal(false)}>Close</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}