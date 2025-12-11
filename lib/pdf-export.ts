// utils/pdf-export.ts
import jsPDF from 'jspdf';
import 'jspdf-autotable';

interface Expense {
  id: string;
  property_id: string;
  category: string;
  sub_category: string;
  amount: number;
  tax_percentage: number;
  total_amount: number;
  payment_method: string;
  supplier_name: string;
  receipt_number: string;
  expense_date: string;
  approval_status: string;
  notes: string;
  recorded_by_user: {
    first_name: string;
    last_name: string;
  };
  approved_by_user?: {
    first_name: string;
    last_name: string;
  };
}

interface Purchase {
  id: string;
  expense_id: string;
  property_id: string;
  asset_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  supplier: string;
  warranty_expiry: string;
  assigned_to: string;
  created_at: string;
  expense: {
    amount: number;
    total_amount: number;
    category: string;
    expense_date: string;
  };
}

export const exportExpensesToPDF = (expenses: Expense[], title: string = 'Expenses Report') => {
  const doc = new jsPDF();

  // Title
  doc.setFontSize(18);
  doc.text(title, 14, 20);

  // Date
  doc.setFontSize(10);
  doc.text(`Report generated on: ${new Date().toLocaleDateString()}`, 14, 30);

  // Table
  const tableData = expenses.map((expense) => [
    expense.id,
    expense.property_id,
    expense.category,
    expense.sub_category || '',
    expense.amount.toFixed(2),
    expense.tax_percentage ? expense.tax_percentage + '%' : '0%',
    expense.total_amount.toFixed(2),
    expense.payment_method,
    expense.supplier_name,
    new Date(expense.expense_date).toLocaleDateString(),
    expense.approval_status,
    expense.notes,
    expense.recorded_by_user 
      ? `${expense.recorded_by_user.first_name} ${expense.recorded_by_user.last_name}`
      : ''
  ]);

  const headers = [
    'ID', 'Property ID', 'Category', 'Sub Category', 
    'Amount', 'Tax %', 'Total', 'Payment Method', 
    'Supplier', 'Date', 'Status', 'Notes', 'Recorded By'
  ];

  // @ts-ignore: jspdf-autotable adds this method to jsPDF
  doc.autoTable({
    head: [headers],
    body: tableData,
    startY: 35,
    theme: 'grid',
    headStyles: { fillColor: [22, 163, 74] }, // Primary color
    styles: { fontSize: 8 },
    columnStyles: {
      0: { cellWidth: 25 }, // ID
      1: { cellWidth: 20 }, // Property ID
      2: { cellWidth: 25 }, // Category
      3: { cellWidth: 25 }, // Sub Category
      11: { cellWidth: 30 }, // Notes
    }
  });

  doc.save(`${title.replace(/\s+/g, '_').toLowerCase()}.pdf`);
};

export const exportPurchasesToPDF = (purchases: Purchase[], title: string = 'Purchases Report') => {
  const doc = new jsPDF();

  // Title
  doc.setFontSize(18);
  doc.text(title, 14, 20);

  // Date
  doc.setFontSize(10);
  doc.text(`Report generated on: ${new Date().toLocaleDateString()}`, 14, 30);

  // Table
  const tableData = purchases.map((purchase) => [
    purchase.id,
    purchase.expense_id,
    purchase.property_id,
    purchase.asset_name,
    purchase.quantity,
    purchase.unit_price.toFixed(2),
    purchase.total_price.toFixed(2),
    purchase.supplier || '',
    purchase.warranty_expiry ? new Date(purchase.warranty_expiry).toLocaleDateString() : 'N/A',
    purchase.assigned_to || 'Unassigned',
    purchase.expense ? new Date(purchase.expense.expense_date).toLocaleDateString() : '',
    purchase.expense ? purchase.expense.category : ''
  ]);

  const headers = [
    'ID', 'Expense ID', 'Property ID', 'Asset Name', 
    'Qty', 'Unit Price', 'Total', 'Supplier', 
    'Warranty', 'Assigned To', 'Expense Date', 'Category'
  ];

  // @ts-ignore: jspdf-autotable adds this method to jsPDF
  doc.autoTable({
    head: [headers],
    body: tableData,
    startY: 35,
    theme: 'grid',
    headStyles: { fillColor: [22, 163, 74] }, // Primary color
    styles: { fontSize: 8 },
    columnStyles: {
      0: { cellWidth: 20 }, // ID
      1: { cellWidth: 20 }, // Expense ID
      2: { cellWidth: 20 }, // Property ID
      3: { cellWidth: 30 }, // Asset Name
      7: { cellWidth: 25 }, // Supplier
      9: { cellWidth: 25 }, // Assigned To
    }
  });

  doc.save(`${title.replace(/\s+/g, '_').toLowerCase()}.pdf`);
};