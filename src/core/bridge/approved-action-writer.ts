import { promises as fs } from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import type { ControlAction } from "../data/provider";
import type { ProjectExecutionProfile } from "../execution/types";
import type { BridgeActionEnvelope } from "../bridge/action-envelope";
import { validateActionInputContract } from "./metadata-action-contract";
const BRIDGE_ROOT = "D:\\SOCIAL AGENT\\marketing-os-bridge";
const APPROVED_DIR = path.join(BRIDGE_ROOT, "approved");
function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}
function toUtcIso(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new Error("Invalid timestamp.");
  }
  return date.toISOString();
}
function getInput(action: ControlAction): Record<string, unknown> {
  if (!action.input || typeof action.input !== "object" || Array.isArray(action.input)) {
    return {};
  }
  return action.input as Record<string, unknown>;
}
function buildPayloadHash(
  action: ControlAction,
  profile: ProjectExecutionProfile,
): string {
  const payload = JSON.stringify({
    action_id: action.id,
    action_type: action.type,
    project: profile.domain,
    adapter: profile.adapter,
    input: getInput(action),
  });
  return sha256(payload);
}
export async function writeApprovedAction(
  action: ControlAction,
  profile: ProjectExecutionProfile,
  approvalId: string,
  approvedBy: string,
  approvedAt: string,
): Promise<BridgeActionEnvelope> {
  if (!profile.enabled) {
    throw new Error("Execution profile is disabled.");
  }
  if (profile.adapter !== "playwright") {
    throw new Error("Bridge v1 only supports the Playwright adapter.");
  }
  if (
    action.type !== "seo.write.metadata" &&
    action.type !== "seo.write.content"
  ) {
    throw new Error(`Action type "${action.type}" is not supported by Bridge v1.`);
  }
  const input = getInput(action);
  const contract = validateActionInputContract(action.type, input);
  if (!contract.ok) {
    throw new Error(
      `Action input contract validation failed: ${JSON.stringify(contract.violations)}`,
    );
  }
  const createdAt = new Date().toISOString();
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  const envelope: BridgeActionEnvelope = {
    version: "1.0",
    action_id: action.id,
    action_type: action.type,
    project: profile.domain,
    adapter: "playwright",
    approval: {
      approval_id: approvalId,
      approved_by: approvedBy,
      approved_at: toUtcIso(approvedAt),
    },
    created_at: createdAt,
    expires_at: expiresAt,
    payload_hash: buildPayloadHash(action, profile),
    input: getInput(action),
  };
  await fs.mkdir(APPROVED_DIR, { recursive: true });
  const filePath = path.join(APPROVED_DIR, `${action.id}.json`);
  const serialized = JSON.stringify(envelope, null, 2);
  try {
    await fs.writeFile(filePath, serialized, {
      encoding: "utf8",
      flag: "wx",
    });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "EEXIST") {
      throw new Error(
        `Bridge action already exists for action_id "${action.id}".`,
      );
    }
    throw error;
  }
  return envelope;
}





