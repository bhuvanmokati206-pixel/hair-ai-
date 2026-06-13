"use client";

import { usePathname, useRouter } from "next/navigation";
import { motion } from "framer-motion";

const TABS = [
  { path: "/home",      icon: "🏠", label: "Home" },
  { path: "/scan",      icon: "📷", label: "Scan" },
  { path: "/customise", icon: "✨", label: "Customise" },
  { path: "/saved",     icon: "🔖", label: "Saved" },
  { path: "/profile",   icon: "👤", label: "Profile" },
];

export default function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 flex items-stretch bottom-nav-safe"
      style={{ background: "var(--bg-card)", borderTop: "1px solid var(--border)" }}
    >
      {TABS.map((tab) => {
        const active = pathname.startsWith(tab.path);
        return (
          <button
            key={tab.path}
            onClick={() => router.push(tab.path)}
            className="flex-1 flex flex-col items-center justify-center pt-3 pb-1 relative"
            style={{ color: active ? "var(--accent-dark)" : "var(--text-muted)" }}
          >
            {active && (
              <motion.div
                layoutId="tab-indicator"
                className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full"
                style={{ background: "var(--accent)" }}
                transition={{ type: "spring", stiffness: 500, damping: 35 }}
              />
            )}
            <span className="text-xl leading-none">{tab.icon}</span>
            <span className="text-[10px] font-medium mt-1">{tab.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
