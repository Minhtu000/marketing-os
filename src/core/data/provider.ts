import type {
  ActivityEvent,
  Issue,
  Kpi,
  ModuleHealth,
  Priority,
} from "../models/types";
export interface DataProvider {
  readonly name: string;
  getLastUpdated(): Promise<string>;
  getSystemHealth(): Promise<ModuleHealth[]>;
  getKpis(): Promise<Kpi[]>;
  getIssues(): Promise<Issue[]>;
  getPriorities(): Promise<Priority[]>;
  getActivity(): Promise<ActivityEvent[]>;
  execute(action: ControlAction): Promise<ControlResult>;
}
export interface ControlAction {
  id: string;
  moduleId: string;
  type: string;
  project?: string;
  input?: Record<string, unknown>;
  requestedBy?: string;
}
export interface ControlResult {
  actionId: string;
  status: "accepted" | "completed" | "failed" | "blocked";
  message: string;
  executedAt: string;
  data?: Record<string, unknown>;
}
