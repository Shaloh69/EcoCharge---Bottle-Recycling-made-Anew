import { NextResponse } from "next/server";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "";

// GET /api/health-backend — pings the main Render backend
export async function GET() {
  if (!API_URL) {
    return NextResponse.json(
      { online: false, error: "API_URL not configured" },
      { status: 200 },
    );
  }

  try {
    const res = await fetch(`${API_URL}/api/kiosk/list`, {
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
