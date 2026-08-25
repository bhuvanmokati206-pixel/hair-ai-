// POST/GET /api/cron/dispatch — sends every WhatsApp message that is now due.
//
// Trigger it from Supabase pg_cron (or any scheduler) every minute. The proxy
// exempts /api/cron from auth, so it's protected here by a shared secret instead.
//
//   curl -X POST http://localhost:3000/api/cron/dispatch -H "x-cron-secret: <CRON_SECRET>"
//
// In simulation (WHATSAPP_SIMULATE=true) this "sends" without calling Meta.

import { NextRequest, NextResponse } from "next/server";
import { dispatchDueMessages } from "@/lib/messageQueue";
import { getSessionSalonId } from "@/lib/auth";

async function authorized(req: NextRequest): Promise<boolean> {
  // 1. External scheduler (pg_cron/Vercel) → shared secret.
  const secret = process.env.CRON_SECRET;
  const provided = req.headers.get("x-cron-secret") ?? req.nextUrl.searchParams.get("secret");
  if (secret && provided === secret) return true;
  // 2. A signed-in salon owner triggering it from the outbox page.
  if (await getSessionSalonId()) return true;
  // 3. Dev with no secret configured.
  if (!secret) return process.env.NODE_ENV !== "production";
  return false;
}

async function run(req: NextRequest) {
  if (!(await authorized(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const result = await dispatchDueMessages();
    return NextResponse.json({ ok: true, ...result, simulated: process.env.WHATSAPP_SIMULATE === "true" });
  } catch (err) {
    console.error("[cron/dispatch] error:", err);
    return NextResponse.json({ error: "Dispatch failed" }, { status: 500 });
  }
}

export const POST = run;
export const GET = run;
