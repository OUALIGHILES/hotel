-- Payment Tracking and Disbursement Tables for Wellhost PMS

-- Supported payment methods table
CREATE TYPE payment_method_type AS ENUM (
    'cash',
    'bank_transfer',
    'pos',
    'credit_card',
    'debit_card',
    'apple_pay',
    'stc_pay',
    'internal_wallet',
    'hyperpay',
    'tap',
    'stripe'
);

-- Transaction types
CREATE TYPE transaction_type AS ENUM (
    'payout_to_owner',
    'refund_to_guest',
    'staff_payment',
    'supplier_payment',
    'payment_received',
    'charge'
);

-- Payment transactions table (for tracking funds received)
CREATE TABLE IF NOT EXISTS payment_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id VARCHAR(50) UNIQUE NOT NULL, -- Custom transaction ID
    type transaction_type NOT NULL, -- payment_received, charge, etc.
    amount DECIMAL(12, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'SAR',
    payment_method payment_method_type NOT NULL,
    description TEXT,
    reference_number VARCHAR(100), -- For bank refs, payment gateway refs
    date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    status VARCHAR(20) DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'failed', 'refunded', 'cancelled')),
    
    -- Relations
    owner_id UUID REFERENCES auth.users(id), -- For owner payments
    guest_id UUID REFERENCES auth.users(id), -- For guest payments
    property_id UUID REFERENCES properties(id),
    unit_id UUID REFERENCES units(id),
    reservation_id UUID REFERENCES reservations(id),
    invoice_id UUID REFERENCES invoices(id), -- Link to invoices
    linked_transaction_id UUID REFERENCES payment_transactions(id), -- For linked transactions
    
    -- Metadata
    notes TEXT,
    attachment_url TEXT, -- For receipts or proof of payment
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Disbursement records table (for tracking funds paid out)
CREATE TABLE IF NOT EXISTS disbursement_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id VARCHAR(50) UNIQUE NOT NULL, -- Custom transaction ID
    type transaction_type NOT NULL CHECK (type IN ('payout_to_owner', 'refund_to_guest', 'staff_payment', 'supplier_payment')),
    amount DECIMAL(12, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'SAR',
    payment_method payment_method_type NOT NULL,
    date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'cancelled')),
    
    -- Relations
    owner_id UUID REFERENCES auth.users(id), -- For payouts to owners
    guest_id UUID REFERENCES auth.users(id), -- For refunds to guests
    staff_id UUID REFERENCES auth.users(id), -- For staff payments
    supplier_id UUID REFERENCES users(id), -- For supplier payments (if using users table)
    property_id UUID REFERENCES properties(id),
    invoice_id UUID REFERENCES invoices(id), -- Link to invoice or expense
    expense_id UUID REFERENCES expenses(id), -- Link to specific expense
    
    -- Metadata
    notes TEXT,
    attachment_url TEXT, -- For receipts or proof of payment
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Owner balances table (for tracking account balance for each owner)
CREATE TABLE IF NOT EXISTS owner_balances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID NOT NULL REFERENCES auth.users(id),
    property_id UUID REFERENCES properties(id),
    current_balance DECIMAL(12, 2) DEFAULT 0.00,
    currency VARCHAR(3) DEFAULT 'SAR',
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_payment_transactions_owner_id ON payment_transactions(owner_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_guest_id ON payment_transactions(guest_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_property_id ON payment_transactions(property_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_reservation_id ON payment_transactions(reservation_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_date ON payment_transactions(date);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_transaction_id ON payment_transactions(transaction_id);

CREATE INDEX IF NOT EXISTS idx_disbursement_records_owner_id ON disbursement_records(owner_id);
CREATE INDEX IF NOT EXISTS idx_disbursement_records_guest_id ON disbursement_records(guest_id);
CREATE INDEX IF NOT EXISTS idx_disbursement_records_date ON disbursement_records(date);
CREATE INDEX IF NOT EXISTS idx_disbursement_records_transaction_id ON disbursement_records(transaction_id);

CREATE INDEX IF NOT EXISTS idx_owner_balances_owner_id ON owner_balances(owner_id);
CREATE INDEX IF NOT EXISTS idx_owner_balances_property_id ON owner_balances(property_id);

-- Function to update owner balance when a new payment transaction is added
CREATE OR REPLACE FUNCTION update_owner_balance_on_payment()
RETURNS TRIGGER AS $$
BEGIN
    -- Only update balance when transaction is completed and for owner-related payments
    IF NEW.status = 'completed' AND NEW.owner_id IS NOT NULL THEN
        INSERT INTO owner_balances (owner_id, property_id, current_balance)
        VALUES (NEW.owner_id, NEW.property_id, 
                CASE 
                    WHEN NEW.type = 'payment_received' THEN NEW.amount
                    WHEN NEW.type = 'charge' THEN -NEW.amount
                    ELSE 0
                END)
        ON CONFLICT (owner_id, COALESCE(property_id, '00000000-0000-0000-0000-000000000000'::UUID))
        DO UPDATE SET 
            current_balance = owner_balances.current_balance + 
                             CASE 
                                 WHEN NEW.type = 'payment_received' THEN NEW.amount
                                 WHEN NEW.type = 'charge' THEN -NEW.amount
                                 ELSE 0
                             END,
            last_updated = NOW();
    END IF;
    
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Function to update owner balance when a disbursement is made
CREATE OR REPLACE FUNCTION update_owner_balance_on_disbursement()
RETURNS TRIGGER AS $$
BEGIN
    -- Update balance when disbursement is completed and for owner payouts
    IF NEW.status = 'completed' AND NEW.owner_id IS NOT NULL AND NEW.type = 'payout_to_owner' THEN
        INSERT INTO owner_balances (owner_id, property_id, current_balance)
        VALUES (NEW.owner_id, NEW.property_id, -NEW.amount)
        ON CONFLICT (owner_id, COALESCE(property_id, '00000000-0000-0000-0000-000000000000'::UUID))
        DO UPDATE SET 
            current_balance = owner_balances.current_balance - NEW.amount,
            last_updated = NOW();
    END IF;
    
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers to update balances automatically
CREATE TRIGGER trigger_update_owner_balance_on_payment
    AFTER INSERT OR UPDATE ON payment_transactions
    FOR EACH ROW
    EXECUTE FUNCTION update_owner_balance_on_payment();

CREATE TRIGGER trigger_update_owner_balance_on_disbursement
    AFTER INSERT OR UPDATE ON disbursement_records
    FOR EACH ROW
    EXECUTE FUNCTION update_owner_balance_on_disbursement();

-- Function to prevent duplicate payouts
CREATE OR REPLACE FUNCTION prevent_duplicate_payouts()
RETURNS TRIGGER AS $$
DECLARE
    existing_payout_count INTEGER;
BEGIN
    -- Check if a payout with the same amount and date already exists for this owner
    SELECT COUNT(*) INTO existing_payout_count
    FROM disbursement_records
    WHERE owner_id = NEW.owner_id
      AND type = 'payout_to_owner'
      AND amount = NEW.amount
      AND DATE(date) = DATE(NEW.date)
      AND status != 'cancelled';

    IF existing_payout_count > 0 THEN
        RAISE EXCEPTION 'A payout with the same amount and date already exists for this owner';
    END IF;

    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to prevent duplicate payouts
CREATE TRIGGER trigger_prevent_duplicate_payouts
    BEFORE INSERT OR UPDATE ON disbursement_records
    FOR EACH ROW
    WHEN (NEW.type = 'payout_to_owner')
    EXECUTE FUNCTION prevent_duplicate_payouts();

COMMIT;