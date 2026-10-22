import Link from "next/link";

const INK = "#F2EFE9";
const MUTE = "#948D82";
const ACC = "#8FA79A";

export default function NotFound() {
  return (
    <main
      className="min-h-screen flex flex-col items-center justify-center px-6 text-center"
      style={{ background: "var(--bg, #070605)", color: INK }}
    >
      {/* NOIR TrimView Mark Icon */}
      <div className="mb-6 opacity-80">
        <svg
          viewBox="0 0 100 100"
          width={54}
          height={54}
          fill="none"
          stroke={ACC}
          strokeWidth={8}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="mx-auto"
        >
          <path d="M22 44 V34 A12 12 0 0 1 34 22 H44" />
          <path d="M56 22 H66 A12 12 0 0 1 78 34 V44" />
          <path d="M78 56 V66 A12 12 0 0 1 66 78 H56" />
          <path d="M44 78 H34 A12 12 0 0 1 22 66 V56" />
          <path d="M39 43 H61" strokeWidth={10} />
          <path d="M50 43 V60" strokeWidth={10} />
        </svg>
      </div>

      <div
        style={{
          fontFamily: "ui-monospace, 'SF Mono', Menlo, monospace",
          fontSize: 11,
          letterSpacing: ".24em",
          textTransform: "uppercase",
          color: ACC,
        }}
        className="mb-2"
      >
        404 — Page Not Found
      </div>

      <h1 className="text-2xl font-bold tracking-tight mb-2" style={{ color: INK }}>
        This look isn&apos;t in the catalog
      </h1>

      <p className="text-xs max-w-xs mb-8" style={{ color: MUTE, lineHeight: 1.6 }}>
        The link you followed may be expired, mistyped, or the customer visit session was archived.
      </p>

      <div className="flex flex-col sm:flex-row gap-3 w-full max-w-xs">
        <Link
          href="/home"
          className="w-full py-3 px-5 rounded-xl text-xs font-semibold tracking-wider uppercase text-center transition-transform active:scale-95"
          style={{
            background: "linear-gradient(160deg, #F4F1EB, #8FA79A 52%, #C7BDAE)",
            color: "#14130F",
            boxShadow: "0 14px 28px -10px rgba(143,167,154,.5)",
          }}
        >
          Salon Dashboard
        </Link>
        <Link
          href="/scan"
          className="w-full py-3 px-5 rounded-xl text-xs font-semibold tracking-wider uppercase text-center transition-colors"
          style={{
            background: "rgba(242,239,233,.05)",
            color: INK,
            border: "1px solid rgba(242,239,233,.12)",
          }}
        >
          New Scan
        </Link>
      </div>
    </main>
  );
}
