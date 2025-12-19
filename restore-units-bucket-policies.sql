-- Restore proper policies for the units bucket after removing all policies
-- This makes the bucket public for read access and allows authenticated users to upload

-- Insert bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public, avif_autodetection, file_size_limit, allowed_mime_types)
VALUES ('units', 'units', true, false, 10485760, '{image/png,image/jpeg,image/jpg,image/webp,image/gif,image/bmp,image/svg+xml,image/tiff,image/x-icon,image/apng,image/avif}')
ON CONFLICT (id) DO UPDATE SET
  public = true,
  avif_autodetection = false,
  file_size_limit = 10485760,
  allowed_mime_types = '{image/png,image/jpeg,image/jpg,image/webp,image/gif,image/bmp,image/svg+xml,image/tiff,image/x-icon,image/apng,image/avif}';

-- Policy to allow public read access to units bucket
CREATE POLICY "Allow public read access to units bucket" ON storage.objects
FOR SELECT TO public USING (bucket_id = 'units');

-- Policy to allow authenticated users to upload to units bucket
CREATE POLICY "Allow authenticated users to upload to units bucket" ON storage.objects
FOR INSERT TO authenticated WITH CHECK (bucket_id = 'units');

-- Policy to allow authenticated users to update units bucket
CREATE POLICY "Allow authenticated users to update units bucket" ON storage.objects
FOR UPDATE TO authenticated WITH CHECK (bucket_id = 'units');

-- Policy to allow users to delete their own files from units bucket
CREATE POLICY "Allow authenticated users to delete from units bucket" ON storage.objects
FOR DELETE TO authenticated USING (
  (SELECT properties.user_id FROM properties WHERE properties.id = ANY(
    SELECT u.property_id FROM units u WHERE CONCAT('units/', auth.uid(), '/', u.property_id, '/') = LEFT(name, LENGTH(CONCAT('units/', auth.uid(), '/', u.property_id, '/')))
  ) LIMIT 1) = auth.uid()
);