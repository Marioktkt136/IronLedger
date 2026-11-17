import {
  BLUEPRINT_LIMITS,
  BodyMeasurement,
  EquipmentType,
  ExerciseDefinition,
  ExerciseGuideRecord,
  FitnessGoal,
  LanguageCode,
  MealLogEntry,
  MuscleGroup,
  PantryFoodItem,
  ProgressReport,
  ThemeMode,
  TimeframeKey,
  TrackingType,
  UserPreferences,
  WeeklyMealPlan,
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
  exerciseGuides: ExerciseGuideRecord[];
  routines: WorkoutRoutine[];
  workouts: WorkoutSession[];
  measurements: BodyMeasurement[];
  progressReports: ProgressReport[];
  mealLogs: MealLogEntry[];
  pantryItems: PantryFoodItem[];
  mealPlans: WeeklyMealPlan[];
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
    exerciseGuides: [],
    routines: [],
    workouts: [],
    measurements: [],
    progressReports: [],
    mealLogs: [],
    pantryItems: [],
    mealPlans: [],
  };
}

export interface ComputedStatsSummary {
  totalWorkouts: number;
  totalVolumeKg: number;
  totalCompletedSets: number;
  latestWeightKg?: number;
  latestMeasurementDate?: string;
}

export function computeUserStatsSummary(
  workouts: WorkoutSession[],
  measurements: BodyMeasurement[],
): ComputedStatsSummary {
  let totalVolumeKg = 0;
  let totalCompletedSets = 0;
  for (const w of workouts) {
    totalVolumeKg += Math.max(0, w.totalVolumeKg || 0);
    totalCompletedSets += Math.max(0, w.completedSetsCount || 0);
  }

  let latestMeasurement: BodyMeasurement | null = null;
  for (const m of measurements) {
    if (!latestMeasurement || m.recordedDate.localeCompare(latestMeasurement.recordedDate) > 0) {
      latestMeasurement = m;
    }
  }

  const summary: ComputedStatsSummary = {
    totalWorkouts: Math.min(100000, workouts.length),
    totalVolumeKg: Math.min(100000000, roundTo(totalVolumeKg, 1)),
    totalCompletedSets: Math.min(1000000, Math.round(totalCompletedSets)),
  };
  if (latestMeasurement) {
    summary.latestWeightKg = latestMeasurement.weightKg;
    summary.latestMeasurementDate = latestMeasurement.recordedDate;
  }
  return summary;
}

const SHA256_K = [
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
  0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
  0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
];

function rotr(value: number, bits: number): number {
  return (value >>> bits) | (value << (32 - bits));
}

export function sha256Hex(input: string): string {
  const bytes = new TextEncoder().encode(input);
  const bitLen = bytes.length * 8;
  const withOneLen = bytes.length + 1;
  const padZeroLen = (64 - ((withOneLen + 8) % 64)) % 64;
  const totalLen = withOneLen + padZeroLen + 8;
  const padded = new Uint8Array(totalLen);
  padded.set(bytes);
  padded[bytes.length] = 0x80;

  const view = new DataView(padded.buffer);
  const highBits = Math.floor(bitLen / 0x100000000);
  const lowBits = bitLen >>> 0;
  view.setUint32(totalLen - 8, highBits, false);
  view.setUint32(totalLen - 4, lowBits, false);

  let h0 = 0x6a09e667;
  let h1 = 0xbb67ae85;
  let h2 = 0x3c6ef372;
  let h3 = 0xa54ff53a;
  let h4 = 0x510e527f;
  let h5 = 0x9b05688c;
  let h6 = 0x1f83d9ab;
  let h7 = 0x5be0cd19;

  const w = new Uint32Array(64);
  for (let offset = 0; offset < totalLen; offset += 64) {
    for (let i = 0; i < 16; i++) {
      w[i] = view.getUint32(offset + i * 4, false);
    }
    for (let i = 16; i < 64; i++) {
      const s0 = rotr(w[i - 15], 7) ^ rotr(w[i - 15], 18) ^ (w[i - 15] >>> 3);
      const s1 = rotr(w[i - 2], 17) ^ rotr(w[i - 2], 19) ^ (w[i - 2] >>> 10);
      w[i] = (w[i - 16] + s0 + w[i - 7] + s1) >>> 0;
    }

    let a = h0;
    let b = h1;
    let c = h2;
    let d = h3;
    let e = h4;
    let f = h5;
    let g = h6;
    let h = h7;

    for (let i = 0; i < 64; i++) {
      const S1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25);
      const ch = (e & f) ^ (~e & g);
      const temp1 = (h + S1 + ch + SHA256_K[i] + w[i]) >>> 0;
      const S0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const temp2 = (S0 + maj) >>> 0;

      h = g;
      g = f;
      f = e;
      e = (d + temp1) >>> 0;
      d = c;
      c = b;
      b = a;
      a = (temp1 + temp2) >>> 0;
    }

    h0 = (h0 + a) >>> 0;
    h1 = (h1 + b) >>> 0;
    h2 = (h2 + c) >>> 0;
    h3 = (h3 + d) >>> 0;
    h4 = (h4 + e) >>> 0;
    h5 = (h5 + f) >>> 0;
    h6 = (h6 + g) >>> 0;
    h7 = (h7 + h) >>> 0;
  }

  return [h0, h1, h2, h3, h4, h5, h6, h7]
    .map((val) => val.toString(16).padStart(8, '0'))
    .join('');
}

