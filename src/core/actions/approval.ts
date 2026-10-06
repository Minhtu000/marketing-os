import { promises as fs } from "node:fs";
import path from "node:path";
import type { ControlAction, ControlResult } from "@/core/data/provider";
const DATA_DIR = path.join(process.cwd(), "data", "control-plane");
const STORE_FILE = path.join(DATA_DIR, "approvals.json");
export type ApprovalStatus = "pending" | "approved" | "rejected" | "completed";
export interface ApprovalRecord {
  approvalId: string;
  action: ControlAction;
  status: ApprovalStatus;
  requestedAt: string;
  decidedAt?: string;
  decidedBy?: string;
  result?: ControlResult;
}
async function readStore(): Promise<ApprovalRecord[]> {
  try {
    const raw = await fs.readFile(STORE_FILE, "utf8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}
async function writeStore(records: ApprovalRecord[]): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(
    STORE_FILE,
    JSON.stringify(records, null, 2),
    "utf8",
  );
}
export async function getApproval(
  actionId: string,
): Promise<ApprovalRecord | null> {
  const records = await readStore();
  return records.find((record) => record.action.id === actionId) ?? null;
}
export async function createApproval(
  action: ControlAction,
): Promise<ApprovalRecord> {
  const existing = await getApproval(action.id);
  if (existing) {
    return existing;
  }
  const record: ApprovalRecord = {
    approvalId: `approval-${crypto.randomUUID()}`,
    action,
    status: "pending",
    requestedAt: new Date().toISOString(),
  };
  const records = await readStore();
  records.push(record);
  await writeStore(records);
  return record;
}
export async function updateApproval(
  actionId: string,
  patch: Partial<ApprovalRecord>,
): Promise<ApprovalRecord> {
  const records = await readStore();
  const index = records.findIndex(
    (record) => record.action.id === actionId,
  );
  if (index === -1) {
    throw new Error(`Approval not found for action "${actionId}".`);
  }
  const updated = {
    ...records[index],
    ...patch,
  };
  records[index] = updated;
  await writeStore(records);
  return updated;
}
