import { notFound } from "next/navigation";
import ActiveIssues from "../../../components/ActiveIssues/ActiveIssues";
import Priorities from "../../../components/Priorities/Priorities";
import RecentActivity from "../../../components/RecentActivity/RecentActivity";
import SectionCard from "../../../components/ui/SectionCard";
import { getDashboardSnapshot } from "../../../core/data";
import { MODULES } from "../../../core/registry/modules";

export const dynamic = "force-dynamic";

interface ModuleDetailPageProps {
  params: Promise<{
    moduleSlug: string;
  }>;
}

export default async function ModuleDetailPage({
  params,
}: ModuleDetailPageProps) {
  const { moduleSlug } = await params;

  const module = MODULES.find(
    (item) => item.detailRoute === `/modules/${moduleSlug}`
  );

  if (!module) {
    notFound();
  }

  const snapshot = await getDashboardSnapshot();

  const health = snapshot.health.find(
    (item) => item.moduleId === module.id
  );

  const issues = snapshot.issues.filter(
    (item) => item.moduleId === module.id
  );

  const priorities = snapshot.priorities.filter(
    (item) => item.moduleId === module.id
  );

  const activity = snapshot.activity.filter(
    (item) => item.moduleId === module.id
  );

  const statusLabel =
    health?.status === "available"
      ? health.dataSource === "demo"
        ? "Available / Demo"
        : "Available"
      : "Planned";

  const connectionLabel =
    health?.connection === "connected"
      ? "Connected"
      : "Not connected";

  const dataSourceLabel =
    health?.dataSource === "demo"
      ? "Demo"
      : health?.dataSource === "live"
        ? "Live"
        : "None";

  return (
    <main className="min-h-screen bg-background p-4 sm:p-6">
      <div className="mx-auto max-w-7xl space-y-4">
        <SectionCard
          title={module.name}
          description={module.description}
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-wider text-muted">
                Status
              </div>
              <div className="mt-1 text-sm">{statusLabel}</div>
            </div>

            <div>
              <div className="text-[11px] font-semibold uppercase tracking-wider text-muted">
                Provider
              </div>
              <div className="mt-1 text-sm">{snapshot.providerName}</div>
            </div>

            <div>
              <div className="text-[11px] font-semibold uppercase tracking-wider text-muted">
                Connection
              </div>
              <div className="mt-1 text-sm">{connectionLabel}</div>
            </div>

            <div>
              <div className="text-[11px] font-semibold uppercase tracking-wider text-muted">
                Data source
              </div>
              <div className="mt-1 text-sm">{dataSourceLabel}</div>
            </div>
          </div>
        </SectionCard>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
          <SectionCard
            title="Active Issues"
            description="Issues belonging to this module"
            className="xl:col-span-6"
          >
            <ActiveIssues issues={issues} />
          </SectionCard>

          <SectionCard
            title="Today's Priorities"
            description="Priorities belonging to this module"
            className="xl:col-span-6"
          >
            <Priorities priorities={priorities} />
          </SectionCard>

          <SectionCard
            title="Recent Activity"
            description="Recent events belonging to this module"
            className="xl:col-span-12"
          >
            <RecentActivity activity={activity} />
          </SectionCard>
        </div>
      </div>
    </main>
  );
}
