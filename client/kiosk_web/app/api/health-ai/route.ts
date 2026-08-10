import { NextResponse } from "next/server";

const AI_URL = process.env.AI_URL ?? "";
const AI_KEY = process.env.AI_KEY ?? "";

function maskKey(k: string) {
  if (!k) return "(not set)";

  return `${k.slice(0, 8)}...${k.slice(-4)} (${k.length} chars)`;
}

// GET /api/health-ai — tests reachability AND auth against the AI server
export async function GET() {
  const keyInfo = maskKey(AI_KEY);

  console.log(`[health-ai] AI_URL=${AI_URL || "(not set)"} AI_KEY=${keyInfo}`);

  if (!AI_URL) {
    return NextResponse.json(
      { online: false, error: "AI_URL not configured", key: keyInfo },
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
      { online: false, error: "unreachable", key: keyInfo },
      { status: 200 },
    );
  }

  if (!reachable) {
    return NextResponse.json({
      online: false,
      error: "health check failed",
      key: keyInfo,
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
          key: keyInfo,
        },
        { status: 200 },
      );
    }

    // 400/422 = auth passed, bad input rejected — key is correct
    console.log(`[health-ai] AUTH OK — key accepted`);

    return NextResponse.json(
      { online: true, auth: true, key: keyInfo },
      { status: 200 },
    );
  } catch (err) {
    console.error(`[health-ai] auth check error: ${(err as Error).message}`);

    return NextResponse.json(
      { online: true, auth: null, error: "auth check failed", key: keyInfo },
      { status: 200 },
    );
  }
}
