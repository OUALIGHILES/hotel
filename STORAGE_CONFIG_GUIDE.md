# Supabase Storage Configuration Guide

## Issue
After removing all policies from the "units" bucket in Supabase storage, file upload operations may fail due to lack of proper permissions.

## Solution
To fix this issue, you need to restore appropriate policies to allow authenticated users to upload files while keeping the bucket public for read access.

## Steps to Fix

### Option 1: Run the SQL Script
Execute the SQL commands in `restore-units-bucket-policies.sql` in your Supabase SQL Editor:

1. Go to your Supabase dashboard
2. Navigate to Database → SQL Editor
3. Copy and paste the contents of `restore-units-bucket-policies.sql`
4. Execute the query

### Option 2: Manual Configuration via Supabase Dashboard

#### For the "units" bucket:
1. Go to Storage → Buckets in your Supabase dashboard
2. Make sure the "units" bucket exists and is set to public
3. Go to Storage → Policies
4. Create the following policies:

**Read (SELECT) Policy:**
- Action: SELECT
- Role: PUBLIC
- Target: `bucket_id = 'units'`

**Insert (UPLOAD) Policy:**
- Action: INSERT
- Role: AUTHENTICATED
- Target: `bucket_id = 'units'`

**Update Policy:**
- Action: UPDATE
- Role: AUTHENTICATED
- Target: `bucket_id = 'units'`

**Delete Policy:**
- Action: DELETE
- Role: AUTHENTICATED
- Target: `bucket_id = 'units'`

#### For the "profile" bucket:
1. Make sure the "profile" bucket exists and is set to public
2. Create similar policies as above for "profile" bucket

## Bucket Configuration Details

### units bucket
- Public: true
- File size limit: 10MB (10485760 bytes)
- Allowed MIME types: image/png, image/jpeg, image/jpg, image/webp, image/gif, image/bmp, image/svg+xml, image/tiff, image/x-icon, image/apng, image/avif

### profile bucket
- Public: true
- File size limit: 5MB (5242880 bytes) 
- Allowed MIME types: image/png, image/jpeg, image/jpg, image/webp, image/gif, image/bmp, image/svg+xml, image/tiff, image/x-icon, image/apng, image/avif

## Troubleshooting

If you continue to have upload issues after restoring policies:
1. Verify that your Supabase service role key has proper permissions
2. Ensure your authentication is working properly (user must be logged in to upload)
3. Check that the file formats you're uploading are in the allowed MIME types list
4. Confirm the bucket names match exactly (case-sensitive)

## Security Note
These policies allow authenticated users to upload files to the storage buckets. Make sure to validate file types and sizes in your application code as well for additional security.