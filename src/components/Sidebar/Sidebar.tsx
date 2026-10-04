import Link from "next/link";
import type { ModuleHealth } from "../../core/models/types";
import { getModule } from "../../core/registry/modules";

interface SidebarProps {
  health: ModuleHealth[];
}

function statusLabel(m: ModuleHealth): string {
  if (m.status === "available") {
    return m.dataSource === "demo" ? "Available / Demo" : "Available";
  }

  return "Planned";
}

function dotClass(m: ModuleHealth): string {
  return m.status === "available" ? "bg-emerald-400" : "bg-slate-500";
}

const ITEM_CLASS =
  "flex items-center justify-between rounded-lg px-3 py-2 text-sm text-foreground/90";

export default function Sidebar({ health }: SidebarProps) {
  return (
    <aside className="hidden flex-col border-r border-line bg-surface md:sticky md:top-0 md:flex md:h-screen md:w-64 md:shrink-0">
      <div className="flex h-16 items-center gap-3 border-b border-line px-5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent text-sm font-bold text-white">
          M
        </div>

        <div className="leading-tight">
          <div className="text-sm font-semibold">Marketing OS</div>
          <div className="text-[11px] text-muted">Control Plane</div>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <Link
          href="/"
          aria-current="page"
          className="flex items-center rounded-lg bg-surface-2 px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-line focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent"
        >
          Dashboard
        </Link>

        <div className="mb-2 mt-6 px-3 text-[11px] font-semibold uppercase tracking-wider text-muted">
          Modules
        </div>

        <ul className="space-y-1">
          {health.map((m) => {
            const detailRoute = getModule(m.moduleId)?.detailRoute;

            const content = (
              <>
                <span className="flex items-center gap-2">
                  <span className={"h-2 w-2 rounded-full " + dotClass(m)} />
                  {m.name}
                </span>

                <span className="text-[11px] text-muted">
                  {statusLabel(m)}
                </span>
              </>
            );

            return (
              <li key={m.moduleId}>
                {detailRoute ? (
                  <Link
                    href={detailRoute}
                    className={
                      ITEM_CLASS +
                      " transition-colors hover:bg-surface-2 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent"
                    }
                  >
                    {content}
                  </Link>
                ) : (
                  <div className={ITEM_CLASS + " cursor-default"}>
                    {content}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="border-t border-line px-5 py-3 text-[11px] text-muted">
        Phase 1 / Demo environment
      </div>
    </aside>
  );
}
