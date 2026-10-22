const ACC = "#8FA79A";
const INK = "#F2EFE9";

export default function Loading() {
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center p-6"
      style={{ background: "var(--bg, #070605)", color: INK }}
    >
      {/* Animated glowing NOIR mark */}
      <div className="relative mb-6">
        <div
          className="absolute inset-0 rounded-full blur-xl opacity-25 animate-pulse"
          style={{ background: ACC }}
        />
        <svg
          viewBox="0 0 100 100"
          width={48}
          height={48}
          fill="none"
          stroke={ACC}
          strokeWidth={7}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="relative animate-spin"
          style={{ animationDuration: "3s" }}
        >
          <path d="M22 44 V34 A12 12 0 0 1 34 22 H44" />
          <path d="M56 22 H66 A12 12 0 0 1 78 34 V44" />
          <path d="M78 56 V66 A12 12 0 0 1 66 78 H56" />
          <path d="M44 78 H34 A12 12 0 0 1 22 66 V56" />
        </svg>
      </div>

      <p
        style={{
          fontFamily: "ui-monospace, 'SF Mono', Menlo, monospace",
          fontSize: 10,
          letterSpacing: ".26em",
          textTransform: "uppercase",
          color: "#948D82",
        }}
        className="animate-pulse"
      >
        Loading TrimView Studio…
      </p>
    </div>
  );
}
