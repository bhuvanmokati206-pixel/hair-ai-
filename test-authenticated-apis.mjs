import { createClient } from "@supabase/supabase-js";
import fetch from "node-fetch";

const SUPABASE_URL = "https://zbxjasifejvkddcpagki.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpieGphc2lmZWp2a2RkY3BhZ2tpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODYxOTUxNDUsImV4cCI6MjEwMTc3MTE0NX0.DwsqmQ1ST2onRfyaihpnAzOW0o0608tRjdvPYlaxqY4";

const BASE_URL = "http://localhost:3000";
const DUMMY_PNG_BASE64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";

async function run() {
  console.log("🔑 Creating a test salon account and signing in...");
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  
  const testEmail = `tester_${Date.now()}@example.com`;
  const testPassword = "TestPassword123!";

  // 1. Create salon via /api/auth/signup
  const signupRes = await fetch(`${BASE_URL}/api/auth/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: testEmail,
      password: testPassword,
      salonName: "Automated Test Salon",
      fullName: "Test Suite Owner",
      phone: `+9198${Math.floor(10000000 + Math.random() * 90000000)}`
    })
  });

  const signupData = await signupRes.json();
  console.log("Signup Result:", signupRes.status, signupData);

  if (!signupRes.ok) {
    console.error("Signup failed, aborting session tests.");
    return;
  }

  // 2. Sign in with Supabase to get session tokens
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: testEmail,
    password: testPassword,
  });

  if (authError || !authData.session) {
    console.error("Supabase signin failed:", authError);
    return;
  }

  console.log("✅ Authenticated successfully! User ID:", authData.user.id);

  // Build the Supabase auth cookie format used by @supabase/ssr
  // cookie format: sb-<project-ref>-auth-token
  const ref = "zbxjasifejvkddcpagki";
  const sessionStr = JSON.stringify(authData.session);
  const cookieHeader = `sb-${ref}-auth-token=${encodeURIComponent(sessionStr)}`;

  const headers = {
    "Content-Type": "application/json",
    "Cookie": cookieHeader,
    "Authorization": `Bearer ${authData.session.access_token}`
  };

  const testResults = [];

  async function testEp(name, path, options = {}) {
    const url = `${BASE_URL}${path}`;
    const start = Date.now();
    try {
      const res = await fetch(url, {
        method: options.method || "GET",
        headers: {
          ...headers,
          ...(options.headers || {})
        },
        body: options.body ? JSON.stringify(options.body) : undefined
      });
      const duration = Date.now() - start;
      const contentType = res.headers.get("content-type") || "";
      let data;
      if (contentType.includes("application/json")) {
        data = await res.json();
      } else {
        data = await res.text();
      }

      testResults.push({
        name,
        path,
        method: options.method || "GET",
        status: res.status,
        ok: res.ok,
        durationMs: duration,
        data: typeof data === "object" ? data : String(data).slice(0, 200)
      });
      console.log(`[${res.status}] ${options.method || "GET"} ${path} (${duration}ms)`);
    } catch (err) {
      testResults.push({
        name,
        path,
        method: options.method || "GET",
        status: 0,
        ok: false,
        durationMs: Date.now() - start,
        error: err.message
      });
      console.error(`[ERR] ${options.method || "GET"} ${path}: ${err.message}`);
    }
  }

  console.log("\n🧪 Running Authenticated API Endpoint Verification...\n");

  await testEp("GET Trending", "/api/trending");
  await testEp("GET Hairstyle Search", "/api/hairstyle-search?q=taper");
  await testEp("POST Build Grid", "/api/build-grid", { method: "POST", body: { photos: [{ base64: DUMMY_PNG_BASE64, mediaType: "image/png" }] } });
  await testEp("POST Analyze Hair", "/api/analyze-hair", { method: "POST", body: { photos: [{ base64: DUMMY_PNG_BASE64, mediaType: "image/png", label: "front" }] } });
  await testEp("POST Hair Health", "/api/hair-health", { method: "POST", body: { answers: { concern: ["hairfall"], washFrequency: "daily", waterType: "soft", diet: "non-veg", stressLevel: "low", currentProducts: "shampoo", scalpCondition: ["normal"] } } });
  await testEp("GET Barbers", "/api/barbers");
  await testEp("POST Add Barber", "/api/barbers", { method: "POST", body: { name: "Alex Barber", phone: "+919876543210" } });
  await testEp("GET Customer", "/api/customer?phone=%2B919876543210");
  await testEp("POST Create Customer", "/api/customer", { method: "POST", body: { phone: "+919876543210", name: "David Customer", gender: "male" } });
  await testEp("GET Salon Info", "/api/salon");
  await testEp("PATCH Update Salon", "/api/salon", { method: "PATCH", body: { address_line1: "123 Main St", city: "Mumbai" } });
  await testEp("GET Salon Menu", "/api/salon/menu");
  await testEp("POST Add Menu Service", "/api/salon/menu", { method: "POST", body: { service: { name: "Classic Haircut", category: "haircut", pricePaise: 30000, gender: "men" } } });
  await testEp("POST Import Salon Menu (Dry Run)", "/api/salon/menu/import", { method: "POST", body: { text: "Haircut - Rs 300\nBeard Trim - Rs 150", dryRun: true } });
  await testEp("GET Messages Outbox", "/api/messages");
  await testEp("GET In-Progress Visits", "/api/visit/in-progress");
  await testEp("POST Payments Create Order", "/api/payments/create-order", { method: "POST", body: { packId: "starter" } });
  await testEp("POST Payments Verify", "/api/payments/verify", { method: "POST", body: { razorpay_order_id: "order_123", razorpay_payment_id: "pay_123", razorpay_signature: "sig_123", packId: "starter" } });

  console.log("\n=========================================");
  console.log("📊 AUTHENTICATED API RESULTS SUMMARY");
  console.log("=========================================\n");
  console.log(JSON.stringify(testResults, null, 2));
}

run();
