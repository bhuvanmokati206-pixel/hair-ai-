import { NextRequest, NextResponse } from "next/server";
import Razorpay from "razorpay";

const PACKS = {
  starter: { price: 19900, credits: 100 },  // paise
  popular: { price: 49900, credits: 300 },
  pro:     { price: 99900, credits: 750 },
} as const;

export async function POST(req: NextRequest) {
  const keyId     = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  if (!keyId || !keySecret) {
    return NextResponse.json({ error: "Payment gateway not configured" }, { status: 503 });
  }

  const { packId } = await req.json() as { packId: keyof typeof PACKS };
  const pack = PACKS[packId];
  if (!pack) return NextResponse.json({ error: "Invalid pack" }, { status: 400 });

  const razorpay = new Razorpay({ key_id: keyId, key_secret: keySecret });

  const order = await razorpay.orders.create({
    amount: pack.price,
    currency: "INR",
    receipt: `credits_${packId}_${Date.now()}`,
  });

  return NextResponse.json({ orderId: order.id, amount: order.amount, currency: order.currency, keyId });
}
