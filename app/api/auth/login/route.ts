import { NextResponse } from "next/server";
import { z } from "zod";
import { createSessionToken, SESSION_COOKIE, sessionCookieOptions } from "@/lib/auth/session";

const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1)
});

export async function POST(request: Request) {
  const parsed = loginSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Enter your credentials." }, { status: 400 });
  }

  const expectedUsername = process.env.USER_NAME;
  const expectedPassword = process.env.PASSWORD;

  if (!expectedUsername || !expectedPassword) {
    return NextResponse.json({ error: "Login is not configured." }, { status: 500 });
  }

  if (parsed.data.username !== expectedUsername || parsed.data.password !== expectedPassword) {
    return NextResponse.json({ error: "Invalid username or password." }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE, createSessionToken(parsed.data.username), sessionCookieOptions());
  return response;
}
