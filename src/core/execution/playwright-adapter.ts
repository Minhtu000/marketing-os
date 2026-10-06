import type { ControlAction, ControlResult } from "../data/provider";
import type {
  ExecutionAdapter,
  ProjectExecutionProfile,
} from "./types";
const PLAYWRIGHT_ACTIONS = new Set([
  "seo.write.metadata",
  "seo.write.content",
]);
function getProject(action: ControlAction): string | null {
  return typeof action.project === "string"
    ? action.project
    : null;
}
export const playwrightAdapter: ExecutionAdapter = {
  id: "playwright",
  canExecute(
    action: ControlAction,
    profile: ProjectExecutionProfile,
  ): boolean {
    if (!profile.enabled) return false;
    if (!PLAYWRIGHT_ACTIONS.has(action.type)) {
      return false;
    }
    if (!profile.allowedActions.includes(action.type)) {
      return false;
    }
    const project = getProject(action);
    return project === profile.domain || project === profile.projectId;
  },
  async execute(
    action: ControlAction,
    profile: ProjectExecutionProfile,
  ): Promise<ControlResult> {
    if (!this.canExecute(action, profile)) {
      return {
        actionId: action.id,
        status: "blocked",
        message:
          "Playwright adapter rejected the action because the project, action type, or execution profile is not permitted.",
        executedAt: new Date().toISOString(),
      };
    }
    return {
      actionId: action.id,
      status: "blocked",
      message:
        "Playwright adapter is configured but the external Playwright MCP execution bridge is not connected yet. No CMS action was executed.",
      executedAt: new Date().toISOString(),
    };
  },
};
