import { NextResponse } from "next/server";

const AI_URL = process.env.AI_URL ?? "";

// GET /api/health-ai — proxies to AI server /health (no auth required)
// Called by the kiosk every 60 s to verify the AI server is reachable.
export async function GET() {
  if (!AI_URL) {
    return NextResponse.json(
      { online: false, error: "AI_URL not configured" },
      { status: 200 },
    );
  }

  try {
    const res = await fetch(`${AI_URL}/health`, {
      signal: AbortSignal.timeout(5_000),
      cache: "no-store",
    });

    if (!res.ok) {
      return NextResponse.json(
        { online: false, status: res.status },
        { status: 200 },
      );
    }

    const data = await res.json();

    return NextResponse.json({ online: true, ...data }, { status: 200 });
  } catch {
    return NextResponse.json(
      { online: false, error: "unreachable" },
      { status: 200 },
    );
  }
}
