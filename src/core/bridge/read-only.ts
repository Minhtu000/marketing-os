import { promises as fs } from "node:fs";
import path from "node:path";
import type {
  ControlAction,
  ControlResult,
} from "@/core/data/provider";
export type ReadOnlySource = "gsc" | "ga4" | "upgradeseo" | "backlinks" | "geolint" | "trends";
export interface ReadOnlyRequest {
  action: ControlAction;
  source: ReadOnlySource;
}
export interface ReadOnlyBridge {
  readonly name: string;
  isConnected(source: ReadOnlySource): Promise<boolean>;
  execute(request: ReadOnlyRequest): Promise<ControlResult>;
}
interface StoredEnvelope {
  envelope_id: string;
  idempotency_key: string;
  action_id: string;
  action_type: string;
  project: string;
  collected_at: string;
  stored_at?: string;
  envelope: {
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
  };
}
const ENVELOPE_STORE = path.join(
  process.cwd(),
  "data",
  "control-plane",
  "envelopes.json",
);
async function readStoredEnvelopes(): Promise<StoredEnvelope[]> {
  try {
    const raw = await fs.readFile(ENVELOPE_STORE, "utf8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed)
      ? (parsed as StoredEnvelope[])
      : [];
  } catch {
    return [];
  }
}
function sourceMatches(
  envelope: StoredEnvelope,
  source: ReadOnlySource,
): boolean {
  return envelope.action_type === `seo.read.${source}`;
}
function isValidEnvelope(
  envelope: StoredEnvelope,
): boolean {
  return (
    envelope.envelope?.read_only === true &&
    (envelope.envelope?.status === "ok" ||
      envelope.envelope?.status === "partial") &&
    typeof envelope.envelope?.payload === "object" &&
    envelope.envelope?.payload !== null
  );
}
export const readOnlyBridge: ReadOnlyBridge = {
  name: "Marketing OS Read-only Bridge",
  async isConnected(source) {
    const envelopes = await readStoredEnvelopes();
    return envelopes.some(
      (envelope) =>
        sourceMatches(envelope, source) &&
        isValidEnvelope(envelope),
    );
  },
  async execute({ action, source }) {
    const envelopes = await readStoredEnvelopes();
    const matching = envelopes
      .filter(
        (envelope) =>
          sourceMatches(envelope, source) &&
          isValidEnvelope(envelope),
      )
      .sort((a, b) => {
        const collectedDiff =
          new Date(b.collected_at).getTime() -
          new Date(a.collected_at).getTime();
        if (collectedDiff !== 0) {
          return collectedDiff;
        }
        return (
          new Date(b.stored_at ?? b.collected_at).getTime() -
          new Date(a.stored_at ?? a.collected_at).getTime()
        );
      });
    if (matching.length === 0) {
      return {
        actionId: action.id,
        status: "blocked",
        message:
          `Read-only source "${source}" has no valid envelope available. ` +
          "No external action was executed.",
        executedAt: new Date().toISOString(),
        data: {
          source,
          reason: "NO_ENVELOPE_AVAILABLE",
        },
      };
    }
    const stored = matching[0];
    const envelope = stored.envelope;
    return {
      actionId: action.id,
      status: "completed",
      message:
        `Read-only source "${source}" data loaded from the latest valid envelope.`,
      executedAt: new Date().toISOString(),
      data: {
        source,
        envelope_id: envelope.envelope_id,
        source_action_id: envelope.action_id,
        project: envelope.project,
        collected_at: envelope.collected_at,
        data_period: envelope.data_period,
        source_status: envelope.source_status,
        payload: envelope.payload,
        limitations: envelope.limitations,
      },
    };
  },
};


