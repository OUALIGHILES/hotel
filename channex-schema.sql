-- Channex Connections Table
-- Stores the user's Channex API connection details
CREATE TABLE IF NOT EXISTS channex_connections (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  channex_user_api_key TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  last_sync_at TIMESTAMP WITH TIME ZONE,
  token_expires_at TIMESTAMP WITH TIME ZONE
);

-- Index for faster lookups by user_id
CREATE INDEX IF NOT EXISTS idx_channex_connections_user_id ON channex_connections(user_id);

-- Trigger to update the 'updated_at' column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_channex_connections_updated_at 
    BEFORE UPDATE ON channex_connections 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Channex Properties Table
-- Stores properties fetched from Channex
CREATE TABLE IF NOT EXISTS channex_properties (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  channex_property_id TEXT UNIQUE NOT NULL, -- The ID from Channex
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  currency_code TEXT,
  timezone TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Index for faster lookups by user_id and channex_property_id
CREATE INDEX IF NOT EXISTS idx_channex_properties_user_id ON channex_properties(user_id);
CREATE INDEX IF NOT EXISTS idx_channex_properties_channex_id ON channex_properties(channex_property_id);

CREATE TRIGGER update_channex_properties_updated_at 
    BEFORE UPDATE ON channex_properties 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Channex Room Types Table
-- Stores room types fetched from Channex
CREATE TABLE IF NOT EXISTS channex_room_types (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  channex_room_type_id TEXT UNIQUE NOT NULL, -- The ID from Channex
  channex_property_id TEXT REFERENCES channex_properties(channex_property_id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_channex_room_types_property_id ON channex_room_types(channex_property_id);
CREATE INDEX IF NOT EXISTS idx_channex_room_types_channex_id ON channex_room_types(channex_room_type_id);

CREATE TRIGGER update_channex_room_types_updated_at 
    BEFORE UPDATE ON channex_room_types 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Channex Rate Plans Table
-- Stores rate plans fetched from Channex
CREATE TABLE IF NOT EXISTS channex_rate_plans (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  channex_rate_plan_id TEXT UNIQUE NOT NULL, -- The ID from Channex
  channex_room_type_id TEXT REFERENCES channex_room_types(channex_room_type_id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_channex_rate_plans_room_type_id ON channex_rate_plans(channex_room_type_id);
CREATE INDEX IF NOT EXISTS idx_channex_rate_plans_channex_id ON channex_rate_plans(channex_rate_plan_id);

CREATE TRIGGER update_channex_rate_plans_updated_at 
    BEFORE UPDATE ON channex_rate_plans 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Channex Property Channels Table
-- Stores the channels connected to each property in Channex
CREATE TABLE IF NOT EXISTS channex_property_channels (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  channex_property_channel_id TEXT UNIQUE NOT NULL, -- The ID from Channex
  channex_property_id TEXT REFERENCES channex_properties(channex_property_id) ON DELETE CASCADE NOT NULL,
  channel_id TEXT NOT NULL, -- The internal Channex channel ID
  channel_name TEXT NOT NULL, -- The name of the channel (e.g., "Booking.com", "Airbnb")
  is_enabled BOOLEAN DEFAULT true NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_channex_property_channels_property_id ON channex_property_channels(channex_property_id);
CREATE INDEX IF NOT EXISTS idx_channex_property_channels_channex_id ON channex_property_channels(channex_property_channel_id);

CREATE TRIGGER update_channex_property_channels_updated_at 
    BEFORE UPDATE ON channex_property_channels 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- RLS (Row Level Security) Policies
-- Enable RLS on all tables
ALTER TABLE channex_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE channex_properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE channex_room_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE channex_rate_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE channex_property_channels ENABLE ROW LEVEL SECURITY;

-- Create RLS policies to ensure users can only access their own data
CREATE POLICY "Users can view their own channex connections" ON channex_connections
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own channex connections" ON channex_connections
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own channex connections" ON channex_connections
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own channex connections" ON channex_connections
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own channex properties" ON channex_properties
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own channex properties" ON channex_properties
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own channex properties" ON channex_properties
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own channex properties" ON channex_properties
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own channex room types" ON channex_room_types
  FOR SELECT USING (channex_property_id IN (SELECT channex_property_id FROM channex_properties WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert their own channex room types" ON channex_room_types
  FOR INSERT WITH CHECK (channex_property_id IN (SELECT channex_property_id FROM channex_properties WHERE user_id = auth.uid()));

CREATE POLICY "Users can update their own channex room types" ON channex_room_types
  FOR UPDATE USING (channex_property_id IN (SELECT channex_property_id FROM channex_properties WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete their own channex room types" ON channex_room_types
  FOR DELETE USING (channex_property_id IN (SELECT channex_property_id FROM channex_properties WHERE user_id = auth.uid()));

CREATE POLICY "Users can view their own channex rate plans" ON channex_rate_plans
  FOR SELECT USING (channex_room_type_id IN (
    SELECT rt.channex_room_type_id 
    FROM channex_room_types rt
    JOIN channex_properties p ON rt.channex_property_id = p.channex_property_id
    WHERE p.user_id = auth.uid()
  ));

CREATE POLICY "Users can insert their own channex rate plans" ON channex_rate_plans
  FOR INSERT WITH CHECK (channex_room_type_id IN (
    SELECT rt.channex_room_type_id 
    FROM channex_room_types rt
    JOIN channex_properties p ON rt.channex_property_id = p.channex_property_id
    WHERE p.user_id = auth.uid()
  ));

CREATE POLICY "Users can update their own channex rate plans" ON channex_rate_plans
  FOR UPDATE USING (channex_room_type_id IN (
    SELECT rt.channex_room_type_id 
    FROM channex_room_types rt
    JOIN channex_properties p ON rt.channex_property_id = p.channex_property_id
    WHERE p.user_id = auth.uid()
  ));

CREATE POLICY "Users can delete their own channex rate plans" ON channex_rate_plans
  FOR DELETE USING (channex_room_type_id IN (
    SELECT rt.channex_room_type_id 
    FROM channex_room_types rt
    JOIN channex_properties p ON rt.channex_property_id = p.channex_property_id
    WHERE p.user_id = auth.uid()
  ));

CREATE POLICY "Users can view their own channex property channels" ON channex_property_channels
  FOR SELECT USING (channex_property_id IN (SELECT channex_property_id FROM channex_properties WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert their own channex property channels" ON channex_property_channels
  FOR INSERT WITH CHECK (channex_property_id IN (SELECT channex_property_id FROM channex_properties WHERE user_id = auth.uid()));

CREATE POLICY "Users can update their own channex property channels" ON channex_property_channels
  FOR UPDATE USING (channex_property_id IN (SELECT channex_property_id FROM channex_properties WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete their own channex property channels" ON channex_property_channels
  FOR DELETE USING (channex_property_id IN (SELECT channex_property_id FROM channex_properties WHERE user_id = auth.uid()));