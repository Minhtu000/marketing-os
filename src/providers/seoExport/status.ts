import type { ExportStatus, SeoExportFile } from "./contract";
const STALE_DAYS = 30;
function isValidDate(value: string | undefined): boolean {
  if (!value) return false;
  const date = new Date(value);
  return !Number.isNaN(date.getTime());
}
function isStale(value: string): boolean {
  const timestamp = new Date(value).getTime();
  const threshold = STALE_DAYS * 24 * 60 * 60 * 1000;
  return Date.now() - timestamp > threshold;
}
function hasRequiredSections(data: SeoExportFile): boolean {
  return Boolean(
    data.sections &&
      data.sections.kpis &&
      data.sections.signals &&
      data.sections.tasks &&
      data.sections.activity,
  );
}
function hasPartialSection(data: SeoExportFile): boolean {
  return Object.values(data.sections).some(
    (section) => section.state === "not_available",
  );
}
function hasSourceProvenance(data: SeoExportFile): boolean {
  const reportRefs = data.producer?.reportRefs;
  if (
    !Array.isArray(reportRefs) ||
    reportRefs.length === 0 ||
    reportRefs.some((ref) => typeof ref !== "string" || !ref.trim())
  ) {
    return false;
  }
  if (data.sections.kpis.state === "present") {
    const items = data.sections.kpis.items;
    if (
      !Array.isArray(items) ||
      items.length === 0 ||
      items.some(
        (item) =>
          typeof item.source?.ref !== "string" ||
          !item.source.ref.trim(),
      )
    ) {
      return false;
    }
  }
  return true;
}
export function validateSeoExport(data: unknown): {
  status: ExportStatus;
  data?: SeoExportFile;
} {
  if (!data || typeof data !== "object") {
    return { status: "invalid" };
  }
  const candidate = data as SeoExportFile;
  if (
    typeof candidate.schemaVersion !== "string" ||
    !/^[12]\./.test(candidate.schemaVersion)
  ) {
    return { status: "invalid" };
  }
  if (!isValidDate(candidate.exportedAt)) {
    return { status: "invalid" };
  }
  if (candidate.module?.id !== "seo") {
    return { status: "invalid" };
  }
  if (!hasRequiredSections(candidate)) {
    return { status: "invalid" };
  }
  if (isStale(candidate.dataAsOf ?? candidate.exportedAt)) {
    return {
      status: "stale",
      data: candidate,
    };
  }
  if (hasPartialSection(candidate)) {
    return {
      status: "partial",
      data: candidate,
    };
  }
  if (!hasSourceProvenance(candidate)) {
    return {
      status: "partial",
      data: candidate,
    };
  }
  return {
    status: "live",
    data: candidate,
  };
}
export function unavailableResult(): { status: ExportStatus } {
  return {
    status: "unavailable",
  };
}