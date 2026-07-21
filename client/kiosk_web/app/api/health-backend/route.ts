import { NextResponse } from "next/server";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "";

// GET /api/health-backend — pings the main backend's public /health endpoint
// (kiosk/list now requires auth, so it can no longer serve as the probe)
export async function GET() {
  if (!API_URL) {
    return NextResponse.json(
      { online: false, error: "API_URL not configured" },
      { status: 200 },
    );
  }

  try {
    const res = await fetch(`${API_URL}/health`, {
      signal: AbortSignal.timeout(7_000),
      cache: "no-store",
    });

    return NextResponse.json(
      { online: res.ok, status: res.status, url: API_URL },
      { status: 200 },
    );
  } catch (err: unknown) {
    return NextResponse.json(
      {
        online: false,
        error: err instanceof Error ? err.message : "unreachable",
        url: API_URL,
      },
      { status: 200 },
    );
  }
}
