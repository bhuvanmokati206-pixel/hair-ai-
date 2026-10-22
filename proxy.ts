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
const PUBLIC_ROUTES = ["/login", "/splash", "/onboarding", "/otp"];

export async function proxy(request: NextRequest) {
  // Local-only escape hatch. This must never be controlled by a NEXT_PUBLIC_
  // variable: those values are embedded in the browser build and are too easy
  // to accidentally carry into a production deployment.
  if (process.env.NODE_ENV !== "production" && process.env.SKIP_AUTH_FOR_LOCAL_DEMO === "true") {
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

  // Only query Supabase auth if an auth cookie actually exists in the request.
  // When no cookie exists, calling getUser() makes an unnecessary remote network call
  // that can hang or timeout for 30-40 seconds.
  const allCookies = request.cookies.getAll();
  const hasAuthToken = allCookies.some((c) => c.name.includes("-auth-token") || c.name.startsWith("sb-"));
  let user = null;
  if (hasAuthToken) {
    const { data } = await supabase.auth.getUser();
    user = data?.user ?? null;
  }

  const path = request.nextUrl.pathname;
  const isPublic = PUBLIC_ROUTES.some((r) => path === r || path.startsWith(`${r}/`));

  // Cookie-authenticated writes must come from this application. Requests that
  // intentionally originate server-to-server (the webhook and cron endpoints)
  // are excluded by the matcher below and authenticate independently.
  if (path.startsWith("/api/") && !["GET", "HEAD", "OPTIONS"].includes(request.method)) {
    const origin = request.headers.get("origin");
    if (origin) {
      try {
        const originUrl = new URL(origin);
        const hostHeader = request.headers.get("x-forwarded-host") || request.headers.get("host") || request.nextUrl.host;
        const isSameHost = originUrl.host === hostHeader || origin === request.nextUrl.origin;
        const isDev = process.env.NODE_ENV !== "production";
        const isLocalDevOrigin = isDev && (
          originUrl.hostname === "localhost" ||
          originUrl.hostname === "127.0.0.1" ||
          originUrl.hostname.startsWith("192.168.") ||
          originUrl.hostname.startsWith("10.") ||
          originUrl.hostname.startsWith("172.")
        );
        if (!isSameHost && !isLocalDevOrigin) {
          return NextResponse.json({ error: "Cross-origin request rejected" }, { status: 403 });
        }
      } catch {
        return NextResponse.json({ error: "Invalid origin" }, { status: 400 });
      }
    }
  }

  if (!user && !isPublic) {
    // API routes get JSON, not a redirect. A fetch() following a 307 to /login
    // receives an HTML page and fails at .json() with a parse error that says
    // nothing about the session having expired.
    if (path.startsWith("/api/")) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const host = request.headers.get("x-forwarded-host") || request.headers.get("host") || request.nextUrl.host;
    const proto = request.headers.get("x-forwarded-proto") || (request.nextUrl.protocol.replace(":", "") || "http");
    const redirectUrl = new URL(`/login?next=${encodeURIComponent(path)}`, `${proto}://${host}`);
    return NextResponse.redirect(redirectUrl);
  }

  if (user && path === "/login") {
    const host = request.headers.get("x-forwarded-host") || request.headers.get("host") || request.nextUrl.host;
    const proto = request.headers.get("x-forwarded-proto") || (request.nextUrl.protocol.replace(":", "") || "http");
    const redirectUrl = new URL("/home", `${proto}://${host}`);
    return NextResponse.redirect(redirectUrl);
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
