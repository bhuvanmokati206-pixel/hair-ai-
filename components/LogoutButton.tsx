"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Props = {
  className?: string;
  label?: string;
  /** Ask before signing out. On by default — an accidental tap mid-scan is costly. */
  confirm?: boolean;
};

export default function LogoutButton({ className, label = "Log out", confirm = true }: Props) {
  const [busy, setBusy] = useState(false);
  const [asking, setAsking] = useState(false);
  const router = useRouter();

  const signOut = async () => {
    setBusy(true);
    const supabase = createClient();
    // scope 'local' clears this device only. 'global' would kill the session on
    // every device — the right choice for a compromised-account flow, not this one.
    await supabase.auth.signOut({ scope: "local" });
    router.replace("/login");
    router.refresh(); // drop cached Server Component output for the old user
  };

  if (asking) {
    return (
      <div className="flex gap-2">
        <button
          onClick={signOut}
          disabled={busy}
          className="flex-1 py-2.5 rounded-xl text-sm font-bold active:scale-95 transition-transform"
          style={{ background: "var(--danger, #E5484D)", color: "#fff", opacity: busy ? 0.7 : 1 }}
        >
          {busy ? "Signing out…" : "Yes, log out"}
        </button>
        <button
          onClick={() => setAsking(false)}
          disabled={busy}
          className="flex-1 py-2.5 rounded-xl text-sm font-bold active:scale-95 transition-transform"
          style={{ background: "var(--bg-subtle)", color: "var(--text-primary)" }}
        >
          Cancel
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => (confirm ? setAsking(true) : signOut())}
      disabled={busy}
      className={className ?? "w-full py-3 rounded-xl text-sm font-bold active:scale-95 transition-transform"}
      style={{ background: "var(--bg-subtle)", color: "var(--danger, #E5484D)", opacity: busy ? 0.7 : 1 }}
    >
      {busy ? "Signing out…" : label}
    </button>
  );
}
