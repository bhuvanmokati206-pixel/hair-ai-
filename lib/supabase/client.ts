"use client";

// Browser-side Supabase client.
//
// Uses @supabase/ssr rather than plain createClient so the session lives in
// cookies instead of localStorage. Cookies are the only thing the server, the
// proxy, and Server Components can all read — localStorage is invisible to
// every one of them, which is why route protection cannot work without this.

import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
