"use client";

import { useEffect } from "react";
import Link from "next/link";

const INK = "#F2EFE9";
const MUTE = "#948D82";
const DANGER = "#E06A5C";
const ACC = "#8FA79A";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[TrimView Crash Boundary]:", error);
  }, [error]);

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-6 text-center"
      style={{ background: "var(--bg, #070605)", color: INK }}
    >
      <div
        className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl mb-4"
        style={{
          background: "rgba(224,106,92,0.12)",
          border: "1px solid rgba(224,106,92,0.3)",
        }}
      >
        ⚠️
      </div>

      <div
        style={{
          fontFamily: "ui-monospace, 'SF Mono', Menlo, monospace",
          fontSize: 10,
          letterSpacing: ".22em",
          textTransform: "uppercase",
          color: DANGER,
        }}
        className="mb-2"
      >
        Session Error
      </div>

      <h2 className="text-xl font-bold tracking-tight mb-2" style={{ color: INK }}>
        Something interrupted the salon flow
      </h2>

      <p className="text-xs max-w-xs mb-8" style={{ color: MUTE, lineHeight: 1.6 }}>
        {error.message?.slice(0, 140) ||
          "An unexpected runtime error occurred. Your visit data has not been lost."}
      </p>

      <div className="flex flex-col sm:flex-row gap-3 w-full max-w-xs">
        <button
          onClick={() => reset()}
          className="w-full py-3 px-5 rounded-xl text-xs font-semibold tracking-wider uppercase text-center transition-transform active:scale-95"
          style={{
            background: "linear-gradient(160deg, #F4F1EB, #8FA79A 52%, #C7BDAE)",
            color: "#14130F",
            boxShadow: "0 14px 28px -10px rgba(143,167,154,.5)",
          }}
        >
          Try Step Again
        </button>
        <Link
          href="/home"
          className="w-full py-3 px-5 rounded-xl text-xs font-semibold tracking-wider uppercase text-center transition-colors"
          style={{
            background: "rgba(242,239,233,.05)",
            color: INK,
            border: "1px solid rgba(242,239,233,.12)",
          }}
        >
          Return to Chair Queue
        </Link>
      </div>
    </div>
  );
}
