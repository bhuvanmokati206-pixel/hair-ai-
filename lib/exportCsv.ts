// CSV export — the "download an Excel sheet" feature.
//
// A .csv opens straight into Excel / Google Sheets / LibreOffice with no
// library on our side, so there is no xlsx dependency to ship. The BOM prefix
// (﻿) makes Excel read the file as UTF-8, so ₹, accents and non-Latin
// names don't turn into mojibake.

export type Cell = string | number | null | undefined;

/** Escape one field per RFC 4180: wrap in quotes when it holds a comma, quote,
 *  or newline, and double any embedded quotes. */
function escapeCell(value: Cell): string {
  if (value == null) return "";
  const s = String(value);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCsv(headers: string[], rows: Cell[][]): string {
  const lines = [headers, ...rows].map((r) => r.map(escapeCell).join(","));
  return "﻿" + lines.join("\r\n");
}

/** Trigger a browser download of `content` as `filename`. Named with the date
 *  so successive exports don't overwrite each other in the Downloads folder. */
export function downloadCsv(filename: string, content: string) {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  // Revoke on the next tick so the click has fired before the URL is freed.
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

/** `Customers-FNS-2026-08-21.csv` — a stable, sortable, salon-scoped name. */
export function exportFilename(kind: string, salonCode?: string | null): string {
  const date = new Date().toISOString().slice(0, 10);
  const code = salonCode ? `-${salonCode}` : "";
  return `${kind}${code}-${date}.csv`;
}
