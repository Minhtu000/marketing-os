import { NextRequest } from "next/server";
import crypto from "crypto";
export interface AdminSession {
  user_id: string;
  role: "SUPER_ADMIN";
  iat: number;
  exp: number;
}
const AUTH_SECRET = process.env.AUTH_SECRET || "dev_fallback_secret_must_change_in_production_32bytes";
const SESSION_COOKIE_NAME = "marketing_os_session";
export function signToken(payload: Record<string, any>): string {
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const dataToSign = `${header}.${body}`;
  const signature = crypto.createHmac("sha256", AUTH_SECRET).update(dataToSign).digest("base64url");
  return `${dataToSign}.${signature}`;
}
export function verifyToken(token: string): AdminSession | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const [header, body, signature] = parts;
    const expectedSig = crypto.createHmac("sha256", AUTH_SECRET).update(`${header}.${body}`).digest("base64url");
    const sigBuffer = Buffer.from(signature);
    const expectedBuffer = Buffer.from(expectedSig);
    if (sigBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(sigBuffer, expectedBuffer)) {
      return null;
    }
    const payload: AdminSession = JSON.parse(Buffer.from(body, "base64url").toString("utf-8"));
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < now) {
      return null;
    }
    if (payload.role !== "SUPER_ADMIN") {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}
export async function verifyAdminSession(req: NextRequest): Promise<AdminSession | null> {
  if (["POST", "PUT", "DELETE", "PATCH"].includes(req.method)) {
    const origin = req.headers.get("origin");
    const host = req.headers.get("host");
    if (origin && host) {
      const originHost = new URL(origin).host;
      if (originHost !== host) {
        return null;
      }
    }
  }
  const cookie = req.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (!cookie) return null;
  return verifyToken(cookie);
}
