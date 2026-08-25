import type { Metadata } from "next";
import { Space_Grotesk } from "next/font/google";
import "./globals.css";

// NOIR AI Studio typeface. Keeps the --font-geist-sans variable name that
// globals.css already references, so the whole app picks it up.
const displayFont = Space_Grotesk({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
});

export const metadata: Metadata = {
  title: "TrimView — AI Salon Studio",
  description: "AI hairstyle, colour and grooming previews for salons",
  manifest: "/manifest.webmanifest",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${displayFont.variable} h-full`}>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="theme-color" content="#070605" />
        <link rel="apple-touch-icon" href="/icon-192.png" />
      </head>
      {/* suppressHydrationWarning: browser extensions (Grammarly etc.) inject
          attributes like data-new-gr-c-s-check-loaded / data-gr-ext-installed into
          <body> before React hydrates, causing a harmless hydration mismatch. This
          silences that one tag without hiding real mismatches elsewhere. */}
      <body className="min-h-full" style={{ background: "var(--bg)", color: "var(--text-primary)" }} suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
