// Server-side Supabase client, bound to the request's cookies.
//
// Use this in Server Components, Route Handlers, and Server Actions. It runs as
// the logged-in user, so RLS applies — unlike getServiceClient() in lib/supabase.ts,
// which bypasses RLS entirely and must never be used to serve user requests.

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Server Components cannot set cookies. Harmless when the proxy is
            // refreshing sessions, which it does on every request.
          }
        },
      },
    }
  );
}
