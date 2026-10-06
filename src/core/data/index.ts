import type {
  ControlAction,
  ControlResult,
  DataProvider,
} from "./provider";
import type {
  DashboardSnapshot,
  SeoExportStatus,
} from "../models/types";
import { demoProvider } from "../../providers/demo/demoProvider";
import { seoExportProvider } from "../../providers/seoExport/provider";
import { listHandoffs } from "@/core/handoff/inbox-store";
import { getProjectExecutionProfile } from "@/core/execution/project-profiles";
import { getExecutionAdapter } from "@/core/execution/adapter-registry";
import "@/core/execution/register-adapters";
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
  async execute(action: ControlAction): Promise<ControlResult> {
    if (action.moduleId === "seo") {
      if (
        action.type === "seo.read.gsc" ||
        action.type === "seo.read.ga4" ||
        action.type === "seo.read.upgradeseo" ||
        action.type === "seo.read.backlinks" ||
        action.type === "seo.read.geolint" ||
        action.type === "seo.read.trends"
      ) {
        const { readOnlyBridge } = await import(
          "@/core/bridge/read-only"
        );
        return readOnlyBridge.execute({
          action,
          source:
            action.type === "seo.read.gsc"
              ? "gsc"
              : action.type === "seo.read.ga4"
                ? "ga4"
                : action.type === "seo.read.upgradeseo"
                  ? "upgradeseo"
                  : action.type === "seo.read.backlinks"
                    ? "backlinks"
                    : action.type === "seo.read.geolint"
                      ? "geolint"
                      : "trends",
        });
      }
      if (
        action.type === "seo.write.metadata" ||
        action.type === "seo.write.content"
      ) {
        const input =
          action.input && typeof action.input === "object"
            ? action.input
            : {};
        const project =
          typeof action.project === "string"
            ? action.project
            : null;
        if (!project) {
          return {
            actionId: action.id,
            status: "blocked",
            message:
              "Execution requires a project identifier in action.input.project.",
            executedAt: new Date().toISOString(),
          };
        }
        const profile = getProjectExecutionProfile(project);
        if (!profile) {
          return {
            actionId: action.id,
            status: "blocked",
            message:
              `No execution profile is configured for project "${project}".`,
            executedAt: new Date().toISOString(),
          };
        }
        const adapter = getExecutionAdapter(profile.adapter);
        if (!adapter) {
          return {
            actionId: action.id,
            status: "blocked",
            message:
              `Execution adapter "${profile.adapter}" is not registered.`,
            executedAt: new Date().toISOString(),
          };
        }
        return adapter.execute(action, profile);
      }
      return {
        actionId: action.id,
        status: "blocked",
        message:
          `SEO action "${action.type}" has no execution adapter configured.`,
        executedAt: new Date().toISOString(),
      };
    }
    return {
      actionId: action.id,
      status: "blocked",
      message: `No execution provider is connected for module "${action.moduleId}".`,
      executedAt: new Date().toISOString(),
    };
  },
};
export async function getDashboardSnapshot(): Promise<DashboardSnapshot> {
  const seoExportStatus: SeoExportStatus =
    (await seoExportProvider.getExportStatus()) as SeoExportStatus;
  const [
    lastUpdated,
    health,
    kpis,
    issues,
    priorities,
    activity,
    handoffs,
  ] = await Promise.all([
    provider.getLastUpdated(),
    provider.getSystemHealth(),
    provider.getKpis(),
    provider.getIssues(),
    provider.getPriorities(),
    provider.getActivity(),
    listHandoffs(),
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
    handoffs,
  };
}
export async function executeControlAction(
  action: ControlAction,
): Promise<ControlResult> {
  return provider.execute(action);
}
