-- Properties table
CREATE TABLE IF NOT EXISTS properties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  name VARCHAR(255) NOT NULL,
  address TEXT NOT NULL,
  city VARCHAR(255) NOT NULL,
  country VARCHAR(255) NOT NULL,
  check_in_time TIME DEFAULT '14:00:00',
  check_out_time TIME DEFAULT '11:00:00',
  currency VARCHAR(3) DEFAULT 'USD',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Units/Rooms table
CREATE TABLE IF NOT EXISTS units (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  floor INTEGER,
  price_per_night NUMERIC(10, 2) NOT NULL,
  status VARCHAR(50) DEFAULT 'vacant',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Reservations table (replacing bookings for PMS)
CREATE TABLE IF NOT EXISTS reservations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id UUID NOT NULL REFERENCES units(id),
  guest_id UUID REFERENCES auth.users(id),
  check_in_date DATE NOT NULL,
  check_out_date DATE NOT NULL,
  guest_name VARCHAR(255) NOT NULL,
  guest_email VARCHAR(255),
  guest_phone VARCHAR(20),
  status VARCHAR(50) DEFAULT 'pending',
  special_requests TEXT,
  total_price NUMERIC(10, 2),
  payment_status VARCHAR(50) DEFAULT 'unpaid',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Tasks table
CREATE TABLE IF NOT EXISTS tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES properties(id),
  unit_id UUID REFERENCES units(id),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  priority VARCHAR(50) DEFAULT 'medium',
  status VARCHAR(50) DEFAULT 'pending',
  assigned_to UUID REFERENCES auth.users(id),
  due_date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Guests table
CREATE TABLE IF NOT EXISTS guests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(20),
  full_name VARCHAR(255) NOT NULL,
  id_number VARCHAR(50),
  id_type VARCHAR(50),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Invoices table
CREATE TABLE IF NOT EXISTS invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reservation_id UUID NOT NULL REFERENCES reservations(id),
  property_id UUID NOT NULL REFERENCES properties(id),
  invoice_number VARCHAR(50) UNIQUE NOT NULL,
  amount NUMERIC(10, 2) NOT NULL,
  tax_amount NUMERIC(10, 2) DEFAULT 0,
  status VARCHAR(50) DEFAULT 'draft',
  issued_date DATE,
  due_date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  -- Detailed pricing breakdown
  nightly_rate NUMERIC(10, 2),
  number_of_nights INTEGER,
  cleaning_fee NUMERIC(10, 2) DEFAULT 0,
  extra_guest_fee NUMERIC(10, 2) DEFAULT 0,
  additional_services JSONB,
  -- Taxes
  vat_percentage NUMERIC(5, 2) DEFAULT 0,
  tourism_fee NUMERIC(10, 2) DEFAULT 0,
  -- Payment tracking
  amount_paid NUMERIC(10, 2) DEFAULT 0,
  outstanding_balance NUMERIC(10, 2) DEFAULT 0,
  payment_method VARCHAR(50),
  -- Invoice metadata
  notes TEXT,
  terms TEXT
);

-- Payments table
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reservation_id UUID NOT NULL REFERENCES reservations(id),
  invoice_id UUID REFERENCES invoices(id),
  amount NUMERIC(10, 2) NOT NULL,
  payment_method VARCHAR(50),
  transaction_id VARCHAR(255),
  status VARCHAR(50) DEFAULT 'pending',
  paid_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Messages/Inbox table
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reservation_id UUID REFERENCES reservations(id),
  sender_id UUID NOT NULL REFERENCES auth.users(id),
  recipient_id UUID NOT NULL REFERENCES auth.users(id),
  subject VARCHAR(255),
  body TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Channels table (booking platforms)
CREATE TABLE IF NOT EXISTS channels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES properties(id),
  name VARCHAR(255) NOT NULL,
  type VARCHAR(50),
  api_key VARCHAR(255),
  commission_rate NUMERIC(5, 2),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Smart Locks table
CREATE TABLE IF NOT EXISTS smart_locks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id UUID NOT NULL REFERENCES units(id),
  device_id VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255),
  battery_level INTEGER,
  status VARCHAR(50) DEFAULT 'locked',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Access Codes table
CREATE TABLE IF NOT EXISTS access_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  smart_lock_id UUID NOT NULL REFERENCES smart_locks(id),
  reservation_id UUID REFERENCES reservations(id),
  code VARCHAR(50) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE units ENABLE ROW LEVEL SECURITY;
ALTER TABLE reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE guests ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE smart_locks ENABLE ROW LEVEL SECURITY;
ALTER TABLE access_codes ENABLE ROW LEVEL SECURITY;

-- Create indexes for performance
CREATE INDEX idx_properties_user_id ON properties(user_id);
CREATE INDEX idx_units_property_id ON units(property_id);
CREATE INDEX idx_reservations_unit_id ON reservations(unit_id);
CREATE INDEX idx_reservations_check_in ON reservations(check_in_date);
CREATE INDEX idx_tasks_property_id ON tasks(property_id);
CREATE INDEX idx_invoices_reservation_id ON invoices(reservation_id);
CREATE INDEX idx_payments_reservation_id ON payments(reservation_id);
CREATE INDEX idx_channels_property_id ON channels(property_id);
CREATE INDEX idx_smart_locks_unit_id ON smart_locks(unit_id);
