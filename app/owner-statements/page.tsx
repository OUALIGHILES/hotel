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
  X
} from "lucide-react"
import { useRouter } from "next/navigation"

// Define interfaces for our data
interface OwnerStatement {
  id: string
  owner_id: string
  property_id: string
  period_start: string
  period_end: string
  total_revenue: number
  total_expenses: number
  management_fee: number
  net_payout: number
  payout_status: string
  created_at: string
  property_name?: string
  owner_name?: string
}

interface DetailedBookingLine {
  id: string
  statement_id: string
  reservation_id: string
  guest_name: string
  stay_dates: string
  revenue: number
  taxes: number
  fees: number
  net_revenue: number
  created_at: string
}

interface ExpenseLine {
  id: string
  statement_id: string
  expense_type: string
  amount: number
  date: string
  notes: string
  created_at: string
}

export default function OwnerStatementsPage() {
  const [statements, setStatements] = useState<OwnerStatement[]>([])
  const [detailedBookingLines, setDetailedBookingLines] = useState<DetailedBookingLine[]>([])
  const [expenseLines, setExpenseLines] = useState<ExpenseLine[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedStatement, setSelectedStatement] = useState<OwnerStatement | null>(null)
  const [isAuthenticated, setIsAuthenticated] = useState(true)
  const [filters, setFilters] = useState({
    owner_id: "",
    property_id: "",
    period: ""
  })
  const [showGenerateForm, setShowGenerateForm] = useState(false)
  const [properties, setProperties] = useState<{id: string, name: string}[]>([])
  
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    checkAuthenticationAndFetchStatements()
    fetchProperties()
  }, [filters])

  const checkAuthenticationAndFetchStatements = async () => {
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

      // Get user's properties first
      const { data: propertiesData, error: propertiesError } = await supabase
        .from("properties")
        .select("id, name")
        .eq("user_id", userId)

      if (propertiesError) {
        console.error("Error fetching properties:", propertiesError)
        return
      }

      if (!propertiesData || propertiesData.length === 0) {
        setStatements([])
        return
      }

      const propertyIds = propertiesData.map(prop => prop.id)

      // Build the query for owner statements
      let query = supabase
        .from("owner_statements")
        .select(`
          id,
          owner_id,
          property_id,
          period_start,
          period_end,
          total_revenue,
          total_expenses,
          management_fee,
          net_payout,
          payout_status,
          created_at,
          properties(name)
        `)
        .in("property_id", propertyIds)
        .eq("owner_id", userId) // Ensure user can only see their own statements
        .order("created_at", { ascending: false })

      // Apply filters if they exist
      if (filters.property_id) {
        query = query.eq("property_id", filters.property_id)
      }
      if (filters.period) {
        // Assuming filters.period is in YYYY-MM format
        const [year, month] = filters.period.split("-")
        if (year && month) {
          const startDate = `${year}-${month}-01`
          const endDate = new Date(parseInt(year), parseInt(month), 0).toISOString().split('T')[0]
          query = query.gte("period_start", startDate).lte("period_end", endDate)
        }
      }

      const { data, error } = await query

      if (error) {
        console.error("Error fetching statements:", error)
        throw error
      }

      // Format the data to include property names
      const statementsWithPropertyNames = data.map(stmt => ({
        ...stmt,
        property_name: stmt.properties?.name || "Unknown Property"
      }))

      setStatements(statementsWithPropertyNames || [])
    } catch (error) {
      console.error("Error fetching statements:", error)
      setIsAuthenticated(false)
    } finally {
      setIsLoading(false)
    }
  }

  // Fetch properties for the generate form
  const fetchProperties = async () => {
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

      const { data, error } = await supabase
        .from("properties")
        .select("id, name")
        .eq("user_id", userId)

      if (error) {
        console.error("Error fetching properties:", error)
        throw error
      }

      setProperties(data || [])
    } catch (error) {
      console.error("Error in fetchProperties:", error)
    }
  }

  // Handle form submission for generating a statement
  const handleGenerateStatement = async (e: React.FormEvent) => {
    e.preventDefault()
    const formData = new FormData(e.target as HTMLFormElement)

    const propertyId = formData.get('property_id') as string
    const periodStart = formData.get('period_start') as string
    const periodEnd = formData.get('period_end') as string

    if (!propertyId || !periodStart || !periodEnd) {
      alert("Please fill in all fields")
      return
    }

    // Validate dates
    if (new Date(periodEnd) < new Date(periodStart)) {
      alert("End date must be after start date")
      return
    }

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

      // Check if statement already exists for this period
      const { data: existingStatement, error: existingError } = await supabase
        .from("owner_statements")
        .select("id")
        .eq("property_id", propertyId)
        .eq("period_start", periodStart)
        .eq("period_end", periodEnd)
        .single()

      if (!existingError && existingStatement) {
        alert("Statement already exists for this period");
        setShowGenerateForm(false);
        checkAuthenticationAndFetchStatements(); // Refresh the list
        return;
      }

      // Get units for this property
      const { data: units, error: unitsError } = await supabase
        .from("units")
        .select("id")
        .eq("property_id", propertyId)

      if (unitsError) {
        throw new Error(`Error fetching units: ${unitsError.message}`);
      }

      const unitIds = units?.map(unit => unit.id) || [];

      // Fetch reservations for units of this property in the specified period
      const { data: reservations, error: reservationsError } = await supabase
        .from("reservations")
        .select(`
          id,
          guest_name,
          check_in_date,
          check_out_date,
          total_price,
          payment_status
        `)
        .in("unit_id", unitIds)
        .gte("check_in_date", periodStart)
        .lte("check_out_date", periodEnd)
        .in("payment_status", ["paid", "confirmed"]);

      if (reservationsError) {
        throw new Error(`Error fetching reservations: ${reservationsError.message}`);
      }

      // Calculate revenue from reservations
      const totalRevenue = reservations?.reduce((sum, res) => sum + (res.total_price || 0), 0) || 0

      // Get expenses for this property in the period
      let expenses: any[] = [];
      let totalExpenses = 0;

      try {
        const { data, error } = await supabase
          .from("expenses") // Assuming there's an expenses table
          .select("amount")
          .eq("property_id", propertyId)
          .gte("date", periodStart)
          .lte("date", periodEnd);

        if (!error && data) {
          expenses = data;
          totalExpenses = expenses.reduce((sum, exp) => sum + (exp.amount || 0), 0);
        }
      } catch (error) {
        console.warn("Expenses table not found or accessible:", error);
        // Continue without expenses for now
      }

      // Calculate management fee (assuming 10% default)
      const managementFeePercent = 10; // Default to 10%
      const managementFee = totalRevenue * (managementFeePercent / 100);
      const netPayout = totalRevenue - totalExpenses - managementFee

      // Insert the new owner statement
      const { data: newStatement, error: statementError } = await supabase
        .from("owner_statements")
        .insert({
          owner_id: userId,
          property_id: propertyId,
          period_start: periodStart,
          period_end: periodEnd,
          total_revenue: totalRevenue,
          total_expenses: totalExpenses,
          management_fee: managementFee,
          net_payout: netPayout,
          payout_status: "pending" // Default to pending
        })
        .select()
        .single()

      if (statementError) {
        throw new Error(`Error creating statement: ${statementError.message}`);
      }

      // Insert booking lines based on reservations
      if (reservations && reservations.length > 0) {
        const bookingLines = reservations.map(res => ({
          statement_id: newStatement.id,
          reservation_id: res.id,
          guest_name: res.guest_name,
          stay_dates: `${res.check_in_date} to ${res.check_out_date}`,
          revenue: res.total_price,
          taxes: 0, // Placeholder - would come from reservation data
          fees: 0, // Placeholder - could be platform fees
          net_revenue: res.total_price
        }))

        const { error: bookingLinesError } = await supabase
          .from("owner_statement_booking_lines")
          .insert(bookingLines)

        if (bookingLinesError) {
          console.error("Error inserting booking lines:", bookingLinesError)
          // Continue even if booking lines fail to insert
        }
      }

      // Insert expense lines based on property expenses
      if (expenses && expenses.length > 0) {
        const expenseLines = expenses.map(exp => ({
          statement_id: newStatement.id,
          expense_type: "Property Expense", // Default type, could be more specific
          amount: exp.amount,
          date: exp.date,
          notes: `Expense from ${exp.date}`
        }))

        const { error: expenseLinesError } = await supabase
          .from("owner_statement_expense_lines")
          .insert(expenseLines)

        if (expenseLinesError) {
          console.error("Error inserting expense lines:", expenseLinesError)
          // Continue even if expense lines fail to insert
        }
      }

      alert("Owner statement generated successfully");
      setShowGenerateForm(false);
      checkAuthenticationAndFetchStatements(); // Refresh the list
    } catch (error: any) {
      console.error("Error generating statement:", error);
      alert(`Error generating statement: ${error.message || "Please try again."}`);
    }
  }

  const handleFilterChange = (field: keyof typeof filters, value: string) => {
    setFilters(prev => ({ ...prev, [field]: value }))
  }

  // Open statement detail view
  const openStatementDetail = async (statement: OwnerStatement) => {
    setSelectedStatement(statement)
    
    // Fetch detailed booking lines and expense lines for this statement
    try {
      const [bookingRes, expenseRes] = await Promise.all([
        supabase
          .from("owner_statement_booking_lines")
          .select("*")
          .eq("statement_id", statement.id),
        
        supabase
          .from("owner_statement_expense_lines")
          .select("*")
          .eq("statement_id", statement.id)
      ])
      
      if (bookingRes.error) throw bookingRes.error
      if (expenseRes.error) throw expenseRes.error
      
      setDetailedBookingLines(bookingRes.data || [])
      setExpenseLines(expenseRes.data || [])
    } catch (error) {
      console.error("Error fetching statement details:", error)
    }
  }

  // Close statement detail view
  const closeStatementDetail = () => {
    setSelectedStatement(null)
    setDetailedBookingLines([])
    setExpenseLines([])
  }

  // Generate statement manually
  const generateStatement = async () => {
    if (!window.confirm("Are you sure you want to generate a new owner statement?")) {
      return
    }

    try {
      // Get the current user to ensure authentication
      const authResponse = await fetch("/api/auth/check");
      if (!authResponse.ok) {
        throw new Error("Authentication required");
      }

      const authResult = await authResponse.json();
      if (!authResult.user) {
        throw new Error("User not authenticated");
      }

      const userId = authResult.user.id;

      // Get user's properties
      const { data: propertiesData, error: propertiesError } = await supabase
        .from("properties")
        .select("id")
        .eq("user_id", userId)
        .limit(1); // Just get one property for now

      if (propertiesError) {
        throw new Error(`Error fetching properties: ${propertiesError.message}`);
      }

      if (!propertiesData || propertiesData.length === 0) {
        throw new Error("No properties found for this user");
      }

      const propertyId = propertiesData[0].id;

      // Calculate period for this month
      const now = new Date();
      const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];

      // Check if statement already exists for this period
      const { data: existingStatement, error: existingError } = await supabase
        .from("owner_statements")
        .select("id")
        .eq("property_id", propertyId)
        .eq("period_start", start)
        .eq("period_end", end)
        .single()

      if (!existingError && existingStatement) {
        alert("Statement already exists for this period");
        checkAuthenticationAndFetchStatements(); // Refresh the list
        return;
      }

      // Get units for this property
      const { data: units, error: unitsError } = await supabase
        .from("units")
        .select("id")
        .eq("property_id", propertyId)

      if (unitsError) {
        throw new Error(`Error fetching units: ${unitsError.message}`);
      }

      const unitIds = units?.map(unit => unit.id) || [];

      // Fetch reservations for units of this property in the specified period
      let reservationsQuery = supabase
        .from("reservations")
        .select(`
          id,
          guest_name,
          check_in_date,
          check_out_date,
          total_price,
          payment_status
        `)
        .in("unit_id", unitIds)
        .gte("check_in_date", start)
        .lte("check_out_date", end)
        .in("payment_status", ["paid", "confirmed"]);

      const { data: reservations, error: reservationsError } = await reservationsQuery

      if (reservationsError) {
        throw new Error(`Error fetching reservations: ${reservationsError.message}`);
      }

      // Calculate revenue from reservations
      const totalRevenue = reservations?.reduce((sum, res) => sum + (res.total_price || 0), 0) || 0

      // Get expenses for this property in the period
      let expenses: any[] = [];
      let totalExpenses = 0;

      try {
        const { data, error } = await supabase
          .from("expenses") // Assuming there's an expenses table
          .select("amount")
          .eq("property_id", propertyId)
          .gte("date", start)
          .lte("date", end);

        if (!error && data) {
          expenses = data;
          totalExpenses = expenses.reduce((sum, exp) => sum + (exp.amount || 0), 0);
        }
      } catch (error) {
        console.warn("Expenses table not found or accessible:", error);
        // Continue without expenses for now
      }

      // Calculate management fee (assuming 10% default)
      const managementFeePercent = 10; // Default to 10%
      const managementFee = totalRevenue * (managementFeePercent / 100);
      const netPayout = totalRevenue - totalExpenses - managementFee

      // Insert the new owner statement
      const { data: newStatement, error: statementError } = await supabase
        .from("owner_statements")
        .insert({
          owner_id: userId,
          property_id: propertyId,
          period_start: start,
          period_end: end,
          total_revenue: totalRevenue,
          total_expenses: totalExpenses,
          management_fee: managementFee,
          net_payout: netPayout,
          payout_status: "pending" // Default to pending
        })
        .select()
        .single()

      if (statementError) {
        throw new Error(`Error creating statement: ${statementError.message}`);
      }

      // Insert booking lines based on reservations
      if (reservations && reservations.length > 0) {
        const bookingLines = reservations.map(res => ({
          statement_id: newStatement.id,
          reservation_id: res.id,
          guest_name: res.guest_name,
          stay_dates: `${res.check_in_date} to ${res.check_out_date}`,
          revenue: res.total_price,
          taxes: 0, // Placeholder - would come from reservation data
          fees: 0, // Placeholder - could be platform fees
          net_revenue: res.total_price
        }))

        const { error: bookingLinesError } = await supabase
          .from("owner_statement_booking_lines")
          .insert(bookingLines)

        if (bookingLinesError) {
          console.error("Error inserting booking lines:", bookingLinesError)
          // Continue even if booking lines fail to insert
        }
      }

      // Insert expense lines based on property expenses
      if (expenses && expenses.length > 0) {
        const expenseLines = expenses.map(exp => ({
          statement_id: newStatement.id,
          expense_type: "Property Expense", // Default type, could be more specific
          amount: exp.amount,
          date: exp.date,
          notes: `Expense from ${exp.date}`
        }))

        const { error: expenseLinesError } = await supabase
          .from("owner_statement_expense_lines")
          .insert(expenseLines)

        if (expenseLinesError) {
          console.error("Error inserting expense lines:", expenseLinesError)
          // Continue even if expense lines fail to insert
        }
      }

      alert("Owner statement generated successfully");
      checkAuthenticationAndFetchStatements(); // Refresh the list
    } catch (error: any) {
      console.error("Error generating statement:", error);
      alert(`Error generating statement: ${error.message || "Please try again."}`);
    }
  }

  // Export statement as PDF
  const exportAsPdf = (statement: OwnerStatement) => {
    // Create a new window with printable statement details
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Owner Statement - ${statement.id}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 20px; }
            .summary { margin: 15px 0; }
            .label { font-weight: bold; display: inline-block; width: 180px; }
            .value { display: inline-block; }
            table { width: 100%; border-collapse: collapse; margin: 15px 0; }
            th, td { border: 1px solid #000; padding: 8px; text-align: left; }
            th { background-color: #f0f0f0; }
            .footer { margin-top: 30px; text-align: center; font-style: italic; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Owner Statement</h1>
            <h2>${statement.property_name}</h2>
          </div>

          <div class="summary">
            <div><span class="label">Statement ID:</span> <span class="value">${statement.id}</span></div>
            <div><span class="label">Period:</span> <span class="value">${new Date(statement.period_start).toLocaleDateString()} - ${new Date(statement.period_end).toLocaleDateString()}</span></div>
            <div><span class="label">Total Revenue:</span> <span class="value">$${statement.total_revenue.toFixed(2)}</span></div>
            <div><span class="label">Total Expenses:</span> <span class="value">$${statement.total_expenses.toFixed(2)}</span></div>
            <div><span class="label">Management Fee:</span> <span class="value">$${statement.management_fee.toFixed(2)}</span></div>
            <div><span class="label">Net Payout:</span> <span class="value">$${statement.net_payout.toFixed(2)}</span></div>
            <div><span class="label">Payout Status:</span> <span class="value">${statement.payout_status}</span></div>
          </div>

          <h3>Detailed Booking Lines</h3>
          <table>
            <thead>
              <tr><th>Reservation ID</th><th>Guest Name</th><th>Stay Dates</th><th>Revenue</th><th>Taxes</th><th>Fees</th><th>Net Revenue</th></tr>
            </thead>
            <tbody>
              ${detailedBookingLines.map(line => `
                <tr>
                  <td>${line.reservation_id}</td>
                  <td>${line.guest_name}</td>
                  <td>${line.stay_dates}</td>
                  <td>$${line.revenue.toFixed(2)}</td>
                  <td>$${line.taxes.toFixed(2)}</td>
                  <td>$${line.fees.toFixed(2)}</td>
                  <td>$${line.net_revenue.toFixed(2)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <h3>Expense Lines</h3>
          <table>
            <thead>
              <tr><th>Type</th><th>Date</th><th>Amount</th><th>Notes</th></tr>
            </thead>
            <tbody>
              ${expenseLines.map(line => `
                <tr>
                  <td>${line.expense_type}</td>
                  <td>${new Date(line.date).toLocaleDateString()}</td>
                  <td>$${line.amount.toFixed(2)}</td>
                  <td>${line.notes}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

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
  }

  // Export statement as Excel (CSV format for simplicity without external libraries)
  const exportAsExcel = (statement: OwnerStatement) => {
    // Create CSV content
    let csvContent = `Owner Statement - ${statement.property_name}\n`;
    csvContent += `Statement ID,${statement.id}\n`;
    csvContent += `Period,${new Date(statement.period_start).toLocaleDateString()} - ${new Date(statement.period_end).toLocaleDateString()}\n`;
    csvContent += `Total Revenue,$${statement.total_revenue.toFixed(2)}\n`;
    csvContent += `Total Expenses,$${statement.total_expenses.toFixed(2)}\n`;
    csvContent += `Management Fee,$${statement.management_fee.toFixed(2)}\n`;
    csvContent += `Net Payout,$${statement.net_payout.toFixed(2)}\n`;
    csvContent += `Payout Status,${statement.payout_status}\n`;
    csvContent += `\n`;

    csvContent += `Detailed Booking Lines\n`;
    csvContent += `Reservation ID,Guest Name,Stay Dates,Revenue,Taxes,Fees,Net Revenue\n`;
    detailedBookingLines.forEach(line => {
      csvContent += `"${line.reservation_id}","${line.guest_name}","${line.stay_dates}",${line.revenue.toFixed(2)},${line.taxes.toFixed(2)},${line.fees.toFixed(2)},${line.net_revenue.toFixed(2)}\n`;
    });
    csvContent += `\n`;

    csvContent += `Expense Lines\n`;
    csvContent += `Expense Type,Date,Amount,Notes\n`;
    expenseLines.forEach(line => {
      csvContent += `"${line.expense_type}","${new Date(line.date).toLocaleDateString()}",${line.amount.toFixed(2)},"${line.notes}"\n`;
    });

    // Create and download CSV file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `Owner-Statement-${statement.id}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  // Print statement
  const printStatement = (statement: OwnerStatement) => {
    // Create a new window with printable reservation details
    const printWindow = window.open('', '_blank');
    if (printWindow && statement) {
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Owner Statement - ${statement.id}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 20px; }
            .summary { margin: 15px 0; }
            .label { font-weight: bold; display: inline-block; width: 180px; }
            .value { display: inline-block; }
            table { width: 100%; border-collapse: collapse; margin: 15px 0; }
            th, td { border: 1px solid #000; padding: 8px; text-align: left; }
            th { background-color: #f0f0f0; }
            .footer { margin-top: 30px; text-align: center; font-style: italic; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Owner Statement</h1>
            <h2>${statement.property_name}</h2>
          </div>

          <div class="summary">
            <div><span class="label">Statement ID:</span> <span class="value">${statement.id}</span></div>
            <div><span class="label">Period:</span> <span class="value">${new Date(statement.period_start).toLocaleDateString()} - ${new Date(statement.period_end).toLocaleDateString()}</span></div>
            <div><span class="label">Total Revenue:</span> <span class="value">$${statement.total_revenue.toFixed(2)}</span></div>
            <div><span class="label">Total Expenses:</span> <span class="value">$${statement.total_expenses.toFixed(2)}</span></div>
            <div><span class="label">Management Fee:</span> <span class="value">$${statement.management_fee.toFixed(2)}</span></div>
            <div><span class="label">Net Payout:</span> <span class="value">$${statement.net_payout.toFixed(2)}</span></div>
            <div><span class="label">Payout Status:</span> <span class="value">${statement.payout_status}</span></div>
          </div>

          <h3>Detailed Booking Lines</h3>
          <table>
            <thead>
              <tr><th>Reservation ID</th><th>Guest Name</th><th>Stay Dates</th><th>Revenue</th><th>Taxes</th><th>Fees</th><th>Net Revenue</th></tr>
            </thead>
            <tbody>
              ${detailedBookingLines.map(line => `
                <tr>
                  <td>${line.reservation_id}</td>
                  <td>${line.guest_name}</td>
                  <td>${line.stay_dates}</td>
                  <td>$${line.revenue.toFixed(2)}</td>
                  <td>$${line.taxes.toFixed(2)}</td>
                  <td>$${line.fees.toFixed(2)}</td>
                  <td>$${line.net_revenue.toFixed(2)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <h3>Expense Lines</h3>
          <table>
            <thead>
              <tr><th>Type</th><th>Date</th><th>Amount</th><th>Notes</th></tr>
            </thead>
            <tbody>
              ${expenseLines.map(line => `
                <tr>
                  <td>${line.expense_type}</td>
                  <td>${new Date(line.date).toLocaleDateString()}</td>
                  <td>$${line.amount.toFixed(2)}</td>
                  <td>${line.notes}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

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
  }

  // Statement status badge colors
  const statusColors = {
    paid: "bg-green-100 text-green-800 border border-green-200",
    pending: "bg-yellow-100 text-yellow-800 border border-yellow-200",
    on_hold: "bg-orange-100 text-orange-800 border border-orange-200",
    overdue: "bg-red-100 text-red-800 border border-red-200",
  }

  // Show authentication error message if not authenticated
  if (!isAuthenticated) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6">
        <div className="w-12 h-12 text-foreground opacity-50 flex items-center justify-center">
          <Receipt className="w-12 h-12" />
        </div>
        <h2 className="text-2xl font-bold text-center text-foreground">Access Denied</h2>
        <p className="text-muted-foreground text-center max-w-md">
          You are not authenticated. Please log in to access your owner statements.
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Owner Statements (كشف حساب المالك)</h1>
          <p className="text-muted-foreground mt-1">Manage and view owner statements for your properties</p>
        </div>

        <div className="flex gap-2 w-full md:w-auto">
          <Button
            variant="outline"
            className="gap-2 flex-1 md:flex-none"
            onClick={() => setShowGenerateForm(true)}
          >
            <Plus className="w-4 h-4" />
            Generate Statement
          </Button>
        </div>
      </div>

      {/* Generate Statement Form Modal */}
      {showGenerateForm && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-background border rounded-xl shadow-xl max-w-md w-full">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-foreground">Generate New Statement</h2>
                <button
                  onClick={() => setShowGenerateForm(false)}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleGenerateStatement}>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="property-select">Property</Label>
                    <Select name="property_id" required>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a property" />
                      </SelectTrigger>
                      <SelectContent>
                        {properties.map(property => (
                          <SelectItem key={property.id} value={property.id}>
                            {property.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="period-start">Start Date</Label>
                      <Input
                        id="period-start"
                        name="period_start"
                        type="date"
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="period-end">End Date</Label>
                      <Input
                        id="period-end"
                        name="period_end"
                        type="date"
                        required
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setShowGenerateForm(false)}
                    >
                      Cancel
                    </Button>
                    <Button type="submit">
                      Generate Statement
                    </Button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <Card className="border rounded-xl shadow-lg">
        <CardHeader>
          <CardTitle className="text-lg">Filters</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="owner-filter">Owner</Label>
            <Input
              id="owner-filter"
              placeholder="Owner ID"
              value={filters.owner_id}
              onChange={(e) => handleFilterChange('owner_id', e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="property-filter">Property</Label>
            <Input
              id="property-filter"
              placeholder="Property ID"
              value={filters.property_id}
              onChange={(e) => handleFilterChange('property_id', e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="period-filter">Period</Label>
            <Input
              id="period-filter"
              placeholder="YYYY-MM"
              value={filters.period}
              onChange={(e) => handleFilterChange('period', e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <Card className="flex justify-center items-center h-64 border rounded-xl shadow-lg">
          <div className="flex flex-col items-center gap-2">
            <div className="w-8 h-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
            <span className="text-foreground">Loading owner statements...</span>
          </div>
        </Card>
      ) : statements.length === 0 ? (
        <Card className="text-center py-12 border rounded-xl shadow-lg">
          <p className="text-muted-foreground">No owner statements found</p>
        </Card>
      ) : (
        <Card className="border rounded-xl shadow-lg">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted border-b">
                  <tr>
                    <th className="px-6 py-4 text-left font-semibold text-foreground">ID</th>
                    <th className="px-6 py-4 text-left font-semibold text-foreground">Property</th>
                    <th className="px-6 py-4 text-left font-semibold text-foreground">Period</th>
                    <th className="px-6 py-4 text-left font-semibold text-foreground">Total Revenue</th>
                    <th className="px-6 py-4 text-left font-semibold text-foreground">Total Expenses</th>
                    <th className="px-6 py-4 text-left font-semibold text-foreground">Net Payout</th>
                    <th className="px-6 py-4 text-left font-semibold text-foreground">Status</th>
                    <th className="px-6 py-4 text-left font-semibold text-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {statements.map((stmt) => (
                    <tr key={stmt.id} className="border-b hover:bg-muted transition-colors">
                      <td className="px-6 py-4 font-mono text-foreground">{stmt.id.substring(0, 8)}</td>
                      <td className="px-6 py-4 font-medium text-foreground">{stmt.property_name}</td>
                      <td className="px-6 py-4 text-foreground">
                        {new Date(stmt.period_start).toLocaleDateString()} - {new Date(stmt.period_end).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 font-semibold text-foreground">${stmt.total_revenue?.toFixed(2)}</td>
                      <td className="px-6 py-4 font-semibold text-foreground">${stmt.total_expenses?.toFixed(2)}</td>
                      <td className="px-6 py-4 font-semibold text-foreground">${stmt.net_payout?.toFixed(2)}</td>
                      <td className="px-6 py-4">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-medium ${
                            statusColors[stmt.payout_status as keyof typeof statusColors] || "bg-gray-100 text-gray-800"
                          }`}
                        >
                          {stmt.payout_status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-6 py-4 flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openStatementDetail(stmt)}
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => printStatement(stmt)}
                          title="Print Statement"
                        >
                          <Printer className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => exportAsPdf(stmt)}
                          title="Export as PDF"
                        >
                          <Download className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => exportAsExcel(stmt)}
                          title="Export as Excel"
                        >
                          <FileText className="w-4 h-4" />
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

      {/* Statement Detail Modal */}
      {selectedStatement && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-background border rounded-xl shadow-xl max-w-6xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-foreground">
                  Owner Statement Details: {selectedStatement.property_name}
                </h2>
                <button
                  onClick={closeStatementDetail}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              {/* Statement Summary */}
              <Card className="mb-6">
                <CardHeader>
                  <CardTitle className="text-lg">Statement Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-muted/50 p-4 rounded-lg">
                      <p className="text-sm text-muted-foreground">Period</p>
                      <p className="font-medium">
                        {new Date(selectedStatement.period_start).toLocaleDateString()} - {new Date(selectedStatement.period_end).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="bg-muted/50 p-4 rounded-lg">
                      <p className="text-sm text-muted-foreground">Total Revenue</p>
                      <p className="font-medium text-green-600">${selectedStatement.total_revenue?.toFixed(2)}</p>
                    </div>
                    <div className="bg-muted/50 p-4 rounded-lg">
                      <p className="text-sm text-muted-foreground">Total Expenses</p>
                      <p className="font-medium text-red-600">${selectedStatement.total_expenses?.toFixed(2)}</p>
                    </div>
                    <div className="bg-muted/50 p-4 rounded-lg">
                      <p className="text-sm text-muted-foreground">Net Payout</p>
                      <p className="font-medium text-blue-600">${selectedStatement.net_payout?.toFixed(2)}</p>
                    </div>
                    <div className="bg-muted/50 p-4 rounded-lg">
                      <p className="text-sm text-muted-foreground">Management Fee</p>
                      <p className="font-medium">${selectedStatement.management_fee?.toFixed(2)}</p>
                    </div>
                    <div className="bg-muted/50 p-4 rounded-lg">
                      <p className="text-sm text-muted-foreground">Status</p>
                      <p className="font-medium">
                        <span
                          className={`px-2 py-1 rounded text-xs ${
                            statusColors[selectedStatement.payout_status as keyof typeof statusColors] || "bg-gray-100 text-gray-800"
                          }`}
                        >
                          {selectedStatement.payout_status.replace('_', ' ')}
                        </span>
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Detailed Booking Lines */}
              <Card className="mb-6">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Receipt className="w-5 h-5" />
                    Detailed Booking Lines
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {detailedBookingLines.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-muted">
                          <tr>
                            <th className="px-4 py-3 text-left font-semibold text-foreground">Reservation ID</th>
                            <th className="px-4 py-3 text-left font-semibold text-foreground">Guest Name</th>
                            <th className="px-4 py-3 text-left font-semibold text-foreground">Stay Dates</th>
                            <th className="px-4 py-3 text-left font-semibold text-foreground">Revenue</th>
                            <th className="px-4 py-3 text-left font-semibold text-foreground">Taxes</th>
                            <th className="px-4 py-3 text-left font-semibold text-foreground">Fees</th>
                            <th className="px-4 py-3 text-left font-semibold text-foreground">Net Revenue</th>
                          </tr>
                        </thead>
                        <tbody>
                          {detailedBookingLines.map(line => (
                            <tr key={line.id} className="border-b hover:bg-muted">
                              <td className="px-4 py-3 text-foreground">{line.reservation_id.substring(0, 8)}</td>
                              <td className="px-4 py-3 text-foreground">{line.guest_name}</td>
                              <td className="px-4 py-3 text-foreground">{line.stay_dates}</td>
                              <td className="px-4 py-3 font-medium text-foreground">${line.revenue?.toFixed(2)}</td>
                              <td className="px-4 py-3 text-foreground">${line.taxes?.toFixed(2)}</td>
                              <td className="px-4 py-3 text-foreground">${line.fees?.toFixed(2)}</td>
                              <td className="px-4 py-3 font-medium text-green-600">${line.net_revenue?.toFixed(2)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="text-muted-foreground text-center py-4">No booking lines found for this statement</p>
                  )}
                </CardContent>
              </Card>

              {/* Expense Lines */}
              <Card className="mb-6">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <DollarSign className="w-5 h-5" />
                    Expense Lines
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {expenseLines.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-muted">
                          <tr>
                            <th className="px-4 py-3 text-left font-semibold text-foreground">Type</th>
                            <th className="px-4 py-3 text-left font-semibold text-foreground">Date</th>
                            <th className="px-4 py-3 text-left font-semibold text-foreground">Amount</th>
                            <th className="px-4 py-3 text-left font-semibold text-foreground">Notes</th>
                          </tr>
                        </thead>
                        <tbody>
                          {expenseLines.map(line => (
                            <tr key={line.id} className="border-b hover:bg-muted">
                              <td className="px-4 py-3 text-foreground">{line.expense_type}</td>
                              <td className="px-4 py-3 text-foreground">{new Date(line.date).toLocaleDateString()}</td>
                              <td className="px-4 py-3 font-medium text-red-600">${line.amount?.toFixed(2)}</td>
                              <td className="px-4 py-3 text-foreground">{line.notes}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="text-muted-foreground text-center py-4">No expense lines found for this statement</p>
                  )}
                </CardContent>
              </Card>

              {/* Action Buttons */}
              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button variant="outline" onClick={closeStatementDetail}>Close</Button>
                <Button onClick={() => printStatement(selectedStatement)}>Print Statement</Button>
                <Button onClick={() => exportAsPdf(selectedStatement)}>Export as PDF</Button>
                <Button onClick={() => exportAsExcel(selectedStatement)}>Export as Excel</Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}