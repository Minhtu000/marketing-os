import {
  getActionDefinition,
  type ActionDefinition,
} from "./action-registry";

export type PolicyDecision =
  | {
      allowed: true;
      definition: ActionDefinition;
    }
  | {
      allowed: false;
      reason:
        | "UNKNOWN_ACTION_TYPE"
        | "MODULE_MISMATCH"
        | "HUMAN_ONLY"
        | "WRITE_REQUIRES_APPROVAL";
      message: string;
    };

export function evaluateActionPolicy(
  moduleId: string,
  type: string,
): PolicyDecision {
  const definition = getActionDefinition(type);

  if (!definition) {
    return {
      allowed: false,
      reason: "UNKNOWN_ACTION_TYPE",
      message: `Action type "${type}" is not registered.`,
    };
  }

  if (definition.moduleId !== moduleId) {
    return {
      allowed: false,
      reason: "MODULE_MISMATCH",
      message: `Action type "${type}" is not allowed for module "${moduleId}".`,
    };
  }

  if (definition.risk === "human_only") {
    return {
      allowed: false,
      reason: "HUMAN_ONLY",
      message:
        "This action requires human execution and cannot be executed automatically.",
    };
  }

  if (definition.risk === "write") {
    return {
      allowed: false,
      reason: "WRITE_REQUIRES_APPROVAL",
      message:
        "Write actions require an approval workflow before execution is enabled.",
    };
  }

  return {
    allowed: true,
    definition,
  };
}