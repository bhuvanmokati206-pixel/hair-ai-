// Creates a login for an existing salon.
//
//   node scripts/create-salon-user.mjs <email> <password> <salonCode> [role] [fullName]
//
// Example:
//   node scripts/create-salon-user.mjs owner@fishnetsalon.in "FishNet@Demo2026" FNS-5572 salon_owner "Vikram Menon"
//
// Auth users cannot be created in plain SQL — passwords must go through
// Supabase's admin API so they are bcrypted correctly. Hence a script rather
// than a .sql file.
//
// Roles: salon_owner | salon_staff
// (platform_admin is deliberately not accepted here — see the guard below.)

import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

// Read .env.local directly: this runs outside Next, so process.env is not populated.
const env = Object.fromEntries(
  readFileSync(new URL("../.env.local", import.meta.url), "utf8")
    .split("\n")
    .filter((l) => l.trim() && !l.trim().startsWith("#") && l.includes("="))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
    })
);

const [email, password, salonCode, role = "salon_owner", fullName = "Salon Owner"] =
  process.argv.slice(2);

if (!email || !password || !salonCode) {
  console.error("usage: node scripts/create-salon-user.mjs <email> <password> <salonCode> [role] [fullName]");
  process.exit(1);
}
if (password.length < 8) {
  console.error("password must be at least 8 characters");
  process.exit(1);
}
// A script that can mint platform admins is a privilege-escalation tool sitting
// in the repo. Those are created deliberately, by hand, in the dashboard.
if (!["salon_owner", "salon_staff"].includes(role)) {
  console.error(`role must be salon_owner or salon_staff (got "${role}")`);
  process.exit(1);
}

const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false },
});

const { data: salon, error: salonErr } = await db
  .from("salons")
  .select("id, name, code")
  .eq("code", salonCode)
  .maybeSingle();

if (salonErr) { console.error("lookup failed:", salonErr.message); process.exit(1); }
if (!salon) { console.error(`no salon with code "${salonCode}"`); process.exit(1); }

const { data: created, error: authErr } = await db.auth.admin.createUser({
  email,
  password,
  email_confirm: true, // no SMTP wired up yet, so confirm immediately
  user_metadata: { full_name: fullName },
});

if (authErr) { console.error("could not create user:", authErr.message); process.exit(1); }

const { error: profileErr } = await db.from("profiles").insert({
  id: created.user.id,
  role,
  salon_id: salon.id,
  full_name: fullName,
});

if (profileErr) {
  // Without a profile the account can log in but has no role, and getProfile()
  // treats it as signed out. Roll back rather than leave that half-state.
  await db.auth.admin.deleteUser(created.user.id);
  console.error("could not create profile:", profileErr.message);
  process.exit(1);
}

console.log(`created ${role} for ${salon.name} (${salon.code})`);
console.log(`  email: ${email}`);
console.log(`  id:    ${created.user.id}`);
