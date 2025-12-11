"use client";

import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { CalendarIcon, Upload } from "lucide-react";
import { cn } from "@/lib/utils";

interface Property {
  id: string;
  name: string;
}

interface AddExpenseModalProps {
  onClose: () => void;
  onSubmit: (expenseData: any) => void;
}

const AddExpenseModal = ({ onClose, onSubmit }: AddExpenseModalProps) => {
  const [properties, setProperties] = useState<Property[]>([]);
  const [loadingProperties, setLoadingProperties] = useState(true);

  const [formData, setFormData] = useState({
    property_id: '',
    category: 'cleaning_supplies',
    sub_category: '',
    amount: '',
    tax_percentage: '0',
    payment_method: 'cash',
    supplier_name: '',
    receipt_number: '',
    receipt_image_url: '',
    expense_date: new Date(),
    notes: '',
    approval_status: 'pending'
  });

  // Fetch properties when modal opens
  useEffect(() => {
    fetchProperties();
  }, []);

  const fetchProperties = async () => {
    try {
      setLoadingProperties(true);

      // Check authentication
      const response = await fetch("/api/auth/check");
      if (!response.ok) {
        throw new Error("User not authenticated");
      }

      const result = await response.json();
      if (!result.user) {
        throw new Error("User not authenticated");
      }

      // Get user's properties
      const supabase = await import("@/lib/supabase/client").then(module => module.createClient());

      const { data: propertiesData, error: propertiesError } = await supabase
        .from("properties")
        .select("id, name")
        .eq("user_id", result.user.id);

      if (propertiesError) throw propertiesError;

      setProperties(propertiesData || []);
    } catch (error) {
      console.error("Error fetching properties:", error);
      // Still allow the modal to show but with empty properties
      setProperties([]);
    } finally {
      setLoadingProperties(false);
    }
  };

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

    if (!formData.property_id.trim()) newErrors.property_id = 'Property is required';
    if (!formData.category) newErrors.category = 'Category is required';
    if (!formData.amount || parseFloat(formData.amount) <= 0) newErrors.amount = 'Valid amount is required';
    if (!formData.payment_method) newErrors.payment_method = 'Payment method is required';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (!validateForm()) return;

    // Calculate total amount based on tax
    const amount = parseFloat(formData.amount);
    const taxPercentage = parseFloat(formData.tax_percentage) || 0;
    const totalAmount = amount + (amount * taxPercentage / 100);

    const submitData = {
      ...formData,
      amount: parseFloat(formData.amount),
      tax_percentage: taxPercentage,
      total_amount: totalAmount,
      expense_date: formData.expense_date.toISOString(),
    };

    onSubmit(submitData);
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Add New Expense</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="property_id">Property *</Label>
            {loadingProperties ? (
              <div className="w-full h-10 flex items-center justify-center bg-muted rounded-md">
                <span className="text-muted-foreground">Loading properties...</span>
              </div>
            ) : properties.length > 0 ? (
              <Select value={formData.property_id} onValueChange={(value) => handleChange('property_id', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a property" />
                </SelectTrigger>
                <SelectContent>
                  {properties.map((property) => (
                    <SelectItem key={property.id} value={property.id}>
                      {property.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <div className="w-full h-10 flex items-center justify-center bg-muted rounded-md">
                <span className="text-muted-foreground">No properties found</span>
              </div>
            )}
            {errors.property_id && <p className="text-sm text-red-500">{errors.property_id}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="category">Category *</Label>
            <Select value={formData.category} onValueChange={(value) => handleChange('category', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cleaning_supplies">Cleaning Supplies</SelectItem>
                <SelectItem value="maintenance">Maintenance</SelectItem>
                <SelectItem value="furniture_purchase">Furniture Purchase</SelectItem>
                <SelectItem value="utilities">Utilities</SelectItem>
                <SelectItem value="staff_expenses">Staff Expenses</SelectItem>
                <SelectItem value="consumables">Consumables</SelectItem>
                <SelectItem value="government_fees">Government Fees</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
            {errors.category && <p className="text-sm text-red-500">{errors.category}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="sub_category">Sub Category</Label>
            <Input
              id="sub_category"
              value={formData.sub_category}
              onChange={(e) => handleChange('sub_category', e.target.value)}
              placeholder="Enter sub category"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="payment_method">Payment Method *</Label>
            <Select value={formData.payment_method} onValueChange={(value) => handleChange('payment_method', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select payment method" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cash">Cash</SelectItem>
                <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                <SelectItem value="credit_card">Credit Card</SelectItem>
                <SelectItem value="company_account">Company Account</SelectItem>
                <SelectItem value="wallet">Wallet</SelectItem>
              </SelectContent>
            </Select>
            {errors.payment_method && <p className="text-sm text-red-500">{errors.payment_method}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="amount">Amount *</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              value={formData.amount}
              onChange={(e) => handleChange('amount', e.target.value)}
              placeholder="0.00"
            />
            {errors.amount && <p className="text-sm text-red-500">{errors.amount}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="tax_percentage">Tax Percentage</Label>
            <Input
              id="tax_percentage"
              type="number"
              step="0.01"
              value={formData.tax_percentage}
              onChange={(e) => handleChange('tax_percentage', e.target.value)}
              placeholder="0.00"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="supplier_name">Supplier Name</Label>
            <Input
              id="supplier_name"
              value={formData.supplier_name}
              onChange={(e) => handleChange('supplier_name', e.target.value)}
              placeholder="Enter supplier name"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="receipt_number">Receipt Number</Label>
            <Input
              id="receipt_number"
              value={formData.receipt_number}
              onChange={(e) => handleChange('receipt_number', e.target.value)}
              placeholder="Enter receipt number"
            />
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="expense_date">Expense Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant={"outline"}
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !formData.expense_date && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {formData.expense_date ? format(formData.expense_date, "PPP") : <span>Pick a date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={formData.expense_date}
                  onSelect={(date) => date && handleChange('expense_date', date)}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => handleChange('notes', e.target.value)}
              placeholder="Any additional notes about this expense..."
            />
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="receipt_upload">Upload Receipt</Label>
            <div className="flex items-center gap-4">
              <Button variant="outline" type="button" className="w-full">
                <Upload className="w-4 h-4 mr-2" />
                Upload Receipt Image/PDF
              </Button>
              {formData.receipt_image_url && (
                <p className="text-sm text-muted-foreground">File uploaded</p>
              )}
            </div>
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit}>Add Expense</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AddExpenseModal;