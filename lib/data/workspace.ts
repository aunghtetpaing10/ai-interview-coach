import type { WorkspaceSnapshot } from "@/lib/data/repository";

export function getWorkspaceMetricCopy(snapshot: WorkspaceSnapshot) {
  const role = snapshot.targetRole?.title ?? "No target role selected";
  const mode =
    snapshot.activeMode === "system-design"
      ? "system design"
      : snapshot.activeMode.replace("-", " ");

  return [
    {
      label: "Target role",
      value: role,
      description: "The active role context that drives question selection and scoring.",
    },
    {
      label: "Focus mode",
      value: mode,
      description: "The default interview track used for the next practice session.",
    },
    {
      label: "Rubric coverage",
      value: `${snapshot.rubricCount} criteria`,
      description: "Reference rubric dimensions loaded from persisted data sources.",
    },
    {
      label: "Question bank",
      value: `${snapshot.questionCount} prompts`,
      description: "Prompt inventory available for grounded interviews and eval coverage.",
    },
  ] as const;
}
