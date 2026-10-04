import type { DataSource, ModuleHealth } from "../../core/models/types";
import Badge from "../ui/Badge";
const SOURCE_LABEL: Record<DataSource, string> = {
  demo: "Demo",
  live: "Live",
  none: "No data",
};
function statusLabel(m: ModuleHealth): string {
  if (m.status === "available") {
    return m.dataSource === "demo" ? "Available / Demo" : "Available";
  }
  return "Planned";
}
interface SystemHealthProps {
  health: ModuleHealth[];
}
export default function SystemHealth({ health }: SystemHealthProps) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {health.map((m) => (
        <div
          key={m.moduleId}
          className="rounded-lg border border-line bg-surface-2 p-4"
        >
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold">{m.name}</span>
            <Badge tone={m.status === "available" ? "emerald" : "slate"}>
              {statusLabel(m)}
            </Badge>
          </div>
          <dl className="mt-3 space-y-1.5 text-xs">
            <div className="flex justify-between">
              <dt className="text-muted">Connection</dt>
              <dd>{m.connection === "connected" ? "Connected" : "Not connected"}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted">Data source</dt>
              <dd>{SOURCE_LABEL[m.dataSource]}</dd>
            </div>
          </dl>
        </div>
      ))}
    </div>
  );
}
