import crypto from "crypto";
import fs from "fs";
import path from "path";
import { AdminSession } from "./auth_guard";
export function canonicalizePythonJson(data: any): string {
  if (data === null) return "null";
  if (typeof data === "boolean") return data ? "true" : "false";
  if (typeof data === "number") return JSON.stringify(data);
  if (typeof data === "string") return JSON.stringify(data);
  if (Array.isArray(data)) {
    return "[" + data.map(canonicalizePythonJson).join(", ") + "]";
  }
  if (typeof data === "object") {
    const sortedKeys = Object.keys(data).sort();
    const pairs = sortedKeys.map(
      (key) => JSON.stringify(key) + ": " + canonicalizePythonJson(data[key])
    );
    return "{" + pairs.join(", ") + "}";
  }
  return JSON.stringify(data);
}
export function computeProposalHash(proposal: any): string {
  const canonicalStr = canonicalizePythonJson(proposal);
  return crypto.createHash("sha256").update(Buffer.from(canonicalStr, "utf8")).digest("hex");
}
export interface OutOfBandApprovalRecord {
  schema_version: string;
  approval_id: string;
  request_id: string;
  proposal_id: string;
  proposal_hash: string;
  decision: "APPROVE" | "REJECT";
  approver_id: string;
  approver_role: string;
  approved_at: string;
  expires_at: string;
  key_id: string;
  signature: string;
}
export async function createAndSignApproval(
  requestId: string,
  proposal: any,
  decision: "APPROVE" | "REJECT",
  session: AdminSession,
  trustedStoreDir: string,
  privateKeyPem?: string
): Promise<OutOfBandApprovalRecord> {
  if (requestId.includes("..") || requestId.includes("/") || requestId.includes("\\")) {
    throw new Error("INVALID_REQUEST_ID_PATH_TRAVERSAL");
  }
  const proposalHash = computeProposalHash(proposal);
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const approvalId = `appr_${now.getTime().toString(36)}_${crypto.randomBytes(4).toString("hex")}`;
  const keyId = process.env.ED25519_KEY_ID || "key_v7_2026_01";
  const recordNoSig = {
    schema_version: "1.0",
    approval_id: approvalId,
    request_id: requestId,
    proposal_id: proposal.proposal_id || "UNKNOWN",
    proposal_hash: proposalHash,
    decision: decision,
    approver_id: session.user_id,
    approver_role: session.role,
    approved_at: now.toISOString(),
    expires_at: expiresAt.toISOString(),
    key_id: keyId
  };
  const canonicalSigningStr = `${recordNoSig.approval_id}|${recordNoSig.request_id}|${recordNoSig.proposal_id}|${recordNoSig.proposal_hash}|${recordNoSig.decision}|${recordNoSig.approver_id}|${recordNoSig.approved_at}|${recordNoSig.expires_at}|${recordNoSig.key_id}`;
  const privateKey = privateKeyPem || process.env.ED25519_PRIVATE_KEY_PEM?.replace(/\\n/g, "\n");
  if (!privateKey) {
    throw new Error("ED25519_PRIVATE_KEY_MISSING");
  }
  const signature = crypto.sign(null, Buffer.from(canonicalSigningStr, "utf8"), privateKey).toString("hex");
  const fullRecord: OutOfBandApprovalRecord = {
    ...recordNoSig,
    signature: signature
  };
  if (!fs.existsSync(trustedStoreDir)) {
    fs.mkdirSync(trustedStoreDir, { recursive: true });
  }
  const targetPath = path.join(trustedStoreDir, `${requestId}.json`);
  const tempPath = `${targetPath}.tmp_${Date.now()}`;
  fs.writeFileSync(tempPath, JSON.stringify(fullRecord, null, 2), { encoding: "utf8" });
  fs.renameSync(tempPath, targetPath);
  return fullRecord;
}

