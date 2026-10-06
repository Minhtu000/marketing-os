import { createHash } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";

import { getActionDefinition } from "@/core/actions/action-registry";
import { evaluateActionPolicy } from "@/core/actions/action-policy";
import {
  appendAuditEvent,
  type AuditEventType,
} from "@/core/actions/audit";
import {
  getIdempotencyRecord,
  saveIdempotencyRecord,
} from "@/core/actions/idempotency";
import type {
  ControlAction,
  ControlResult,
} from "@/core/data/provider";

export interface ResultEnvelope {
  envelope_version: "1.0";
  envelope_id: string;
  idempotency_key: string;
  action_id: string;
  action_type: string;
  project: string;
  producer: {
    system: string;
    run_id: string;
  };
  collected_at: string;
  data_period: {
    from: string;
    to: string;
  };
  status: "ok" | "partial" | "blocked" | "error";
  source_status: Record<string, string>;
  read_only: true;
  payload: Record<string, unknown>;
  limitations: Array<{
    dataset: string;
    impact: string;
    status: "KNOWN";
  }>;
  checksum: string;
}

interface StoredEnvelope {
  envelope_id: string;
  idempotency_key: string;
  action_id: string;
  action_type: string;
  project: string;
  collected_at: string;
  stored_at: string;
  envelope: ResultEnvelope;
}

const ROOT_DIR = process.cwd();
const INBOX_DIR = path.join(ROOT_DIR, "inbox");
const PROCESSED_DIR = path.join(ROOT_DIR, "processed");
const REJECTED_DIR = path.join(ROOT_DIR, "rejected");
const STORE_DIR = path.join(
  ROOT_DIR,
  "data",
  "control-plane",
);
const STORE_FILE = path.join(
  STORE_DIR,
  "envelopes.json",
);

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

function checksumPayload(
  envelope: Omit<ResultEnvelope, "checksum">,
): string {
  return createHash("sha256")
    .update(stableSerialize(envelope), "utf8")
    .digest("hex");
}

