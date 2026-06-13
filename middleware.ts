import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PROTECTED = ["/home", "/scan", "/customise", "/saved", "/profile"];

export function middleware(request: NextRequest) {
  // Skip auth entirely when NEXT_PUBLIC_SKIP_AUTH=true
  if (process.env.NEXT_PUBLIC_SKIP_AUTH === "true") {
    if (request.nextUrl.pathname === "/") {
      return NextResponse.redirect(new URL("/home", request.url));
    }
    return NextResponse.next();
  }

  const { pathname } = request.nextUrl;
  const hasSession = request.cookies.getAll().some(
    (c) => c.name.startsWith("sb-") && c.name.endsWith("-auth-token")
  );
  const isProtected = PROTECTED.some((p) => pathname.startsWith(p));

  if (isProtected && !hasSession) {
    return NextResponse.redirect(new URL("/splash", request.url));
  }
  if (pathname === "/") {
    return NextResponse.redirect(new URL(hasSession ? "/home" : "/splash", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/",
    "/home/:path*",
    "/scan/:path*",
    "/customise/:path*",
    "/saved/:path*",
    "/profile/:path*",
  ],
};
