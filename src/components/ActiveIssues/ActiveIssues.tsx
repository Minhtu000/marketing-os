"use client";
import { useState } from "react";import type { Issue, IssueSeverity, IssueStatus } from "../../core/models/types";
import { getModule } from "../../core/registry/modules";
import Badge, { type BadgeTone } from "../ui/Badge";
const SEVERITY_TONE: Record<IssueSeverity, BadgeTone> = {
  critical: "red",
  high: "orange",
  medium: "amber",
  low: "sky",
};
const STATUS_LABEL: Record<IssueStatus, string> = {
  open: "Open",
  in_progress: "In progress",
  resolved: "Resolved",
};
const STATUS_TONE: Record<IssueStatus, BadgeTone> = {
  open: "slate",
  in_progress: "sky",
  resolved: "emerald",
};
interface ActiveIssuesProps {
  issues: Issue[];
}
function ActiveIssuesList({ issues }: ActiveIssuesProps) {
  if (issues.length === 0) {
    return <p className="text-sm text-muted">No active issues.</p>;
  }
  return (
    <ul className="divide-y divide-line">
      {issues.map((issue) => (
        <li key={issue.id} className="py-3 first:pt-0 last:pb-0">
          <details className="group">
            <summary className="flex cursor-pointer list-none items-start gap-3 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent [&::-webkit-details-marker]:hidden">
          <div className="w-16 shrink-0 pt-0.5">
            <Badge tone={SEVERITY_TONE[issue.severity]}>
              {issue.severity.charAt(0).toUpperCase() + issue.severity.slice(1)}
            </Badge>
          </div>
          <div className="min-w-0 flex-1 break-words">
            <div className="text-sm">{issue.title}</div>
            <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted">
              <span>{getModule(issue.moduleId)?.name ?? issue.moduleId}</span>
              <span>&middot;</span>
              <Badge tone={STATUS_TONE[issue.status]}>
                {STATUS_LABEL[issue.status]}
              </Badge>
            </div>
          </div>
                      <span aria-hidden="true" className="ml-auto shrink-0 pt-0.5 text-xs text-muted transition-transform group-open:rotate-90">&#9656;</span>
            </summary>
            <div className="mt-2 rounded-lg border border-line bg-surface-2 p-3 text-xs">
              <div className="mb-2 flex items-center justify-between gap-2">
                <span className="font-semibold uppercase tracking-wider text-muted">Issue details</span>
                <span className="rounded border border-line px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-muted">Read-only</span>
              </div>
              <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5">
                <dt className="text-muted">ID</dt>
                <dd className="min-w-0 break-words">{issue.id}</dd>
                <dt className="text-muted">Title</dt>
                <dd className="min-w-0 break-words">{issue.title}</dd>
                <dt className="text-muted">Severity</dt>
                <dd className="min-w-0 break-words capitalize">{issue.severity.replace("_", " ")}</dd>
                <dt className="text-muted">Module</dt>
                <dd className="min-w-0 break-words">{getModule(issue.moduleId)?.name ?? issue.moduleId}</dd>
                <dt className="text-muted">Status</dt>
                <dd className="min-w-0 break-words capitalize">{issue.status.replace("_", " ")}</dd>
              </dl>
            </div>
          </details>
        </li>
      ))}
    </ul>
  );
}
const SEVERITY_FILTERS = [
  { value: "all", label: "All" },
  { value: "critical", label: "Critical" },
  { value: "high", label: "High" },
  { value: "medium", label: "Medium" },
  { value: "low", label: "Low" },
];
const STATUS_FILTERS = [
  { value: "all", label: "All" },
  { value: "open", label: "Open" },
  { value: "in_progress", label: "In progress" },
  { value: "resolved", label: "Resolved" },
];
const FILTER_LABEL_CLASS =
  "flex flex-col gap-1 text-[11px] font-medium uppercase tracking-wider text-muted";
const FILTER_SELECT_CLASS =
  "w-full rounded-lg border border-line bg-surface-2 px-2.5 py-1.5 text-xs normal-case tracking-normal text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent";
export default function ActiveIssues({ issues }: ActiveIssuesProps) {
  const [severity, setSeverity] = useState("all");
  const [status, setStatus] = useState("all");
  const filtered = issues.filter(
    (issue) =>
      (severity === "all" || issue.severity === severity) &&
      (status === "all" || issue.status === status)
  );
  return (
    <div>
      <div className="mb-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className={FILTER_LABEL_CLASS}>
          Severity
          <select
            value={severity}
            onChange={(e) => setSeverity(e.target.value)}
            className={FILTER_SELECT_CLASS}
          >
            {SEVERITY_FILTERS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
        <label className={FILTER_LABEL_CLASS}>
          Status
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className={FILTER_SELECT_CLASS}
          >
            {STATUS_FILTERS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
      </div>
      {issues.length > 0 && filtered.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted">
          No issues match the current filters.
        </p>
      ) : (
        <ActiveIssuesList issues={filtered} />
      )}
    </div>
  );
}
