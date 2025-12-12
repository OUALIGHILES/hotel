-- Comprehensive Property Settings Schema for PMS

-- Property Details Settings Table
CREATE TABLE IF NOT EXISTS property_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
    
    -- Property Details Section
    property_name TEXT,
    address TEXT,
    property_type VARCHAR(50) CHECK (property_type IN ('Apartment', 'Villa', 'Tent', 'Chalet', 'Room', 'Hotel', 'Motel', 'Resort')),
    check_in_time TIME DEFAULT '15:00:00',
    check_out_time TIME DEFAULT '11:00:00',
    max_occupancy INTEGER DEFAULT 1,
    
    -- Amenities (stored as JSON array of amenities)
    amenities JSONB DEFAULT '[]'::jsonb,
    
    -- House rules
    house_rules TEXT,
    
    -- Directions/Guide
    directions TEXT,
    
    -- Images (array of image URLs)
    images JSONB DEFAULT '[]'::jsonb,
    
    -- Pricing Settings
    base_price DECIMAL(10, 2),
    weekend_price DECIMAL(10, 2),
    seasonal_pricing JSONB DEFAULT '[]'::jsonb, -- Array of objects with dates and prices
    
    -- Discounts
    weekly_discount_percent DECIMAL(5, 2) DEFAULT 0,
    monthly_discount_percent DECIMAL(5, 2) DEFAULT 0,
    last_minute_discount_percent DECIMAL(5, 2) DEFAULT 0,
    early_booking_discount_percent DECIMAL(5, 2) DEFAULT 0,
    
    -- Minimum / Maximum Stay
    minimum_nights INTEGER DEFAULT 1,
    maximum_nights INTEGER DEFAULT 365,
    allow_same_day_booking BOOLEAN DEFAULT FALSE,
    same_day_cutoff_time TIME DEFAULT '12:00:00',
    
    -- Auto Message Templates
    booking_confirmation_msg TEXT,
    pre_arrival_instructions_msg TEXT,
    smart_lock_code_msg TEXT,
    welcome_msg TEXT,
    checkout_instructions_msg TEXT,
    post_checkout_thanks_msg TEXT,
    
    -- Guest Guide Settings
    guest_guide_pdf_url TEXT,
    wifi_credentials TEXT,
    property_rules TEXT,
    instructions TEXT,
    
    -- Housekeeping Settings
    auto_create_cleaning_tasks BOOLEAN DEFAULT TRUE,
    cleaning_fee DECIMAL(10, 2),
    cleaning_checklist JSONB DEFAULT '[]'::jsonb, -- Array of cleaning checklist items
    turnover_hours INTEGER DEFAULT 2,
    
    -- Maintenance Settings
    maintenance_categories JSONB DEFAULT '["Plumbing", "Electrical", "HVAC", "Furniture", "Appliance"]'::jsonb,
    auto_notify_technician BOOLEAN DEFAULT TRUE,
    
    -- Deposit & Payment Settings
    security_deposit_required BOOLEAN DEFAULT FALSE,
    security_deposit_amount DECIMAL(10, 2),
    accepted_payment_methods JSONB DEFAULT '["cash", "bank_transfer", "pos"]'::jsonb,
    
    -- Tax Settings
    vat_enabled BOOLEAN DEFAULT FALSE,
    vat_percentage DECIMAL(5, 2) DEFAULT 0,
    tourism_tax_enabled BOOLEAN DEFAULT FALSE,
    tourism_tax_amount DECIMAL(10, 2) DEFAULT 0,
    
    -- Invoice Settings
    invoice_footer_text TEXT,
    invoice_logo_url TEXT,
    invoice_terms TEXT,
    
    -- Notification Preferences
    notify_new_booking BOOLEAN DEFAULT TRUE,
    notify_cancellation BOOLEAN DEFAULT TRUE,
    notify_payment_received BOOLEAN DEFAULT TRUE,
    notify_guest_message BOOLEAN DEFAULT TRUE,
    notify_cleaning_task_assigned BOOLEAN DEFAULT TRUE,
    notify_maintenance_issue BOOLEAN DEFAULT TRUE,
    
    -- Notification Channels (JSONB with boolean flags for channels)
    notification_channels JSONB DEFAULT '{"email": true, "sms": false, "whatsapp": false, "push": true}'::jsonb,
    
    -- Website Configuration
    website_description TEXT,
    website_photos JSONB DEFAULT '[]'::jsonb,
    booking_policy TEXT,
    cancellation_policy TEXT,
    custom_domain TEXT,
    seo_title TEXT,
    seo_meta_tags JSONB DEFAULT '[]'::jsonb,
    
    -- Booking Engine Settings
    enable_direct_booking BOOLEAN DEFAULT TRUE,
    accept_online_payments BOOLEAN DEFAULT FALSE,
    promotions_and_coupons JSONB DEFAULT '[]'::jsonb,
    
    -- Automation Rules
    auto_send_welcome_msg BOOLEAN DEFAULT TRUE,
    auto_generate_smart_lock_code BOOLEAN DEFAULT FALSE,
    auto_create_cleaning_task BOOLEAN DEFAULT TRUE,
    auto_close_cleaning_task BOOLEAN DEFAULT TRUE,
    auto_update_prices_based_on_occupancy BOOLEAN DEFAULT FALSE,
    
    -- Report Settings
    default_report_period VARCHAR(20) DEFAULT 'monthly' CHECK (default_report_period IN ('daily', 'weekly', 'monthly', 'quarterly', 'yearly')),
    preferred_metrics_order JSONB DEFAULT '["revenue", "occupancy", "adr"]'::jsonb,
    export_formats JSONB DEFAULT '["CSV", "PDF"]'::jsonb,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for faster lookups by property_id
