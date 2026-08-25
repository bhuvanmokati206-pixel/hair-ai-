// Data Access Layer for auth.
//
// Next 16's guidance: the proxy does *optimistic* checks only (read the cookie,
// redirect), and the real verification happens here, close to the data. The
// proxy runs on prefetched routes too, so a DB call there would fire constantly.
//
// Always use getUser(), never getSession(), on the server. getSession() reads
// the cookie without contacting the auth server, so a forged cookie passes it.
// getUser() revalidates the JWT with Supabase.

import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "./supabase/server";

export type Role = "platform_admin" | "salon_owner" | "salon_staff";

export type Profile = {
  id: string;
  role: Role;
  salonId: string | null;
  fullName: string | null;
  phone: string | null;
  isActive: boolean;
  email: string | null;
};

/**
 * The signed-in user's profile, or null.
 *
 * Wrapped in React's cache() so several Server Components on one page share a
 * single round trip instead of each re-querying.
 */
export const getProfile = cache(async (): Promise<Profile | null> => {
  const supabase = await createClient();

  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role, salon_id, full_name, phone, is_active")
    .eq("id", user.id)
    .maybeSingle();

  // Authenticated but no profile row means signup did not finish. Treat as
  // signed out rather than guessing a role — guessing here grants privileges.
  if (!profile || !profile.is_active) return null;

  return {
    id:       profile.id,
    role:     profile.role as Role,
    salonId:  profile.salon_id,
    fullName: profile.full_name,
    phone:    profile.phone,
    isActive: profile.is_active,
    email:    user.email ?? null,
  };
});

/** Requires any signed-in user. Redirects to /login otherwise. */
export async function requireAuth(): Promise<Profile> {
  const profile = await getProfile();
  if (!profile) redirect("/login");
  return profile;
}

/** Requires the platform admin. Salon users are sent to their own dashboard. */
export async function requireAdmin(): Promise<Profile> {
  const profile = await requireAuth();
  if (profile.role !== "platform_admin") redirect("/home");
  return profile;
}

/**
 * Requires a user bound to a salon, and returns that salon id.
 * Platform admins can act on a specific salon by passing one explicitly.
 */
export async function requireSalon(explicitSalonId?: string): Promise<{ profile: Profile; salonId: string }> {
  const profile = await requireAuth();

  if (profile.role === "platform_admin") {
    if (!explicitSalonId) redirect("/admin");
    return { profile, salonId: explicitSalonId };
  }

  if (!profile.salonId) redirect("/login");
  return { profile, salonId: profile.salonId };
}

/** Where a user lands after signing in. */
export function homeRouteFor(role: Role): string {
  return role === "platform_admin" ? "/admin" : "/home";
}

/**
 * The signed-in user's salon, for route handlers.
 *
 * Returns null rather than redirecting, so a route can answer with JSON.
 * Deliberately reads the salon from the session instead of the request body —
 * a client-supplied salonId would let anyone write into another salon's data.
 */
export async function getSessionSalonId(): Promise<string | null> {
  const profile = await getProfile();
  return profile?.salonId ?? null;
}
