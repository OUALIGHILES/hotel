-- Expenses & Purchases Module Schema

-- Expense categories table
CREATE TYPE expense_category AS ENUM (
  'cleaning_supplies',
  'maintenance',
  'furniture_purchase',
  'utilities',
  'staff_expenses',
  'consumables',
  'government_fees',
  'other'
);

-- Payment methods table
CREATE TYPE payment_method AS ENUM (
  'cash',
  'bank_transfer',
  'credit_card',
  'company_account',
  'wallet'
);

-- Approval statuses
CREATE TYPE approval_status AS ENUM (
  'created',
  'pending',
  'approved',
  'rejected'
);

-- Expenses table
CREATE TABLE IF NOT EXISTS expenses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  property_id UUID REFERENCES properties(id) ON DELETE SET NULL,
  owner_id UUID REFERENCES users(id) ON DELETE SET NULL,
  
  -- Category information
  category expense_category NOT NULL,
  sub_category TEXT,
  
  -- Financial details
  amount DECIMAL(10,2) NOT NULL,
  tax_percentage DECIMAL(5,2) DEFAULT 0,
  total_amount DECIMAL(10,2) NOT NULL,
  payment_method payment_method NOT NULL,
  supplier_name TEXT,
  receipt_number TEXT,
  receipt_image_url TEXT,
  
  -- Expense details
  expense_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  recorded_by UUID NOT NULL REFERENCES users(id),
  approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
  approval_status approval_status DEFAULT 'created',
  notes TEXT,
  
  -- Audit fields
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Purchases table (for asset tracking)
CREATE TABLE IF NOT EXISTS purchases (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  expense_id UUID REFERENCES expenses(id) ON DELETE CASCADE, -- Link to expense record
  property_id UUID REFERENCES properties(id) ON DELETE SET NULL,
  owner_id UUID REFERENCES users(id) ON DELETE SET NULL,
  
  -- Asset details
  asset_name TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price DECIMAL(10,2) NOT NULL,
  total_price DECIMAL(10,2) NOT NULL,
  supplier TEXT,
  
  -- Warranty and assignment
  warranty_expiry TIMESTAMP WITH TIME ZONE,
  assigned_to TEXT, -- Could be a unit name or warehouse location
  
  -- Audit fields
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for better performance
CREATE INDEX idx_expenses_property_id ON expenses(property_id);
CREATE INDEX idx_expenses_owner_id ON expenses(owner_id);
CREATE INDEX idx_expenses_category ON expenses(category);
CREATE INDEX idx_expenses_date ON expenses(expense_date);
CREATE INDEX idx_expenses_recorded_by ON expenses(recorded_by);
CREATE INDEX idx_expenses_approval_status ON expenses(approval_status);

CREATE INDEX idx_purchases_property_id ON purchases(property_id);
CREATE INDEX idx_purchases_owner_id ON purchases(owner_id);
CREATE INDEX idx_purchases_expense_id ON purchases(expense_id);

-- RLS Policies (if enabled)
-- Enable RLS on both tables
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchases ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own expenses and those related to their properties
CREATE POLICY "Users can view expenses for their properties" ON expenses
FOR SELECT TO authenticated
USING (
  property_id IN (
    SELECT id FROM properties WHERE user_id = auth.uid()
  ) OR owner_id = auth.uid() OR recorded_by = auth.uid()
);

-- Policy: Users can insert expenses for their properties
CREATE POLICY "Users can insert expenses for their properties" ON expenses
FOR INSERT TO authenticated
WITH CHECK (
  property_id IN (
    SELECT id FROM properties WHERE user_id = auth.uid()
  ) OR owner_id = auth.uid()
);

-- Policy: Users can update their own expenses
CREATE POLICY "Users can update their own expenses" ON expenses
FOR UPDATE TO authenticated
USING (recorded_by = auth.uid())
WITH CHECK (
  property_id IN (
    SELECT id FROM properties WHERE user_id = auth.uid()
  ) OR owner_id = auth.uid()
);

-- Policy: Users can delete their own expenses
CREATE POLICY "Users can delete their own expenses" ON expenses
FOR DELETE TO authenticated
USING (recorded_by = auth.uid());

-- Purchase policies
CREATE POLICY "Users can view purchases for their properties" ON purchases
FOR SELECT TO authenticated
USING (
  property_id IN (
    SELECT id FROM properties WHERE user_id = auth.uid()
  ) OR owner_id = auth.uid()
);

CREATE POLICY "Users can insert purchases for their properties" ON purchases
FOR INSERT TO authenticated
WITH CHECK (
  property_id IN (
    SELECT id FROM properties WHERE user_id = auth.uid()
  ) OR owner_id = auth.uid()
);

-- Function to recalculate expense total when tax changes
CREATE OR REPLACE FUNCTION update_expense_total()
RETURNS TRIGGER AS $$
BEGIN
  NEW.total_amount := NEW.amount + (NEW.amount * COALESCE(NEW.tax_percentage, 0) / 100);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update total_amount when amount or tax_percentage changes
CREATE TRIGGER update_expense_total_trigger
  BEFORE INSERT OR UPDATE ON expenses
  FOR EACH ROW
  EXECUTE FUNCTION update_expense_total();

-- Example data insertion (can be run separately if needed)
-- INSERT INTO expenses (property_id, owner_id, category, sub_category, amount, tax_percentage, payment_method, supplier_name, recorded_by)
-- VALUES
--   (uuid_generate_v4(), uuid_generate_v4(), 'cleaning_supplies', 'Household Supplies', 125.50, 5.0, 'cash', 'Local Store', uuid_generate_v4()),
--   (uuid_generate_v4(), uuid_generate_v4(), 'maintenance', 'Repair', 450.00, 8.0, 'credit_card', 'Fix-It Service', uuid_generate_v4());