function sanitizeFileName(fileName: string): string {
  return path.basename(fileName);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isValidDate(value: unknown): boolean {
  return (
    typeof value === "string" &&
    !Number.isNaN(Date.parse(value))
  );
}

function isValidEnvelopeShape(
  value: unknown,
): value is ResultEnvelope {
  if (!value || typeof value !== "object") {
    return false;
  }

  const envelope = value as Record<string, unknown>;

  if (envelope.envelope_version !== "1.0") return false;

  const requiredStrings = [
    "envelope_id",
    "idempotency_key",
    "action_id",
    "action_type",
    "project",
  ];

  for (const key of requiredStrings) {
    if (!isNonEmptyString(envelope[key])) {
      return false;
    }
  }

  if (
    envelope.action_type !== "seo.read.gsc" &&
    envelope.action_type !== "seo.read.ga4" &&
    envelope.action_type !== "seo.read.upgradeseo" &&
      envelope.action_type !== "seo.read.backlinks" &&
      envelope.action_type !== "seo.read.geolint" &&
      envelope.action_type !== "seo.read.trends"
  ) {
    return false;
  }

  if (!isValidDate(envelope.collected_at)) {
    return false;
  }

  if (!envelope.producer || typeof envelope.producer !== "object") {
    return false;
  }

  const producer = envelope.producer as Record<string, unknown>;

  if (
    !isNonEmptyString(producer.system) ||
    !isNonEmptyString(producer.run_id)
  ) {
    return false;
  }

  if (
    !envelope.data_period ||
    typeof envelope.data_period !== "object"
  ) {
    return false;
  }

  const dataPeriod = envelope.data_period as Record<
    string,
    unknown
  >;

  if (
    !isNonEmptyString(dataPeriod.from) ||
    !isNonEmptyString(dataPeriod.to)
  ) {
    return false;
  }

  if (
    envelope.status !== "ok" &&
    envelope.status !== "partial" &&
    envelope.status !== "blocked" &&
    envelope.status !== "error"
  ) {
    return false;
  }

  if (
    !envelope.source_status ||
    typeof envelope.source_status !== "object" ||
    Array.isArray(envelope.source_status)
  ) {
    return false;
  }

  if (envelope.read_only !== true) {
    return false;
  }

  if (
    !envelope.payload ||
    typeof envelope.payload !== "object" ||
    Array.isArray(envelope.payload)
  ) {
    return false;
  }

  if (!Array.isArray(envelope.limitations)) {
    return false;
  }

  if (!isNonEmptyString(envelope.checksum)) {
    return false;
  }

  return /^sha256:[a-f0-9]{64}$/.test(
    envelope.checksum,
  );
}

function validateChecksum(
  envelope: ResultEnvelope,
): boolean {
  const { checksum, ...withoutChecksum } = envelope;

  const expected =
    `sha256:${checksumPayload(withoutChecksum)}`;

  return checksum === expected;
}

function toControlAction(
  envelope: ResultEnvelope,
): ControlAction {
  return {
    id: envelope.action_id,
    moduleId: "seo",
    type: envelope.action_type,
    input: {
      envelope_id: envelope.envelope_id,
      idempotency_key: envelope.idempotency_key,
      project: envelope.project,
    },
    requestedBy: envelope.producer.system,
  };
}

async function readStore(): Promise<StoredEnvelope[]> {
  try {
    const raw = await fs.readFile(STORE_FILE, "utf8");
    const parsed = JSON.parse(raw);

    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function writeStore(
  records: StoredEnvelope[],
): Promise<void> {
  await fs.mkdir(STORE_DIR, { recursive: true });

  await fs.writeFile(
    STORE_FILE,
    JSON.stringify(records, null, 2),
    "utf8",
  );
}

async function storeEnvelope(
  envelope: ResultEnvelope,
): Promise<void> {
  const records = await readStore();

  if (
    records.some(
      (record) =>
        record.idempotency_key ===
        envelope.idempotency_key,
    )
  ) {
    return;
  }

  records.push({
    envelope_id: envelope.envelope_id,
    idempotency_key: envelope.idempotency_key,
    action_id: envelope.action_id,
    action_type: envelope.action_type,
    project: envelope.project,
    collected_at: envelope.collected_at,
    stored_at: new Date().toISOString(),
    envelope,
  });

  await writeStore(records);
}

async function moveFile(
  filePath: string,
  destinationDir: string,
): Promise<void> {
  await fs.mkdir(destinationDir, { recursive: true });

  const fileName = sanitizeFileName(
    path.basename(filePath),
  );

  await fs.rename(
    filePath,
    path.join(destinationDir, fileName),
  );
}

function makeResult(
  actionId: string,
  status: ControlResult["status"],
  message: string,
  data?: Record<string, unknown>,
): ControlResult {
  return {
    actionId,
    status,
    message,
    executedAt: new Date().toISOString(),
    data,
  };
}

async function audit(
  action: ControlAction,
  event: AuditEventType,
  result: ControlResult,
): Promise<void> {
  await appendAuditEvent(action, event, result);
}

async function processFile(
  filePath: string,
): Promise<ControlResult> {
  const fileName = sanitizeFileName(
    path.basename(filePath),
  );

  let raw: string;

  try {
    raw = await fs.readFile(filePath, "utf8");
  } catch {
    const result = makeResult(
      fileName,
      "failed",
      "Unable to read inbox file.",
    );

    return result;
  }

  let parsed: unknown;

  try {
    parsed = JSON.parse(raw);
  } catch {
    const result = makeResult(
      fileName,
      "blocked",
      "Envelope rejected: invalid JSON.",
      {
        reason: "INVALID_JSON",
        file: fileName,
      },
    );

    const action: ControlAction = {
      id: `ingest-${fileName}`,
      moduleId: "seo",
      type: "seo.read.gsc",
      requestedBy: "ingest",
    };

    await audit(action, "blocked", result);
    await moveFile(filePath, REJECTED_DIR);

    return result;
  }

  if (!isValidEnvelopeShape(parsed)) {
    const result = makeResult(
      fileName,
      "blocked",
      "Envelope rejected: schema validation failed.",
      {
        reason: "SCHEMA_VALIDATION_FAILED",
        file: fileName,
      },
    );

    const action: ControlAction = {
      id: `ingest-${fileName}`,
      moduleId: "seo",
      type: "seo.read.gsc",
      requestedBy: "ingest",
    };

    await audit(action, "blocked", result);
    await moveFile(filePath, REJECTED_DIR);

    return result;
  }

  const envelope = parsed;

  if (!validateChecksum(envelope)) {
    const action = toControlAction(envelope);

    const result = makeResult(
      action.id,
      "blocked",
      "Envelope rejected: checksum validation failed.",
      {
        reason: "CHECKSUM_INVALID",
        envelope_id: envelope.envelope_id,
      },
    );

    await audit(action, "blocked", result);
    await moveFile(filePath, REJECTED_DIR);

    return result;
  }

  const action = toControlAction(envelope);

  const definition = getActionDefinition(
    action.type,
  );

  if (!definition) {
    const result = makeResult(
      action.id,
      "blocked",
      "Envelope rejected: action type is not registered.",
      {
        reason: "UNKNOWN_ACTION_TYPE",
      },
    );

    await audit(action, "blocked", result);
    await moveFile(filePath, REJECTED_DIR);

    return result;
  }

  const policy = evaluateActionPolicy(
    action.moduleId,
    action.type,
  );

  if (!policy.allowed) {
    const result = makeResult(
      action.id,
      "blocked",
      policy.message,
      {
        reason: policy.reason,
      },
    );

    await audit(action, "blocked", result);
    await moveFile(filePath, REJECTED_DIR);

    return result;
  }

  const fingerprint = createHash("sha256")
    .update(
      stableSerialize({
        id: action.id,
        moduleId: action.moduleId,
        type: action.type,
        input: action.input ?? null,
        requestedBy: action.requestedBy ?? null,
      }),
      "utf8",
    )
    .digest("hex");

  const idempotency = await getIdempotencyRecord(
    action,
  );

  if (idempotency.kind === "replay") {
    await audit(
      action,
      "replayed",
      idempotency.result,
    );

    await moveFile(filePath, PROCESSED_DIR);

    return idempotency.result;
  }

  if (idempotency.kind === "conflict") {
    await audit(
      action,
      "conflict",
      idempotency.result,
    );

    await moveFile(filePath, REJECTED_DIR);

    return idempotency.result;
  }

  const existing = await readStore();

  const duplicate = existing.find(
    (record) =>
      record.idempotency_key ===
      envelope.idempotency_key,
  );

  if (duplicate) {
    const result = makeResult(
      action.id,
      "accepted",
      "Envelope duplicate detected. No duplicate store write performed.",
      {
        reason: "DUPLICATE",
        envelope_id: envelope.envelope_id,
        idempotency_key: envelope.idempotency_key,
      },
    );

    await saveIdempotencyRecord(
      action,
      fingerprint,
      result,
    );

    await audit(action, "duplicate", result);
    await moveFile(filePath, PROCESSED_DIR);

    return result;
  }

  await storeEnvelope(envelope);

  const result = makeResult(
    action.id,
    "accepted",
    "Envelope accepted and stored successfully.",
    {
      envelope_id: envelope.envelope_id,
      idempotency_key: envelope.idempotency_key,
      action_type: envelope.action_type,
      project: envelope.project,
    },
  );

  await saveIdempotencyRecord(
    action,
    fingerprint,
    result,
  );

  await audit(action, "accepted", result);
  await moveFile(filePath, PROCESSED_DIR);

  return result;
}

export async function ingestInbox(): Promise<
  ControlResult[]
> {
  await fs.mkdir(INBOX_DIR, { recursive: true });
  await fs.mkdir(PROCESSED_DIR, { recursive: true });
  await fs.mkdir(REJECTED_DIR, { recursive: true });

  const entries = await fs.readdir(INBOX_DIR, {
    withFileTypes: true,
  });

  const files = entries
    .filter(
      (entry) =>
        entry.isFile() &&
        entry.name.toLowerCase().endsWith(".json"),
    )
    .map((entry) =>
      path.join(INBOX_DIR, entry.name),
    )
    .sort();

  const results: ControlResult[] = [];

  for (const filePath of files) {
    results.push(await processFile(filePath));
  }

  return results;
}

async function main(): Promise<void> {
  const results = await ingestInbox();

  if (results.length === 0) {
    console.log("No JSON envelopes found in inbox/.");
    return;
  }

  for (const result of results) {
    console.log(
      JSON.stringify(result, null, 2),
    );
  }
}

if (process.argv[1]?.includes("ingest")) {
  main().catch((error) => {
    console.error(
      "Ingest failed:",
      error instanceof Error
        ? error.message
        : "Unknown error",
    );

    process.exitCode = 1;
  });
}


