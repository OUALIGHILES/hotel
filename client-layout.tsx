'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isLoaded, setIsLoaded] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    // Check if user is logged in via the custom auth system by calling the auth check API
    const syncSession = async () => {
      try {
        // First, verify if user is authenticated via our custom system
        const response = await fetch('/api/auth/check');

        if (response.ok) {
          const { user } = await response.json();

          if (user) {
            // The user is logged in via our custom system, but Supabase might not know
            // Check if there's already a Supabase session
            const { data: { session } } = await supabase.auth.getSession();

            if (!session) {
              // No Supabase session exists, so we need to make sure we can still use Supabase services
              // For this app's architecture, this might mean that we rely on row-level security
              // being bypassed for authenticated users, or we need to ensure proper session handling

              // In some cases, we might need to refetch user info to ensure Supabase client
              // is aware of the authenticated state
              const { data: { user: supabaseUser } } = await supabase.auth.getUser();
              if (!supabaseUser) {
                // User is logged in via custom system but Supabase client doesn't know
                // This can happen with the custom auth approach
                console.log('User authenticated via custom system but Supabase session not active');
              }
            }
          }
        } else {
          // User is not authenticated via custom system
          console.log('User not authenticated via custom system');
        }
      } catch (error) {
        console.error('Error syncing session:', error);
      } finally {
        setIsLoaded(true);
      }
    };

    syncSession();
  }, [supabase]);

  if (!isLoaded) {
    return <div>Loading...</div>;
  }

  return <>{children}</>;
}