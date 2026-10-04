"use client";

import type { ActivityEvent, ActivityStatus } from "../../core/models/types";
import { getModule } from "../../core/registry/modules";
import { formatRelativeTime } from "../../lib/format";

const DOT: Record<ActivityStatus, string> = {
  success: "bg-emerald-400",
  info: "bg-sky-400",
  warning: "bg-amber-400",
  error: "bg-red-400",
};

const STATUS_LABEL: Record<ActivityStatus, string> = {
  success: "Success",
  info: "Info",
  warning: "Warning",
  error: "Error",
};

interface RecentActivityProps {
  activity: ActivityEvent[];
}

export default function RecentActivity({ activity }: RecentActivityProps) {
  if (activity.length === 0) {
    return <p className="text-sm text-muted">No recent activity.</p>;
  }

  const now = Date.now();

  return (
    <ul className="space-y-3">
      {activity.map((e) => (
        <li key={e.id}>
          <details className="group">
            <summary className="flex cursor-pointer list-none items-start gap-3 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent [&::-webkit-details-marker]:hidden">
              <span
                className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${DOT[e.status]}`}
                aria-hidden="true"
              />

              <div className="min-w-0 flex-1 break-words">
                <div className="text-sm">{e.event}</div>

                <div className="mt-0.5 text-xs text-muted">
                  {getModule(e.moduleId)?.name ?? e.moduleId}
                </div>
              </div>

              <span className="shrink-0 text-xs text-muted">
                {formatRelativeTime(e.timestamp, now)}
              </span>

              <span
                aria-hidden="true"
                className="shrink-0 pt-0.5 text-xs text-muted transition-transform group-open:rotate-90"
              >
                &#9656;
              </span>
            </summary>

            <div className="mt-2 rounded-lg border border-line bg-surface-2 p-3 text-xs">
              <div className="mb-2 flex items-center justify-between gap-2">
                <span className="font-semibold uppercase tracking-wider text-muted">
                  Activity details
                </span>

                <span className="rounded border border-line px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-muted">
                  Read-only
                </span>
              </div>

              <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5">
                <dt className="text-muted">ID</dt>
                <dd className="min-w-0 break-words">{e.id}</dd>

                <dt className="text-muted">Event</dt>
                <dd className="min-w-0 break-words">{e.event}</dd>

                <dt className="text-muted">Module</dt>
                <dd className="min-w-0 break-words">
                  {getModule(e.moduleId)?.name ?? e.moduleId}
                </dd>

                <dt className="text-muted">Status</dt>
                <dd className="min-w-0 break-words">
                  {STATUS_LABEL[e.status]}
                </dd>

                <dt className="text-muted">Time</dt>
                <dd className="min-w-0 break-words">
                  {formatRelativeTime(e.timestamp, now)}
                </dd>
              </dl>
            </div>
          </details>
        </li>
      ))}
    </ul>
  );
}
