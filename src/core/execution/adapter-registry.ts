import type { ExecutionAdapter, ExecutionAdapterId } from "./types";
const adapters = new Map<ExecutionAdapterId, ExecutionAdapter>();
export function registerExecutionAdapter(
  adapter: ExecutionAdapter,
): void {
  adapters.set(adapter.id, adapter);
}
export function getExecutionAdapter(
  id: ExecutionAdapterId,
): ExecutionAdapter | null {
  return adapters.get(id) ?? null;
}
