import type {
  ActivityEvent,
  Issue,
  Kpi,
  ModuleHealth,
  Priority,
} from "../../core/models/types";
import type {
  ExportStatus,
  SeoExportFile,
  SeoExportResult,
} from "./contract";

function mapKpis(data: SeoExportFile): Kpi[] {
  if (data.sections.kpis.state !== "present") {
    return [];
  }

  return data.sections.kpis.items.map((item) => ({
    id: item.id,
    label: item.label,
    value: item.value,
    format: item.format,
    changePercent: item.changePercent,
  }));
}

function mapIssues(data: SeoExportFile): Issue[] {
  if (data.sections.signals.state !== "present") {
    return [];
  }

  return data.sections.signals.items.map((item) => ({
    id: item.id,
    severity: item.severity,
    title: item.title,
    moduleId: "seo",
    status: item.status,
  }));
}

function mapPriorities(data: SeoExportFile): Priority[] {
  if (data.sections.tasks.state !== "present") {
    return [];
  }

  return data.sections.tasks.items.map((item) => ({
    id: item.id,
    title: item.title,
    moduleId: "seo",
    priority: item.priority,
    status: item.status,
  }));
}

function mapActivity(data: SeoExportFile): ActivityEvent[] {
  if (data.sections.activity.state !== "present") {
    return [];
  }

  return data.sections.activity.items.map((item) => ({
    id: item.id,
    timestamp: item.timestamp,
    moduleId: "seo",
    event: item.event,
    status: item.status,
  }));
}

function mapHealth(
  data: SeoExportFile,
  status: ExportStatus,
): ModuleHealth {
  if (status === "unavailable" || status === "invalid") {
    return {
      moduleId: "seo",
      name: "SEO OS",
      status: "available",
      connection: "not_connected",
      dataSource: "none",
    };
  }
  return {
    moduleId: "seo",
    name: "SEO OS",
    status: "available",
    connection: "connected",
    dataSource: status === "live" ? "live" : "none",
  };
}
export function mapSeoExport(
  data: SeoExportFile,
  status: ExportStatus,
): SeoExportResult {
  return {
    status,
    exportedAt: data.exportedAt,
    dataAsOf: data.dataAsOf,
    kpis: mapKpis(data),
    issues: mapIssues(data),
    priorities: mapPriorities(data),
    activity: mapActivity(data),
    health: mapHealth(data, status),
  };
}

export function mapUnavailableSeoExport(): SeoExportResult {
  return {
    status: "unavailable",
    kpis: [],
    issues: [],
    priorities: [],
    activity: [],
    health: mapHealth({} as SeoExportFile, "unavailable"),
  };
}


