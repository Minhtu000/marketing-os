const fs = require("fs");
const crypto = require("crypto");
function stableSerialize(value) {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map(stableSerialize).join(",")}]`;
  }
  return `{${Object.keys(value)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${stableSerialize(value[key])}`)
    .join(",")}}`;
}
const source = "processed/gsc-test-2026-10-05-001.json";
const target = "inbox/gsc-duplicate-key-2026-10-05-003.json";
const envelope = JSON.parse(fs.readFileSync(source, "utf8"));
envelope.action_id = "gsc-ingest-test-2026-10-05-003";
envelope.envelope_id = "env-test-2026-10-05-003";
delete envelope.checksum;
envelope.checksum =
  "sha256:" +
  crypto
    .createHash("sha256")
    .update(stableSerialize(envelope), "utf8")
    .digest("hex");
fs.writeFileSync(target, JSON.stringify(envelope, null, 2), "utf8");
console.log("action_id:", envelope.action_id);
console.log("idempotency_key:", envelope.idempotency_key);
console.log("envelope_id:", envelope.envelope_id);
console.log("Created:", target);
