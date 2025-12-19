-- Complete Database Reset - Safe Version
-- This will completely reset your database with all required tables

-- Drop all tables in the correct order (starting with dependent tables)
DROP TABLE IF EXISTS access_codes;
DROP TABLE IF EXISTS smart_locks;
DROP TABLE IF EXISTS messages;
DROP TABLE IF EXISTS payments;
DROP TABLE IF EXISTS invoices;
DROP TABLE IF EXISTS guests;
DROP TABLE IF EXISTS reservations;
DROP TABLE IF EXISTS tasks;
DROP TABLE IF EXISTS units;
DROP TABLE IF EXISTS properties;
DROP TABLE IF EXISTS channels;
DROP TABLE IF EXISTS channex_property_channels;
DROP TABLE IF EXISTS channex_rate_plans;
DROP TABLE IF EXISTS channex_room_types;
DROP TABLE IF EXISTS channex_properties;
DROP TABLE IF EXISTS channex_connections;
DROP TABLE IF EXISTS unit_settings;
DROP TABLE IF EXISTS property_settings;
DROP TABLE IF EXISTS calendar_overrides;
DROP TABLE IF EXISTS channel_sync_settings;
DROP TABLE IF EXISTS staff_access_settings;
DROP TABLE IF EXISTS tuya_tokens;
DROP TABLE IF EXISTS expenses;
DROP TABLE IF EXISTS purchases;
DROP TABLE IF EXISTS notifications;
DROP TABLE IF EXISTS reviews;
DROP TABLE IF EXISTS bookings;
DROP TABLE IF EXISTS listings;
DROP TABLE IF EXISTS user_subscriptions;
DROP TABLE IF EXISTS subscription_plans;
DROP TABLE IF EXISTS profiles;
DROP TABLE IF EXISTS auth_users;

-- Remove any remaining indexes that might have been created manually
DROP INDEX IF EXISTS idx_properties_user_id;
DROP INDEX IF EXISTS idx_units_property_id;
DROP INDEX IF EXISTS idx_reservations_unit_id;
DROP INDEX IF EXISTS idx_reservations_check_in;
DROP INDEX IF EXISTS idx_tasks_property_id;
DROP INDEX IF EXISTS idx_invoices_reservation_id;
DROP INDEX IF EXISTS idx_payments_reservation_id;
DROP INDEX IF EXISTS idx_channels_property_id;
DROP INDEX IF EXISTS idx_smart_locks_unit_id;
DROP INDEX IF EXISTS idx_auth_users_email;
DROP INDEX IF EXISTS idx_notifications_user_id;
DROP INDEX IF EXISTS idx_notifications_created_at;
DROP INDEX IF EXISTS idx_notifications_is_read;
DROP INDEX IF EXISTS idx_channex_connections_user_id;
DROP INDEX IF EXISTS idx_channex_properties_user_id;
DROP INDEX IF EXISTS idx_channex_properties_channex_id;
DROP INDEX IF EXISTS idx_channex_room_types_property_id;
DROP INDEX IF EXISTS idx_channex_room_types_channex_id;
DROP INDEX IF EXISTS idx_channex_rate_plans_room_type_id;
DROP INDEX IF EXISTS idx_channex_rate_plans_channex_id;
DROP INDEX IF EXISTS idx_channex_property_channels_property_id;
DROP INDEX IF EXISTS idx_channex_property_channels_channex_id;
DROP INDEX IF EXISTS idx_property_settings_property_id;
DROP INDEX IF EXISTS idx_unit_settings_unit_id;
DROP INDEX IF EXISTS idx_calendar_overrides_property_id;
DROP INDEX IF EXISTS idx_calendar_overrides_date;
DROP INDEX IF EXISTS idx_channel_sync_settings_property_id;
DROP INDEX IF EXISTS idx_staff_access_settings_user_id;
DROP INDEX IF EXISTS idx_staff_access_settings_property_id;
DROP INDEX IF EXISTS idx_expenses_property_id;
DROP INDEX IF EXISTS idx_expenses_owner_id;
DROP INDEX IF EXISTS idx_expenses_category;
DROP INDEX IF EXISTS idx_expenses_date;
DROP INDEX IF EXISTS idx_expenses_recorded_by;
DROP INDEX IF EXISTS idx_expenses_approval_status;
DROP INDEX IF EXISTS idx_purchases_property_id;
DROP INDEX IF EXISTS idx_purchases_owner_id;
DROP INDEX IF EXISTS idx_purchases_expense_id;

-- Drop functions and custom types
DROP FUNCTION IF EXISTS handle_new_user();
DROP FUNCTION IF EXISTS notify_new_message();
DROP FUNCTION IF EXISTS notify_new_reservation();
DROP FUNCTION IF EXISTS notify_new_task();
DROP FUNCTION IF EXISTS update_updated_at_column();
DROP FUNCTION IF EXISTS insert_notification(UUID, VARCHAR, TEXT, VARCHAR, VARCHAR);
DROP FUNCTION IF EXISTS get_user_display_name(UUID);
DROP FUNCTION IF EXISTS update_expense_total();
DROP TYPE IF EXISTS expense_category;
DROP TYPE IF EXISTS payment_method;
DROP TYPE IF EXISTS approval_status;

-- Now create all the required tables for your application

-- 1. profiles - User profiles
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  avatar_url TEXT,
  bio TEXT,
  phone TEXT,
  address TEXT,
  city TEXT,
  country TEXT,
  is_host BOOLEAN DEFAULT FALSE,
  is_premium BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 2. listings - Property listings (needed for homepage)
