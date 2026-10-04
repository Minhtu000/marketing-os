import type { KpiFormat } from "../core/models/types";
export function formatKpiValue(value: number, format: KpiFormat): string {
  switch (format) {
    case "percent":
      return `${value.toFixed(1)}%`;
    case "currency":
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 0,
      }).format(value);
    default:
      return new Intl.NumberFormat("en-US").format(value);
  }
}
export function formatChange(percent: number): string {
  const sign = percent > 0 ? "+" : "";
  return `${sign}${percent.toFixed(1)}%`;
}
export function formatRelativeTime(iso: string, now: number = Date.now()): string {
  const diff = Math.max(0, now - new Date(iso).getTime());
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}export type FreshnessState = "fresh" | "aging" | "stale";
export function getFreshness(
  iso: string,
  now: number = Date.now()
): { state: FreshnessState; relative: string } {
  const minutes = Math.max(0, now - new Date(iso).getTime()) / 60000;
  const state: FreshnessState =
    minutes < 15 ? "fresh" : minutes < 60 ? "aging" : "stale";
  return { state, relative: formatRelativeTime(iso, now) };
}
