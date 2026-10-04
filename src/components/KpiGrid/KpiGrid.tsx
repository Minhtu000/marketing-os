import type { Kpi } from "../../core/models/types";
import { formatChange, formatKpiValue } from "../../lib/format";
function changeStyle(percent: number): { color: string; arrow: string } {
  if (percent > 0) return { color: "text-sky-400", arrow: "\u25B2" };
  if (percent < 0) return { color: "text-amber-400", arrow: "\u25BC" };
  return { color: "text-muted", arrow: "\u2022" };
}
interface KpiGridProps {
  kpis: Kpi[];
}
export default function KpiGrid({ kpis }: KpiGridProps) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
      {kpis.map((kpi) => {
        const style = changeStyle(kpi.changePercent);
        return (
          <div
            key={kpi.id}
            className="rounded-lg border border-line bg-surface-2 p-4"
          >
            <div className="text-xs font-medium text-muted">{kpi.label}</div>
            <div className="mt-2 text-3xl font-semibold tracking-tight">
              {formatKpiValue(kpi.value, kpi.format)}
            </div>
            <div className={`mt-2 text-xs font-medium ${style.color}`}>
              {style.arrow} {formatChange(kpi.changePercent)}
            </div>
          </div>
        );
      })}
    </div>
  );
}
