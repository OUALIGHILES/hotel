-- Add the expense_date column to the expenses table as it's needed by the application

ALTER TABLE expenses ADD COLUMN IF NOT EXISTS expense_date TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Update existing records to have expense_date to match created_at if expense_date is null
UPDATE expenses SET expense_date = created_at WHERE expense_date IS NULL;