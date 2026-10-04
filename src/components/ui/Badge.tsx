import type { ReactNode } from "react";
export type BadgeTone = "red" | "orange" | "amber" | "sky" | "emerald" | "slate";
const TONES: Record<BadgeTone, string> = {
  red: "border-red-500/30 bg-red-500/15 text-red-300",
  orange: "border-orange-500/30 bg-orange-500/15 text-orange-300",
  amber: "border-amber-500/30 bg-amber-500/15 text-amber-300",
  sky: "border-sky-500/30 bg-sky-500/15 text-sky-300",
  emerald: "border-emerald-500/30 bg-emerald-500/15 text-emerald-300",
  slate: "border-slate-500/30 bg-slate-500/15 text-slate-300",
};
interface BadgeProps {
  tone: BadgeTone;
  children: ReactNode;
}
export default function Badge({ tone, children }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-medium ${TONES[tone]}`}
    >
      {children}
    </span>
  );
}
