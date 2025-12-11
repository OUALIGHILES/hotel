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
import { MoreHorizontal, Edit, Trash2 } from "lucide-react";
import EditPurchaseModal from "./edit-purchase-modal";

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
  expense?: {
    amount: number;
    total_amount: number;
    category: string;
    expense_date: string;
  };
}

interface PurchaseTableProps {
  purchases: Purchase[];
  onUpdate: () => void;
}

const PurchaseTable = ({ purchases, onUpdate }: PurchaseTableProps) => {
  const [editingPurchase, setEditingPurchase] = useState<Purchase | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
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

  const handleDeletePurchase = async (id: string) => {
    if (!confirm("Are you sure you want to delete this purchase?")) return;

    try {
      await import("@/lib/services/expense-service").then(
        (module) => module.purchaseService.deletePurchase(id)
      );

      onUpdate(); // Refresh the data
    } catch (error) {
      console.error("Error deleting purchase:", error);
    }
  };

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Asset Name</TableHead>
            <TableHead>Quantity</TableHead>
            <TableHead>Unit Price</TableHead>
            <TableHead>Total Price</TableHead>
            <TableHead>Supplier</TableHead>
            <TableHead>Assigned To</TableHead>
            <TableHead>Warranty Expiry</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {purchases.length > 0 ? (
            purchases.map((purchase) => (
              <TableRow key={purchase.id}>
                <TableCell className="font-medium">{purchase.asset_name}</TableCell>
                <TableCell>{purchase.quantity}</TableCell>
                <TableCell>{formatCurrency(purchase.unit_price)}</TableCell>
                <TableCell>{formatCurrency(purchase.total_price)}</TableCell>
                <TableCell>{purchase.supplier}</TableCell>
                <TableCell>{purchase.assigned_to || 'Unassigned'}</TableCell>
                <TableCell>{formatDate(purchase.warranty_expiry)}</TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="h-8 w-8 p-0">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => {
                        setEditingPurchase(purchase);
                        setShowEditModal(true);
                      }}>
                        <Edit className="mr-2 h-4 w-4" /> Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        className="text-red-600"
                        onClick={() => handleDeletePurchase(purchase.id)}
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
                No purchases found. Start by adding your first purchase.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      {/* Edit Purchase Modal */}
      {showEditModal && editingPurchase && (
        <EditPurchaseModal
          purchase={editingPurchase}
          onClose={() => {
            setShowEditModal(false);
            setEditingPurchase(null);
          }}
          onUpdate={onUpdate}
        />
      )}
    </div>
  );
};

export default PurchaseTable;