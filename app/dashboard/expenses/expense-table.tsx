"use client";

import React, { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Edit, Trash2, CheckCircle, XCircle } from "lucide-react";
import EditExpenseModal from "./edit-expense-modal";

interface Expense {
  id: string;
  property_id: string;
  owner_id: string;
  category: string;
  sub_category: string;
  amount: number;
  tax_percentage: number;
  total_amount: number;
  payment_method: string;
  supplier_name: string;
  receipt_number: string;
  expense_date: string;
  recorded_by_user: {
    first_name: string;
    last_name: string;
  };
  approved_by_user?: {
    first_name: string;
    last_name: string;
  };
  approval_status: string;
  notes: string;
}

interface ExpenseTableProps {
  expenses: Expense[];
  onUpdate: () => void;
}

const ExpenseTable = ({ expenses, onUpdate }: ExpenseTableProps) => {
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'approved':
        return 'success';
      case 'pending':
        return 'secondary';
      case 'rejected':
        return 'destructive';
      default:
        return 'default';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const handleApproveExpense = async (id: string) => {
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

      const userId = result.user.id;

      await import("@/lib/services/expense-service").then(
        (module) => module.expenseService.updateApprovalStatus(id, 'approved', userId)
      );

      onUpdate(); // Refresh the data
    } catch (error) {
      console.error("Error approving expense:", error);
    }
  };

  const handleRejectExpense = async (id: string) => {
    try {
      await import("@/lib/services/expense-service").then(
        (module) => module.expenseService.updateApprovalStatus(id, 'rejected', null)
      );

      onUpdate(); // Refresh the data
    } catch (error) {
      console.error("Error rejecting expense:", error);
    }
  };

  const handleDeleteExpense = async (id: string) => {
    if (!confirm("Are you sure you want to delete this expense?")) return;

    try {
      await import("@/lib/services/expense-service").then(
        (module) => module.expenseService.deleteExpense(id)
      );

      onUpdate(); // Refresh the data
    } catch (error) {
      console.error("Error deleting expense:", error);
    }
  };

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Category</TableHead>
            <TableHead>Amount</TableHead>
            <TableHead>Supplier</TableHead>
            <TableHead>Payment Method</TableHead>
            <TableHead>Recorded By</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {expenses.length > 0 ? (
            expenses.map((expense) => (
              <TableRow key={expense.id}>
                <TableCell className="font-medium">{formatDate(expense.expense_date)}</TableCell>
                <TableCell>
                  <Badge variant="secondary">
                    {expense.category.replace(/_/g, ' ').toUpperCase()}
                  </Badge>
                  {expense.sub_category && (
                    <div className="text-xs text-muted-foreground mt-1">
                      {expense.sub_category}
                    </div>
                  )}
                </TableCell>
                <TableCell>{formatCurrency(expense.total_amount)}</TableCell>
                <TableCell>{expense.supplier_name}</TableCell>
                <TableCell>
                  <Badge variant="outline">
                    {expense.payment_method.replace(/_/g, ' ')}
                  </Badge>
                </TableCell>
                <TableCell>
                  {expense.recorded_by_user
                    ? `${expense.recorded_by_user.first_name || ''} ${expense.recorded_by_user.last_name || ''}`.trim() || 'Unknown'
                    : 'Unknown'}
                </TableCell>
                <TableCell>
                  <Badge variant={getStatusBadgeVariant(expense.approval_status)}>
                    {expense.approval_status.charAt(0).toUpperCase() + expense.approval_status.slice(1)}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="h-8 w-8 p-0">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => {
                        setEditingExpense(expense);
                        setShowEditModal(true);
                      }}>
                        <Edit className="mr-2 h-4 w-4" /> Edit
                      </DropdownMenuItem>
                      {expense.approval_status === 'pending' && (
                        <>
                          <DropdownMenuItem onClick={() => handleApproveExpense(expense.id)}>
                            <CheckCircle className="mr-2 h-4 w-4" /> Approve
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleRejectExpense(expense.id)}>
                            <XCircle className="mr-2 h-4 w-4" /> Reject
                          </DropdownMenuItem>
                        </>
                      )}
                      <DropdownMenuItem
                        className="text-red-600"
                        onClick={() => handleDeleteExpense(expense.id)}
                      >
                        <Trash2 className="mr-2 h-4 w-4" /> Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                No expenses found. Start by adding your first expense.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      {/* Edit Expense Modal */}
      {showEditModal && editingExpense && (
        <EditExpenseModal
          expense={editingExpense}
          onClose={() => {
            setShowEditModal(false);
            setEditingExpense(null);
          }}
          onUpdate={onUpdate}
        />
      )}
    </div>
  );
};

export default ExpenseTable;