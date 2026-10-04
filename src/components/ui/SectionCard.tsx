import type { ReactNode } from "react";
interface SectionCardProps {
  title: string;
  description?: string;
  className?: string;
  children?: ReactNode;
}
export default function SectionCard({
  title,
  description,
  className = "",
  children,
}: SectionCardProps) {
  return (
    <section
      className={`rounded-xl border border-line bg-surface p-5 ${className}`}
    >
      <div className="mb-4">
        <h2 className="text-sm font-semibold tracking-wide text-foreground">
          {title}
        </h2>
        {description ? (
          <p className="mt-1 text-xs text-muted">{description}</p>
        ) : null}
      </div>
      {children}
    </section>
  );
}
