import type { ControlAction, ControlResult } from "../data/provider";
export type ExecutionAdapterId =
  | "playwright"
  | "wordpress_api"
  | "shopify_api"
  | "custom_cms";
export interface ProjectExecutionProfile {
  projectId: string;
  domain: string;
  adapter: ExecutionAdapterId;
  enabled: boolean;
  allowedActions: string[];
}
export interface ExecutionAdapter {
  id: ExecutionAdapterId;
  canExecute(
    action: ControlAction,
    profile: ProjectExecutionProfile,
  ): boolean;
  execute(
    action: ControlAction,
    profile: ProjectExecutionProfile,
  ): Promise<ControlResult>;
}
