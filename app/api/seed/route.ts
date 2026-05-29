import { NextResponse } from "next/server";
import { ensureSeedData } from "@/lib/seed";

export async function POST() {
  if (process.env.NODE_ENV === "production" && process.env.AGENTSHIELD_AUTO_SEED !== "true") {
    return NextResponse.json({ error: "Seed endpoint is disabled in production." }, { status: 403 });
  }

  await ensureSeedData();
  return NextResponse.json({ ok: true });
}
