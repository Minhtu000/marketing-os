import type { HandoffInboxItem } from "../../core/models/types";
interface HandoffInboxProps {
  handoffs: HandoffInboxItem[];
}
function kindLabel(kind: HandoffInboxItem["kind"]) {
  switch (kind) {
    case "result":
      return "Result";
    case "finding":
      return "Finding";
    case "recommendation":
      return "Recommendation";
    case "action_request":
      return "Action Request";
  }
}
export default function HandoffInbox({
  handoffs,
}: HandoffInboxProps) {
  if (handoffs.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-line px-4 py-6 text-center text-sm text-muted">
        Chưa có dữ liệu handoff từ Claude SEO OS.
      </div>
    );
  }
  return (
    <div className="space-y-3">
      {handoffs
        .slice()
        .sort(
          (a, b) =>
            new Date(b.createdAt).getTime() -
            new Date(a.createdAt).getTime(),
        )
        .map((handoff) => (
          <article
            key={handoff.handoffId}
            className="rounded-lg border border-line bg-surface-2 p-4"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-line px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted">
                  {kindLabel(handoff.kind)}
                </span>
                <span className="text-[11px] text-muted">
                  Claude SEO OS
                </span>
              </div>
              <time
                dateTime={handoff.createdAt}
                className="text-[11px] text-muted"
              >
                {new Date(handoff.createdAt).toLocaleString("vi-VN")}
              </time>
            </div>
            <h3 className="mt-3 text-sm font-semibold text-foreground">
              {handoff.title}
            </h3>
            <p className="mt-1 text-sm leading-6 text-muted">
              {handoff.summary}
            </p>
            {handoff.actionId ? (
              <div className="mt-3 text-[11px] text-muted">
                Action ID:{" "}
                <span className="font-mono text-foreground">
                  {handoff.actionId}
                </span>
              </div>
            ) : null}
          </article>
        ))}
    </div>
  );
}
