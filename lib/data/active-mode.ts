import type { InterviewMode, InterviewSessionRow } from "@/db/schema";

const DEFAULT_ACTIVE_MODE: InterviewMode = "behavioral";

export function deriveActiveMode(
  sessions: readonly InterviewSessionRow[],
): InterviewMode {
  const latestSession = [...sessions]
    .filter((session) => session.status !== "archived")
    .sort(
      (left, right) =>
        right.updatedAt.getTime() - left.updatedAt.getTime() ||
        right.createdAt.getTime() - left.createdAt.getTime(),
    )[0];

  return latestSession?.mode ?? DEFAULT_ACTIVE_MODE;
}
