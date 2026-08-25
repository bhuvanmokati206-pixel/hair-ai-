// Triggers a browser download for a generated image.
//
// Browsers cannot choose the save folder — the file lands in the user's default
// download location (usually Downloads), and they can move it or set the browser
// to "ask where to save". There is no web API to target the Desktop directly.

/** "Textured Crop" + "front" -> "textured-crop-front.jpg" */
export function imageFilename(styleName: string, angle?: string, ext = "jpg"): string {
  const slug = (s: string) =>
    s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  const parts = [slug(styleName || "hairstyle"), angle ? slug(angle) : ""].filter(Boolean);
  return `${parts.join("-")}.${ext}`;
}

export async function downloadImage(url: string, filename: string): Promise<void> {
  try {
    // A remote URL (Supabase public link) opened via <a download> may just
    // navigate instead of downloading cross-origin. Fetching to a blob forces a
    // real download. Data URIs are used as-is — no network needed.
    let href = url;
    let revoke: string | null = null;

    if (!url.startsWith("data:")) {
      const res = await fetch(url);
      const blob = await res.blob();
      href = URL.createObjectURL(blob);
      revoke = href;
    }

    const a = document.createElement("a");
    a.href = href;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();

    if (revoke) setTimeout(() => URL.revokeObjectURL(revoke!), 1000);
  } catch (err) {
    console.error("[download] failed:", err);
    // Last resort: open in a new tab so the user can save manually.
    window.open(url, "_blank");
  }
}
