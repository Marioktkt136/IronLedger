export type FitnessGoal = 'strength' | 'hypertrophy' | 'fat_loss' | 'endurance' | 'general';
export type WeightUnit = 'kg' | 'lbs';
export type LanguageCode = 'en' | 'ar';
export type ThemeMode = 'light' | 'dark';
export type MuscleGroup = 'chest' | 'back' | 'legs' | 'shoulders' | 'arms' | 'core' | 'full_body';
export type EquipmentType =
  | 'barbell'
  | 'dumbbell'
  | 'machine'
  | 'cable'
  | 'bodyweight'
  | 'kettlebell'
  | 'other';
export type TrackingType = 'weight_reps' | 'bodyweight_reps' | 'duration';
export type TimeframeKey = '7d' | '30d' | '90d' | 'all';

export type NavTab = 'dashboard' | 'workouts' | 'routines' | 'exercises' | 'measurements';

export const BLUEPRINT_LIMITS = {
  idPattern: /^[a-zA-Z0-9_-]+$/,
  datePattern: /^\d{4}-\d{2}-\d{2}$/,
  maxIdLength: 128,
  maxNameLength: 100,
  maxTitleLength: 120,
  maxNotesLength: 500,
  maxLongNotesLength: 800,
  maxExercisesPerRoutine: 30,
  maxEntriesPerWorkout: 30,
  weightMinKg: 20,
  weightMaxKg: 400,
  heightMinCm: 100,
  heightMaxCm: 250,
  bodyFatMinPct: 2,
  bodyFatMaxPct: 70,
  chestMinCm: 40,
  chestMaxCm: 220,
  waistMinCm: 35,
  waistMaxCm: 220,
  hipsMinCm: 40,
  hipsMaxCm: 220,
  armsMinCm: 15,
  armsMaxCm: 90,
  thighsMinCm: 25,
  thighsMaxCm: 130,
} as const;

export interface UserPreferences {
  goal: FitnessGoal;
  preferredUnit: WeightUnit;
  language: LanguageCode;
  theme: ThemeMode;
  heightCm?: number;
  targetWeightKg?: number;
}

export interface ExerciseDefinition {
  id: string;
  nameEn: string;
  nameAr: string;
  muscleGroup: MuscleGroup;
  equipment: EquipmentType;
  trackingType: TrackingType;
  notes?: string;
  isCustom: boolean;
}

export interface RoutineExerciseItem {
  exerciseId: string;
  exerciseName: string;
  muscleGroup: MuscleGroup;
  targetSets: number;
  targetReps: string;
  restSeconds: number;
}

export interface WorkoutRoutine {
  id: string;
  name: string;
  goal: FitnessGoal;
  estimatedMinutes: number;
  notes?: string;
  exercises: RoutineExerciseItem[];
  updatedAtIso: string;
}

export interface LoggedSet {
  setNumber: number;
  weightKg: number;
  reps: number;
  completed: boolean;
}

export interface WorkoutEntry {
  exerciseId: string;
  exerciseName: string;
  muscleGroup: MuscleGroup;
  sets: LoggedSet[];
}

export interface WorkoutSession {
  id: string;
  title: string;
  routineId?: string;
  startedAtIso: string;
  completedAtIso: string;
  durationMinutes: number;
  totalVolumeKg: number;
  completedSetsCount: number;
  notes?: string;
  entries: WorkoutEntry[];
}

export interface ActiveWorkoutDraft {
  id: string;
  title: string;
  routineId?: string;
  startedAtMs: number;
  notes: string;
  entries: WorkoutEntry[];
}

export interface BodyMeasurement {
  id: string;
  recordedDate: string;
  weightKg: number;
  bodyFatPct?: number;
  chestCm?: number;
  waistCm?: number;
  hipsCm?: number;
  armsCm?: number;
  thighsCm?: number;
  notes?: string;
}

export interface ProgressReport {
  id: string;
  title: string;
  timeframeLabel: string;
  startDate: string;
  endDate: string;
  workoutsCount: number;
  totalVolumeKg: number;
  weightDeltaKg: number;
  topMuscleGroup: string;
  notes?: string;
}

export interface OfflineMutation {
  id: string;
  collection: 'exercises' | 'routines' | 'workouts' | 'measurements' | 'progressReports' | 'profile';
  action: 'upsert' | 'delete';
  docId: string;
  queuedAtIso: string;
}

export interface SyncStatus {
  isOnline: boolean;
  offlineModeEnabled: boolean;
  isAuthenticated: boolean;
  hasPendingCloudWrites: boolean;
  pendingOfflineCount: number;
  lastSyncedIso: string | null;
}
