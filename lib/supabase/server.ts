import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
        } catch {
          // Can be ignored in Server Components
        }
      },
    },
  })
}

// For use in API routes where we can't use next/headers
export function createClientForRoute(requestCookies: any) {
  const cookieStore = {
    getAll() {
      return requestCookies.getAll ? requestCookies.getAll() : [];
    },
    setAll(cookiesToSet) {
      try {
        cookiesToSet.forEach(({ name, value, options }: { name: string, value: string, options: any }) => {
          // For API routes, we'll handle cookie setting differently
        });
      } catch {
        // Can be ignored in API routes
      }
    },
  };

  return createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        cookieStore.setAll(cookiesToSet);
      },
    },
  });
}