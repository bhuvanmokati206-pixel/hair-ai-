import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

const MAX_REMOTE_IMAGE_BYTES = 8 * 1024 * 1024;

function isPrivateAddress(address: string): boolean {
  if (address === "::1" || address === "::" || address.startsWith("fe80:") || address.startsWith("fc") || address.startsWith("fd")) return true;
  if (isIP(address) !== 4) return false;
  const [a, b] = address.split(".").map(Number);
  return a === 10 || a === 127 || a === 0 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168);
}

/** Fetch an externally hosted image without allowing access to internal hosts. */
export async function fetchSafeRemoteImage(rawUrl: string): Promise<{ buffer: Buffer; contentType: string }> {
  const url = new URL(rawUrl);
  if (url.protocol !== "https:" || url.username || url.password || url.port) {
    throw new Error("Only standard HTTPS image URLs are allowed");
  }
  if (url.hostname === "localhost" || url.hostname.endsWith(".localhost")) {
    throw new Error("Local image URLs are not allowed");
  }

  const addresses = await lookup(url.hostname, { all: true, verbatim: true });
  if (addresses.length === 0 || addresses.some(({ address }) => isPrivateAddress(address))) {
    throw new Error("Private network image URLs are not allowed");
  }

  const response = await fetch(url, { signal: AbortSignal.timeout(10_000), redirect: "error" });
  if (!response.ok) throw new Error("Could not fetch image URL");
  const contentType = response.headers.get("content-type")?.split(";", 1)[0].toLowerCase() ?? "";
  const contentLength = Number(response.headers.get("content-length") ?? 0);
  if (!contentType.startsWith("image/") || !["image/jpeg", "image/png", "image/webp"].includes(contentType)) {
    throw new Error("Remote file is not a supported image");
  }
  if (contentLength > MAX_REMOTE_IMAGE_BYTES) throw new Error("Remote image is too large");

  const buffer = Buffer.from(await response.arrayBuffer());
  if (buffer.length === 0 || buffer.length > MAX_REMOTE_IMAGE_BYTES) throw new Error("Remote image is too large");
  return { buffer, contentType };
}
