import crypto from "crypto";

export const SESSION_COOKIE = "agentshield_session";
const SESSION_TTL_SECONDS = 60 * 60 * 8;

export function createSessionToken(username: string) {
  const issuedAt = Date.now().toString();
  const payload = `${username}:${issuedAt}`;
  const signature = sign(payload);
  return Buffer.from(`${payload}:${signature}`).toString("base64url");
}

export function verifySessionToken(token: string | undefined) {
  if (!token) return false;

  try {
    const decoded = Buffer.from(token, "base64url").toString("utf8");
    const [username, issuedAt, signature] = decoded.split(":");
    if (!username || !issuedAt || !signature) return false;

    const ageSeconds = (Date.now() - Number(issuedAt)) / 1000;
    if (!Number.isFinite(ageSeconds) || ageSeconds > SESSION_TTL_SECONDS) return false;

    const expected = sign(`${username}:${issuedAt}`);
    return timingSafeEqual(signature, expected);
  } catch {
    return false;
  }
}

export function sessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_TTL_SECONDS
  };
}

function sign(payload: string) {
  const secret = process.env.PASSWORD || process.env.AUTH_SECRET || "agentshield-local-session";
  return crypto.createHmac("sha256", secret).update(payload).digest("hex");
}

function timingSafeEqual(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  if (leftBuffer.length !== rightBuffer.length) return false;
  return crypto.timingSafeEqual(leftBuffer, rightBuffer);
}
