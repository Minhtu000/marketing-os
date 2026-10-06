import type { DataProvider } from "../../core/data/provider";
import type {
  ActivityEvent,
  Issue,
  Kpi,
  ModuleHealth,
  Priority,
} from "../../core/models/types";
import { MODULES } from "../../core/registry/modules";
function minutesAgo(minutes: number): string {
  return new Date(Date.now() - minutes * 60_000).toISOString();
}
export const demoProvider: DataProvider = {
  name: "Demo Data",
  async getLastUpdated() {
    return minutesAgo(2);
  },
  async getSystemHealth(): Promise<ModuleHealth[]> {
    return MODULES.map((m) => ({
      moduleId: m.id,
      name: m.name,
      status: m.status,
      connection: m.connection,
      dataSource: m.id === "seo" ? "demo" : "none",
    }));
  },
  async getKpis(): Promise<Kpi[]> {
    return [
      { id: "organic-traffic", label: "Organic Traffic", value: 48200, format: "number", changePercent: 8.4 },
      { id: "leads", label: "Leads", value: 312, format: "number", changePercent: 5.1 },
      { id: "conversion-rate", label: "Conversion Rate", value: 3.2, format: "percent", changePercent: -0.6 },
      { id: "content-output", label: "Content Output", value: 18, format: "number", changePercent: 12.5 },
      { id: "marketing-spend", label: "Marketing Spend", value: 24500, format: "currency", changePercent: 3.0 },
      { id: "pipeline", label: "Pipeline", value: 186000, format: "currency", changePercent: 9.7 },
    ];
  },
  async getIssues(): Promise<Issue[]> {
    return [
      { id: "iss-1", severity: "high", title: "Nhieu trang giam thu hang tu khoa chinh", moduleId: "seo", status: "open" },
      { id: "iss-2", severity: "medium", title: "Mot so trang bi loi index", moduleId: "seo", status: "in_progress" },
      { id: "iss-3", severity: "low", title: "Chua ket noi nguon du lieu that", moduleId: "analytics", status: "open" },
    ];
  },
  async getPriorities(): Promise<Priority[]> {
    return [
      { id: "pri-1", title: "Xem lai cac trang giam thu hang", moduleId: "seo", priority: "high", status: "todo" },
      { id: "pri-2", title: "Len ke hoach noi dung tuan nay", moduleId: "content", priority: "medium", status: "in_progress" },
      { id: "pri-3", title: "Ra soat tracking truoc chien dich moi", moduleId: "gtm", priority: "medium", status: "todo" },
    ];
  },
  async getActivity(): Promise<ActivityEvent[]> {
    return [
      { id: "evt-1", timestamp: minutesAgo(5), moduleId: "seo", event: "Hoan tat quet SEO dinh ky", status: "success" },
      { id: "evt-2", timestamp: minutesAgo(42), moduleId: "seo", event: "Phat hien trang giam thu hang", status: "warning" },
      { id: "evt-3", timestamp: minutesAgo(130), moduleId: "analytics", event: "Chua co ket noi du lieu", status: "info" },
      { id: "evt-4", timestamp: minutesAgo(300), moduleId: "content", event: "Cap nhat lich noi dung", status: "success" },
    ];
  },  async execute(action) {
    return {
      actionId: action.id,
      status: "blocked",
      message:
        "Execution bridge is not connected yet. No external action was executed.",
      executedAt: new Date().toISOString(),
    };
  },
};
