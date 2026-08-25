// Phone OTP for owner signup, via the MSG91 OTP Widget.
//
// MSG91 sends AND verifies the code on the client (the widget). On success the
// widget returns an "access-token". This module verifies that token server-side
// with the MSG91 Auth Key — that's the proof the phone is real and theirs.
//
// Multiple accounts are prevented by the salons_phone_unique index (add-otp.sql),
// enforced in the signup route. The otp_codes table is no longer used.

import { normalizePhone } from "./whatsapp";

const VERIFY_URL = "https://control.msg91.com/api/v5/widget/verifyAccessToken";

export type TokenVerifyResult =
  | { ok: true; phone?: string }
  | { ok: false; error: string };

/**
 * Verify the widget's access-token with MSG91. Returns ok:true (and the verified
 * phone when MSG91 echoes it back) if the token is valid.
 */
export async function verifyMsg91AccessToken(accessToken: string): Promise<TokenVerifyResult> {
  const authkey = process.env.MSG91_AUTHKEY;
  if (!authkey) {
    console.error("[otp] MSG91_AUTHKEY not set — cannot verify.");
    return { ok: false, error: "Phone verification is not configured." };
  }
  if (!accessToken) return { ok: false, error: "Missing verification token." };

  let json: { type?: string; message?: string } = {};
  try {
    const res = await fetch(VERIFY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ authkey, "access-token": accessToken }),
    });
    json = await res.json().catch(() => ({}));
  } catch (err) {
    console.error("[otp] MSG91 verify call failed:", err);
    return { ok: false, error: "Could not verify the code right now." };
  }

  if (json?.type === "success") {
    // On success MSG91's `message` is usually the verified mobile number.
    const digits = String(json.message ?? "").replace(/\D/g, "");
    return { ok: true, phone: digits.length >= 10 ? normalizePhone(digits) : undefined };
  }
  return { ok: false, error: json?.message || "Phone verification failed." };
}

export { normalizePhone };
