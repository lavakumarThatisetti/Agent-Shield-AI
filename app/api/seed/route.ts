import { NextResponse } from "next/server";
import { ensureSeedData } from "@/lib/seed";

async function seedDemoData() {
  if (process.env.NODE_ENV === "production" && process.env.AGENTSHIELD_AUTO_SEED !== "true") {
    return NextResponse.json({ error: "Seed endpoint is disabled in production." }, { status: 403 });
  }

  await ensureSeedData();
  return NextResponse.json({ ok: true });
}

export async function GET() {
  return seedDemoData();
}

export async function POST() {
  return seedDemoData();
}
