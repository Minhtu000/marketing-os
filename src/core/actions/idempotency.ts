import { createHash } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";

import type {
  ControlAction,
  ControlResult,
} from "@/core/data/provider";

interface IdempotencyRecord {
  actionId: string;
  fingerprint: string;
  result: ControlResult;
  createdAt: string;
}

const DATA_DIR = path.join(process.cwd(), "data", "control-plane");
const STORE_FILE = path.join(DATA_DIR, "idempotency.json");

function stableSerialize(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return `[${value.map(stableSerialize).join(",")}]`;
  }

  const record = value as Record<string, unknown>;

  return `{${Object.keys(record)
    .sort()
    .map(
      (key) =>
        `${JSON.stringify(key)}:${stableSerialize(record[key])}`,
    )
    .join(",")}}`;
}

function fingerprintAction(action: ControlAction): string {
  const payload = {
    id: action.id,
    moduleId: action.moduleId,
    type: action.type,
    input: action.input ?? null,
    requestedBy: action.requestedBy ?? null,
  };

  return createHash("sha256")
    .update(stableSerialize(payload))
    .digest("hex");
}

async function readStore(): Promise<IdempotencyRecord[]> {
  try {
    const raw = await fs.readFile(STORE_FILE, "utf8");
    const parsed = JSON.parse(raw);

    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function writeStore(records: IdempotencyRecord[]): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });

  await fs.writeFile(
    STORE_FILE,
    JSON.stringify(records, null, 2),
    "utf8",
  );
}

export async function getIdempotencyRecord(
  action: ControlAction,
): Promise<
  | {
      kind: "new";
      fingerprint: string;
    }
  | {
      kind: "replay";
      result: ControlResult;
    }
  | {
      kind: "conflict";
      result: ControlResult;
    }
> {
  const records = await readStore();
  const existing = records.find(
    (record) => record.actionId === action.id,
  );

  const fingerprint = fingerprintAction(action);

  if (!existing) {
    return {
      kind: "new",
      fingerprint,
    };
  }

  if (existing.fingerprint === fingerprint) {
    return {
      kind: "replay",
      result: existing.result,
    };
  }

  return {
    kind: "conflict",
    result: {
      actionId: action.id,
      status: "blocked",
      message:
        "Action ID already exists with a different payload.",
      executedAt: new Date().toISOString(),
      data: {
        reason: "IDEMPOTENCY_CONFLICT",
      },
    },
  };
}

export async function saveIdempotencyRecord(
  action: ControlAction,
  fingerprint: string,
  result: ControlResult,
): Promise<void> {
  const records = await readStore();

  const existingIndex = records.findIndex(
    (record) => record.actionId === action.id,
  );

  const record: IdempotencyRecord = {
    actionId: action.id,
    fingerprint,
    result,
    createdAt: new Date().toISOString(),
  };

  if (existingIndex >= 0) {
    records[existingIndex] = record;
  } else {
    records.push(record);
  }

  await writeStore(records);
}