CREATE TABLE listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  host_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  price_per_night DECIMAL(10, 2) NOT NULL,
  currency TEXT DEFAULT 'USD',
  property_type TEXT NOT NULL,
  bedrooms INTEGER DEFAULT 1,
  bathrooms INTEGER DEFAULT 1,
  guests INTEGER DEFAULT 2,
  address TEXT NOT NULL,
  city TEXT NOT NULL,
  country TEXT NOT NULL,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  image_url TEXT,
  rating DECIMAL(3, 2),
  review_count INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 3. bookings - Booking records (needed for bookings API)
CREATE TABLE bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  guest_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  check_in_date DATE NOT NULL,
  check_out_date DATE NOT NULL,
  total_guests INTEGER NOT NULL,
  total_price DECIMAL(10, 2) NOT NULL,
  status TEXT DEFAULT 'pending',
  payment_status TEXT DEFAULT 'unpaid',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 4. reviews - Reviews for listings
CREATE TABLE reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  guest_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 5. properties - Property information
CREATE TABLE properties (
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

-- 6. units - Units/rooms within properties
CREATE TABLE units (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  floor INTEGER,
  price_per_night NUMERIC(10, 2) NOT NULL,
  status VARCHAR(50) DEFAULT 'vacant',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 7. reservations - Reservation information
CREATE TABLE reservations (
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

-- 8. guests - Guest information
CREATE TABLE guests (
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

-- 9. tasks - Property management tasks
CREATE TABLE tasks (
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

-- 10. invoices - Invoice information
CREATE TABLE invoices (
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
  -- Pricing breakdown
  nightly_rate NUMERIC(10, 2),
  number_of_nights INTEGER,
  cleaning_fee NUMERIC(10, 2) DEFAULT 0,
  extra_guest_fee NUMERIC(10, 2) DEFAULT 0,
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

-- 11. payments - Payment information
CREATE TABLE payments (
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

-- 12. messages - Communication between users
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reservation_id UUID REFERENCES reservations(id),
  sender_id UUID NOT NULL REFERENCES auth.users(id),
  recipient_id UUID NOT NULL REFERENCES auth.users(id),
  subject VARCHAR(255),
  body TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 13. channels - Booking platform channels
CREATE TABLE channels (
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

-- 14. smart_locks - Smart lock integration
CREATE TABLE smart_locks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id UUID NOT NULL REFERENCES units(id),
  device_id VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255),
  battery_level INTEGER,
  status VARCHAR(50) DEFAULT 'locked',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 15. access_codes - Access codes for smart locks
CREATE TABLE access_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  smart_lock_id UUID NOT NULL REFERENCES smart_locks(id),
  reservation_id UUID REFERENCES reservations(id),
  code VARCHAR(50) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 16. subscription_plans - Subscription plans
CREATE TABLE subscription_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR NOT NULL,
  price_sar NUMERIC NOT NULL,
  description TEXT,
  features JSONB NOT NULL,
  billing_cycle VARCHAR DEFAULT 'monthly',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 17. user_subscriptions - User subscription information
CREATE TABLE user_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES subscription_plans(id),
  status VARCHAR DEFAULT 'active',
  subscription_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  renewal_date TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT TRUE,
  moyasser_payment_id VARCHAR,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, plan_id)
);

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
CREATE INDEX idx_listings_city ON listings(city);
CREATE INDEX idx_listings_is_active ON listings(is_active);
CREATE INDEX idx_messages_recipient_id ON messages(recipient_id);
CREATE INDEX idx_messages_is_read ON messages(is_read);

-- Insert default subscription plans
INSERT INTO subscription_plans (name, price_sar, description, features) VALUES
(
  'Professional',
  499,
  'Perfect for property managers with 1-5 properties',
  jsonb_build_object(
    'properties', 5,
    'units', 20,
    'users', 3,
    'support', 'Email support',
    'reports', true,
    'channels', 3,
    'payment_processing', true
  )
),
(
  'Enterprise',
  1299,
  'For large-scale operations with unlimited properties',
  jsonb_build_object(
    'properties', 'unlimited',
    'units', 'unlimited',
    'users', 'unlimited',
    'support', '24/7 Phone & Email support',
    'reports', true,
    'channels', 'unlimited',
    'payment_processing', true,
    'api_access', true,
    'custom_branding', true
  )
);

-- Disable Row Level Security for all tables
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE listings DISABLE ROW LEVEL SECURITY;
ALTER TABLE bookings DISABLE ROW LEVEL SECURITY;
ALTER TABLE reviews DISABLE ROW LEVEL SECURITY;
ALTER TABLE properties DISABLE ROW LEVEL SECURITY;
ALTER TABLE units DISABLE ROW LEVEL SECURITY;
ALTER TABLE reservations DISABLE ROW LEVEL SECURITY;
ALTER TABLE guests DISABLE ROW LEVEL SECURITY;
ALTER TABLE tasks DISABLE ROW LEVEL SECURITY;
ALTER TABLE invoices DISABLE ROW LEVEL SECURITY;
ALTER TABLE payments DISABLE ROW LEVEL SECURITY;
ALTER TABLE messages DISABLE ROW LEVEL SECURITY;
ALTER TABLE channels DISABLE ROW LEVEL SECURITY;
ALTER TABLE smart_locks DISABLE ROW LEVEL SECURITY;
ALTER TABLE access_codes DISABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_plans DISABLE ROW LEVEL SECURITY;
ALTER TABLE user_subscriptions DISABLE ROW LEVEL SECURITY;