import { NextResponse } from "next/server";

const AI_URL = process.env.AI_URL ?? "";
const AI_KEY = process.env.AI_KEY ?? "";

// Server-side logging only — never put this in an HTTP response body.
// This route is unauthenticated and the kiosk is served over a public tunnel,
// so anything returned here is world-readable. Returning even a partial key
// (first 8 + last 4 + exact length) leaks most of a 39-char secret; fixed
// 2026-08-12 after the live endpoint was found doing exactly that.
function maskKey(k: string) {
  if (!k) return "(not set)";

  return `${k.slice(0, 4)}…${k.slice(-2)} (${k.length} chars)`;
}

/** Safe for the response body: whether a key is configured, nothing about its value. */
function keyConfigured(k: string) {
  return k.length > 0;
}

// GET /api/health-ai — tests reachability AND auth against the AI server
export async function GET() {
  const keyInfo = maskKey(AI_KEY);

  console.log(`[health-ai] AI_URL=${AI_URL || "(not set)"} AI_KEY=${keyInfo}`);

  if (!AI_URL) {
    return NextResponse.json(
      { online: false, error: "AI_URL not configured", keyConfigured: keyConfigured(AI_KEY) },
      { status: 200 },
    );
  }

  // Step 1: reachability
  let reachable = false;

  try {
    const res = await fetch(`${AI_URL}/health`, {
      signal: AbortSignal.timeout(5_000),
      cache: "no-store",
    });

    reachable = res.ok;
    console.log(`[health-ai] /health → ${res.status}`);
  } catch (err) {
    console.error(`[health-ai] /health unreachable: ${(err as Error).message}`);

    return NextResponse.json(
      { online: false, error: "unreachable", keyConfigured: keyConfigured(AI_KEY) },
      { status: 200 },
    );
  }

  if (!reachable) {
    return NextResponse.json({
      online: false,
      error: "health check failed",
      keyConfigured: keyConfigured(AI_KEY),
    });
  }

  // Step 2: auth check — POST empty form, expect 400 (auth OK) not 401 (key wrong)
  try {
    const form = new FormData();
    const res = await fetch(`${AI_URL}/api/detect`, {
      method: "POST",
      headers: { "X-Api-Key": AI_KEY },
      body: form,
      signal: AbortSignal.timeout(5_000),
    });

    console.log(`[health-ai] auth check → ${res.status}`);

    if (res.status === 401) {
      const body = await res.json().catch(() => ({}));

      console.error(
        `[health-ai] AUTH FAILED — kiosk AI_KEY=${keyInfo} rejected by AI server. detail=${JSON.stringify(body)}`,
      );

      return NextResponse.json(
        {
          online: true,
          auth: false,
          error: "API key rejected (401)",
          keyConfigured: keyConfigured(AI_KEY),
        },
        { status: 200 },
      );
    }

    // 400/422 = auth passed, bad input rejected — key is correct
    console.log(`[health-ai] AUTH OK — key accepted`);

    return NextResponse.json(
      { online: true, auth: true, keyConfigured: keyConfigured(AI_KEY) },
      { status: 200 },
    );
  } catch (err) {
    console.error(`[health-ai] auth check error: ${(err as Error).message}`);

    return NextResponse.json(
      { online: true, auth: null, error: "auth check failed", keyConfigured: keyConfigured(AI_KEY) },
      { status: 200 },
    );
  }
}
