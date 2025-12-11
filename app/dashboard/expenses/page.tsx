"use client";

import React, { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { CalendarIcon, Plus, Search, Filter, Download, FileText, FileSpreadsheet, FileDown, Printer, X } from "lucide-react";
import { expenseService, purchaseService } from "@/lib/services/expense-service";
import ExpenseTable from "./expense-table";
import PurchaseTable from "./purchase-table";
import ExpenseSummary from "./expense-summary";
import ExpenseFilter from "./expense-filter";
import AddExpenseModal from "./add-expense-modal";
import AddPurchaseModal from "./add-purchase-modal";

const ExpensesPage = () => {
  const [expenses, setExpenses] = useState<any[]>([]);
  const [purchases, setPurchases] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddExpenseModal, setShowAddExpenseModal] = useState(false);
  const [showAddPurchaseModal, setShowAddPurchaseModal] = useState(false);

  // Filters
  const [filters, setFilters] = useState({
    propertyId: '',
    category: '',
    dateFrom: '',
    dateTo: '',
    approvalStatus: ''
  });

  const [showFilters, setShowFilters] = useState(false);

  // Fetch expenses and purchases
  useEffect(() => {
    fetchExpensesAndPurchases();
  }, [filters]);

  const fetchExpensesAndPurchases = async () => {
    try {
      setLoading(true);

      // Convert filters to the format expected by the service
      const serviceFilters: Record<string, any> = {};
      if (filters.propertyId) serviceFilters.propertyId = filters.propertyId;
      if (filters.category) serviceFilters.category = filters.category;
      if (filters.approvalStatus) serviceFilters.approvalStatus = filters.approvalStatus;
      if (filters.dateFrom) serviceFilters.dateFrom = filters.dateFrom;
      if (filters.dateTo) serviceFilters.dateTo = filters.dateTo;

      // Fetch expenses using the service
      const expensesData = await expenseService.getExpenses(serviceFilters);
      setExpenses(expensesData || []);

      // Fetch purchases using the service
      const purchasesData = await purchaseService.getPurchases({ propertyId: filters.propertyId });
      setPurchases(purchasesData || []);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (filterName: string, value: string) => {
    setFilters(prev => ({
      ...prev,
      [filterName]: value
    }));
  };

  const handleResetFilters = () => {
    setFilters({
      propertyId: '',
      category: '',
      dateFrom: '',
      dateTo: '',
      approvalStatus: ''
    });
  };

  // Handle adding new expense
  const handleAddExpense = async (expenseData: any) => {
    try {
      // Check authentication using the custom auth system
      const response = await fetch("/api/auth/check");
      if (!response.ok) {
        throw new Error("User not authenticated");
      }

      const result = await response.json();
      if (!result.user) {
        throw new Error("User not authenticated");
      }

      // Use the user's ID from the auth result, ensuring it's properly formatted if needed
      const userId = result.user.id;

      const newExpense = await expenseService.createExpense({
        ...expenseData,
        // Ensure recorded_by is a valid UUID - if it's not, you might need to adjust this based on your auth system
        recorded_by: userId
      });

      setExpenses([newExpense, ...expenses]);
      setShowAddExpenseModal(false);
    } catch (error) {
      console.error("Error adding expense:", error);
      // Optionally show a user-friendly error message
      alert("Failed to add expense: " + (error as Error).message);
    }
  };

  // Handle adding new purchase
  const handleAddPurchase = async (purchaseData: any) => {
    try {
      const newPurchase = await purchaseService.createPurchase(purchaseData);

      setPurchases([newPurchase, ...purchases]);
      setShowAddPurchaseModal(false);
    } catch (error) {
      console.error("Error adding purchase:", error);
    }
  };

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  // Export as CSV
  const exportAsCSV = (type: 'expenses' | 'purchases') => {
    let data: any[] = [];
    let filename = '';

    if (type === 'expenses') {
      data = expenses.map(e => ({
        'ID': e.id,
        'Property ID': e.property_id,
        'Category': e.category,
        'Sub Category': e.sub_category || '',
        'Amount': e.amount || 0,
        'Tax %': e.tax_percentage || 0,
        'Total Amount': e.total_amount || 0,
        'Payment Method': e.payment_method,
        'Supplier Name': e.supplier_name || '',
        'Receipt Number': e.receipt_number || '',
        'Expense Date': e.expense_date,
        'Approval Status': e.approval_status,
        'Notes': e.notes || '',
        'Recorded By': e.recorded_by_user ? `${e.recorded_by_user.first_name || ''} ${e.recorded_by_user.last_name || ''}`.trim() || 'Unknown' : 'Unknown',
        'Approved By': e.approved_by_user ? `${e.approved_by_user.first_name || ''} ${e.approved_by_user.last_name || ''}`.trim() || 'Unknown' : 'Unknown'
      }));
      filename = 'expenses.csv';
    } else {
      data = purchases.map(p => ({
        'ID': p.id,
        'Expense ID': p.expense_id,
        'Property ID': p.property_id,
        'Asset Name': p.asset_name,
        'Quantity': p.quantity || 0,
        'Unit Price': p.unit_price || 0,
        'Total Price': p.total_price || 0,
        'Supplier': p.supplier || '',
        'Warranty Expiry': p.warranty_expiry || '',
        'Assigned To': p.assigned_to || '',
        'Created At': p.created_at,
        'Expense Amount': p.expense?.amount || 0,
        'Expense Total': p.expense?.total_amount || 0,
        'Expense Category': p.expense?.category || '',
        'Expense Date': p.expense?.expense_date || ''
      }));
      filename = 'purchases.csv';
    }

    // Handle empty data case
    if (data.length === 0) {
      alert(`No ${type} to export`);
      return;
    }

    const headers = Object.keys(data[0]).join(',');
    const rows = data.map(row =>
      Object.values(row).map(value => {
        // Properly escape values that might contain commas or quotes
        const stringValue = String(value);
        if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
          return `"${stringValue.replace(/"/g, '""')}"`;
        }
        return stringValue;
      }).join(',')
    );

    const csvContent = [headers, ...rows].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.setAttribute('href', URL.createObjectURL(blob));
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Simple PDF export using print functionality
  const exportAsPDF = (type: 'expenses' | 'purchases') => {
    if ((type === 'expenses' && expenses.length === 0) || (type === 'purchases' && purchases.length === 0)) {
      alert(`No ${type} to export`);
      return;
    }

    // Create a printable HTML table
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>${type === 'expenses' ? 'Expenses Report' : 'Purchases Report'}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 20px; }
            table { width: 100%; border-collapse: collapse; margin: 20px 0; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f2f2f2; }
            .footer { margin-top: 40px; text-align: center; font-style: italic; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>${type === 'expenses' ? 'Expenses Report' : 'Purchases Report'}</h1>
            <p>Generated on: ${new Date().toLocaleString()}</p>
          </div>

          <table>
            <thead>
              <tr>
                ${type === 'expenses'
                  ? '<th>ID</th><th>Property ID</th><th>Category</th><th>Sub Category</th><th>Amount</th><th>Tax %</th><th>Total</th><th>Payment Method</th><th>Supplier</th><th>Date</th><th>Status</th>'
                  : '<th>ID</th><th>Expense ID</th><th>Property ID</th><th>Asset Name</th><th>Qty</th><th>Unit Price</th><th>Total</th><th>Supplier</th><th>Warranty Expiry</th><th>Assigned To</th>'
                }
              </tr>
            </thead>
            <tbody>
              ${type === 'expenses'
                ? expenses.map(e => `
                  <tr>
                    <td>${e.id}</td>
                    <td>${e.property_id || ''}</td>
                    <td>${e.category ? e.category.replace(/_/g, ' ') : ''}</td>
                    <td>${e.sub_category || ''}</td>
                    <td>$${(e.amount || 0).toFixed(2)}</td>
                    <td>${e.tax_percentage || 0}%</td>
                    <td>$${(e.total_amount || 0).toFixed(2)}</td>
                    <td>${e.payment_method ? e.payment_method.replace(/_/g, ' ') : ''}</td>
                    <td>${e.supplier_name || ''}</td>
                    <td>${e.expense_date ? new Date(e.expense_date).toLocaleDateString() : 'N/A'}</td>
                    <td>${e.approval_status || ''}</td>
                  </tr>
                `).join('')
                : purchases.map(p => `
                  <tr>
                    <td>${p.id}</td>
                    <td>${p.expense_id || ''}</td>
                    <td>${p.property_id || ''}</td>
                    <td>${p.asset_name || ''}</td>
                    <td>${p.quantity || 0}</td>
                    <td>$${(p.unit_price || 0).toFixed(2)}</td>
                    <td>$${(p.total_price || 0).toFixed(2)}</td>
                    <td>${p.supplier || ''}</td>
                    <td>${p.warranty_expiry ? new Date(p.warranty_expiry).toLocaleDateString() : 'N/A'}</td>
                    <td>${p.assigned_to || 'Unassigned'}</td>
                  </tr>
                `).join('')
              }
            </tbody>
          </table>

          <div class="footer">
            <p>Generated by PMS Dashboard</p>
          </div>
        </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.focus();

      // Wait for content to load before printing
      printWindow.onload = () => {
        printWindow.print();
      };
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6">
        <div className="w-8 h-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
        <span className="text-foreground">Loading expenses and purchases...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Expenses & Purchases</h1>
          <p className="text-muted-foreground">Track all property-related expenses and purchases</p>
        </div>
        <div className="flex gap-2">
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => exportAsCSV('expenses')}>
              <FileSpreadsheet className="w-4 h-4 mr-2" />
              Export Expenses CSV
            </Button>
            <Button variant="outline" onClick={() => exportAsPDF('expenses')}>
              <Printer className="w-4 h-4 mr-2" />
              Export Expenses PDF
            </Button>
          </div>
          <Button variant="outline" onClick={() => setShowAddExpenseModal(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Add Expense
          </Button>
        </div>
      </div>

      <ExpenseSummary expenses={expenses} purchases={purchases} />

      <div className="flex justify-end">
        <Button
          variant="outline"
          onClick={() => setShowFilters(!showFilters)}
          className="flex items-center gap-2"
        >
          <Filter className="w-4 h-4" />
          {showFilters ? 'Hide Filters' : 'Show Filters'}
        </Button>
      </div>

      {showFilters && (
        <ExpenseFilter
          filters={filters}
          onFilterChange={handleFilterChange}
          onResetFilters={handleResetFilters}
        />
      )}

      <Tabs defaultValue="expenses" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="expenses">Expenses</TabsTrigger>
          <TabsTrigger value="purchases">Purchases</TabsTrigger>
        </TabsList>
        
        <TabsContent value="expenses">
          <Card>
            <CardHeader>
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <CardTitle>Expense Records</CardTitle>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setShowAddExpenseModal(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Expense
                  </Button>
                  <Button variant="outline" onClick={() => exportAsCSV('expenses')}>
                    <FileSpreadsheet className="w-4 h-4 mr-2" />
                    Export CSV
                  </Button>
                  <Button variant="outline" onClick={() => exportAsPDF('expenses')}>
                    <Printer className="w-4 h-4 mr-2" />
                    Export PDF
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <ExpenseTable expenses={expenses} onUpdate={fetchExpensesAndPurchases} />
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="purchases">
          <Card>
            <CardHeader>
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <CardTitle>Purchase Records</CardTitle>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setShowAddPurchaseModal(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Purchase
                  </Button>
                  <Button variant="outline" onClick={() => exportAsCSV('purchases')}>
                    <FileSpreadsheet className="w-4 h-4 mr-2" />
                    Export CSV
                  </Button>
                  <Button variant="outline" onClick={() => exportAsPDF('purchases')}>
                    <Printer className="w-4 h-4 mr-2" />
                    Export PDF
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <PurchaseTable purchases={purchases} onUpdate={fetchExpensesAndPurchases} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Modal for adding expense */}
      {showAddExpenseModal && (
        <AddExpenseModal
          onClose={() => setShowAddExpenseModal(false)}
          onSubmit={handleAddExpense}
        />
      )}

      {/* Modal for adding purchase */}
      {showAddPurchaseModal && (
        <AddPurchaseModal
          onClose={() => setShowAddPurchaseModal(false)}
          onSubmit={handleAddPurchase}
        />
      )}
    </div>
  );
};

export default ExpensesPage;