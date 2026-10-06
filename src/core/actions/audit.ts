import { promises as fs } from "node:fs";
import path from "node:path";

import type {
  ControlAction,
  ControlResult,
} from "@/core/data/provider";

export type AuditEventType =
  | "requested"
  | "accepted"
  | "blocked"
  | "completed"
  | "failed"
  | "replayed"
  | "duplicate"
  | "conflict";

export interface AuditEvent {
  id: string;
  timestamp: string;
  event: AuditEventType;
  actionId: string;
  moduleId: string;
  actionType: string;
  status: ControlResult["status"];
  requestedBy?: string;
  message: string;
  result?: ControlResult;
}

const DATA_DIR = path.join(
  process.cwd(),
  "data",
  "control-plane",
);

const AUDIT_FILE = path.join(
  DATA_DIR,
  "audit.jsonl",
);

const SENSITIVE_KEY_PATTERN = /(token|api[_-]?key|secret|password|authorization|cookie|credential|access[_-]?key|private[_-]?key)/i;
function sanitizeValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sanitizeValue);
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, nestedValue]) => [
        key,
        SENSITIVE_KEY_PATTERN.test(key)
          ? "[REDACTED]"
          : sanitizeValue(nestedValue),
      ]),
    );
  }
  return value;
}
function sanitizeResult(
  result: ControlResult,
): ControlResult {
  return {
    actionId: result.actionId,
    status: result.status,
    message: result.message,
    executedAt: result.executedAt,
    data: sanitizeValue(result.data) as Record<string, unknown> | undefined,
  };
}
export async function appendAuditEvent(
  action: ControlAction,
  event: AuditEventType,
  result: ControlResult,
): Promise<void> {
  await fs.mkdir(DATA_DIR, {
    recursive: true,
  });

  const auditEvent: AuditEvent = {
    id: `audit-${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 8)}`,
    timestamp: new Date().toISOString(),
    event,
    actionId: action.id,
    moduleId: action.moduleId,
    actionType: action.type,
    status: result.status,
    requestedBy: action.requestedBy,
    message: result.message,
    result: sanitizeResult(result),
  };

  await fs.appendFile(
    AUDIT_FILE,
    `${JSON.stringify(auditEvent)}\n`,
    "utf8",
  );
}

export async function readAuditEvents(): Promise<
  AuditEvent[]
> {
  try {
    const raw = await fs.readFile(
      AUDIT_FILE,
      "utf8",
    );

    return raw
      .split("\n")
      .filter(Boolean)
      .map(
        (line) =>
          JSON.parse(line) as AuditEvent,
      );
  } catch {
    return [];
  }
}

