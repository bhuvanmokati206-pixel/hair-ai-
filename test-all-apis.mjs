// Using global fetch (Node 18+)

const BASE_URL = "http://localhost:3000";

// A tiny valid 1x1 transparent PNG base64 for testing image endpoints
const DUMMY_PNG_BASE64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";

const results = [];

async function testApi(name, path, options = {}) {
  const url = `${BASE_URL}${path}`;
  const start = Date.now();
  try {
    const res = await fetch(url, {
      method: options.method || "GET",
      headers: {
        "Content-Type": "application/json",
        ...(options.headers || {}),
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
    });
    const duration = Date.now() - start;
    let data;
    const contentType = res.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      data = await res.json();
    } else {
      data = await res.text();
    }

    results.push({
      name,
      path,
      method: options.method || "GET",
      status: res.status,
      ok: res.ok,
      durationMs: duration,
      response: typeof data === "object" ? JSON.stringify(data).slice(0, 200) : String(data).slice(0, 200),
      raw: data,
    });
    console.log(`[${res.status}] ${options.method || "GET"} ${path} (${duration}ms)`);
  } catch (err) {
    results.push({
      name,
      path,
      method: options.method || "GET",
      status: 0,
      ok: false,
      durationMs: Date.now() - start,
      error: err.message,
    });
    console.error(`[ERR] ${options.method || "GET"} ${path}: ${err.message}`);
  }
}

