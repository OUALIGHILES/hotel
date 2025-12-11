"use client";

import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { CalendarIcon, Upload } from "lucide-react";
import { cn } from "@/lib/utils";

interface Purchase {
  id: string;
  expense_id: string;
  property_id: string;
  asset_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  supplier: string;
  warranty_expiry: string | null;
  assigned_to: string;
}

interface EditPurchaseModalProps {
  purchase: Purchase;
  onClose: () => void;
  onUpdate: () => void;
}

const EditPurchaseModal = ({ purchase, onClose, onUpdate }: EditPurchaseModalProps) => {
  const [formData, setFormData] = useState({
    expense_id: purchase.expense_id || '',
    property_id: purchase.property_id || '',
    asset_name: purchase.asset_name,
    quantity: purchase.quantity.toString(),
    unit_price: purchase.unit_price.toString(),
    supplier: purchase.supplier || '',
    warranty_expiry: purchase.warranty_expiry ? new Date(purchase.warranty_expiry) : null,
    assigned_to: purchase.assigned_to || '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));

    // Clear error for this field
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.asset_name.trim()) newErrors.asset_name = 'Asset name is required';
    if (!formData.quantity || parseInt(formData.quantity) <= 0) newErrors.quantity = 'Valid quantity is required';
    if (!formData.unit_price || parseFloat(formData.unit_price) <= 0) newErrors.unit_price = 'Valid unit price is required';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    try {
      const quantity = parseInt(formData.quantity);
      const unitPrice = parseFloat(formData.unit_price);
      const totalPrice = quantity * unitPrice;

      const submitData = {
        quantity,
        unit_price: unitPrice,
        expense_id: formData.expense_id,
        property_id: formData.property_id,
        asset_name: formData.asset_name,
        supplier: formData.supplier,
        warranty_expiry: formData.warranty_expiry ? formData.warranty_expiry.toISOString() : null,
        assigned_to: formData.assigned_to,
      };

      await import("@/lib/services/expense-service").then(
        (module) => module.purchaseService.updatePurchase(purchase.id, submitData)
      );

      onUpdate(); // Refresh the data
      onClose(); // Close the modal
    } catch (error) {
      console.error("Error updating purchase:", error);
    }
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Edit Purchase</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="expense_id">Related Expense ID</Label>
            <Input
              id="expense_id"
              value={formData.expense_id}
              onChange={(e) => handleChange('expense_id', e.target.value)}
              placeholder="Enter expense ID"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="property_id">Property ID</Label>
            <Input
              id="property_id"
              value={formData.property_id}
              onChange={(e) => handleChange('property_id', e.target.value)}
              placeholder="Enter property ID"
            />
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="asset_name">Asset Name *</Label>
            <Input
              id="asset_name"
              value={formData.asset_name}
              onChange={(e) => handleChange('asset_name', e.target.value)}
              placeholder="Enter asset name"
            />
            {errors.asset_name && <p className="text-sm text-red-500">{errors.asset_name}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="quantity">Quantity *</Label>
            <Input
              id="quantity"
              type="number"
              min="1"
              value={formData.quantity}
              onChange={(e) => handleChange('quantity', e.target.value)}
              placeholder="1"
            />
            {errors.quantity && <p className="text-sm text-red-500">{errors.quantity}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="unit_price">Unit Price *</Label>
            <Input
              id="unit_price"
              type="number"
              step="0.01"
              value={formData.unit_price}
              onChange={(e) => handleChange('unit_price', e.target.value)}
              placeholder="0.00"
            />
            {errors.unit_price && <p className="text-sm text-red-500">{errors.unit_price}</p>}
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="supplier">Supplier</Label>
            <Input
              id="supplier"
              value={formData.supplier}
              onChange={(e) => handleChange('supplier', e.target.value)}
              placeholder="Enter supplier name"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="warranty_expiry">Warranty Expiry</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant={"outline"}
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !formData.warranty_expiry && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {formData.warranty_expiry ? format(formData.warranty_expiry, "PPP") : <span>Pick a date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={formData.warranty_expiry || undefined}
                  onSelect={(date) => handleChange('warranty_expiry', date)}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
            <Label htmlFor="assigned_to">Assigned To</Label>
            <Input
              id="assigned_to"
              value={formData.assigned_to}
              onChange={(e) => handleChange('assigned_to', e.target.value)}
              placeholder="Unit or warehouse"
            />
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit}>Update Purchase</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default EditPurchaseModal;