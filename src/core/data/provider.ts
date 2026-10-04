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
}
