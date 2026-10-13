import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { signToken } from "@/lib/security/auth_guard";
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { username, password } = body;
    const expectedUser = process.env.ADMIN_USERNAME || "admin";
    const expectedPass = process.env.ADMIN_PASSWORD || "change_this_admin_password_immediately";
    const userHash = crypto.createHash("sha256").update(username || "").digest();
    const expUserHash = crypto.createHash("sha256").update(expectedUser).digest();
    const passHash = crypto.createHash("sha256").update(password || "").digest();
    const expPassHash = crypto.createHash("sha256").update(expectedPass).digest();
    const userMatch = crypto.timingSafeEqual(userHash, expUserHash);
    const passMatch = crypto.timingSafeEqual(passHash, expPassHash);
    if (!userMatch || !passMatch) {
      return NextResponse.json({ error: "INVALID_CREDENTIALS" }, { status: 401 });
    }
    const now = Math.floor(Date.now() / 1000);
    const sessionToken = signToken({
      user_id: expectedUser,
      role: "SUPER_ADMIN",
      iat: now,
      exp: now + 8 * 3600
    });
    const response = NextResponse.json({ success: true, user: { id: expectedUser, role: "SUPER_ADMIN" } });
    response.cookies.set("marketing_os_session", sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
      maxAge: 8 * 3600
    });
    return response;
  } catch {
    return NextResponse.json({ error: "BAD_REQUEST" }, { status: 400 });
  }
}
