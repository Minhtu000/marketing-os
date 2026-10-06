export const BRIDGE_VERSION = "1.0" as const;
export type BridgeResultStatus =
  | "completed"
  | "blocked"
  | "failed"
  | "skipped_already_applied";
export type BridgeResultCode =
  | "EXECUTED"
  | "BLOCKED"
  | "FAILED"
  | "ALREADY_APPLIED";
export interface BridgeEvidence {
  type: "screenshot" | "log";
  path: string;
}
export type BridgeAuditEventName =
  | "claimed"
  | "started"
  | "verified"
  | "completed"
  | "failed"
  | "blocked";
export interface BridgeAuditEvent {
  event: BridgeAuditEventName;
  at: string;
}
export interface BridgeResultEnvelope {
  version: typeof BRIDGE_VERSION;
  action_id: string;
  status: BridgeResultStatus;
  result_code: BridgeResultCode;
  message: string;
  payload_hash: string;
  started_at?: string;
  completed_at: string;
  evidence: BridgeEvidence[];
  audit_events: BridgeAuditEvent[];
}
function isIsoUtc(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(value)
  );
}
const STATUS_TO_CODE: Record<BridgeResultStatus, BridgeResultCode> = {
  completed: "EXECUTED",
  blocked: "BLOCKED",
  failed: "FAILED",
  skipped_already_applied: "ALREADY_APPLIED",
};
export function isBridgeResultEnvelope(
  value: unknown,
): value is BridgeResultEnvelope {
  if (!value || typeof value !== "object") return false;
  const result = value as Record<string, unknown>;
  const status = result.status;
  if (
    status !== "completed" &&
    status !== "blocked" &&
    status !== "failed" &&
    status !== "skipped_already_applied"
  ) {
    return false;
  }
  if (result.result_code !== STATUS_TO_CODE[status]) {
    return false;
  }
  if (!Array.isArray(result.evidence)) {
    return false;
  }
  if (!Array.isArray(result.audit_events)) {
    return false;
  }
  return (
    result.version === BRIDGE_VERSION &&
    typeof result.action_id === "string" &&
    result.action_id.length > 0 &&
    typeof result.message === "string" &&
    result.message.length > 0 &&
    typeof result.payload_hash === "string" &&
    /^[a-f0-9]{64}$/.test(result.payload_hash) &&
    typeof result.completed_at === "string" &&
    isIsoUtc(result.completed_at) &&
    result.evidence.every((item) => {
      if (!item || typeof item !== "object") return false;
      const evidence = item as Record<string, unknown>;
      return (
        (evidence.type === "screenshot" || evidence.type === "log") &&
        typeof evidence.path === "string" &&
        evidence.path.length > 0
      );
    }) &&
    result.audit_events.every((item) => {
      if (!item || typeof item !== "object") return false;
      const event = item as Record<string, unknown>;
      return (
        typeof event.event === "string" &&
        [
          "claimed",
          "started",
          "verified",
          "completed",
          "failed",
          "blocked",
        ].includes(event.event) &&
        typeof event.at === "string" &&
        isIsoUtc(event.at)
      );
    })
  );
}
