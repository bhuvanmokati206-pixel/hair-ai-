import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

const PACK_CREDITS = { starter: 100, popular: 300, pro: 750 } as const;

export async function POST(req: NextRequest) {
  const {
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature,
    packId,
  } = await req.json() as {
    razorpay_order_id: string;
    razorpay_payment_id: string;
    razorpay_signature: string;
    packId: keyof typeof PACK_CREDITS;
  };

  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keySecret) return NextResponse.json({ error: "Not configured" }, { status: 503 });

  // Verify HMAC signature
  const body = `${razorpay_order_id}|${razorpay_payment_id}`;
  const expectedSig = crypto.createHmac("sha256", keySecret).update(body).digest("hex");

  if (expectedSig !== razorpay_signature) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const credits = PACK_CREDITS[packId];
  if (!credits) return NextResponse.json({ error: "Invalid pack" }, { status: 400 });

  // TODO: when auth is on, also persist to Supabase salon_credits table here
  // const user = await getUser(req); await supabase.rpc("add_credits", { salon_id: user.id, amount: credits });

  return NextResponse.json({ success: true, creditsAdded: credits });
}
