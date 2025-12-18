-- Add image columns to the units table
ALTER TABLE public.units
ADD COLUMN IF NOT EXISTS main_picture_url TEXT,
ADD COLUMN IF NOT EXISTS additional_pictures_urls JSONB;

-- Create storage bucket for units if it doesn't exist
INSERT INTO storage.buckets (id, name, public, avif_autodetection, file_size_limit, allowed_mime_types)
VALUES ('units', 'units', true, false, 5242880, '{image/png,image/jpeg,image/jpg,image/webp,image/gif,image/bmp,image/svg+xml,image/tiff,image/x-icon,image/apng,image/avif}')
ON CONFLICT (id) DO NOTHING;

-- Set up storage policies for units bucket
CREATE POLICY "Allow public read access to units bucket" ON storage.objects
FOR SELECT TO public USING (bucket_id = 'units');

CREATE POLICY "Allow authenticated users to upload to units bucket" ON storage.objects
FOR INSERT TO authenticated WITH CHECK (bucket_id = 'units');

CREATE POLICY "Allow authenticated users to update units bucket" ON storage.objects
FOR UPDATE TO authenticated WITH CHECK (bucket_id = 'units');

CREATE POLICY "Allow authenticated users to delete from units bucket" ON storage.objects
FOR DELETE TO authenticated WITH CHECK (bucket_id = 'units');