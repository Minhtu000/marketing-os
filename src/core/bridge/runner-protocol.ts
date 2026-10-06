import type {
  BridgeActionEnvelope,
  BridgeActionType,
} from "./action-envelope";
export const RUNNER_PROTOCOL_VERSION = "1.0" as const;
export type RunnerStep =
  | "claim"
  | "validate"
  | "precheck"
  | "navigate"
  | "snapshot_before"
  | "assert_before"
  | "apply"
  | "save"
  | "snapshot_after"
  | "verify"
  | "write_result";
export interface RunnerProtocol {
  version: typeof RUNNER_PROTOCOL_VERSION;
  action_types: BridgeActionType[];
  adapter: "playwright";
  steps: RunnerStep[];
  fail_closed: true;
  require_approval: true;
  require_payload_hash: true;
  require_utc_timestamps: true;
  never_handle_credentials: true;
}
export const SEO_PLAYWRIGHT_RUNNER_PROTOCOL: RunnerProtocol = {
  version: RUNNER_PROTOCOL_VERSION,
  action_types: [
    "seo.write.metadata",
    "seo.write.content",
  ],
  adapter: "playwright",
  steps: [
    "claim",
    "validate",
    "precheck",
    "navigate",
    "snapshot_before",
    "assert_before",
    "apply",
    "save",
    "snapshot_after",
    "verify",
    "write_result",
  ],
  fail_closed: true,
  require_approval: true,
  require_payload_hash: true,
  require_utc_timestamps: true,
  never_handle_credentials: true,
};
export function isRunnerProtocolCompatible(
  action: BridgeActionEnvelope,
): boolean {
  return (
    action.version === RUNNER_PROTOCOL_VERSION &&
    action.adapter === SEO_PLAYWRIGHT_RUNNER_PROTOCOL.adapter &&
    SEO_PLAYWRIGHT_RUNNER_PROTOCOL.action_types.includes(action.action_type) &&
    action.approval.approval_id.length > 0 &&
    /^[a-f0-9]{64}$/.test(action.payload_hash)
  );
}