CREATE INDEX IF NOT EXISTS idx_property_settings_property_id ON property_settings(property_id);

-- Trigger to update the updated_at timestamp for property_settings
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_property_settings_updated_at
    BEFORE UPDATE ON property_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Unit Settings Table (for properties with multiple units)
CREATE TABLE IF NOT EXISTS unit_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    unit_id UUID NOT NULL REFERENCES units(id) ON DELETE CASCADE,
    
    -- Unit Details
    unit_name TEXT,
    unit_capacity INTEGER DEFAULT 1,
    bed_configuration TEXT,
    unit_amenities JSONB DEFAULT '[]'::jsonb,
    base_price DECIMAL(10, 2),
    cleaning_fee DECIMAL(10, 2),
    security_deposit_rules TEXT,
    
    -- Smart Lock Integration per Unit
    smart_lock_device_id TEXT, -- Device ID for smart lock
    smart_lock_type VARCHAR(20) CHECK (smart_lock_type IN ('ttlock', 'nuki', 'schlage', 'august', 'other')), -- Lock types
    auto_generate_code_on_booking BOOLEAN DEFAULT FALSE,
    code_validity_duration INTEGER DEFAULT 1440, -- in minutes (default 24 hours)
    auto_send_code_by_email BOOLEAN DEFAULT TRUE,
    auto_send_code_by_sms BOOLEAN DEFAULT FALSE,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for faster lookups by unit_id
CREATE INDEX IF NOT EXISTS idx_unit_settings_unit_id ON unit_settings(unit_id);

-- Trigger to update the updated_at timestamp for unit_settings
CREATE TRIGGER update_unit_settings_updated_at
    BEFORE UPDATE ON unit_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Calendar Override Settings Table (for specific date settings)
CREATE TABLE IF NOT EXISTS calendar_overrides (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
    override_date DATE NOT NULL,
    availability_status VARCHAR(20) CHECK (availability_status IN ('available', 'blocked', 'maintenance', 'manual_booking')) DEFAULT 'available',
    override_price DECIMAL(10, 2), -- Price override for this specific date
    reason TEXT, -- Reason for the override
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for faster lookups by property_id and date
CREATE INDEX IF NOT EXISTS idx_calendar_overrides_property_id ON calendar_overrides(property_id);
CREATE INDEX IF NOT EXISTS idx_calendar_overrides_date ON calendar_overrides(override_date);

-- Trigger to update the updated_at timestamp for calendar_overrides
CREATE TRIGGER update_calendar_overrides_updated_at
    BEFORE UPDATE ON calendar_overrides
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Channel Sync Settings Table (for channel manager integration)
CREATE TABLE IF NOT EXISTS channel_sync_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
    
    -- Sync Control
    enable_availability_sync BOOLEAN DEFAULT TRUE,
    enable_price_sync BOOLEAN DEFAULT TRUE,
    enable_booking_import BOOLEAN DEFAULT TRUE,
    
    -- Channel-specific settings (stored as JSONB)
    channel_specific_settings JSONB DEFAULT '{}'::jsonb,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for faster lookups by property_id
CREATE INDEX IF NOT EXISTS idx_channel_sync_settings_property_id ON channel_sync_settings(property_id);

-- Trigger to update the updated_at timestamp for channel_sync_settings
CREATE TRIGGER update_channel_sync_settings_updated_at
    BEFORE UPDATE ON channel_sync_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Staff Access Settings Table (for controlling staff permissions)
CREATE TABLE IF NOT EXISTS staff_access_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    staff_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
    
    -- Access Permissions
    can_access_financial_data BOOLEAN DEFAULT FALSE,
    can_access_calendar BOOLEAN DEFAULT TRUE,
    can_manage_bookings BOOLEAN DEFAULT TRUE,
    can_edit_property_settings BOOLEAN DEFAULT FALSE,
    can_manage_housekeeping BOOLEAN DEFAULT FALSE,
    can_manage_maintenance BOOLEAN DEFAULT FALSE,
    can_send_guest_messages BOOLEAN DEFAULT TRUE,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure unique combination of staff and property
    UNIQUE(staff_user_id, property_id)
);

