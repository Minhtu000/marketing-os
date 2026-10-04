import Sidebar from "../components/Sidebar/Sidebar";
import Header from "../components/Header/Header";
import SectionCard from "../components/ui/SectionCard";
import SystemHealth from "../components/SystemHealth/SystemHealth";
import KpiGrid from "../components/KpiGrid/KpiGrid";
import DashboardModuleFilter from "../components/DashboardModuleFilter/DashboardModuleFilter";
import { getDashboardSnapshot } from "../core/data";

export const dynamic = "force-dynamic";

export default async function Home() {
  const snapshot = await getDashboardSnapshot();

  return (
    <div className="flex min-h-screen">
      <Sidebar health={snapshot.health} />

      <div className="flex min-w-0 flex-1 flex-col">
        <Header
          title="Dashboard"
          providerName={snapshot.providerName}
          lastUpdated={snapshot.lastUpdated}
          seoExportStatus={snapshot.seoExportStatus}
        />

        <main className="flex-1 p-4 sm:p-6">
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
            <SectionCard
              title="System Health"
              description="Status of every marketing module"
              className="xl:col-span-12"
            >
              <SystemHealth health={snapshot.health} />
            </SectionCard>

            <SectionCard
              title="KPI Overview"
              description="Key marketing indicators"
              className="xl:col-span-12"
            >
              <KpiGrid kpis={snapshot.kpis} />
            </SectionCard>

            <DashboardModuleFilter
              issues={snapshot.issues}
              priorities={snapshot.priorities}
              activity={snapshot.activity}
            />

            <SectionCard
              title="AI Assistant"
              description="Coming soon"
              className="xl:col-span-4"
            >
              <div className="rounded-lg border border-dashed border-line px-4 py-6 text-center text-sm text-muted">
                AI Assistant is not available yet.
              </div>
            </SectionCard>
          </div>
        </main>
      </div>
    </div>
  );
}
