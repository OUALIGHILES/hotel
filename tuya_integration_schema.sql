-- Add Tuya integration columns to properties table
ALTER TABLE properties ADD COLUMN IF NOT EXISTS tuya_client_id VARCHAR(255);
ALTER TABLE properties ADD COLUMN IF NOT EXISTS tuya_client_secret VARCHAR(255);
ALTER TABLE properties ADD COLUMN IF NOT EXISTS tuya_access_token VARCHAR(500);
ALTER TABLE properties ADD COLUMN IF NOT EXISTS tuya_refresh_token VARCHAR(500);
ALTER TABLE properties ADD COLUMN IF NOT EXISTS tuya_region VARCHAR(10) DEFAULT 'us';
ALTER TABLE properties ADD COLUMN IF NOT EXISTS tuya_connected BOOLEAN DEFAULT FALSE;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS tuya_token_expires_at TIMESTAMP WITH TIME ZONE;

-- Optionally, create a separate table for API tokens if more complex storage is needed
CREATE TABLE IF NOT EXISTS tuya_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  access_token VARCHAR(500) NOT NULL,
  refresh_token VARCHAR(500) NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_tuya_tokens_property_id ON tuya_tokens(property_id);

-- Enable Row Level Security on the new table
ALTER TABLE tuya_tokens ENABLE ROW LEVEL SECURITY;

-- Create policy to allow property owners to access their own tokens
CREATE POLICY "Allow property owners to access their own tokens" ON tuya_tokens
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM properties 
    WHERE properties.id = tuya_tokens.property_id 
    AND properties.user_id = auth.uid()
  )
);