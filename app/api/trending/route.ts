import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ""
);

export async function GET() {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const { data, error } = await supabase
    .from("style_choices")
    .select("style_name")
    .gte("chosen_at", sevenDaysAgo);

  if (error || !data) {
    return NextResponse.json({ styles: [] });
  }

  const counts = new Map<string, number>();
  for (const row of data) {
    counts.set(row.style_name, (counts.get(row.style_name) ?? 0) + 1);
  }

  const styles = Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([name, count]) => ({
      name,
      description: `Chosen by ${count} customer${count === 1 ? "" : "s"} this week`,
      why: "Trending across your salon",
    }));

  return NextResponse.json({ styles });
}