async function runAllTests() {
  console.log("🚀 Starting Hair AI API Endpoint Test Suite...\n");

  // 1. Trending
  await testApi("Trending Styles", "/api/trending");

  // 2. Hairstyle Search
  await testApi("Hairstyle Search (SerpAPI)", "/api/hairstyle-search?q=crop");

  // 3. Build Grid
  await testApi("Build Photo Grid", "/api/build-grid", {
    method: "POST",
    body: {
      photos: [
        { base64: DUMMY_PNG_BASE64, mediaType: "image/png" }
      ]
    }
  });

  // 4. Analyze Hair
  await testApi("Analyze Hair (Gemini Vision)", "/api/analyze-hair", {
    method: "POST",
    body: {
      photos: [
        { base64: DUMMY_PNG_BASE64, mediaType: "image/png", label: "front" }
      ]
    }
  });

  // 5. Hair Health Diagnostic
  await testApi("Hair Health Diagnostic (Groq)", "/api/hair-health", {
    method: "POST",
    body: {
      answers: {
        concern: ["hair fall", "dandruff"],
        washFrequency: "2x per week",
        waterType: "hard water",
        diet: "vegetarian",
        stressLevel: "moderate",
        currentProducts: "anti-dandruff shampoo",
        scalpCondition: ["dry", "flaky"]
      }
    }
  });

  // 6. Payments - Create Order
  await testApi("Payments Create Order", "/api/payments/create-order", {
    method: "POST",
    body: { packId: "starter" }
  });

  // 7. Payments - Verify
  await testApi("Payments Verify", "/api/payments/verify", {
    method: "POST",
    body: {
      razorpay_order_id: "order_dummy",
      razorpay_payment_id: "pay_dummy",
      razorpay_signature: "sig_dummy",
      packId: "starter"
    }
  });

  // 8. WhatsApp Webhook GET Verification
  await testApi("WhatsApp Webhook (Verification)", "/api/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=dev-verify-token-change-me&hub.challenge=test_challenge_123");

  // 9. WhatsApp Webhook POST
  await testApi("WhatsApp Webhook (Inbound)", "/api/whatsapp/webhook", {
    method: "POST",
    body: { entry: [] }
  });

  // 10. Cron Dispatch
  await testApi("Cron Dispatch Messages", "/api/cron/dispatch", {
    method: "POST",
    headers: { "x-cron-secret": "dev-cron-secret-change-me" }
  });

  // 11. Auth Signup
  await testApi("Auth Signup", "/api/auth/signup", {
    method: "POST",
    body: {
      email: `test_dev_${Date.now()}@example.com`,
      password: "TestPassword123!",
      salonName: "Test Auto Salon",
      fullName: "Test Owner",
      phone: `+9199${Math.floor(10000000 + Math.random() * 90000000)}`
    }
  });

  // 12. Barbers GET
  await testApi("Get Barbers (Unauth test)", "/api/barbers");

  // 13. Barbers POST
  await testApi("Add Barber (Unauth test)", "/api/barbers", {
    method: "POST",
    body: { name: "Test Barber" }
  });

  // 14. Customer GET
  await testApi("Get Customer (Unauth test)", "/api/customer?phone=%2B919999999999");

  // 15. Customer POST
  await testApi("Create Customer (Unauth test)", "/api/customer", {
    method: "POST",
    body: { phone: "+919999999999", name: "John Doe" }
  });

  // 16. Salon GET
  await testApi("Get Salon (Unauth test)", "/api/salon");

  // 17. Salon PATCH
  await testApi("Update Salon (Unauth test)", "/api/salon", {
    method: "PATCH",
    body: { name: "Updated Salon Name" }
  });

  // 18. Salon Menu GET
  await testApi("Get Salon Menu (Unauth test)", "/api/salon/menu");

  // 19. Salon Menu POST
  await testApi("Add Menu Service (Unauth test)", "/api/salon/menu", {
    method: "POST",
    body: { service: { name: "Haircut", price: 250 } }
  });

  // 20. Salon Menu DELETE
  await testApi("Delete Menu Service (Unauth test)", "/api/salon/menu?slug=haircut", {
    method: "DELETE"
  });

  // 21. Salon Menu Import
  await testApi("Import Salon Menu (Unauth test)", "/api/salon/menu/import", {
    method: "POST",
    body: { text: "Haircut - Rs 250\nBeard Trim - Rs 150", dryRun: true }
  });

  // 22. Messages Outbox
  await testApi("Get Messages Outbox (Unauth test)", "/api/messages");

  // 23. Bill GET
  await testApi("Get Bill (Unauth test)", "/api/bill?visitId=dummy_visit_id");

  // 24. Bill POST
  await testApi("Create Bill (Unauth test)", "/api/bill", {
    method: "POST",
    body: { visitId: "dummy_visit_id", items: [{ name: "Cut", pricePaise: 25000, qty: 1 }] }
  });

  // 25. Save Visit POST
  await testApi("Save Visit (Unauth test)", "/api/save-visit", {
    method: "POST",
    body: { customerId: "dummy_cust", analysis: {} }
  });

  // 26. Save Visit PATCH
  await testApi("Update Visit (Unauth test)", "/api/save-visit", {
    method: "PATCH",
    body: { visitId: "dummy_visit_id", chosenStyle: "Fade" }
  });

  // 27. Visit Checkout POST
  await testApi("Checkout Visit (Unauth test)", "/api/visit/checkout", {
    method: "POST",
    body: { visitId: "dummy_visit_id" }
  });

  // 28. Visit In-Progress GET
  await testApi("In-Progress Visits (Unauth test)", "/api/visit/in-progress");

  // 29. Visit GET
  await testApi("Get Visit Details (Unauth test)", "/api/visit?id=dummy_visit_id");

  // 30. Visit Photos GET
  await testApi("Get Visit Photos", "/api/visit-photos?visitId=dummy_visit_id");

  // 31. Visit Photos POST
  await testApi("Upload Visit Photos", "/api/visit-photos", {
    method: "POST",
    body: { visitId: "dummy_visit_id", photos: [] }
  });

  // 32. Hairstyle Generation V1 (Replicate)
  await testApi("Generate Hairstyle V1 (Replicate)", "/api/generate-hairstyle", {
    method: "POST",
    body: {
      styleName: "Textured Crop",
      photoBase64: DUMMY_PNG_BASE64,
      photoMediaType: "image/png"
    }
  });

  // 33. Hairstyle Generation V2 (Replicate)
  await testApi("Generate Hairstyle V2 (Replicate)", "/api/generate-hairstyle-v2", {
    method: "POST",
    body: {
      styleName: "Textured Crop",
      photoBase64: DUMMY_PNG_BASE64,
      photoMediaType: "image/png"
    }
  });

  // 34. Generate GIF (Replicate)
  await testApi("Generate 360 GIF (Replicate)", "/api/generate-gif", {
    method: "POST",
    body: {
      styleName: "Textured Crop"
    }
  });

  // 35. Hair Transfer (Replicate)
  await testApi("Hair Transfer (Replicate)", "/api/hair-transfer", {
    method: "POST",
    body: {
      targetBase64: DUMMY_PNG_BASE64,
      targetMediaType: "image/png",
      referenceBase64: DUMMY_PNG_BASE64,
      referenceMediaType: "image/png"
    }
  });

  console.log("\n=========================================");
  console.log("📊 API TEST SUMMARY RESULTS");
  console.log("=========================================\n");
  console.log(JSON.stringify(results, null, 2));
}

runAllTests();
