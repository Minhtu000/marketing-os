export type ModuleId = "seo" | "gtm" | "content" | "analytics";
export type ModuleStatus = "available" | "planned";
export type ConnectionStatus = "connected" | "not_connected";
export type DataSource = "demo" | "live" | "none";
export interface ModuleInfo {
  id: ModuleId;
  name: string;
  status: ModuleStatus;
  connection: ConnectionStatus;
  description: string;
  route?: string;
  detailRoute?: string;
}
export interface ModuleHealth {
  moduleId: ModuleId;
  name: string;
  status: ModuleStatus;
  connection: ConnectionStatus;
  dataSource: DataSource;
}
export type KpiFormat = "number" | "percent" | "currency";
export interface Kpi {
  id: string;
  label: string;
  value: number;
  format: KpiFormat;
  changePercent: number;
}
export type IssueSeverity = "critical" | "high" | "medium" | "low";
export type IssueStatus = "open" | "in_progress" | "resolved";
export interface Issue {
  id: string;
  severity: IssueSeverity;
  title: string;
  moduleId: ModuleId;
  status: IssueStatus;
}
export type PriorityLevel = "high" | "medium" | "low";
export type PriorityStatus = "todo" | "in_progress" | "done";
export interface Priority {
  id: string;
  title: string;
  moduleId: ModuleId;
  priority: PriorityLevel;
  status: PriorityStatus;
}
export type ActivityStatus = "success" | "info" | "warning" | "error";
export interface ActivityEvent {
  id: string;
  timestamp: string;
  moduleId: ModuleId;
  event: string;
  status: ActivityStatus;
}
export type SeoExportStatus = "live" | "stale" | "partial" | "invalid" | "unavailable";

export interface DashboardSnapshot {
  providerName: string;
  lastUpdated: string;
  seoExportStatus: SeoExportStatus;
  health: ModuleHealth[];
  kpis: Kpi[];
  issues: Issue[];
  priorities: Priority[];
  activity: ActivityEvent[];
}
export type Metric = Kpi & { moduleId?: ModuleId };
export type Signal = Issue;
export type Task = Priority;
export type Action = ActivityEvent;
export type ReportStatus = "draft" | "ready" | "archived";
export interface Report {
  id: string;
  title: string;
  moduleId?: ModuleId;
  status: ReportStatus;
  createdAt: string;
}