export function hashAccountEmail(email: string): string {
  return sha256Hex(email.trim().toLowerCase());
}

export interface DailyNutritionTarget {
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
}

export function calculateDailyCalorieTarget(input: {
  weightKg?: number | null;
  heightCm?: number | null;
  goal: FitnessGoal;
}): DailyNutritionTarget {
  const w = input.weightKg && input.weightKg >= 30 && input.weightKg <= 300 ? input.weightKg : 75;
  const h = input.heightCm && input.heightCm >= 120 && input.heightCm <= 230 ? input.heightCm : 175;
  // Mifflin-St Jeor baseline (neutral adult age 28) x moderate gym activity factor 1.5
  const bmr = 10 * w + 6.25 * h - 5 * 28 - 40;
  const tdee = bmr * 1.5;

  let adjustment = 0;
  if (input.goal === 'fat_loss') adjustment = -400;
  else if (input.goal === 'hypertrophy') adjustment = 250;
  else if (input.goal === 'strength') adjustment = 200;
  else if (input.goal === 'endurance') adjustment = 150;

  const calories = Math.min(4800, Math.max(1300, Math.round((tdee + adjustment) / 10) * 10));
  const proteinPerKg = input.goal === 'fat_loss' ? 2.1 : input.goal === 'hypertrophy' || input.goal === 'strength' ? 1.9 : 1.6;
  const proteinG = Math.round(w * proteinPerKg);
  const fatG = Math.round((calories * 0.25) / 9);
  const remainingKcal = Math.max(200, calories - proteinG * 4 - fatG * 9);
  const carbsG = Math.round(remainingKcal / 4);

  return {calories, proteinG, carbsG, fatG};
}

export interface DailyNutritionSummary {
  dateYmd: string;
  mealsCount: number;
  consumedCalories: number;
  remainingCalories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  fiberG: number;
  caloriePct: number;
}

export function computeDailyNutritionSummary(
  mealLogs: MealLogEntry[],
  dateYmd: string,
  targetCalories: number,
): DailyNutritionSummary {
  const dayMeals = mealLogs.filter((m) => m.loggedDate === dateYmd);
  let consumedCalories = 0;
  let proteinG = 0;
  let carbsG = 0;
  let fatG = 0;
  let fiberG = 0;

  for (const m of dayMeals) {
    consumedCalories += Math.max(0, m.totalCalories || 0);
    proteinG += Math.max(0, m.proteinG || 0);
    carbsG += Math.max(0, m.carbsG || 0);
    fatG += Math.max(0, m.fatG || 0);
    fiberG += Math.max(0, m.fiberG || 0);
  }

  consumedCalories = Math.round(consumedCalories);
  const safeTarget = Math.max(1, targetCalories);
  const caloriePct = Math.min(150, Math.round((consumedCalories / safeTarget) * 100));

  return {
    dateYmd,
    mealsCount: dayMeals.length,
    consumedCalories,
    remainingCalories: Math.max(0, Math.round(safeTarget - consumedCalories)),
    proteinG: roundTo(proteinG, 1),
    carbsG: roundTo(carbsG, 1),
    fatG: roundTo(fatG, 1),
    fiberG: roundTo(fiberG, 1),
    caloriePct,
  };
}


