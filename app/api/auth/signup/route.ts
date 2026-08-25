// POST /api/auth/signup — creates the auth user, the salon, and the profile.
//
// Server-side because a salon row and a profile row must be created together,
// and both need the service key. Doing it from the browser would mean exposing
// a client that can write profiles — i.e. letting anyone set their own role.

import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase";
import { verifyMsg91AccessToken, normalizePhone } from "@/lib/otp";

export async function POST(req: NextRequest) {
  try {
    const { email, password, salonName, fullName, phone, otpToken } = await req.json() as {
      email?: string; password?: string; salonName?: string; fullName?: string; phone?: string; otpToken?: string;
    };

    if (!email || !password || !salonName || !fullName || !phone) {
      return NextResponse.json({ error: "All fields are required." }, { status: 400 });
    }
    if (password.length < 8) {
      return NextResponse.json({ error: "Password must be at least 8 characters." }, { status: 400 });
    }

    // OTP gate: the phone must be verified (MSG91 widget access-token, checked
    // server-side) and must not already back a salon. This prevents one person
    // opening many accounts. Skipped when NEXT_PUBLIC_OTP_ENABLED=false.
    const OTP_ON = process.env.NEXT_PUBLIC_OTP_ENABLED !== "false";
    let normPhone = normalizePhone(phone);
    if (OTP_ON) {
      if (!otpToken) {
        return NextResponse.json({ error: "Please verify your phone number first." }, { status: 400 });
      }
      const verified = await verifyMsg91AccessToken(otpToken);
      if (!verified.ok) {
        return NextResponse.json({ error: verified.error || "Phone verification failed." }, { status: 400 });
      }
      // Trust the number MSG91 actually verified when it echoes one back; otherwise
      // fall back to the submitted phone (the widget verified whatever was entered).
      normPhone = verified.phone ?? normalizePhone(phone);
    }

    const db = getServiceClient();

    const { data: phoneTaken } = await db.from("salons").select("id").eq("phone", normPhone).maybeSingle();
    if (phoneTaken) {
      return NextResponse.json({ error: "This phone number already has an account. Try logging in." }, { status: 409 });
    }

    // Role is hardcoded to salon_owner and never read from the request body.
    // Accepting a role from the client would let anyone sign up as platform_admin
    // and read every salon's data.
    const { data: created, error: authErr } = await db.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // no SMTP configured yet; flip to false once it is
      user_metadata: { full_name: fullName, salon_name: salonName },
    });

    if (authErr || !created?.user) {
      const msg = authErr?.message ?? "Could not create the account.";
      // Do not confirm whether an email is registered — that is an account
      // enumeration leak. Same generic wording either way.
      const safe = /already|exists|registered/i.test(msg)
        ? "Could not create the account. Try logging in instead."
        : msg;
      return NextResponse.json({ error: safe }, { status: 400 });
    }

    const userId = created.user.id;

    const { data: salon, error: salonErr } = await db
      .from("salons")
      .insert({ name: salonName, email, phone: normPhone, status: "trial", onboarded_at: new Date().toISOString() })
      .select("id, code, name")
      .single();

    if (salonErr || !salon) {
      // Roll back the auth user, otherwise the email is taken by an account
      // that can never finish signing up.
      await db.auth.admin.deleteUser(userId);
      console.error("[signup] salon insert failed:", salonErr);
      // 23505 = the unique-phone index: someone raced us to this number.
      const msg = salonErr?.code === "23505"
        ? "This phone number already has an account. Try logging in."
        : "Could not create the salon.";
      return NextResponse.json({ error: msg }, { status: salonErr?.code === "23505" ? 409 : 500 });
    }

    const { error: profileErr } = await db.from("profiles").insert({
      id:        userId,
      role:      "salon_owner",
      salon_id:  salon.id,
      full_name: fullName,
    });

    if (profileErr) {
      await db.from("salons").delete().eq("id", salon.id);
      await db.auth.admin.deleteUser(userId);
      console.error("[signup] profile insert failed:", profileErr);
      return NextResponse.json({ error: "Could not finish setting up the account." }, { status: 500 });
    }

    await db.from("audit_log").insert({
      actor_id: userId, actor_role: "salon_owner", action: "salon.signup",
      target_table: "salons", target_id: salon.id, salon_id: salon.id,
      metadata: { salon_name: salonName, code: salon.code },
    });

    return NextResponse.json({
      salon: { id: salon.id, code: salon.code, name: salon.name },
      needsConfirmation: false,
    });
  } catch (err) {
    console.error("[signup] error:", err);
    return NextResponse.json({ error: "Signup failed. Please try again." }, { status: 500 });
  }
}
