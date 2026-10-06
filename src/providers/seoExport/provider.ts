import { readFile } from "node:fs/promises";
import path from "node:path";
import type { DataProvider } from "../../core/data/provider";
import type {
  ActivityEvent,
  Issue,
  Kpi,
  ModuleHealth,
  Priority,
} from "../../core/models/types";
import { mapSeoExport, mapUnavailableSeoExport } from "./mapper";
import type { SeoExportFile } from "./contract";
import { validateSeoExport } from "./status";

const EXPORT_PATH = path.join(
  process.cwd(),
  "data",
  "seo-os",
  "seo-os-export.json",
);

async function readExport(): Promise<ReturnType<typeof mapUnavailableSeoExport>> {
  try {
    const raw = await readFile(EXPORT_PATH, "utf8");
    const parsed = JSON.parse(raw) as SeoExportFile;
    const validation = validateSeoExport(parsed);

    if (!validation.data) {
      return mapUnavailableSeoExport();
    }

    return mapSeoExport(validation.data, validation.status);
  } catch {
    return mapUnavailableSeoExport();
  }
}

export const seoExportProvider: DataProvider & {
  getExportStatus(): Promise<string>;
} = {
  name: "SEO OS Export",

  async getLastUpdated() {
    const result = await readExport();
    return result.dataAsOf ?? result.exportedAt ?? new Date(0).toISOString();
  },

  async getSystemHealth(): Promise<ModuleHealth[]> {
    const result = await readExport();
    return [result.health];
  },

  async getKpis(): Promise<Kpi[]> {
    const result = await readExport();
    return result.kpis;
  },

  async getIssues(): Promise<Issue[]> {
    const result = await readExport();
    return result.issues;
  },

  async getPriorities(): Promise<Priority[]> {
    const result = await readExport();
    return result.priorities;
  },

  async getActivity(): Promise<ActivityEvent[]> {
    const result = await readExport();
    return result.activity;
  },

  async getExportStatus() {
    const result = await readExport();
    return result.status;
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
