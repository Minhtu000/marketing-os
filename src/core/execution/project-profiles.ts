import type { ProjectExecutionProfile } from "./types";
export const projectExecutionProfiles: ProjectExecutionProfile[] = [
  {
    projectId: "noithatvuonganh",
    domain: "noithatvuonganh.com",
    adapter: "playwright",
    enabled: true,
    allowedActions: [
      "seo.write.metadata",
      "seo.write.content",
    ],
  },
];
export function getProjectExecutionProfile(
  projectIdOrDomain: string,
): ProjectExecutionProfile | null {
  return (
    projectExecutionProfiles.find(
      (profile) =>
        profile.projectId === projectIdOrDomain ||
        profile.domain === projectIdOrDomain,
    ) ?? null
  );
}
