import { parseISO } from "date-fns";
import { deriveReadinessState } from "@/lib/domain/interview";
import type { ScoreBand } from "@/lib/types/interview";

export type ProgressTrack =
  | "behavioral"
  | "coding"
  | "resume"
  | "project"
  | "system-design";

export interface ProgressSession {
  id: string;
  completedAt: string;
  track: ProgressTrack;
  score: number;
  durationMinutes: number;
  followUps: number;
  focus: string;
  note: string;
}

export interface ProgressTimelinePoint {
  label: string;
  score: number;
  durationMinutes: number;
  followUps: number;
  track: ProgressTrack;
}

export interface ProgressTrackSummary {
  track: ProgressTrack;
  label: string;
  averageScore: number;
  sessions: number;
  bestScore: number;
  bestNote: string;
}

export interface ProgressDashboardSnapshot {
  readinessBand: ScoreBand;
  averageScore: number;
  momentum: number;
  streakDays: number;
  totalMinutes: number;
  averageFollowUps: number;
  weakestTrack: ProgressTrackSummary;
  strongestTrack: ProgressTrackSummary;
  trackSummaries: ProgressTrackSummary[];
  timeline: ProgressTimelinePoint[];
  sessions: ProgressSession[];
  latestSession: ProgressSession;
}

const TRACK_LABELS: Record<ProgressTrack, string> = {
  behavioral: "Behavioral",
  coding: "Coding",
  resume: "Resume deep dive",
  project: "Project walkthrough",
  "system-design": "System design",
};

