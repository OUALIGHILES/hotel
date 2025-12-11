-- Fix relationships for Expenses & Purchases Module

-- Ensure foreign key constraints exist
ALTER TABLE expenses 
ADD CONSTRAINT expenses_recorded_by_fkey 
FOREIGN KEY (recorded_by) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE expenses 
ADD CONSTRAINT expenses_approved_by_fkey 
FOREIGN KEY (approved_by) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE expenses 
ADD CONSTRAINT expenses_property_fkey 
FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE SET NULL;

ALTER TABLE expenses 
ADD CONSTRAINT expenses_owner_fkey 
FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE purchases 
ADD CONSTRAINT purchases_expense_fkey 
FOREIGN KEY (expense_id) REFERENCES expenses(id) ON DELETE CASCADE;

ALTER TABLE purchases 
ADD CONSTRAINT purchases_property_fkey 
FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE SET NULL;

ALTER TABLE purchases 
ADD CONSTRAINT purchases_owner_fkey 
FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE SET NULL;

-- Refresh the schema cache if needed
NOTIFY pgrst, 'reload schema';