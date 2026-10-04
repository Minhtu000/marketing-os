"use client";

import { useState } from "react";
import type {
  ActivityEvent,
  Issue,
  ModuleId,
  Priority,
} from "../../core/models/types";
import { MODULES } from "../../core/registry/modules";
import SectionCard from "../ui/SectionCard";
import ActiveIssues from "../ActiveIssues/ActiveIssues";
import Priorities from "../Priorities/Priorities";
import RecentActivity from "../RecentActivity/RecentActivity";

interface DashboardModuleFilterProps {
  issues: Issue[];
  priorities: Priority[];
  activity: ActivityEvent[];
}

const FILTER_LABEL_CLASS =
  "flex flex-col gap-1 text-[11px] font-medium uppercase tracking-wider text-muted";

const FILTER_SELECT_CLASS =
  "w-full rounded-lg border border-line bg-surface-2 px-2.5 py-1.5 text-xs normal-case tracking-normal text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent";

export default function DashboardModuleFilter({
  issues,
  priorities,
  activity,
}: DashboardModuleFilterProps) {
  const [moduleId, setModuleId] = useState<"all" | ModuleId>("all");

  const filteredIssues =
    moduleId === "all"
      ? issues
      : issues.filter((item) => item.moduleId === moduleId);

  const filteredPriorities =
    moduleId === "all"
      ? priorities
      : priorities.filter((item) => item.moduleId === moduleId);

  const filteredActivity =
    moduleId === "all"
      ? activity
      : activity.filter((item) => item.moduleId === moduleId);

  return (
    <>
      <div className="xl:col-span-12">
        <label className={`${FILTER_LABEL_CLASS} sm:max-w-xs`}>
          Module

          <select
            value={moduleId}
            onChange={(e) => setModuleId(e.target.value as "all" | ModuleId)}
            className={FILTER_SELECT_CLASS}
          >
            <option value="all">All Modules</option>

            {MODULES.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      <SectionCard
        title="Active Issues"
        description="Signals that need attention"
        className="xl:col-span-6"
      >
        <ActiveIssues issues={filteredIssues} />
      </SectionCard>

      <SectionCard
        title="Today's Priorities"
        description="What to focus on today"
        className="xl:col-span-6"
      >
        <Priorities priorities={filteredPriorities} />
      </SectionCard>

      <SectionCard
        title="Recent Activity"
        description="Latest events across modules"
        className="xl:col-span-8"
      >
        <RecentActivity activity={filteredActivity} />
      </SectionCard>
    </>
  );
}
