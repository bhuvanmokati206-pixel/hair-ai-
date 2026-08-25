"use client";

import { usePathname, useRouter } from "next/navigation";
import { motion } from "framer-motion";

// ── SVG Icons ─────────────────────────────────────────────────────
function HomeIcon({ active }: { active: boolean }) {
  const c = active ? "#8FA79A" : "#505050";
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <path d="M3 12L12 3L21 12" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M5 10V20C5 20.552 5.448 21 6 21H9V16C9 15.448 9.448 15 10 15H14C14.552 15 15 15.448 15 16V21H18C18.552 21 19 20.552 19 20V10" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function ExploreIcon({ active }: { active: boolean }) {
  const c = active ? "#8FA79A" : "#505050";
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <circle cx="11" cy="11" r="8" stroke={c} strokeWidth="1.8"/>
      <path d="M21 21L16.65 16.65" stroke={c} strokeWidth="1.8" strokeLinecap="round"/>
    </svg>
  );
}

function SavedIcon({ active }: { active: boolean }) {
  const c = active ? "#8FA79A" : "#505050";
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <path
        d="M19 21L12 16L5 21V5C5 3.895 5.895 3 7 3H17C18.105 3 19 3.895 19 5V21Z"
        stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
        fill={active ? "rgba(143,167,154,0.12)" : "none"}
      />
    </svg>
  );
}

function ProfileIcon({ active }: { active: boolean }) {
  const c = active ? "#8FA79A" : "#505050";
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="8" r="4" stroke={c} strokeWidth="1.8"/>
      <path d="M4 20C4 17.239 7.582 15 12 15C16.418 15 20 17.239 20 20" stroke={c} strokeWidth="1.8" strokeLinecap="round"/>
    </svg>
  );
}

function CameraIcon() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
      <path
        d="M23 19C23 19.53 22.79 20.04 22.41 20.41C22.04 20.79 21.53 21 21 21H3C2.47 21 1.96 20.79 1.59 20.41C1.21 20.04 1 19.53 1 19V8C1 7.47 1.21 6.96 1.59 6.59C1.96 6.21 2.47 6 3 6H7L9 3H15L17 6H21C21.53 6 22.04 6.21 22.41 6.59C22.79 6.96 23 7.47 23 8V19Z"
        stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
      />
      <circle cx="12" cy="13" r="4" stroke="white" strokeWidth="1.8"/>
    </svg>
  );
}

// ── Tab config ────────────────────────────────────────────────────
const TABS = [
  { path: "/home",      label: "Home",    icon: HomeIcon },
  { path: "/explore", label: "Explore", icon: ExploreIcon },
  { path: "/scan",      label: "Scan",    icon: null, isCenter: true },
  { path: "/saved",     label: "Saved",   icon: SavedIcon },
  { path: "/profile",   label: "Profile", icon: ProfileIcon },
];

export default function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50"
      style={{ background: "transparent", pointerEvents: "none" }}
    >
      {/* Glassmorphism pill container */}
      <div
        className="mx-3 mb-3 flex items-center rounded-[28px] relative"
        style={{
          background: "rgba(12, 12, 14, 0.88)",
          backdropFilter: "blur(24px)",
          WebkitBackdropFilter: "blur(24px)",
          border: "1px solid rgba(255,255,255,0.07)",
          boxShadow: "0 8px 32px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.05)",
          pointerEvents: "all",
          paddingBottom: "max(12px, env(safe-area-inset-bottom))",
        }}
      >
        {TABS.map((tab) => {
          const active = pathname.startsWith(tab.path);
          const Icon = tab.icon;

          if (tab.isCenter) {
            return (
              <button
                key={tab.path}
                onClick={() => router.push(tab.path)}
                className="flex-1 flex flex-col items-center"
                style={{ marginTop: -24 }}
              >
                {/* Elevated gradient scan button */}
                <motion.div
                  className="relative flex items-center justify-center"
                  whileTap={{ scale: 0.9 }}
                  transition={{ type: "spring", stiffness: 400, damping: 20 }}
                >
                  {/* Outer glow ring */}
                  <div
                    className="absolute inset-0 rounded-full"
                    style={{
                      background: "radial-gradient(circle, rgba(169,162,184,0.25) 0%, transparent 70%)",
                      transform: "scale(1.5)",
                    }}
                  />
                  {/* Main circle */}
                  <div
                    className="w-[58px] h-[58px] rounded-full flex items-center justify-center relative overflow-hidden"
                    style={{
                      background: "linear-gradient(135deg, #7C3AED 0%, #4F46E5 45%, #0EA5E9 100%)",
                      boxShadow: "0 4px 20px rgba(99, 102, 241, 0.55), 0 0 0 3px rgba(255,255,255,0.08)",
                    }}
                  >
                    {/* Shimmer top */}
                    <div className="absolute inset-0 pointer-events-none" style={{
                      background: "linear-gradient(to bottom, rgba(255,255,255,0.22) 0%, transparent 55%)",
                    }} />
                    <CameraIcon />
                  </div>
                </motion.div>
                <span
                  className="text-[10px] font-semibold mt-1.5 tracking-wide"
                  style={{ color: active ? "#8FA79A" : "#404040" }}
                >
                  {tab.label}
                </span>
              </button>
            );
          }

          return (
            <button
              key={tab.path}
              onClick={() => router.push(tab.path)}
              className="flex-1 flex flex-col items-center justify-end pt-3"
            >
              <div className="relative">
                {/* Active background pill */}
                {active && (
                  <motion.div
                    layoutId="nav-bg-pill"
                    className="absolute inset-0 -m-1.5 rounded-xl"
                    style={{ background: "rgba(143,167,154,0.07)" }}
                    transition={{ type: "spring", stiffness: 500, damping: 35 }}
                  />
                )}
                <motion.div
                  animate={{ y: active ? -1 : 0 }}
                  transition={{ type: "spring", stiffness: 400 }}
                >
                  {Icon && <Icon active={active} />}
                </motion.div>
              </div>
              <span
                className="text-[10px] font-semibold mt-1 tracking-wide"
                style={{ color: active ? "#8FA79A" : "#505050" }}
              >
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
