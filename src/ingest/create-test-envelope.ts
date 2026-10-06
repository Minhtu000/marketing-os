import { createHash } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
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
async function main(): Promise<void> {
  const envelopeWithoutChecksum = {
    envelope_version: "1.0",
    envelope_id: "env-test-2026-10-05-002",
    idempotency_key: "gsc-ingest-test-2026-10-05-002",
    action_id: "gsc-ingest-test-2026-10-05-002",
    action_type: "seo.read.gsc",
    project: "noithatvuonganh",
    producer: {
      system: "claude-free",
      run_id: "run-test-2026-10-05-001",
    },
    collected_at: new Date().toISOString(),
    data_period: {
      from: "2026-09-01",
      to: "2026-10-05",
    },
    status: "ok",
    source_status: {
      gsc: "connected",
    },
    read_only: true,
    payload: {
      test: true,
      clicks: 306,
      impressions: 10055,
    },
    limitations: [],
  };
  const checksum =
    "sha256:" +
    createHash("sha256")
      .update(stableSerialize(envelopeWithoutChecksum), "utf8")
      .digest("hex");
  const envelope = {
    ...envelopeWithoutChecksum,
    checksum,
  };
  const filePath = path.join(
    process.cwd(),
    "inbox",
    "gsc-test-2026-10-05-001.json",
  );
  await fs.writeFile(
    filePath,
    JSON.stringify(envelope, null, 2),
    "utf8",
  );
  console.log(`Created: ${filePath}`);
  console.log(`Checksum: ${checksum}`);
}
main().catch((error) => {
  console.error(
    "Failed:",
    error instanceof Error ? error.message : "Unknown error",
  );
  process.exitCode = 1;
});

