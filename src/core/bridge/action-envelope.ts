export const BRIDGE_VERSION = "1.0" as const;
export type BridgeActionType =
  | "seo.write.metadata"
  | "seo.write.content";
export interface BridgeApproval {
  approval_id: string;
  approved_by: string;
  approved_at: string;
}
export interface BridgeActionEnvelope {
  version: typeof BRIDGE_VERSION;
  action_id: string;
  action_type: BridgeActionType;
  project: string;
  adapter: "playwright";
  approval: BridgeApproval;
  created_at: string;
  expires_at: string;
  payload_hash: string;
  input: Record<string, unknown>;
}
function isIsoUtc(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(value)
  );
}
const VALID_ACTION_TYPES: BridgeActionType[] = [
  "seo.write.metadata",
  "seo.write.content",
];
export function isBridgeActionEnvelope(
  value: unknown,
): value is BridgeActionEnvelope {
  if (!value || typeof value !== "object") return false;
  const envelope = value as Record<string, unknown>;
  const approval = envelope.approval;
  if (!approval || typeof approval !== "object") return false;
  const approvalRecord = approval as Record<string, unknown>;
  return (
    envelope.version === BRIDGE_VERSION &&
    typeof envelope.action_id === "string" &&
    envelope.action_id.length > 0 &&
    typeof envelope.action_type === "string" &&
    VALID_ACTION_TYPES.includes(envelope.action_type as BridgeActionType) &&
    typeof envelope.project === "string" &&
    envelope.project.length > 0 &&
    envelope.adapter === "playwright" &&
    typeof envelope.created_at === "string" &&
    isIsoUtc(envelope.created_at) &&
    typeof envelope.expires_at === "string" &&
    isIsoUtc(envelope.expires_at) &&
    typeof envelope.payload_hash === "string" &&
    /^[a-f0-9]{64}$/.test(envelope.payload_hash) &&
    typeof approvalRecord.approval_id === "string" &&
    approvalRecord.approval_id.length > 0 &&
    typeof approvalRecord.approved_by === "string" &&
    approvalRecord.approved_by.length > 0 &&
    typeof approvalRecord.approved_at === "string" &&
    isIsoUtc(approvalRecord.approved_at) &&
    typeof envelope.input === "object" &&
    envelope.input !== null &&
    !Array.isArray(envelope.input)
  );
}
