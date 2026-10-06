export const HANDOFF_VERSION = "1.0";
export type HandoffSource = "claude_seo_os";
export type HandoffKind =
  | "result"
  | "finding"
  | "recommendation"
  | "action_request";
export interface HandoffEnvelope {
  handoffId: string;
  version: typeof HANDOFF_VERSION;
  source: HandoffSource;
  moduleId: "seo";
  kind: HandoffKind;
  createdAt: string;
  actionId?: string;
  title: string;
  summary: string;
  payload: Record<string, unknown>;
  readOnly: true;
  metadata?: Record<string, unknown>;
}
const VALID_HANDOFF_KINDS: HandoffKind[] = [
  "result",
  "finding",
  "recommendation",
  "action_request",
];
export function isHandoffEnvelope(
  value: unknown,
): value is HandoffEnvelope {
  if (!value || typeof value !== "object") {
    return false;
  }
  const envelope = value as Record<string, unknown>;
  return (
    typeof envelope.handoffId === "string" &&
    envelope.handoffId.length > 0 &&
    envelope.version === HANDOFF_VERSION &&
    envelope.source === "claude_seo_os" &&
    envelope.moduleId === "seo" &&
    typeof envelope.kind === "string" &&
    VALID_HANDOFF_KINDS.includes(envelope.kind as HandoffKind) &&
    typeof envelope.createdAt === "string" &&
    typeof envelope.title === "string" &&
    envelope.title.length > 0 &&
    typeof envelope.summary === "string" &&
    envelope.summary.length > 0 &&
    typeof envelope.payload === "object" &&
    envelope.payload !== null &&
    !Array.isArray(envelope.payload) &&
    envelope.readOnly === true
  );
}