-- Index for faster lookups by user and property
CREATE INDEX IF NOT EXISTS idx_staff_access_settings_user_id ON staff_access_settings(staff_user_id);
CREATE INDEX IF NOT EXISTS idx_staff_access_settings_property_id ON staff_access_settings(property_id);

-- Trigger to update the updated_at timestamp for staff_access_settings
CREATE TRIGGER update_staff_access_settings_updated_at
    BEFORE UPDATE ON staff_access_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- RLS (Row Level Security) Policies
-- Enable RLS on all tables
ALTER TABLE property_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE unit_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_overrides ENABLE ROW_LEVEL SECURITY;
ALTER TABLE channel_sync_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_access_settings ENABLE ROW LEVEL SECURITY;

-- RLS policies for property_settings
CREATE POLICY "Users can view property settings for their properties" ON property_settings
    FOR SELECT USING (
        property_id IN (
            SELECT p.id 
            FROM properties p 
            JOIN property_managers pm ON p.id = pm.property_id
            WHERE pm.user_id = auth.uid() OR p.owner_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert property settings for their properties" ON property_settings
    FOR INSERT WITH CHECK (
        property_id IN (
            SELECT p.id 
            FROM properties p 
            JOIN property_managers pm ON p.id = pm.property_id
            WHERE pm.user_id = auth.uid() OR p.owner_id = auth.uid()
        )
    );

CREATE POLICY "Users can update property settings for their properties" ON property_settings
    FOR UPDATE USING (
        property_id IN (
            SELECT p.id 
            FROM properties p 
            JOIN property_managers pm ON p.id = pm.property_id
            WHERE pm.user_id = auth.uid() OR p.owner_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete property settings for their properties" ON property_settings
    FOR DELETE USING (
        property_id IN (
            SELECT p.id 
            FROM properties p 
            JOIN property_managers pm ON p.id = pm.property_id
            WHERE pm.user_id = auth.uid() OR p.owner_id = auth.uid()
        )
    );

-- RLS policies for unit_settings
CREATE POLICY "Users can view unit settings for their properties" ON unit_settings
    FOR SELECT USING (
        unit_id IN (
            SELECT u.id 
            FROM units u
            JOIN properties p ON u.property_id = p.id
            JOIN property_managers pm ON p.id = pm.property_id
            WHERE pm.user_id = auth.uid() OR p.owner_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert unit settings for their properties" ON unit_settings
    FOR INSERT WITH CHECK (
        unit_id IN (
            SELECT u.id 
            FROM units u
            JOIN properties p ON u.property_id = p.id
            JOIN property_managers pm ON p.id = pm.property_id
            WHERE pm.user_id = auth.uid() OR p.owner_id = auth.uid()
        )
    );

CREATE POLICY "Users can update unit settings for their properties" ON unit_settings
    FOR UPDATE USING (
        unit_id IN (
            SELECT u.id 
            FROM units u
            JOIN properties p ON u.property_id = p.id
            JOIN property_managers pm ON p.id = pm.property_id
            WHERE pm.user_id = auth.uid() OR p.owner_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete unit settings for their properties" ON unit_settings
    FOR DELETE USING (
        unit_id IN (
            SELECT u.id 
            FROM units u
            JOIN properties p ON u.property_id = p.id
            JOIN property_managers pm ON p.id = pm.property_id
            WHERE pm.user_id = auth.uid() OR p.owner_id = auth.uid()
        )
    );

-- RLS policies for calendar_overrides
CREATE POLICY "Users can view calendar overrides for their properties" ON calendar_overrides
    FOR SELECT USING (
        property_id IN (
            SELECT p.id 
            FROM properties p 
            JOIN property_managers pm ON p.id = pm.property_id
            WHERE pm.user_id = auth.uid() OR p.owner_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert calendar overrides for their properties" ON calendar_overrides
    FOR INSERT WITH CHECK (
        property_id IN (
            SELECT p.id 
            FROM properties p 
            JOIN property_managers pm ON p.id = pm.property_id
            WHERE pm.user_id = auth.uid() OR p.owner_id = auth.uid()
        )
    );

CREATE POLICY "Users can update calendar overrides for their properties" ON calendar_overrides
    FOR UPDATE USING (
        property_id IN (
            SELECT p.id 
            FROM properties p 
            JOIN property_managers pm ON p.id = pm.property_id
            WHERE pm.user_id = auth.uid() OR p.owner_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete calendar overrides for their properties" ON calendar_overrides
    FOR DELETE USING (
        property_id IN (
            SELECT p.id 
            FROM properties p 
            JOIN property_managers pm ON p.id = pm.property_id
            WHERE pm.user_id = auth.uid() OR p.owner_id = auth.uid()
        )
    );

-- RLS policies for channel_sync_settings
CREATE POLICY "Users can view channel sync settings for their properties" ON channel_sync_settings
    FOR SELECT USING (
        property_id IN (
            SELECT p.id 
            FROM properties p 
            JOIN property_managers pm ON p.id = pm.property_id
            WHERE pm.user_id = auth.uid() OR p.owner_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert channel sync settings for their properties" ON channel_sync_settings
    FOR INSERT WITH CHECK (
        property_id IN (
            SELECT p.id 
            FROM properties p 
            JOIN property_managers pm ON p.id = pm.property_id
            WHERE pm.user_id = auth.uid() OR p.owner_id = auth.uid()
        )
    );

CREATE POLICY "Users can update channel sync settings for their properties" ON channel_sync_settings
    FOR UPDATE USING (
        property_id IN (
            SELECT p.id 
            FROM properties p 
            JOIN property_managers pm ON p.id = pm.property_id
            WHERE pm.user_id = auth.uid() OR p.owner_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete channel sync settings for their properties" ON channel_sync_settings
    FOR DELETE USING (
        property_id IN (
            SELECT p.id 
            FROM properties p 
            JOIN property_managers pm ON p.id = pm.property_id
            WHERE pm.user_id = auth.uid() OR p.owner_id = auth.uid()
        )
    );

-- RLS policies for staff_access_settings
CREATE POLICY "Users can view staff access settings for their properties" ON staff_access_settings
    FOR SELECT USING (
        property_id IN (
            SELECT p.id 
            FROM properties p 
            JOIN property_managers pm ON p.id = pm.property_id
            WHERE pm.user_id = auth.uid() OR p.owner_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert staff access settings for their properties" ON staff_access_settings
    FOR INSERT WITH CHECK (
        property_id IN (
            SELECT p.id 
            FROM properties p 
            JOIN property_managers pm ON p.id = pm.property_id
            WHERE pm.user_id = auth.uid() OR p.owner_id = auth.uid()
        )
    );

CREATE POLICY "Users can update staff access settings for their properties" ON staff_access_settings
    FOR UPDATE USING (
        property_id IN (
            SELECT p.id 
            FROM properties p 
            JOIN property_managers pm ON p.id = pm.property_id
            WHERE pm.user_id = auth.uid() OR p.owner_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete staff access settings for their properties" ON staff_access_settings
    FOR DELETE USING (
        property_id IN (
            SELECT p.id 
            FROM properties p 
            JOIN property_managers pm ON p.id = pm.property_id
            WHERE pm.user_id = auth.uid() OR p.owner_id = auth.uid()
        )
    );

-- Insert sample data for demonstration (optional)
-- INSERT INTO property_settings (property_id, property_name, address, property_type, max_occupancy) VALUES
--     ('123e4567-e89b-12d3-a456-426614174000', 'Beachfront Villa', '123 Ocean Drive, Miami Beach, FL', 'Villa', 8);

COMMIT;