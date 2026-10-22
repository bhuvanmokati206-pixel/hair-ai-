# Security review — Hair AI

**Review date:** 19 October 2026  
**Scope:** Static source review of the Next.js application, API routes, Supabase schema/migrations, and checked-in configuration. No production penetration test, Supabase-project inspection, or secret-value inspection was performed.

## Executive summary

The app has a thoughtful foundation: server-side Supabase `getUser()` validation, tenant-aware checks in many data routes, RLS migrations, and payment-signature verification are all present. However, it is **not ready to handle real customer photos or production payments** until the critical photo-access and webhook issues are fixed.

The main risk is that customer face images are deliberately placed in a public storage bucket and the endpoint managing those images performs no authentication or ownership validation. Several paid AI endpoints also lack rate limits, and untrusted URLs are fetched server-side.

## Findings

| Severity | Finding | Evidence | Fix |
|---|---|---|---|
| Critical | Customer face images can be read and modified without authorization | `app/api/visit-photos/route.ts:14-64` has no session or salon check for GET, POST, or PATCH. `lib/visitPhotos.ts:64-69` creates a `public: true` bucket and returns permanent public URLs. | Make the bucket private. Authorize the session, load the visit with `visit_id` **and** the session salon id, then permit actions only for that visit. Return short-lived signed URLs only after authorization. Validate `photoId` belongs to the same authorized visit before changing its hero state. |
| High | WhatsApp webhook accepts forged POSTs | `app/api/whatsapp/webhook/route.ts:29-81` parses JSON and executes service-role database writes, but verifies no `x-hub-signature-256` HMAC. | Read the raw request body, calculate `HMAC-SHA256` using Meta's app secret, and compare it with `crypto.timingSafeEqual`. Reject missing/invalid signatures before parsing or touching the database. Keep the verification-token GET endpoint separate. |
| High | Runtime switch can disable all authentication | `proxy.ts:19-21` trusts `NEXT_PUBLIC_SKIP_AUTH=true`. Because `NEXT_PUBLIC_*` variables are public build configuration, an accidental production setting removes every proxy check. | Remove this bypass from production code. If needed for local demos, gate it with `process.env.NODE_ENV !== "production"` and a non-public, server-only variable; fail deployment/startup if it is enabled in production. API routes must still enforce their own authorization. |
| High | Server-side request forgery (SSRF) through reference image URLs | `app/api/analyze-reference/route.ts:89-94` fetches arbitrary `imageUrl`; `app/api/hair-transfer/route.ts:9-17,98` fetches arbitrary `referenceUrl`. Neither validates protocol, host, resolved IP, redirects, or robust response size. | Prefer uploads to a controlled private bucket. If remote URLs are required, allow only HTTPS and an explicit hostname allowlist; resolve and reject loopback, private, link-local, and metadata IP ranges on every redirect; disable automatic redirects or validate each hop; enforce a small streaming byte limit and decoded-image pixel limit. |
| High | Paid AI capacity can be exhausted; account creation makes abuse easier | AI/image endpoints call Gemini, Groq, and Replicate (`app/api/analyze-hair/route.ts`, `generate-hairstyle/route.ts`, `generate-gif/route.ts`, etc.) without a visible rate limit, quota, or atomic credit debit. Signup creates owner accounts with service role (`app/api/auth/signup/route.ts:11-119`). | Add distributed rate limits keyed by user, salon, IP, and endpoint; cap request body/image dimensions; maintain credits in the database and atomically reserve/debit before calling a provider; add CAPTCHA and strict OTP enforcement to signup; alert on unusual provider spend. Never use browser localStorage as an entitlement source. |
| High | Payment credits are not server-authoritative and payment is not bound to a salon/account | `app/api/payments/create-order/route.ts:10-32` and `verify/route.ts:6-36` have no authentication or buyer binding. `components/CreditModal.tsx:58-65` adds credits in the browser through `lib/credits.ts`. | Require an authenticated salon for order creation and persist an order record (`order_id`, salon, pack, amount, pending). On verified payment/webhook, use an idempotent database transaction to credit that same salon. Derive the pack/credit amount from the stored order, not client `packId`; verify Razorpay payment status server-side/webhook. Treat the client only as a display of server balance. |
| Medium | Oversized or malformed image data can cause denial of service | `next.config.ts` raises proxy body limit to 50 MB. `visitPhotos.ts:31-42` decodes arbitrary base64 and trusts declared MIME; `build-grid`, AI endpoints, and image libraries accept client image data without common limits. | Reduce request limits by route. Enforce maximum number of images, encoded and decoded byte sizes, MIME magic-byte validation, image dimensions/pixels, and processing time. Reject SVG/animated/unexpected formats. Process large images asynchronously with queue limits. |
| Medium | Missing browser security response headers | `next.config.ts` defines no production `headers()` policy. | Add a restrictive CSP (initially Report-Only if needed), `frame-ancestors 'none'`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, restrictive `Permissions-Policy`, and HSTS at the HTTPS edge. Permit only required API/image/script origins. |
| Medium | Sensitive biometric and contact data need an explicit privacy lifecycle | Face scans are stored and made public; customer names, phone numbers, analysis, booking, and WhatsApp data are processed by external AI/communication providers. | Obtain explicit, recorded consent before scan/AI processing; display the provider/data-use notice; define retention and deletion flows for originals, generated images, and logs; keep a private bucket; encrypt/safeguard backups; document processor agreements and access controls. Avoid logging prompts or payloads containing customer data. |
| Medium | State-changing cookie-authenticated APIs have no visible origin/CSRF validation | Route handlers rely on cookies, and there is no common Origin/Referer or CSRF-token verification. `/api/cron/dispatch` additionally exposes a state-changing GET handler (`app/api/cron/dispatch/route.ts`). | Make state changes POST-only (cron should be POST only). Add a same-origin Origin check or a CSRF token to cookie-authenticated write routes, and keep Supabase cookies Secure/HttpOnly/SameSite in production. |
| Low | Operational errors and prompts are logged | `generate-hairstyle/route.ts:334` and `generate-hairstyle-v2/route.ts:229` log complete prompts; numerous handlers log raw errors. | Use structured logs with request IDs and redact image data, phone numbers, tokens, provider bodies, and prompt content. Set retention/access controls for logs. |
| Low | Dependency vulnerability scan could not be completed | `npm audit` did not run because the local npm installation references a missing `npm-cli.js`, not because the dependency tree was clean. | Repair/reinstall Node/npm, then run `npm audit --omit=dev`, check lockfile advisories in CI, and update vulnerable packages deliberately. |