const DAY_KEY_FORMATTER = new Intl.DateTimeFormat("en-CA", {
  timeZone: "UTC",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const DAY_LABEL_FORMATTER = new Intl.DateTimeFormat("en-US", {
  timeZone: "UTC",
  month: "short",
  day: "numeric",
});

function toUtcDayKey(value: string | Date) {
  return DAY_KEY_FORMATTER.format(typeof value === "string" ? parseISO(value) : value);
}

function toUtcDayLabel(value: string) {
  return DAY_LABEL_FORMATTER.format(parseISO(value));
}

export const PROGRESS_SESSIONS: ProgressSession[] = [
  {
    id: "session-01",
    completedAt: "2026-03-01T18:15:00.000Z",
    track: "behavioral",
    score: 64,
    durationMinutes: 18,
    followUps: 4,
    focus: "ownership clarity",
    note: "Good structure, but the impact statement still needs a measurable outcome.",
  },
  {
    id: "session-02",
    completedAt: "2026-03-03T18:15:00.000Z",
    track: "resume",
    score: 68,
    durationMinutes: 20,
    followUps: 5,
    focus: "project scope",
    note: "The resume walkthrough is grounded, but the answer still buries the why.",
  },
  {
    id: "session-03",
    completedAt: "2026-03-05T18:15:00.000Z",
    track: "coding",
    score: 71,
    durationMinutes: 22,
    followUps: 5,
    focus: "edge-case coverage",
    note: "The algorithm direction is solid, but the answer still skips edge cases too early.",
  },
  {
    id: "session-04",
    completedAt: "2026-03-07T18:15:00.000Z",
    track: "system-design",
    score: 70,
    durationMinutes: 25,
    followUps: 6,
    focus: "capacity assumptions",
    note: "Strong topic coverage, but the answer needs clearer scale assumptions.",
  },
  {
    id: "session-05",
    completedAt: "2026-03-15T18:15:00.000Z",
    track: "behavioral",
    score: 78,
    durationMinutes: 19,
    followUps: 5,
    focus: "ownership signaling",
    note: "The response now points to direct impact instead of passive team language.",
  },
  {
    id: "session-06",
    completedAt: "2026-03-16T18:15:00.000Z",
    track: "project",
    score: 82,
    durationMinutes: 23,
    followUps: 6,
    focus: "metrics and scope",
    note: "The project story now shows scope, constraints, and measurable outcomes.",
  },
  {
    id: "session-07",
    completedAt: "2026-03-17T18:15:00.000Z",
    track: "resume",
    score: 80,
    durationMinutes: 21,
    followUps: 6,
    focus: "resume gaps",
    note: "Resume answers are tighter and the gaps are handled without over-explaining.",
  },
  {
    id: "session-08",
    completedAt: "2026-03-18T18:15:00.000Z",
    track: "project",
    score: 83,
    durationMinutes: 24,
    followUps: 7,
    focus: "runtime concerns",
    note: "The follow-ups now expose the failure modes that employers care about.",
  },
  {
    id: "session-09",
    completedAt: "2026-03-19T18:15:00.000Z",
    track: "system-design",
    score: 90,
    durationMinutes: 32,
    followUps: 8,
    focus: "tradeoff framing",
    note: "The answer now leads with capacity, bottlenecks, and failure domains.",
  },
  {
    id: "session-10",
    completedAt: "2026-03-20T18:15:00.000Z",
    track: "coding",
    score: 85,
    durationMinutes: 27,
    followUps: 7,
    focus: "complexity tradeoffs",
    note: "The candidate now clarifies constraints, tests edge cases, and explains optimization choices.",
  },
];

export function sortProgressSessions(sessions: ProgressSession[]) {
  return [...sessions].sort(
    (left, right) =>
      parseISO(left.completedAt).getTime() - parseISO(right.completedAt).getTime(),
  );
}

export function averageProgressScore(sessions: ProgressSession[]) {
  if (sessions.length === 0) {
    return 0;
  }

  const total = sessions.reduce((sum, session) => sum + session.score, 0);
  return Math.round(total / sessions.length);
}

export function computeProgressMomentum(
  sessions: ProgressSession[],
  windowSize = 3,
) {
  const ordered = sortProgressSessions(sessions);

  if (ordered.length < windowSize * 2) {
    return 0;
  }

  const recent = ordered.slice(-windowSize);
  const previous = ordered.slice(-windowSize * 2, -windowSize);

  return averageProgressScore(recent) - averageProgressScore(previous);
}

export function computePracticeStreak(
  sessions: ProgressSession[],
  referenceDate: string | Date = sessions.at(-1)?.completedAt ?? new Date(),
) {
  const ordered = sortProgressSessions(sessions);

  if (ordered.length === 0) {
    return 0;
  }

  const completedDays = new Set(ordered.map((session) => toUtcDayKey(session.completedAt)));
  const anchor = typeof referenceDate === "string" ? parseISO(referenceDate) : referenceDate;
  let streak = 0;
  let cursor = new Date(Date.UTC(anchor.getUTCFullYear(), anchor.getUTCMonth(), anchor.getUTCDate()));

  while (completedDays.has(toUtcDayKey(cursor))) {
    streak += 1;
    cursor = new Date(cursor.getTime() - 86_400_000);
  }

  return streak;
}

export function buildProgressTimeline(sessions: ProgressSession[]) {
  return sortProgressSessions(sessions).map((session) => ({
    label: toUtcDayLabel(session.completedAt),
    score: session.score,
    durationMinutes: session.durationMinutes,
    followUps: session.followUps,
    track: session.track,
  }));
}

export function buildTrackSummaries(sessions: ProgressSession[]) {
  const buckets = Object.entries(TRACK_LABELS).reduce(
    (accumulator, [track, label]) => {
      accumulator[track as ProgressTrack] = {
        track: track as ProgressTrack,
        label,
        averageScore: 0,
        sessions: 0,
        bestScore: 0,
        bestNote: "No sessions yet.",
      };
      return accumulator;
    },
    {} as Record<ProgressTrack, ProgressTrackSummary>,
  );

  for (const session of sessions) {
    const bucket = buckets[session.track];
    bucket.sessions += 1;
    bucket.averageScore += session.score;

    if (session.score >= bucket.bestScore) {
      bucket.bestScore = session.score;
      bucket.bestNote = session.note;
    }
  }

  return Object.values(buckets).map((bucket) => ({
    ...bucket,
    averageScore:
      bucket.sessions === 0 ? 0 : Math.round(bucket.averageScore / bucket.sessions),
  }));
}

export function getTrackByExtremes(
  summaries: ProgressTrackSummary[],
  direction: "lowest" | "highest",
) {
  if (summaries.length === 0) {
    return undefined;
  }

  return summaries.reduce((winner, current) => {
    if (!winner) {
      return current;
    }

    return direction === "lowest"
      ? current.averageScore < winner.averageScore
        ? current
        : winner
      : current.averageScore > winner.averageScore
        ? current
        : winner;
  }, summaries[0]);
}

export function buildProgressDashboardSnapshot(
  sessions: ProgressSession[] = PROGRESS_SESSIONS,
): ProgressDashboardSnapshot {
  const ordered = sortProgressSessions(sessions);
  const trackSummaries = buildTrackSummaries(ordered);
  const weakestTrack = getTrackByExtremes(trackSummaries, "lowest");
  const strongestTrack = getTrackByExtremes(trackSummaries, "highest");
  const latestSession = ordered.at(-1);

  if (!weakestTrack || !strongestTrack || !latestSession) {
    throw new Error("progress dashboard snapshot requires at least one session");
  }

  return {
    readinessBand: deriveReadinessState(averageProgressScore(ordered)),
    averageScore: averageProgressScore(ordered),
    momentum: computeProgressMomentum(ordered),
    streakDays: computePracticeStreak(ordered),
    totalMinutes: ordered.reduce((sum, session) => sum + session.durationMinutes, 0),
    averageFollowUps: Math.round(
      ordered.reduce((sum, session) => sum + session.followUps, 0) / ordered.length,
    ),
    weakestTrack,
    strongestTrack,
    trackSummaries,
    timeline: buildProgressTimeline(ordered),
    sessions: ordered,
    latestSession,
  };
}
