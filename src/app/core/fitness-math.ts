import {
  BLUEPRINT_LIMITS,
  BodyMeasurement,
  EquipmentType,
  ExerciseDefinition,
  FitnessGoal,
  LanguageCode,
  MuscleGroup,
  ProgressReport,
  ThemeMode,
  TimeframeKey,
  TrackingType,
  UserPreferences,
  WeightUnit,
  WorkoutEntry,
  WorkoutRoutine,
  WorkoutSession,
} from './models';

const KG_TO_LBS = 2.2046226218;

export function roundTo(value: number, decimals = 1): number {
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}

export function convertWeight(kg: number, unit: WeightUnit): number {
  if (!Number.isFinite(kg)) return 0;
  return unit === 'lbs' ? roundTo(kg * KG_TO_LBS, 1) : roundTo(kg, 1);
}

export function convertInputToKg(value: number, unit: WeightUnit): number {
  if (!Number.isFinite(value)) return 0;
  return unit === 'lbs' ? roundTo(value / KG_TO_LBS, 2) : roundTo(value, 2);
}

export function formatWeight(kg: number, unit: WeightUnit): string {
  const val = convertWeight(kg, unit);
  return `${val.toLocaleString('en-US', {maximumFractionDigits: 1})} ${unit}`;
}

export function calculateSetVolumeKg(weightKg: number, reps: number): number {
  if (!Number.isFinite(weightKg) || !Number.isFinite(reps)) return 0;
  if (weightKg <= 0 || reps <= 0) return 0;
  return roundTo(weightKg * reps, 1);
}

export function calculateWorkoutVolumeKg(entries: WorkoutEntry[]): number {
  let total = 0;
  for (const entry of entries) {
    for (const s of entry.sets) {
      if (s.completed) {
        total += calculateSetVolumeKg(s.weightKg, s.reps);
      }
    }
  }
  return roundTo(total, 1);
}

export function countCompletedSets(entries: WorkoutEntry[]): number {
  let count = 0;
  for (const entry of entries) {
    for (const s of entry.sets) {
      if (s.completed) count += 1;
    }
  }
  return count;
}

export function calculateOneRepMaxKg(weightKg: number, reps: number): number {
  if (!Number.isFinite(weightKg) || !Number.isFinite(reps) || weightKg <= 0 || reps <= 0) {
    return 0;
  }
  if (reps === 1) return roundTo(weightKg, 1);
  // Epley formula
  return roundTo(weightKg * (1 + reps / 30), 1);
}

export function getTimeframeCutoff(timeframe: TimeframeKey, now = new Date()): Date | null {
  if (timeframe === 'all') return null;
  const days = timeframe === '7d' ? 7 : timeframe === '30d' ? 30 : 90;
  const cutoff = new Date(now.getTime());
  cutoff.setHours(0, 0, 0, 0);
  cutoff.setDate(cutoff.getDate() - (days - 1));
  return cutoff;
}

export function filterByTimeframe<T>(
  items: T[],
  getDateIso: (item: T) => string,
  timeframe: TimeframeKey,
  now = new Date(),
): T[] {
  const cutoff = getTimeframeCutoff(timeframe, now);
  if (!cutoff) return [...items];
  const cutoffMs = cutoff.getTime();
  return items.filter((item) => {
    const ms = Date.parse(getDateIso(item));
    return Number.isFinite(ms) && ms >= cutoffMs;
  });
}

export interface MuscleBreakdownItem {
  muscleGroup: MuscleGroup;
  volumeKg: number;
  sets: number;
  percentage: number;
}

export function computeMuscleVolumeBreakdown(workouts: WorkoutSession[]): MuscleBreakdownItem[] {
  const totals = new Map<MuscleGroup, {volumeKg: number; sets: number}>();
  let grandTotalVolume = 0;
  let grandTotalSets = 0;

  for (const w of workouts) {
    for (const entry of w.entries) {
      const current = totals.get(entry.muscleGroup) ?? {volumeKg: 0, sets: 0};
      for (const s of entry.sets) {
        if (s.completed) {
          const vol = calculateSetVolumeKg(s.weightKg, s.reps);
          current.volumeKg += vol;
          current.sets += 1;
          grandTotalVolume += vol;
          grandTotalSets += 1;
        }
      }
      totals.set(entry.muscleGroup, current);
    }
  }

  const denominator = grandTotalVolume > 0 ? grandTotalVolume : grandTotalSets;
  const result: MuscleBreakdownItem[] = [];
  for (const [muscleGroup, stats] of totals.entries()) {
    if (stats.sets === 0) continue;
    const numerator = grandTotalVolume > 0 ? stats.volumeKg : stats.sets;
    result.push({
      muscleGroup,
      volumeKg: roundTo(stats.volumeKg, 1),
      sets: stats.sets,
      percentage: denominator > 0 ? Math.round((numerator / denominator) * 100) : 0,
    });
  }

  return result.sort((a, b) => b.volumeKg - a.volumeKg || b.sets - a.sets);
}

