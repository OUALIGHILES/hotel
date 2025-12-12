-- Add bedrooms, bathrooms, and capacity columns to the units table
ALTER TABLE units 
ADD COLUMN IF NOT EXISTS bedrooms INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS bathrooms INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS max_guests INTEGER DEFAULT 2;

-- Update the units table to set constraints for these new columns
ALTER TABLE units 
ALTER COLUMN bedrooms SET DEFAULT 1,
ALTER COLUMN bathrooms SET DEFAULT 1,
ALTER COLUMN max_guests SET DEFAULT 2;