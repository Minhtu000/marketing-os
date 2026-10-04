import type { DashboardSnapshot, SeoExportStatus } from "../models/types";
import type { DataProvider } from "./provider";
import { demoProvider } from "../../providers/demo/demoProvider";
import { seoExportProvider } from "../../providers/seoExport/provider";

const provider: DataProvider = {
  name: "SEO OS Export + Demo Data",

  async getLastUpdated() {
    const [seoUpdated, demoUpdated] = await Promise.all([
      seoExportProvider.getLastUpdated(),
      demoProvider.getLastUpdated(),
    ]);

    return new Date(
      Math.max(
        new Date(seoUpdated).getTime(),
        new Date(demoUpdated).getTime(),
      ),
    ).toISOString();
  },

  async getSystemHealth() {
    const [seoHealth, demoHealth] = await Promise.all([
      seoExportProvider.getSystemHealth(),
      demoProvider.getSystemHealth(),
    ]);

    return [
      ...seoHealth,
      ...demoHealth.filter((item) => item.moduleId !== "seo"),
    ];
  },

  async getKpis() {
    return seoExportProvider.getKpis();
  },

  async getIssues() {
    const [seoIssues, demoIssues] = await Promise.all([
      seoExportProvider.getIssues(),
      demoProvider.getIssues(),
    ]);

    return [
      ...seoIssues,
      ...demoIssues.filter((item) => item.moduleId !== "seo"),
    ];
  },

  async getPriorities() {
    const [seoPriorities, demoPriorities] = await Promise.all([
      seoExportProvider.getPriorities(),
      demoProvider.getPriorities(),
    ]);

    return [
      ...seoPriorities,
      ...demoPriorities.filter((item) => item.moduleId !== "seo"),
    ];
  },

  async getActivity() {
    const [seoActivity, demoActivity] = await Promise.all([
      seoExportProvider.getActivity(),
      demoProvider.getActivity(),
    ]);

    return [
      ...seoActivity,
      ...demoActivity.filter((item) => item.moduleId !== "seo"),
    ];
  },
};

export async function getDashboardSnapshot(): Promise<DashboardSnapshot> {
  const seoExportStatus: SeoExportStatus = await seoExportProvider.getExportStatus() as SeoExportStatus;
  const [lastUpdated, health, kpis, issues, priorities, activity] =
    await Promise.all([
      provider.getLastUpdated(),
      provider.getSystemHealth(),
      provider.getKpis(),
      provider.getIssues(),
      provider.getPriorities(),
      provider.getActivity(),
    ]);

  return {
    providerName: provider.name,
    seoExportStatus,
    lastUpdated,
    health,
    kpis,
    issues,
    priorities,
    activity,
  };
}
