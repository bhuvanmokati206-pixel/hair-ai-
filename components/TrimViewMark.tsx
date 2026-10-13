// The TrimView bracket logo mark. Use this instead of the ✂️ emoji wherever the
// app's brand icon appears.
export default function TrimViewMark({ size = 28, color = "#F2EFE9", stroke = 9 }: { size?: number; color?: string; stroke?: number }) {
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} fill="none" stroke={color}
      strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" aria-label="TrimView" role="img" style={{ display: "block" }}>
      <path d="M22 44 V34 A12 12 0 0 1 34 22 H44" />
      <path d="M56 22 H66 A12 12 0 0 1 78 34 V44" />
      <path d="M78 56 V66 A12 12 0 0 1 66 78 H56" />
      <path d="M44 78 H34 A12 12 0 0 1 22 66 V56" />
      <path d="M39 43 H61" strokeWidth={stroke + 3} />
      <path d="M50 43 V60" strokeWidth={stroke + 3} />
    </svg>
  );
}