## What is already good

- `lib/auth.ts` uses server-side `supabase.auth.getUser()` rather than trusting a client session.
- Most salon data routes derive the salon id from the authenticated profile instead of the request body.
- `supabase/schema-v3-auth.sql` includes RLS concepts and role separation.
- Razorpay HMAC verification exists; it needs buyer/order persistence and idempotent server-side crediting.
- `.env.local` is ignored by `.gitignore`; no secret values were included in this report.

## Priority remediation plan

1. **Immediately:** Turn the photo bucket private; protect `/api/visit-photos` with session, tenant, and visit ownership checks; rotate any public photo URLs by moving/reuploading existing objects.
2. **Immediately:** Verify Meta webhook POST signatures and remove the production auth bypass.
3. **Before public launch:** Add rate limiting, strict image input limits, SSRF protection, and server-side credit accounting.
4. **Before handling real customer scans:** Deploy security headers, CSRF/origin controls, consent/retention/deletion workflows, private storage, and log redaction.
5. **Continuous:** Apply and verify all Supabase migrations/RLS/storage policies in the actual production project; add automated authorization, webhook-signature, SSRF, and rate-limit tests; repair npm and enable dependency scanning in CI.

## Validation checklist after fixes

- An unauthenticated request cannot list, upload, or mark a visit photo as hero.
- A Salon A user receives 404/403 for every Salon B visit/photo/customer ID.
- Direct bucket URLs and old public URLs do not expose photos.
- A forged WhatsApp POST without a valid Meta signature returns 401/403 and creates no DB updates.
- Private, loopback, metadata, and redirecting URLs are rejected by image-import routes.
- Replaying a Razorpay event cannot credit twice; changing `packId` client-side has no effect.
- AI endpoints stop expensive requests at the configured rate/quota before provider calls.
