"use client";

import { usePathname, useRouter } from "next/navigation";

const ACC = "#8FA79A";
const OFF = "#635E56";

// Tabs — the NOIR operator nav. New Scan is the elevated centre orb.
type Tab = {
  label: string;
  route: string;
  match: string[];        // pathnames that light this tab
  center?: boolean;
  icon: (c: string) => React.ReactNode;
};

const strokeProps = { fill: "none", strokeWidth: 1.4, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };

const TABS: Tab[] = [
  {
    label: "Home", route: "/home", match: ["/home"],
    icon: (c) => (
      <svg viewBox="0 0 24 24" width="21" height="21" stroke={c} {...strokeProps}>
        <path d="M3 10.5 12 3l9 7.5" /><path d="M5.5 9.5V20h13V9.5" /><path d="M9.75 20v-5.5h4.5V20" />
      </svg>
    ),
  },
  {
    label: "Menu", route: "/menu", match: ["/menu"],
    icon: (c) => (
      <svg viewBox="0 0 24 24" width="21" height="21" stroke={c} {...strokeProps}>
        <path d="M4 7h16" /><path d="M4 12h16" /><path d="M4 17h10" />
      </svg>
    ),
  },
  {
    label: "New Scan", route: "/scan", match: ["/scan"], center: true,
    icon: () => (
      <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#14130F" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 8.5A2.5 2.5 0 0 1 6.5 6h1.7l1.2-1.8h4.9L15.5 6h2A2.5 2.5 0 0 1 20 8.5v8A2.5 2.5 0 0 1 17.5 19h-11A2.5 2.5 0 0 1 4 16.5v-8Z" />
        <circle cx="12" cy="12.4" r="3.2" />
      </svg>
    ),
  },
  {
    label: "History", route: "/saved", match: ["/saved", "/explore"],
    icon: (c) => (
      <svg viewBox="0 0 24 24" width="21" height="21" stroke={c} {...strokeProps}>
        <path d="M3.6 12a8.4 8.4 0 1 0 2.6-6" /><path d="M3.4 4.2v4.2h4.2" /><path d="M12 8.2V12l2.8 1.8" />
      </svg>
    ),
  },
  {
    label: "Profile", route: "/profile", match: ["/profile"],
    icon: (c) => (
      <svg viewBox="0 0 24 24" width="21" height="21" stroke={c} {...strokeProps}>
        <circle cx="12" cy="8.5" r="3.8" /><path d="M4.8 20c.9-3.6 3.8-5.6 7.2-5.6s6.3 2 7.2 5.6" />
      </svg>
    ),
  },
];

export default function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50"
      style={{
        height: 96,
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

        if (tab.center) {
          return (
            <div
              key={tab.route}
              onClick={() => router.push(tab.route)}
              style={{
                flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 8,
                marginTop: -22, cursor: "pointer", fontSize: 9, letterSpacing: ".06em", color,
              }}
            >
              <div style={{
                width: 54, height: 54, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
                background: `linear-gradient(160deg, #F4F1EB, ${ACC} 78%)`,
                boxShadow: `0 14px 30px -10px ${ACC}, inset 0 1px 0 rgba(255,255,255,.6)`,
              }}>
                {tab.icon(color)}
              </div>
              <span>{tab.label}</span>
            </div>
          );
        }

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
