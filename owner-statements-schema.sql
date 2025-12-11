-- Owner Statements Tables for Wellhost PMS

-- Table for owner statements
CREATE TABLE IF NOT EXISTS owner_statements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID NOT NULL REFERENCES users(id), -- Assuming users table exists
    property_id UUID NOT NULL REFERENCES properties(id),
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    total_revenue DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    total_expenses DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    management_fee DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    net_payout DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    payout_status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (payout_status IN ('paid', 'pending', 'on_hold', 'overdue')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table for detailed booking lines in statements
CREATE TABLE IF NOT EXISTS owner_statement_booking_lines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    statement_id UUID NOT NULL REFERENCES owner_statements(id) ON DELETE CASCADE,
    reservation_id UUID REFERENCES reservations(id), -- Reference to reservations table if exists
    guest_name VARCHAR(255) NOT NULL,
    stay_dates VARCHAR(100), -- Format like "YYYY-MM-DD to YYYY-MM-DD"
    revenue DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    taxes DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    fees DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    net_revenue DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table for expense lines in statements
CREATE TABLE IF NOT EXISTS owner_statement_expense_lines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    statement_id UUID NOT NULL REFERENCES owner_statements(id) ON DELETE CASCADE,
    expense_type VARCHAR(100) NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    date DATE NOT NULL,
    notes TEXT,
    receipt_url TEXT, -- URL to uploaded receipt attachment
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for better performance
CREATE INDEX idx_owner_statements_owner_id ON owner_statements(owner_id);
CREATE INDEX idx_owner_statements_property_id ON owner_statements(property_id);
CREATE INDEX idx_owner_statements_period ON owner_statements(period_start, period_end);
CREATE INDEX idx_owner_statements_created_at ON owner_statements(created_at);
CREATE INDEX idx_owner_statement_booking_lines_statement_id ON owner_statement_booking_lines(statement_id);
CREATE INDEX idx_owner_statement_expense_lines_statement_id ON owner_statement_expense_lines(statement_id);

-- Trigger to update the updated_at timestamp for owner_statements
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_owner_statements_updated_at 
    BEFORE UPDATE ON owner_statements 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Optional: Generate a sample owner statement (for testing purposes)
-- INSERT INTO owner_statements (owner_id, property_id, period_start, period_end, total_revenue, total_expenses, management_fee, net_payout, payout_status)
-- VALUES 
--     ('123e4567-e89b-12d3-a456-426614174000', '98765432-e1f0-12d3-a456-426614174000', '2023-10-01', '2023-10-31', 5000.00, 1000.00, 500.00, 3500.00, 'paid'),
--     ('123e4567-e89b-12d3-a456-426614174001', '98765432-e1f0-12d3-a456-426614174001', '2023-11-01', '2023-11-30', 6200.00, 800.00, 620.00, 4780.00, 'pending');

-- Optional: Sample booking lines for the statement
-- INSERT INTO owner_statement_booking_lines (statement_id, reservation_id, guest_name, stay_dates, revenue, taxes, fees, net_revenue)
-- VALUES 
--     ((SELECT id FROM owner_statements WHERE property_id = '98765432-e1f0-12d3-a456-426614174000' LIMIT 1), 'abc123def456', 'John Smith', '2023-10-15 to 2023-10-20', 1000.00, 100.00, 50.00, 850.00),
--     ((SELECT id FROM owner_statements WHERE property_id = '98765432-e1f0-12d3-a456-426614174000' LIMIT 1), 'xyz789uvw012', 'Jane Doe', '2023-10-22 to 2023-10-25', 800.00, 80.00, 40.00, 680.00);

-- Optional: Sample expense lines for the statement
-- INSERT INTO owner_statement_expense_lines (statement_id, expense_type, amount, date, notes)
-- VALUES 
--     ((SELECT id FROM owner_statements WHERE property_id = '98765432-e1f0-12d3-a456-426614174000' LIMIT 1), 'Cleaning', 200.00, '2023-10-25', 'Monthly deep cleaning service'),
--     ((SELECT id FROM owner_statements WHERE property_id = '98765432-e1f0-12d3-a456-426614174000' LIMIT 1), 'Maintenance', 300.00, '2023-10-28', 'Fix AC unit');

COMMIT;