// Next 16 renamed `middleware.ts` to `proxy.ts`. Same position (project root),
// same matcher config, but the exported function must be `proxy`.
//
// Two jobs:
//   1. Refresh the Supabase session cookie so it never expires mid-session.
//   2. Optimistic redirects — cookie read only, no database calls. This runs on
//      every request including prefetches, so a DB round trip here would fire
//      constantly. The authoritative check lives in lib/auth.ts.

import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Reachable signed out. Everything else requires a session.
const PUBLIC_ROUTES = ["/login", "/splash", "/onboarding"];

export async function proxy(request: NextRequest) {
  // Escape hatch for local testing without auth. Must be unset in production —
  // it disables every check below.
  if (process.env.NEXT_PUBLIC_SKIP_AUTH === "true") {
    return NextResponse.next();
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Refreshes an expiring token and writes the new cookie via setAll above.
  // Do not remove: without it sessions silently die and users get logged out.
  const { data: { user } } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const isPublic = PUBLIC_ROUTES.some((r) => path === r || path.startsWith(`${r}/`));

  if (!user && !isPublic) {
    // API routes get JSON, not a redirect. A fetch() following a 307 to /login
    // receives an HTML page and fails at .json() with a parse error that says
    // nothing about the session having expired.
    if (path.startsWith("/api/")) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const url = request.nextUrl.clone();
    url.pathname = "/login";
    // Send them back where they were headed once signed in.
    url.searchParams.set("next", path);
    return NextResponse.redirect(url);
  }

  if (user && path === "/login") {
    const url = request.nextUrl.clone();
    url.pathname = "/home";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  // Without a matcher this runs on static files too, and auth redirects would
  // block CSS, JS and images from loading.
  matcher: [
    // api/auth + api/otp are exempt: signup and OTP happen BEFORE the user is
    // authenticated, so the proxy must not 401 them.
    "/((?!_next/static|_next/image|favicon.ico|api/whatsapp|api/cron|api/auth|api/otp|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
