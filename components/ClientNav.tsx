"use client";

import { usePathname, useRouter } from "next/navigation";

const ACC = "#8FA79A";
const OFF = "#635E56";

const S = { fill: "none", strokeWidth: 1.4, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };

// The customer-facing nav (shown on the device handed to the client). Distinct
// from the operator BottomNav — no "New Scan", client-appropriate destinations.
const TABS = [
  {
    label: "Home", route: "/customer-dashboard", match: ["/customer-dashboard"],
    icon: (c: string) => (
      <svg viewBox="0 0 24 24" width="21" height="21" stroke={c} {...S}>
        <path d="M3 10.5 12 3l9 7.5" /><path d="M5.5 9.5V20h13V9.5" /><path d="M9.75 20v-5.5h4.5V20" />
      </svg>
    ),
  },
  {
    label: "Hair Test", route: "/hair-health", match: ["/hair-health"],
    icon: (c: string) => (
      <svg viewBox="0 0 24 24" width="21" height="21" stroke={c} {...S}>
        <path d="M9 3h6" /><path d="M10 3v5l-4.5 8.5A2 2 0 0 0 7.3 20h9.4a2 2 0 0 0 1.8-2.9L14 8V3" /><path d="M8 14h8" />
      </svg>
    ),
  },
  {
    label: "Menu", route: "/menu", match: ["/menu"],
    icon: (c: string) => (
      <svg viewBox="0 0 24 24" width="21" height="21" stroke={c} {...S}>
        <path d="M4 7h16" /><path d="M4 12h16" /><path d="M4 17h10" />
      </svg>
    ),
  },
  {
    label: "Last Visit", route: "/last-visit", match: ["/last-visit"],
    icon: (c: string) => (
      <svg viewBox="0 0 24 24" width="21" height="21" stroke={c} {...S}>
        <path d="M3.6 12a8.4 8.4 0 1 0 2.6-6" /><path d="M3.4 4.2v4.2h4.2" /><path d="M12 8.2V12l2.8 1.8" />
      </svg>
    ),
  },
  {
    label: "Profile", route: "/profile", match: ["/profile"],
    icon: (c: string) => (
      <svg viewBox="0 0 24 24" width="21" height="21" stroke={c} {...S}>
        <circle cx="12" cy="8.5" r="3.8" /><path d="M4.8 20c.9-3.6 3.8-5.6 7.2-5.6s6.3 2 7.2 5.6" />
      </svg>
    ),
  },
];

export default function ClientNav() {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50"
      style={{
        height: 84,
        padding: "12px 10px 0",
        background: "rgba(12,11,10,.82)",
        backdropFilter: "blur(26px)",
        WebkitBackdropFilter: "blur(26px)",
        borderTop: "1px solid rgba(242,239,233,.08)",
        display: "flex",
        alignItems: "flex-start",
        paddingBottom: "env(safe-area-inset-bottom)",
      }}
    >
      {TABS.map((tab) => {
        const on = tab.match.some((m) => pathname.startsWith(m));
        const color = on ? ACC : OFF;
        return (
          <div
            key={tab.route}
            onClick={() => router.push(tab.route)}
            style={{
              flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 6,
              padding: "8px 0 0", cursor: "pointer", fontSize: 9, letterSpacing: ".06em", color,
              transform: on ? "translateY(-2px)" : "translateY(0)",
              transition: "transform .2s ease, color .2s ease",
            }}
          >
            {tab.icon(color)}
            <span>{tab.label}</span>
          </div>
        );
      })}
    </nav>
  );
}
