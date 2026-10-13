import { NextRequest, NextResponse } from "next/server";
import { verifyAdminSession } from "@/lib/security/auth_guard";
import { createAndSignApproval } from "@/lib/security/approval_signer";
export async function POST(req: NextRequest) {
  // 1. STRICT SERVER-SIDE SESSION GUARD
  const session = await verifyAdminSession(req);
  if (!session || session.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "UNAUTHORIZED_ADMIN_SESSION_REQUIRED" }, { status: 403 });
  }
  try {
    const body = await req.json();
    const { request_id, proposal, decision } = body;
    if (!request_id || !proposal || !decision) {
      return NextResponse.json({ error: "MISSING_REQUIRED_FIELDS" }, { status: 400 });
    }
    const trustedStoreDir = process.env.TRUSTED_APPROVAL_STORE_DIR || "D:\\SOCIAL AGENT\\marketing-os-bridge\\trusted_approvals";
    // 2. SIGN USING VERIFIED SERVER SESSION (DO NOT TRUST CLIENT APPROVER/ROLE)
    const approvalRecord = await createAndSignApproval(
      request_id,
      proposal,
      decision,
      session, // Approver ID & Role come directly from verified session
      trustedStoreDir
    );
    return NextResponse.json({ success: true, approval: approvalRecord });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "INTERNAL_ERROR" }, { status: 500 });
  }
}
