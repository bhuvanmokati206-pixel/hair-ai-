import { createClient } from "@supabase/supabase-js";

// Placeholder fallbacks so `createClient()` never throws "supabaseUrl is required"
// at module load — which would crash `next build`'s page-data collection when the
// NEXT_PUBLIC_* vars aren't present at build time. The REAL values are inlined at
// build when the env vars are set in the host (Vercel); the placeholders only keep
// an unconfigured build from hard-failing.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder-anon-key";

// Public client — used in browser/client components
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Service client — used in API routes only (has full DB access, bypasses RLS)
// Never expose SUPABASE_SERVICE_KEY to the browser
export function getServiceClient() {
  const serviceKey = process.env.SUPABASE_SERVICE_KEY ?? "";
  if (!serviceKey) throw new Error("SUPABASE_SERVICE_KEY not set");
  return createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false },
  });
}
