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

  const res = await fetch(`${AI_URL}/api/detect`, {
    method: "POST",
    headers: { Authorization: `Bearer ${AI_KEY}` },
    body: upstream,
  });

  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
