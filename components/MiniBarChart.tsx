// Inline-SVG bar chart. No chart library — one component, themeable, works in a
// Server Component. Used for the admin salon-detail visit trend.

type Bar = { label: string; value: number };

export default function MiniBarChart({
  data,
  height = 120,
  accent = "#8FA79A",
}: {
  data: Bar[];
  height?: number;
  accent?: string;
}) {
  const max = Math.max(1, ...data.map((d) => d.value));
  const barW = 100 / data.length; // percentage width per bar slot

  return (
    <div className="w-full overflow-x-auto">
      <svg viewBox={`0 0 100 ${height}`} preserveAspectRatio="none"
        className="w-full" style={{ height }} role="img" aria-label="Visit trend">
        {data.map((d, i) => {
          const h = (d.value / max) * (height - 18);
          const x = i * barW + barW * 0.15;
          const w = barW * 0.7;
          const y = height - 14 - h;
          return (
            <g key={i}>
              <rect x={x} y={y} width={w} height={Math.max(h, d.value > 0 ? 1.5 : 0)} rx={0.8} fill={accent} opacity={0.85} />
              {d.value > 0 && (
                <text x={x + w / 2} y={y - 1.5} textAnchor="middle" fontSize={3.4} fill="var(--text-secondary)">
                  {d.value}
                </text>
              )}
              <text x={x + w / 2} y={height - 3} textAnchor="middle" fontSize={3} fill="var(--text-muted)">
                {d.label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
