import { NextRequest, NextResponse } from "next/server";

const AI_URL = process.env.AI_URL ?? "";
const AI_KEY = process.env.AI_KEY ?? "";

export async function POST(req: NextRequest) {
  if (!AI_URL) {
    return NextResponse.json({ error: "AI_URL not configured" }, { status: 503 });
  }

  const form = await req.formData();

  const upstream = new FormData();
  const image = form.get("image");
  if (!image || !(image instanceof Blob)) {
    return NextResponse.json({ error: "No image provided" }, { status: 400 });
  }
  upstream.append("file", image, "capture.jpg");

  let res: Response;
  try {
    res = await fetch(`${AI_URL}/api/detect`, {
      method: "POST",
      headers: { Authorization: `Bearer ${AI_KEY}` },
      body: upstream,
    });
  } catch (err) {
    console.error("[detect] AI server unreachable:", err);
    return NextResponse.json({ error: "AI server unreachable" }, { status: 503 });
  }

  let data: unknown;
  try {
    data = await res.json();
  } catch {
    return NextResponse.json({ error: `AI error ${res.status}` }, { status: res.status });
  }

  return NextResponse.json(data, { status: res.status });
}
