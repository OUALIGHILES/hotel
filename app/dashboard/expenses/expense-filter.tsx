"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { CalendarIcon, Filter, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface ExpenseFilterProps {
  filters: {
    propertyId: string;
    category: string;
    dateFrom: string;
    dateTo: string;
    approvalStatus: string;
  };
  onFilterChange: (filterName: string, value: string) => void;
  onResetFilters: () => void;
}

const ExpenseFilter = ({ filters, onFilterChange, onResetFilters }: ExpenseFilterProps) => {
  return (
    <div className="border rounded-lg p-4 mb-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="space-y-2">
          <Label htmlFor="propertyId">Property</Label>
          <Input
            id="propertyId"
            value={filters.propertyId}
            onChange={(e) => onFilterChange('propertyId', e.target.value)}
            placeholder="Property ID"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="category">Category</Label>
          <Select value={filters.category} onValueChange={(value) => onFilterChange('category', value)}>
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
        </div>

        <div className="space-y-2">
          <Label htmlFor="approvalStatus">Status</Label>
          <Select value={filters.approvalStatus} onValueChange={(value) => onFilterChange('approvalStatus', value)}>
            <SelectTrigger>
              <SelectValue placeholder="Select status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="created">Created</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="dateFrom">Date From</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant={"outline"}
                className={cn(
                  "w-full justify-start text-left font-normal",
                  !filters.dateFrom && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {filters.dateFrom ? format(new Date(filters.dateFrom), "PPP") : <span>From date</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={filters.dateFrom ? new Date(filters.dateFrom) : undefined}
                onSelect={(date) => date && onFilterChange('dateFrom', date.toISOString())}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>

        <div className="space-y-2">
          <Label htmlFor="dateTo">Date To</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant={"outline"}
                className={cn(
                  "w-full justify-start text-left font-normal",
                  !filters.dateTo && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {filters.dateTo ? format(new Date(filters.dateTo), "PPP") : <span>To date</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={filters.dateTo ? new Date(filters.dateTo) : undefined}
                onSelect={(date) => date && onFilterChange('dateTo', date.toISOString())}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>

      <div className="flex justify-end gap-2 mt-4">
        <Button variant="outline" onClick={onResetFilters}>
          <X className="w-4 h-4 mr-2" />
          Reset Filters
        </Button>
        <Button type="button">
          <Filter className="w-4 h-4 mr-2" />
          Apply Filters
        </Button>
      </div>
    </div>
  );
};

export default ExpenseFilter;