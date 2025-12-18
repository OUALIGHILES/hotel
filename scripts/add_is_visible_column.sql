-- Add is_visible column to listings table
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS is_visible BOOLEAN DEFAULT TRUE;

-- Update existing listings to match the active status
UPDATE public.listings SET is_visible = is_active;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_listings_is_visible ON public.listings(is_visible);