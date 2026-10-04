import { getFreshness, type FreshnessState } from "../../lib/format";

const DOT: Record<FreshnessState, string> = {
  fresh: "bg-emerald-400",
  aging: "bg-amber-400",
  stale: "bg-red-400",
};

const EXPORT_STATUS: Record<
  NonNullable<HeaderProps["seoExportStatus"]>,
  {
    label: string;
    className: string;
  }
> = {
  live: {
    label: "SEO Export · LIVE",
    className: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
  },
  stale: {
    label: "SEO Export · STALE",
    className: "border-amber-500/30 bg-amber-500/10 text-amber-300",
  },
  partial: {
    label: "SEO Export · PARTIAL",
    className: "border-amber-500/30 bg-amber-500/10 text-amber-300",
  },
  invalid: {
    label: "SEO Export · INVALID",
    className: "border-red-500/30 bg-red-500/10 text-red-300",
  },
  unavailable: {
    label: "SEO Export · UNAVAILABLE",
    className: "border-red-500/30 bg-red-500/10 text-red-300",
  },
};

interface HeaderProps {
  seoExportStatus?: "live" | "stale" | "partial" | "invalid" | "unavailable";
  title: string;
  providerName: string;
  lastUpdated: string;
}

export default function Header({
  title,
  providerName,
  lastUpdated,
  seoExportStatus,
}: HeaderProps) {
  const freshness = getFreshness(lastUpdated);

  const exportStatus = seoExportStatus
    ? EXPORT_STATUS[seoExportStatus]
    : null;

  return (
    <header className="flex min-h-16 items-center justify-between gap-3 border-b border-line bg-surface/60 px-4 py-2 backdrop-blur sm:px-6">
      <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
        <span className="text-sm font-semibold md:hidden">Marketing OS</span>

        <h1 className="hidden text-lg font-semibold md:block">{title}</h1>

        {exportStatus && (
          <span
            className={`rounded-full border px-3 py-1 text-xs font-medium ${exportStatus.className}`}
          >
            {exportStatus.label}
          </span>
        )}

        <span
          className="flex max-w-full items-center gap-2 break-words rounded-full border border-line bg-surface-2 px-3 py-1 text-xs text-muted sm:whitespace-nowrap"
          title={`Data freshness: ${freshness.state}`}
        >
          <span
            className={`h-1.5 w-1.5 shrink-0 rounded-full ${DOT[freshness.state]}`}
          />
          {providerName} &middot; Updated {freshness.relative}
        </span>
      </div>

      <div className="hidden rounded-lg border border-dashed border-line px-3 py-1.5 text-xs text-muted sm:block">
        Controls (coming later)
      </div>
    </header>
  );
}
