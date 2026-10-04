import type {
  ActivityEvent,
  Issue,
  Kpi,
  ModuleHealth,
  Priority,
} from "../../core/models/types";

export type SectionState = "present" | "empty" | "not_available";
export type ExportStatus =
  | "live"
  | "stale"
  | "partial"
  | "invalid"
  | "unavailable";

export interface SeoExportSource {
  ref: string;
  nativeState?: string;
  report?: string;
}

export interface SeoExportKpi extends Kpi {
  source?: SeoExportSource;
}

export interface SeoExportSignal {
  id: string;
  severity: "critical" | "high" | "medium" | "low";
  title: string;
  status: "open" | "in_progress" | "resolved";
  source?: SeoExportSource;
}

export interface SeoExportTask {
  id: string;
  title: string;
  priority: "high" | "medium" | "low";
  status: "todo" | "in_progress" | "done";
  source?: SeoExportSource;
}

export interface SeoExportActivity {
  id: string;
  timestamp: string;
  event: string;
  status: "success" | "info" | "warning" | "error";
  source?: SeoExportSource;
}

export interface SeoExportSection<T> {
  state: SectionState;
  items: T[];
}

export interface SeoExportFile {
  schemaVersion: string;
  exportedAt: string;
  dataAsOf?: string;
  producer: {
    name: string;
    kind: string;
    reportRefs: string[];
  };
  module: {
    id: "seo";
    name: string;
    status: "available";
    connection: "connected" | "not_connected";
    dataSource: "live";
  };
  scope: {
    domain: string;
    periodStart: string;
    periodEnd: string;
  };
  sections: {
    kpis: SeoExportSection<SeoExportKpi>;
    signals: SeoExportSection<SeoExportSignal>;
    tasks: SeoExportSection<SeoExportTask>;
    activity: SeoExportSection<SeoExportActivity>;
  };
  unmapped: unknown[];
}

export interface SeoExportResult {
  status: ExportStatus;
  exportedAt?: string;
  dataAsOf?: string;
  kpis: Kpi[];
  issues: Issue[];
  priorities: Priority[];
  activity: ActivityEvent[];
  health: ModuleHealth;
}
