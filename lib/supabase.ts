import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

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
