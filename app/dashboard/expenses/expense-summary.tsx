"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { DollarSign, Calendar, MapPin, User, FileText } from "lucide-react";

interface ExpenseSummaryProps {
  expenses: any[];
  purchases: any[];
}

const ExpenseSummary = ({ expenses, purchases }: ExpenseSummaryProps) => {
  // Calculate totals
  const totalExpenses = expenses.reduce((sum, expense) => sum + (expense.total_amount || 0), 0);
  const totalPurchases = purchases.reduce((sum, purchase) => sum + (purchase.total_price || 0), 0);
  const pendingExpenses = expenses.filter(e => e.approval_status === 'pending').length;
  const approvedExpenses = expenses.filter(e => e.approval_status === 'approved').length;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <Card className="border rounded-xl shadow-lg">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
          }).format(totalExpenses)}</div>
          <p className="text-xs text-muted-foreground">All recorded expenses</p>
        </CardContent>
      </Card>

      <Card className="border rounded-xl shadow-lg">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">Total Purchases</CardTitle>
          <FileText className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
          }).format(totalPurchases)}</div>
          <p className="text-xs text-muted-foreground">Asset purchases</p>
        </CardContent>
      </Card>

      <Card className="border rounded-xl shadow-lg">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">Pending Approval</CardTitle>
          <Calendar className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{pendingExpenses}</div>
          <p className="text-xs text-muted-foreground">Expenses awaiting approval</p>
        </CardContent>
      </Card>

      <Card className="border rounded-xl shadow-lg">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">Approved</CardTitle>
          <User className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{approvedExpenses}</div>
          <p className="text-xs text-muted-foreground">Expenses approved</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default ExpenseSummary;