export interface ProgressReportSummary {
  startDate: string;
  endDate: string;
  workoutsCount: number;
  totalVolumeKg: number;
  completedSetsCount: number;
  weightDeltaKg: number;
  topMuscleGroup: MuscleGroup | 'none';
}

function toYmd(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function computeProgressReportSummary(
  workouts: WorkoutSession[],
  measurements: BodyMeasurement[],
  timeframe: TimeframeKey,
  now = new Date(),
): ProgressReportSummary {
  const scopedWorkouts = filterByTimeframe(workouts, (w) => w.completedAtIso, timeframe, now);
  const scopedMeasurements = filterByTimeframe(
    measurements,
    (m) => `${m.recordedDate}T12:00:00.000Z`,
    timeframe,
    now,
  ).sort((a, b) => a.recordedDate.localeCompare(b.recordedDate));

  let totalVolumeKg = 0;
  let completedSetsCount = 0;
  for (const w of scopedWorkouts) {
    totalVolumeKg += w.totalVolumeKg;
    completedSetsCount += w.completedSetsCount;
  }

  let weightDeltaKg = 0;
  if (scopedMeasurements.length >= 2) {
    const first = scopedMeasurements[0];
    const last = scopedMeasurements[scopedMeasurements.length - 1];
    weightDeltaKg = roundTo(last.weightKg - first.weightKg, 1);
  }

  const breakdown = computeMuscleVolumeBreakdown(scopedWorkouts);
  const topMuscleGroup = breakdown.length > 0 ? breakdown[0].muscleGroup : 'none';

  const cutoff = getTimeframeCutoff(timeframe, now);
  let startDate = cutoff ? toYmd(cutoff) : toYmd(now);
  if (!cutoff && scopedWorkouts.length > 0) {
    const sortedDates = scopedWorkouts
      .map((w) => w.completedAtIso.slice(0, 10))
      .sort((a, b) => a.localeCompare(b));
    startDate = sortedDates[0];
  } else if (!cutoff && scopedMeasurements.length > 0) {
    startDate = scopedMeasurements[0].recordedDate;
  }

  return {
    startDate,
    endDate: toYmd(now),
    workoutsCount: scopedWorkouts.length,
    totalVolumeKg: roundTo(totalVolumeKg, 1),
    completedSetsCount,
    weightDeltaKg,
    topMuscleGroup,
  };
}

export function computePersonalRecords(
  workouts: WorkoutSession[],
): {exerciseId: string; exerciseName: string; maxWeightKg: number; estimated1RmKg: number; dateIso: string}[] {
  const records = new Map<
    string,
    {exerciseId: string; exerciseName: string; maxWeightKg: number; estimated1RmKg: number; dateIso: string}
  >();

  for (const w of workouts) {
    for (const entry of w.entries) {
      for (const s of entry.sets) {
        if (!s.completed || s.weightKg <= 0 || s.reps <= 0) continue;
        const est1Rm = calculateOneRepMaxKg(s.weightKg, s.reps);
        const existing = records.get(entry.exerciseId);
        if (!existing || est1Rm > existing.estimated1RmKg) {
          records.set(entry.exerciseId, {
            exerciseId: entry.exerciseId,
            exerciseName: entry.exerciseName,
            maxWeightKg: s.weightKg,
            estimated1RmKg: est1Rm,
            dateIso: w.completedAtIso,
          });
        }
      }
    }
  }

  return Array.from(records.values())
    .sort((a, b) => b.estimated1RmKg - a.estimated1RmKg)
    .slice(0, 6);
}

export function computeSessionsInLast7Days(workouts: WorkoutSession[], now = new Date()): number {
  return filterByTimeframe(workouts, (w) => w.completedAtIso, '7d', now).length;
}

export interface MeasurementValidationResult {
  valid: boolean;
  errorKeys: string[];
  sanitized?: Omit<BodyMeasurement, 'id'>;
}

export function validateMeasurementInput(input: {
  recordedDate: string;
  weightKg: number | null;
  bodyFatPct?: number | null;
  chestCm?: number | null;
  waistCm?: number | null;
  hipsCm?: number | null;
  armsCm?: number | null;
  thighsCm?: number | null;
  notes?: string;
}): MeasurementValidationResult {
  const errorKeys: string[] = [];

  if (!BLUEPRINT_LIMITS.datePattern.test(input.recordedDate.trim())) {
    errorKeys.push('val_invalid_date');
  }

  const w = input.weightKg;
  if (w === null || !Number.isFinite(w) || w < BLUEPRINT_LIMITS.weightMinKg || w > BLUEPRINT_LIMITS.weightMaxKg) {
    errorKeys.push('val_invalid_weight');
  }

  const checkOptional = (val: number | null | undefined, min: number, max: number, key: string): number | undefined => {
    if (val === null || val === undefined || Number.isNaN(val)) return undefined;
    if (!Number.isFinite(val) || val < min || val > max) {
      errorKeys.push(key);
      return undefined;
    }
    return roundTo(val, 1);
  };

  const bodyFatPct = checkOptional(input.bodyFatPct, BLUEPRINT_LIMITS.bodyFatMinPct, BLUEPRINT_LIMITS.bodyFatMaxPct, 'val_invalid_bodyfat');
  const chestCm = checkOptional(input.chestCm, BLUEPRINT_LIMITS.chestMinCm, BLUEPRINT_LIMITS.chestMaxCm, 'val_invalid_measurement');
  const waistCm = checkOptional(input.waistCm, BLUEPRINT_LIMITS.waistMinCm, BLUEPRINT_LIMITS.waistMaxCm, 'val_invalid_measurement');
  const hipsCm = checkOptional(input.hipsCm, BLUEPRINT_LIMITS.hipsMinCm, BLUEPRINT_LIMITS.hipsMaxCm, 'val_invalid_measurement');
  const armsCm = checkOptional(input.armsCm, BLUEPRINT_LIMITS.armsMinCm, BLUEPRINT_LIMITS.armsMaxCm, 'val_invalid_measurement');
  const thighsCm = checkOptional(input.thighsCm, BLUEPRINT_LIMITS.thighsMinCm, BLUEPRINT_LIMITS.thighsMaxCm, 'val_invalid_measurement');

  const trimmedNotes = (input.notes ?? '').trim();
  if (trimmedNotes.length > BLUEPRINT_LIMITS.maxNotesLength) {
    errorKeys.push('val_notes_too_long');
  }

  if (errorKeys.length > 0 || w === null) {
    return {valid: false, errorKeys};
  }

  const sanitized: Omit<BodyMeasurement, 'id'> = {
    recordedDate: input.recordedDate.trim(),
    weightKg: roundTo(w, 1),
  };
  if (bodyFatPct !== undefined) sanitized.bodyFatPct = bodyFatPct;
  if (chestCm !== undefined) sanitized.chestCm = chestCm;
  if (waistCm !== undefined) sanitized.waistCm = waistCm;
  if (hipsCm !== undefined) sanitized.hipsCm = hipsCm;
  if (armsCm !== undefined) sanitized.armsCm = armsCm;
  if (thighsCm !== undefined) sanitized.thighsCm = thighsCm;
  if (trimmedNotes.length > 0) sanitized.notes = trimmedNotes;

  return {valid: true, errorKeys: [], sanitized};
}

export function validateExerciseInput(input: {
  nameEn: string;
  nameAr?: string;
  muscleGroup: MuscleGroup;
  equipment: EquipmentType;
  trackingType: TrackingType;
  notes?: string;
}): {valid: boolean; errorKeys: string[]} {
  const errorKeys: string[] = [];
  const nameEn = input.nameEn.trim();
  const nameAr = (input.nameAr ?? '').trim();
  const notes = (input.notes ?? '').trim();

  if (nameEn.length < 2 || nameEn.length > BLUEPRINT_LIMITS.maxNameLength) {
    errorKeys.push('val_exercise_name');
  }
  if (nameAr.length > BLUEPRINT_LIMITS.maxNameLength) {
    errorKeys.push('val_exercise_name');
  }
  if (notes.length > BLUEPRINT_LIMITS.maxNotesLength) {
    errorKeys.push('val_notes_too_long');
  }
  return {valid: errorKeys.length === 0, errorKeys};
}

export function validateRoutineInput(input: {
  name: string;
  goal: FitnessGoal;
  estimatedMinutes: number;
  notes?: string;
  exercises: WorkoutRoutine['exercises'];
}): {valid: boolean; errorKeys: string[]} {
  const errorKeys: string[] = [];
  const name = input.name.trim();
  if (name.length < 2 || name.length > BLUEPRINT_LIMITS.maxNameLength) {
    errorKeys.push('val_routine_name');
  }
  if (!Number.isFinite(input.estimatedMinutes) || input.estimatedMinutes < 5 || input.estimatedMinutes > 300) {
    errorKeys.push('val_routine_duration');
  }
  if (input.exercises.length === 0 || input.exercises.length > BLUEPRINT_LIMITS.maxExercisesPerRoutine) {
    errorKeys.push('val_routine_exercises');
  }
  if ((input.notes ?? '').trim().length > BLUEPRINT_LIMITS.maxNotesLength) {
    errorKeys.push('val_notes_too_long');
  }
  return {valid: errorKeys.length === 0, errorKeys};
}

export function calculateBmi(weightKg: number, heightCm: number): number | null {
  if (!Number.isFinite(weightKg) || !Number.isFinite(heightCm) || weightKg <= 0 || heightCm <= 0) {
    return null;
  }
  const heightM = heightCm / 100;
  return roundTo(weightKg / (heightM * heightM), 1);
}

export function validateInitialBodySetup(input: {
  heightCm: number | null;
  weightKg: number | null;
}): {valid: boolean; errorKeys: string[]; heightCm?: number; weightKg?: number} {
  const errorKeys: string[] = [];
  const h = input.heightCm;
  const w = input.weightKg;

  if (h === null || !Number.isFinite(h) || h < BLUEPRINT_LIMITS.heightMinCm || h > BLUEPRINT_LIMITS.heightMaxCm) {
    errorKeys.push('val_invalid_height');
  }
  if (w === null || !Number.isFinite(w) || w < BLUEPRINT_LIMITS.weightMinKg || w > BLUEPRINT_LIMITS.weightMaxKg) {
    errorKeys.push('val_invalid_weight');
  }

  if (errorKeys.length > 0 || h === null || w === null) {
    return {valid: false, errorKeys};
  }

  return {
    valid: true,
    errorKeys: [],
    heightCm: roundTo(h, 1),
    weightKg: roundTo(w, 1),
  };
}

export interface ScopedStorageKeys {
  stateKey: string;
  queueKey: string;
  activeWorkoutKey: string;
}

export function getScopedStorageKeys(uid: string): ScopedStorageKeys {
  const safeUid = uid.trim().replace(/[^a-zA-Z0-9_-]/g, '_');
  if (!safeUid) {
    throw new Error('Account UID is required for isolated storage keys.');
  }
  return {
    stateKey: `ironledger_user_${safeUid}_state_v3`,
    queueKey: `ironledger_user_${safeUid}_queue_v3`,
    activeWorkoutKey: `ironledger_user_${safeUid}_active_v3`,
  };
}

export interface CleanAccountSnapshot {
  preferences: UserPreferences;
  customExercises: ExerciseDefinition[];
  routines: WorkoutRoutine[];
  workouts: WorkoutSession[];
  measurements: BodyMeasurement[];
  progressReports: ProgressReport[];
}

export function createCleanAccountSnapshot(
  language: LanguageCode = 'en',
  theme: ThemeMode = 'light',
): CleanAccountSnapshot {
  return {
    preferences: {
      goal: 'hypertrophy',
      preferredUnit: 'kg',
      language,
      theme,
      heightCm: undefined,
      targetWeightKg: undefined,
    },
    customExercises: [],
    routines: [],
    workouts: [],
    measurements: [],
    progressReports: [],
  };
}


