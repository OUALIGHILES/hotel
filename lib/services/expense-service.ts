// lib/services/expense-service.ts

import { createClient } from '@/lib/supabase/client';

export interface Expense {
  id?: string;
  property_id: string;
  owner_id?: string;
  category: string;
  sub_category?: string;
  amount: number;
  tax_percentage: number;
  total_amount: number;
  payment_method: string;
  supplier_name?: string;
  receipt_number?: string;
  receipt_image_url?: string;
  expense_date: string;
  recorded_by: string;
  approved_by?: string;
  approval_status: string;
  notes?: string;
}

export interface Purchase {
  id?: string;
  expense_id: string;
  property_id?: string;
  owner_id?: string;
  asset_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  supplier?: string;
  warranty_expiry?: string;
  assigned_to?: string;
}

export const expenseService = {
  // Get all expenses
  async getExpenses(filters: Record<string, any> = {}) {
    const supabase = createClient();
    
    // First get the expenses without the user joins
    let query = supabase
      .from('expenses')
      .select('*')
      .order('expense_date', { ascending: false });

    // Apply filters
    if (filters.propertyId) {
      query = query.eq('property_id', filters.propertyId);
    }
    if (filters.category) {
      query = query.eq('category', filters.category);
    }
    if (filters.approvalStatus) {
      query = query.eq('approval_status', filters.approvalStatus);
    }
    if (filters.dateFrom) {
      query = query.gte('expense_date', filters.dateFrom);
    }
    if (filters.dateTo) {
      query = query.lte('expense_date', filters.dateTo);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(error.message);
    }

    // If there are expenses, fetch user details separately
    if (data && data.length > 0) {
      // Get unique user IDs to fetch
      const userIds = Array.from(
        new Set([
          ...data.map(e => e.recorded_by).filter(id => id),
          ...data.map(e => e.approved_by).filter(id => id)
        ])
      );

      if (userIds.length > 0) {
        // Try to fetch from auth.users with proper column name
        const { data: usersData, error: usersError } = await supabase
          .from('auth.users')
          .select('id, email, user_metadata')
          .in('id', userIds);

        if (usersError) {
          console.error('Error fetching users:', usersError);
          // Continue with expenses data even if users couldn't be fetched
          return data;
        }

        // Create a map of users for quick lookup
        const usersMap = new Map();
        usersData.forEach(user => {
          // Extract first name and last name from user metadata if available
          const firstName = user.user_metadata?.first_name || user.user_metadata?.full_name?.split(' ')[0] || '';
          const lastName = user.user_metadata?.last_name || user.user_metadata?.full_name?.split(' ').slice(1).join(' ') || '';
          usersMap.set(user.id, {
            id: user.id,
            first_name: firstName,
            last_name: lastName,
            email: user.email
          });
        });

        // Add user information to the expenses
        return data.map(expense => ({
          ...expense,
          recorded_by_user: usersMap.get(expense.recorded_by) || null,
          approved_by_user: usersMap.get(expense.approved_by) || null
        }));
      }
    }

    return data || [];
  },

  // Get a single expense by ID
  async getExpenseById(id: string) {
    const supabase = createClient();
    
    const { data, error } = await supabase
      .from('expenses')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      throw new Error(error.message);
    }

    // If expense exists, fetch related user details
    if (data) {
      const userIds = [
        data.recorded_by,
        data.approved_by
      ].filter(id => id);

      if (userIds.length > 0) {
        const { data: usersData, error: usersError } = await supabase
          .from('auth.users')
          .select('id, email, user_metadata')
          .in('id', userIds);

        if (usersError) {
          console.error('Error fetching users:', usersError);
          // Continue with expense data even if users couldn't be fetched
          return data;
        }

        const usersMap = new Map();
        usersData.forEach(user => {
          // Extract first name and last name from user metadata if available
          const firstName = user.user_metadata?.first_name || user.user_metadata?.full_name?.split(' ')[0] || '';
          const lastName = user.user_metadata?.last_name || user.user_metadata?.full_name?.split(' ').slice(1).join(' ') || '';
          usersMap.set(user.id, {
            id: user.id,
            first_name: firstName,
            last_name: lastName,
            email: user.email
          });
        });

        return {
          ...data,
          recorded_by_user: usersMap.get(data.recorded_by) || null,
          approved_by_user: usersMap.get(data.approved_by) || null
        };
      }
    }

    return data;
  },

  // Create a new expense
  async createExpense(expense: Omit<Expense, 'id' | 'total_amount'>) {
    const supabase = createClient();

    // Calculate total amount
    const totalAmount = expense.amount + (expense.amount * (expense.tax_percentage || 0) / 100);

    // Ensure expense_date is properly formatted and not null to avoid any date-related constraint errors
    const expenseDate = expense.expense_date || new Date().toISOString();

    // Construct the insert object with explicit field assignments
    const insertData: any = {
      ...expense,
      expense_date: expenseDate,
      total_amount: totalAmount
    };

    // Also set the generic "date" column if it exists and is required
    // This is sometimes used as an alias or alternative date field
    if (!insertData.date) {
      insertData.date = expenseDate;
    }

    // Handle the expense_type column which seems to exist in the database
    // Default to 'other' if not provided
    if (!insertData.expense_type) {
      insertData.expense_type = insertData.category || 'other';
    }

    const { data, error } = await supabase
      .from('expenses')
      .insert([insertData])
      .select()
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return data;
  },

  // Update an expense
  async updateExpense(id: string, expense: Partial<Omit<Expense, 'id' | 'total_amount'>>) {
    const supabase = createClient();
    
    // Calculate total amount if amount or tax_percentage changes
    let totalAmount = expense.total_amount;
    if (expense.amount !== undefined || expense.tax_percentage !== undefined) {
      const amount = expense.amount ?? 0;
      const taxPercentage = expense.tax_percentage ?? 0;
      totalAmount = amount + (amount * taxPercentage / 100);
    }
    
    const { data, error } = await supabase
      .from('expenses')
      .update({ 
        ...expense, 
        total_amount: totalAmount 
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return data;
  },

  // Delete an expense
  async deleteExpense(id: string) {
    const supabase = createClient();
    
    const { error } = await supabase
      .from('expenses')
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error(error.message);
    }

    return true;
  },

  // Update expense approval status
  async updateApprovalStatus(id: string, status: string, approvedBy: string) {
    const supabase = createClient();
    
    const { data, error } = await supabase
      .from('expenses')
      .update({ 
        approval_status: status,
        approved_by: status === 'approved' ? approvedBy : null
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return data;
  }
};

export const purchaseService = {
  // Get all purchases
  async getPurchases(filters: Record<string, any> = {}) {
    const supabase = createClient();
    
    let query = supabase
      .from('purchases')
      .select('*')
      .order('created_at', { ascending: false });

    // Apply filters
    if (filters.propertyId) {
      query = query.eq('property_id', filters.propertyId);
    }
    if (filters.expenseId) {
      query = query.eq('expense_id', filters.expenseId);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(error.message);
    }

    // If there are purchases, fetch related expense details separately
    if (data && data.length > 0) {
      // Get unique expense IDs to fetch
      const expenseIds = Array.from(
        new Set(data.map(p => p.expense_id).filter(id => id))
      );

      if (expenseIds.length > 0) {
        const { data: expensesData, error: expensesError } = await supabase
          .from('expenses')
          .select('id, amount, total_amount, category, expense_date')
          .in('id', expenseIds);

        if (expensesError) {
          console.error('Error fetching related expenses:', expensesError);
          // Continue with purchases data even if expenses couldn't be fetched
          return data;
        }

        // Create a map of expenses for quick lookup
        const expensesMap = new Map();
        expensesData.forEach(expense => {
          expensesMap.set(expense.id, expense);
        });

        // Add expense information to the purchases
        return data.map(purchase => ({
          ...purchase,
          expense: expensesMap.get(purchase.expense_id) || null
        }));
      }
    }

    return data || [];
  },

  // Get a single purchase by ID
  async getPurchaseById(id: string) {
    const supabase = createClient();
    
    const { data, error } = await supabase
      .from('purchases')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      throw new Error(error.message);
    }

    // If purchase exists and has an expense_id, fetch related expense details
    if (data && data.expense_id) {
      const { data: expenseData, error: expenseError } = await supabase
        .from('expenses')
        .select('id, amount, total_amount, category, expense_date')
        .eq('id', data.expense_id)
        .single();

      if (expenseError) {
        console.error('Error fetching related expense:', expenseError);
        // Continue with purchase data even if expense couldn't be fetched
        return data;
      }

      return {
        ...data,
        expense: expenseData
      };
    }

    return data;
  },

  // Create a new purchase
  async createPurchase(purchase: Omit<Purchase, 'id' | 'total_price'>) {
    const supabase = createClient();
    
    // Calculate total price
    const totalPrice = purchase.quantity * purchase.unit_price;
    
    const { data, error } = await supabase
      .from('purchases')
      .insert([{ 
        ...purchase, 
        total_price: totalPrice 
      }])
      .select()
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return data;
  },

  // Update a purchase
  async updatePurchase(id: string, purchase: Partial<Omit<Purchase, 'id' | 'total_price'>>) {
    const supabase = createClient();
    
    // Calculate total price if quantity or unit_price changes
    let totalPrice = purchase.total_price;
    if (purchase.quantity !== undefined || purchase.unit_price !== undefined) {
      const quantity = purchase.quantity ?? 1;
      const unitPrice = purchase.unit_price ?? 0;
      totalPrice = quantity * unitPrice;
    }
    
    const { data, error } = await supabase
      .from('purchases')
      .update({ 
        ...purchase, 
        total_price: totalPrice 
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return data;
  },

  // Delete a purchase
  async deletePurchase(id: string) {
    const supabase = createClient();
    
    const { error } = await supabase
      .from('purchases')
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error(error.message);
    }

    return true;
  }
};