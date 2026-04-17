import { NextRequest, NextResponse } from "next/server";

const AI_URL = process.env.AI_URL ?? "";
const AI_KEY = process.env.AI_KEY ?? "";
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "";

function maskKey(key: string) {
  if (!key) return "(not set)";
  return `${key.slice(0, 6)}...${key.slice(-4)}`;
}

async function relayAiError(status: number, detail: string, sessionId?: string) {
  if (!API_URL) return;
  try {
    await fetch(`${API_URL}/api/log/ai-error`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, detail, url: AI_URL, session_id: sessionId }),
      signal: AbortSignal.timeout(3_000),
    });
  } catch {
    // best-effort — don't block the response
  }
}

export async function POST(req: NextRequest) {
  if (!AI_URL) {
    console.error("[detect] AI_URL not configured — check Render env vars");
    return NextResponse.json({ error: "AI_URL not configured" }, { status: 503 });
  }
  if (!AI_KEY) {
    console.error("[detect] AI_KEY not configured — check Render env vars");
    return NextResponse.json({ error: "AI_KEY not configured" }, { status: 503 });
  }

  console.log(`[detect] AI_URL=${AI_URL} AI_KEY=${maskKey(AI_KEY)}`);

  const form = await req.formData();
  const upstream = new FormData();
  const image = form.get("image");
  const sessionId = form.get("session_id")?.toString() ?? undefined;

  if (!image || !(image instanceof Blob)) {
    console.warn("[detect] No image in request body");
    return NextResponse.json({ error: "No image provided" }, { status: 400 });
  }

  console.log(`[Stage 2] detect route — session=${sessionId ?? "?"} image=${image.size} bytes → ${AI_URL}/api/detect`);
  upstream.append("image", image, "capture.jpg");

  let res: Response;
  try {
    res = await fetch(`${AI_URL}/api/detect`, {
      method: "POST",
      headers: { "X-Api-Key": AI_KEY },
      body: upstream,
      signal: AbortSignal.timeout(12_000),
    });
  } catch (err) {
    const msg = (err as Error).message ?? String(err);
    console.error(`[detect] AI server unreachable: ${msg} | url=${AI_URL}`);
    await relayAiError(0, `unreachable: ${msg}`);
    return NextResponse.json({ error: "AI server unreachable" }, { status: 503 });
  }

  let data: unknown;
  try {
    data = await res.json();
  } catch {
    console.error(`[detect] AI server returned non-JSON — status=${res.status}`);
    await relayAiError(res.status, "non-JSON response");
    return NextResponse.json({ error: `AI error ${res.status}` }, { status: res.status });
  }

  if (!res.ok) {
    const detail =
      typeof data === "object" && data !== null
        ? ((data as Record<string, unknown>).detail ??
          (data as Record<string, unknown>).error ??
          JSON.stringify(data))
        : String(data);

    console.error(
      `[detect] AI server error — status=${res.status} detail=${detail}` +
        ` | url=${AI_URL} | key=${maskKey(AI_KEY)} | session=${sessionId ?? "?"}`,
    );
    await relayAiError(res.status, String(detail), sessionId);
    return NextResponse.json(data, { status: res.status });
  }

  console.log(`[Stage 2→3] AI response OK — ${JSON.stringify(data).slice(0, 120)}`);
  return NextResponse.json(data, { status: res.status });
}
