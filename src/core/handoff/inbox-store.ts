import { promises as fs } from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import type { HandoffEnvelope } from "./envelope";
const DATA_DIR = path.join(process.cwd(), "data", "control-plane");
const STORE_FILE = path.join(DATA_DIR, "inbox.json");
function fingerprint(handoff: HandoffEnvelope): string {
  const normalized = JSON.stringify({
    ...handoff,
    payload: handoff.payload,
    metadata: handoff.metadata ?? undefined,
  });
  return createHash("sha256")
    .update(normalized)
    .digest("hex");
}
export async function listHandoffs(): Promise<HandoffEnvelope[]> {
  try {
    const raw = await fs.readFile(STORE_FILE, "utf8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as HandoffEnvelope[]) : [];
  } catch {
    return [];
  }
}
export async function getHandoff(
  handoffId: string,
): Promise<HandoffEnvelope | null> {
  const records = await listHandoffs();
  return (
    records.find((record) => record.handoffId === handoffId) ?? null
  );
}
export async function saveHandoff(
  handoff: HandoffEnvelope,
): Promise<{
  status: "created" | "replayed" | "conflict";
  handoff: HandoffEnvelope;
  fingerprint: string;
}> {
  const records = await listHandoffs();
  const existing = records.find(
    (record) => record.handoffId === handoff.handoffId,
  );
  const incomingFingerprint = fingerprint(handoff);
  if (existing) {
    const existingFingerprint = fingerprint(existing);
    if (existingFingerprint === incomingFingerprint) {
      return {
        status: "replayed",
        handoff: existing,
        fingerprint: existingFingerprint,
      };
    }
    return {
      status: "conflict",
      handoff: existing,
      fingerprint: existingFingerprint,
    };
  }
  records.push(handoff);
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(
    STORE_FILE,
    JSON.stringify(records, null, 2),
    "utf8",
  );
  return {
    status: "created",
    handoff,
    fingerprint: incomingFingerprint,
  };
}
