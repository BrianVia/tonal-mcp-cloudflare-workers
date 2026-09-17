/** Pure helpers for shaping Tonal API payloads (no I/O). */

export type ActivitySummary = {
  id: string;
  name: string;
  timestamp: string;
  durationSeconds: number;
  timeUnderTensionSeconds: number;
  totalVolumeLbs: number;
  totalReps: number;
  targetArea: string;
  guided: boolean;
  inProgram: boolean;
};

export type SetDetail = {
  movementId: string;
  movementName: string;
  setGroup?: number;
  blockNumber?: number | null;
  reps?: number;
  avgWeightLbs?: number;
  oneRepMaxLbs?: number;
  onMachineVolumeLbs?: number;
  romInches?: number;
};

export type ActivityDetail = {
  id: string;
  beginTime: string;
  endTime?: string | null;
  totalDurationSeconds?: number;
  activeDurationSeconds?: number;
  totalSets?: number;
  totalReps?: number;
  totalVolumeLbs?: number;
  sets: SetDetail[];
};

const num = (v: unknown): number | undefined =>
  typeof v === "number" && Number.isFinite(v) ? v : undefined;

const str = (v: unknown): string | undefined =>
  typeof v === "string" ? v : undefined;

/** Map activity-summaries rows (defensive across observed field aliases). */
export function summarizeActivities(raw: unknown[]): ActivitySummary[] {
  return raw.map((item) => {
    const a = (item ?? {}) as Record<string, unknown>;
    return {
      id: String(a.id ?? ""),
      name: String(a.name ?? "Workout"),
      timestamp: String(a.timestamp ?? a.UTCTimestamp ?? a.localTimestamp ?? ""),
      durationSeconds: num(a.duration) ?? 0,
      timeUnderTensionSeconds: num(a.timeUnderTension) ?? 0,
      totalVolumeLbs: num(a.totalVolume) ?? 0,
      totalReps: num(a.totalReps) ?? 0,
      targetArea: String(a.targetArea ?? ""),
      guided: Boolean(a.isGuidedWorkout),
      inProgram: Boolean(a.isInProgram),
    };
  });
}

/** Map workout-activities list rows. */
export function summarizeActivityList(raw: unknown[]): Array<{
  id: string;
  beginTime: string;
  totalSets: number;
  totalReps: number;
  totalVolumeLbs: number;
}> {
  return raw.map((item) => {
    const a = (item ?? {}) as Record<string, unknown>;
    return {
      id: String(a.id ?? ""),
      beginTime: String(a.beginTime ?? ""),
      totalSets: num(a.totalSets) ?? 0,
      totalReps: num(a.totalReps) ?? 0,
      totalVolumeLbs: num(a.totalVolume) ?? 0,
    };
  });
}

/** Detail one workout-activity with movement names + per-set weights. */
export function detailActivity(
  raw: Record<string, unknown>,
  movementNames: Map<string, string>,
): ActivityDetail {
  const setsRaw = Array.isArray(raw.workoutSetActivity) ? raw.workoutSetActivity
    : Array.isArray(raw.workoutSetActivities) ? raw.workoutSetActivities
    : [];
  const sets: SetDetail[] = setsRaw.map((item) => {
    const s = (item ?? {}) as Record<string, unknown>;
    const movementId = String(s.movementId ?? "");
    return {
      movementId,
      movementName: movementNames.get(movementId) ?? "Unknown movement",
      setGroup: num(s.setGroup),
      blockNumber: num(s.blockNumber) ?? null,
      reps: num(s.repCount) ?? num(s.repetition),
      avgWeightLbs: num(s.avgWeight),
      oneRepMaxLbs: num(s.oneRepMax),
      onMachineVolumeLbs: num(s.totalOnMachineVolume),
      romInches: num(s.romLengthIn),
    };
  });
  return {
    id: String(raw.id ?? ""),
    beginTime: String(raw.beginTime ?? ""),
    endTime: str(raw.endTime) ?? null,
    totalDurationSeconds: num(raw.totalDuration),
    activeDurationSeconds: num(raw.activeDuration),
    totalSets: num(raw.totalSets),
    totalReps: num(raw.totalReps),
    totalVolumeLbs: num(raw.totalVolume),
    sets,
  };
}

/** Compact Tonal formatted workout summary. */
export function summarizeFormattedWorkout(raw: Record<string, unknown>) {
  const movementSets = Array.isArray(raw.movementSets) ? raw.movementSets : [];
  return {
    name: str(raw.name) ?? "Workout",
    coachName: str(raw.coachName) ?? null,
    targetArea: str(raw.targetArea) ?? "",
    inProgram: Boolean(raw.isInProgram),
    guided: Boolean(raw.isGuidedWorkout),
    durationSeconds: num(raw.duration),
    timeUnderTensionSeconds: num(raw.timeUnderTension),
    movements: movementSets.map((item) => {
      const m = (item ?? {}) as Record<string, unknown>;
      return {
        movementName: str(m.movementName) ?? "Unknown",
        blockNumber: num(m.blockNumber),
        setGroup: num(m.setGroup),
        totalVolumeLbs: num(m.totalVolume),
        onMachineVolumeLbs: num(m.totalOnMachineVolume),
        setCount: Array.isArray(m.sets) ? m.sets.length : undefined,
      };
    }),
  };
}

export function filterMovements(
  movements: Array<{ id: string; name: string; shortName?: string; muscleGroups?: string[]; bodyRegion?: string }>,
  query: string,
  limit = 25,
) {
  const q = query.trim().toLowerCase();
  const matched = q
    ? movements.filter((m) =>
        m.name.toLowerCase().includes(q)
        || (m.shortName?.toLowerCase().includes(q) ?? false)
        || (m.bodyRegion?.toLowerCase().includes(q) ?? false)
        || (m.muscleGroups?.some((g) => g.toLowerCase().includes(q)) ?? false))
    : movements;
  return matched.slice(0, limit);
}
