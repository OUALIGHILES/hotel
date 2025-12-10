import { createClient } from '@supabase/supabase-js'

// Create a Supabase client for server-side operations using anon key (for read operations)
// Note: This requires appropriate RLS policies to be in place
export function createPublicDirectClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}