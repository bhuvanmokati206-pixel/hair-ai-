"use client";

const ACC = "#8FA79A";
const OFF = "#635E56";
const S = { fill: "none", strokeWidth: 1.4, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };

export type DashTab = "home" | "explore" | "previews" | "hairtest" | "history";

const TABS: { key: DashTab; label: string; icon: (c: string) => React.ReactNode }[] = [
  {
    key: "home", label: "Home",
    icon: (c) => (<svg viewBox="0 0 24 24" width="21" height="21" stroke={c} {...S}><path d="M3 10.5 12 3l9 7.5" /><path d="M5.5 9.5V20h13V9.5" /><path d="M9.75 20v-5.5h4.5V20" /></svg>),
  },
  {
    key: "explore", label: "Explore",
    icon: (c) => (
      <svg viewBox="0 0 24 24" width="21" height="21" stroke={c} {...S}>
        <circle cx="12" cy="12" r="9" />
        <polygon points="16.2 7.8 14.1 14.1 7.8 16.2 9.9 9.9 16.2 7.8" fill={c} fillOpacity={0.15} />
      </svg>
    ),
  },
  {
    key: "previews", label: "Previews",
    icon: (c) => (<svg viewBox="0 0 24 24" width="21" height="21" stroke={c} {...S}><path d="M2 12s3.5-6.5 10-6.5S22 12 22 12s-3.5 6.5-10 6.5S2 12 2 12Z" /><circle cx="12" cy="12" r="2.6" /></svg>),
  },
  {
    key: "hairtest", label: "Hair Test",
    icon: (c) => (<svg viewBox="0 0 24 24" width="21" height="21" stroke={c} {...S}><path d="M9 3h6" /><path d="M10 3v5l-4.5 8.5A2 2 0 0 0 7.3 20h9.4a2 2 0 0 0 1.8-2.9L14 8V3" /><path d="M8 14h8" /></svg>),
  },
  {
    key: "history", label: "History",
    icon: (c) => (<svg viewBox="0 0 24 24" width="21" height="21" stroke={c} {...S}><path d="M3.6 12a8.4 8.4 0 1 0 2.6-6" /><path d="M3.4 4.2v4.2h4.2" /><path d="M12 8.2V12l2.8 1.8" /></svg>),
  },
];

// The customer-dashboard tab bar (local, not routing). Home · Previews · Hair Test · History.
export default function DashNav({ tab, onTab }: { tab: DashTab; onTab: (t: DashTab) => void }) {
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50"
      style={{
        height: 84, padding: "12px 10px 0",
        background: "rgba(12,11,10,.82)", backdropFilter: "blur(26px)", WebkitBackdropFilter: "blur(26px)",
        borderTop: "1px solid rgba(242,239,233,.08)", display: "flex", alignItems: "flex-start",
        paddingBottom: "env(safe-area-inset-bottom)",
      }}
    >
      {TABS.map((t) => {
        const on = tab === t.key;
        const color = on ? ACC : OFF;
        return (
          <button type="button" className="tap" key={t.key} onClick={() => onTab(t.key)}
            aria-label={t.label} aria-current={on ? "page" : undefined}
            style={{
              flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 6,
              padding: "8px 0 0", cursor: "pointer", fontSize: 9, letterSpacing: ".06em", color,
              transform: on ? "translateY(-2px)" : "translateY(0)", transition: "transform .2s ease, color .2s ease",
            }}
          >
            {t.icon(color)}
            <span>{t.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
