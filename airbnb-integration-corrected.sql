-- First, let's make sure all our ID columns are the same type (UUID)
-- Create table for external account connections (including Airbnb)
CREATE TABLE IF NOT EXISTS external_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  platform TEXT NOT NULL, -- Use TEXT instead of VARCHAR for consistency with auth tables
  external_account_id TEXT, -- Use TEXT for external IDs (they are typically strings)
  access_token TEXT,
  refresh_token TEXT,
  token_expires_at TIMESTAMP WITH TIME ZONE,
  scopes TEXT[], -- Array of granted permissions
  connection_metadata JSONB, -- Store platform-specific metadata
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create table for synced listings between PMS and external platforms
CREATE TABLE IF NOT EXISTS listing_sync (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pms_unit_id UUID NOT NULL REFERENCES units(id) ON DELETE CASCADE,
  external_account_id UUID NOT NULL REFERENCES external_accounts(id) ON DELETE CASCADE,
  external_listing_id TEXT NOT NULL, -- External platform's listing ID (text)
  platform TEXT NOT NULL,
  sync_settings JSONB,
  is_sync_enabled BOOLEAN DEFAULT true,
  last_sync_at TIMESTAMP WITH TIME ZONE,
  sync_status TEXT DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(pms_unit_id, external_account_id, platform)
);

-- Create indexes
CREATE INDEX idx_external_accounts_user_id ON external_accounts(user_id);
CREATE INDEX idx_external_accounts_platform ON external_accounts(platform);
CREATE INDEX idx_listing_sync_pms_unit_id ON listing_sync(pms_unit_id);
CREATE INDEX idx_listing_sync_external_account_id ON listing_sync(external_account_id);
CREATE INDEX idx_listing_sync_platform ON listing_sync(platform);

-- Enable RLS
ALTER TABLE external_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE listing_sync ENABLE ROW LEVEL SECURITY;

-- RLS policies for external accounts
CREATE POLICY "external_accounts_select_own" ON public.external_accounts
  FOR SELECT USING (auth.uid()::UUID = user_id::UUID);

CREATE POLICY "external_accounts_insert_own" ON public.external_accounts
  FOR INSERT WITH CHECK (auth.uid()::UUID = user_id::UUID);

CREATE POLICY "external_accounts_update_own" ON public.external_accounts
  FOR UPDATE USING (auth.uid()::UUID = user_id::UUID);

CREATE POLICY "external_accounts_delete_own" ON public.external_accounts
  FOR DELETE USING (auth.uid()::UUID = user_id::UUID);

-- RLS policies for listing sync - Using explicit type casting to avoid comparison issues
CREATE POLICY "listing_sync_select_own" ON public.listing_sync
  FOR SELECT USING (
    (
      SELECT user_id::UUID FROM external_accounts 
      WHERE id::UUID = listing_sync.external_account_id::UUID
    ) = auth.uid()::UUID
    OR
    (
      SELECT p.user_id::UUID FROM units u
      JOIN properties p ON u.property_id::UUID = p.id::UUID
      WHERE u.id::UUID = listing_sync.pms_unit_id::UUID
    ) = auth.uid()::UUID
  );

CREATE POLICY "listing_sync_insert_own" ON public.listing_sync
  FOR INSERT WITH CHECK (
    (
      SELECT user_id::UUID FROM external_accounts 
      WHERE id::UUID = listing_sync.external_account_id::UUID
    ) = auth.uid()::UUID
    AND
    (
      SELECT p.user_id::UUID FROM units u
      JOIN properties p ON u.property_id::UUID = p.id::UUID
      WHERE u.id::UUID = listing_sync.pms_unit_id::UUID
    ) = auth.uid()::UUID
  );

CREATE POLICY "listing_sync_update_own" ON public.listing_sync
  FOR UPDATE USING (
    (
      SELECT user_id::UUID FROM external_accounts 
      WHERE id::UUID = listing_sync.external_account_id::UUID
    ) = auth.uid()::UUID
    AND
    (
      SELECT p.user_id::UUID FROM units u
      JOIN properties p ON u.property_id::UUID = p.id::UUID
      WHERE u.id::UUID = listing_sync.pms_unit_id::UUID
    ) = auth.uid()::UUID
  );

-- Add columns to existing channels table to support Airbnb
ALTER TABLE channels ADD COLUMN IF NOT EXISTS external_account_id UUID REFERENCES external_accounts(id);
ALTER TABLE channels ADD COLUMN IF NOT EXISTS sync_settings JSONB;
ALTER TABLE channels ADD COLUMN IF NOT EXISTS last_sync_at TIMESTAMP WITH TIME ZONE;