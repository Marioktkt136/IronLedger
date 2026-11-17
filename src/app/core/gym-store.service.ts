import {isPlatformBrowser} from '@angular/common';
import {Injectable, PLATFORM_ID, computed, inject, signal} from '@angular/core';
import type {AuthUserSummary, CloudSyncCallbacks, FirebaseSyncAdapter} from './firebase-sync.adapter';
import {
  calculateDailyCalorieTarget,
  calculateWorkoutVolumeKg,
  computeMuscleVolumeBreakdown,
  computePersonalRecords,
  computeProgressReportSummary,
  computeSessionsInLast7Days,
  countCompletedSets,
  createCleanAccountSnapshot,
  DailyNutritionTarget,
  getScopedStorageKeys,
} from './fitness-math';
import {I18nService} from './i18n.service';
import {
  ActiveWorkoutDraft,
  BLUEPRINT_LIMITS,
  BodyMeasurement,
  ExerciseDefinition,
  ExerciseGuideRecord,
  FitnessGoal,
  LanguageCode,
  MealLogEntry,
  OfflineMutation,
  PantryFoodItem,
  ProgressReport,
  SyncStatus,
  ThemeMode,
  TimeframeKey,
  UserPreferences,
  WeeklyMealPlan,
  WorkoutEntry,
  WorkoutRoutine,
  WorkoutSession,
} from './models';
import {BUILTIN_EXERCISES} from './seed-data';
import {ThemeService} from './theme.service';

const LEGACY_GLOBAL_KEYS = [
  'ironledger_local_state_v1',
  'ironledger_local_state_v2',
  'ironledger_offline_queue_v1',
  'ironledger_active_workout_v1',
];

const DEVICE_CLIENT_ID_KEY = 'ironledger_client_id_v1';

interface LocalStoreSnapshot {
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

function makeDocId(prefix: string): string {
  const rand = Math.random().toString(36).slice(2, 8);
  return `${prefix}_${Date.now()}_${rand}`.replace(/[^a-zA-Z0-9_-]/g, '');
}

function clampString(value: string | undefined, maxLen: number): string | undefined {
  if (value === undefined) return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  return trimmed.slice(0, maxLen);
}

@Injectable({providedIn: 'root'})
export class GymStoreService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly i18n = inject(I18nService);
  private readonly themeService = inject(ThemeService);

  private adapter: FirebaseSyncAdapter | null = null;
  private callbacksRef: CloudSyncCallbacks | null = null;
  private activeUid: string | null = null;
  private deviceClientId = 'cli_default';
  private userModifiedViewOptions = false;
  private authActionInFlight = false;
  private pendingSignupDisplayName: string | null = null;
  private authSeq = 0;
  private restIntervalId: ReturnType<typeof setInterval> | null = null;

  // Auth, Startup Login Gate & Network State
  readonly showLoginView = signal(true);
  readonly user = signal<AuthUserSummary | null>(null);
  readonly authReady = signal(false);
  readonly authBusy = signal(false);
  readonly authError = signal<string | null>(null);
  readonly authNotice = signal<string | null>(null);
  readonly authProviderNeedsSetup = signal(false);
  readonly isOnline = signal(true);
  readonly offlineModeEnabled = signal(false);
  readonly hasPendingCloudWrites = signal(false);
  readonly pendingQueue = signal<OfflineMutation[]>([]);
  readonly lastSyncedIso = signal<string | null>(null);

  // Domain State (strictly isolated per signed-in account; empty by default)
  readonly preferences = signal<UserPreferences>({
    goal: 'hypertrophy',
    preferredUnit: 'kg',
    language: 'en',
    theme: 'light',
    heightCm: undefined,
    targetWeightKg: undefined,
  });
  readonly customExercises = signal<ExerciseDefinition[]>([]);
  readonly exerciseGuides = signal<ExerciseGuideRecord[]>([]);
  readonly routines = signal<WorkoutRoutine[]>([]);
  readonly workouts = signal<WorkoutSession[]>([]);
  readonly measurements = signal<BodyMeasurement[]>([]);
  readonly progressReports = signal<ProgressReport[]>([]);
  readonly mealLogs = signal<MealLogEntry[]>([]);
  readonly pantryItems = signal<PantryFoodItem[]>([]);
  readonly mealPlans = signal<WeeklyMealPlan[]>([]);
  readonly activeWorkout = signal<ActiveWorkoutDraft | null>(null);

  // Onboarding Flag: prompt first for height (cm) & weight (kg) once logged in and data is empty
  readonly needsBodySetup = computed(
    () =>
      !this.showLoginView() &&
      this.user() !== null &&
      (this.preferences().heightCm === undefined || this.measurements().length === 0),
  );

  // Rest Timer
  readonly restSecondsLeft = signal(0);
  readonly restTimerRunning = computed(() => this.restSecondsLeft() > 0);

  // Derived Signals
  readonly allExercises = computed<ExerciseDefinition[]>(() => {
    return [...this.customExercises(), ...BUILTIN_EXERCISES];
  });

  readonly sortedWorkouts = computed<WorkoutSession[]>(() => {
    return [...this.workouts()].sort((a, b) => b.completedAtIso.localeCompare(a.completedAtIso));
  });

  readonly sortedMeasurements = computed<BodyMeasurement[]>(() => {
    return [...this.measurements()].sort((a, b) => b.recordedDate.localeCompare(a.recordedDate));
  });

  readonly latestMeasurement = computed<BodyMeasurement | null>(() => {
    const list = this.sortedMeasurements();
    return list.length > 0 ? list[0] : null;
  });

  readonly baselineMeasurement = computed<BodyMeasurement | null>(() => {
    const list = this.sortedMeasurements();
    return list.length > 0 ? list[list.length - 1] : null;
  });

  readonly weeklySessionsCount = computed(() => computeSessionsInLast7Days(this.workouts()));
  readonly personalRecords = computed(() => computePersonalRecords(this.workouts()));
  readonly muscleBreakdown = computed(() => computeMuscleVolumeBreakdown(this.workouts()));

  readonly dailyNutritionTarget = computed<DailyNutritionTarget>(() =>
    calculateDailyCalorieTarget({
      weightKg: this.latestMeasurement()?.weightKg ?? this.preferences().targetWeightKg,
      heightCm: this.preferences().heightCm,
      goal: this.preferences().goal,
    }),
  );

  readonly sortedMealLogs = computed<MealLogEntry[]>(() => {
    return [...this.mealLogs()].sort((a, b) => b.loggedDate.localeCompare(a.loggedDate));
  });

  readonly syncStatus = computed<SyncStatus>(() => ({
    isOnline: this.isOnline(),
    offlineModeEnabled: this.offlineModeEnabled(),
    isAuthenticated: this.user() !== null,
    hasPendingCloudWrites: this.hasPendingCloudWrites(),
    pendingOfflineCount: this.pendingQueue().length,
    lastSyncedIso: this.lastSyncedIso(),
  }));

  constructor() {
    if (isPlatformBrowser(this.platformId)) {
      this.isOnline.set(navigator.onLine);
      window.addEventListener('online', () => {
        this.isOnline.set(true);
        void this.flushOfflineQueueIfReady();
      });
      window.addEventListener('offline', () => {
        this.isOnline.set(false);
      });

      this.deviceClientId = this.getOrCreateClientId();
      this.purgeLegacyGlobalStorage();
      this.resetInMemoryDomainState();
      void this.initFirebase();
    }
  }

  private getOrCreateClientId(): string {
    try {
      const existing = localStorage.getItem(DEVICE_CLIENT_ID_KEY);
      if (existing && BLUEPRINT_LIMITS.idPattern.test(existing) && existing.length <= 128) {
        return existing;
      }
      const created = makeDocId('cli');
      localStorage.setItem(DEVICE_CLIENT_ID_KEY, created);
      return created;
    } catch {
      return 'cli_default';
    }
  }

  private purgeLegacyGlobalStorage(): void {
    try {
      for (const legacyKey of LEGACY_GLOBAL_KEYS) {
        localStorage.removeItem(legacyKey);
      }
    } catch {
      // Ignore storage access errors
    }
  }

  private resetInMemoryDomainState(): void {
    this.skipRestTimer();
    const clean = createCleanAccountSnapshot(this.i18n.lang(), this.themeService.theme());
    this.preferences.set(clean.preferences);
    this.customExercises.set([]);
    this.exerciseGuides.set([]);
    this.routines.set([]);
    this.workouts.set([]);
    this.measurements.set([]);
    this.progressReports.set([]);
    this.mealLogs.set([]);
    this.pantryItems.set([]);
    this.mealPlans.set([]);
    this.activeWorkout.set(null);
    this.pendingQueue.set([]);
    this.hasPendingCloudWrites.set(false);
    this.lastSyncedIso.set(null);
  }

  private clearScopedStorageForUid(uid: string): void {
    if (!isPlatformBrowser(this.platformId)) return;
    try {
      const keys = getScopedStorageKeys(uid);
      localStorage.removeItem(keys.stateKey);
      localStorage.removeItem(keys.queueKey);
      localStorage.removeItem(keys.activeWorkoutKey);
    } catch {
      // Ignore
    }
  }

  private async initFirebase(): Promise<void> {
    try {
      const {FirebaseSyncAdapter} = await import('./firebase-sync.adapter');
      this.adapter = new FirebaseSyncAdapter();

      // Load saved theme & language from Firestore appOptions so Login View uses saved options immediately
      void this.adapter.loadAppOptions(this.deviceClientId).then((savedOpts) => {
        if (savedOpts && !this.userModifiedViewOptions && !this.activeUid) {
          this.i18n.setLanguage(savedOpts.language);
          this.themeService.setTheme(savedOpts.theme);
          this.preferences.update((prev) => ({
            ...prev,
            language: savedOpts.language,
            theme: savedOpts.theme,
          }));
        }
      });

      const callbacks: CloudSyncCallbacks = {
        onAuthChange: async (firebaseUser: AuthUserSummary | null) => {
          if (this.authActionInFlight) {
            return;
          }

          const seq = ++this.authSeq;

          if (!firebaseUser) {
            this.user.set(null);
            this.authReady.set(true);
            this.activeUid = null;
            this.adapter?.clearCollectionListeners();
            this.resetInMemoryDomainState();
            this.showLoginView.set(true);
            return;
          }

          if (this.activeUid === firebaseUser.uid) {
            this.user.set(firebaseUser);
            this.authReady.set(true);
            return;
          }

          // Verify user account record actually exists in Firestore database
          try {
            const existsInDb = await this.adapter!.verifyUserExistsInDatabase(firebaseUser.uid);
            if (seq !== this.authSeq || this.authActionInFlight) {
              return;
            }
            if (!existsInDb) {
              await this.adapter!.signOut();
              this.user.set(null);
              this.activeUid = null;
              this.authReady.set(true);
              this.resetInMemoryDomainState();
              this.showLoginView.set(true);
              return;
            }
          } catch {
            // If offline verification cannot reach server, allow local scoped state only if already cached
          }

          this.user.set(firebaseUser);
          this.authReady.set(true);
          await this.activateUserSession(firebaseUser, seq, false);
        },
        onSyncMeta: (hasPending: boolean, fromCache: boolean) => {
          this.hasPendingCloudWrites.set(hasPending);
          if (!hasPending && !fromCache) {
            this.lastSyncedIso.set(new Date().toISOString());
          }
        },
        onAccountRoot: (biometrics) => {
          this.preferences.update((prev) => ({
            ...prev,
            heightCm: biometrics.heightCm,
            targetWeightKg: biometrics.targetWeightKg,
          }));
          this.persistLocalState();
        },
        onSettings: (settings) => {
          this.preferences.update((prev) => ({
            ...prev,
            goal: settings.goal,
            preferredUnit: settings.preferredUnit,
            language: settings.language,
            theme: settings.theme,
          }));
          this.i18n.setLanguage(settings.language);
          this.themeService.setTheme(settings.theme);
          this.persistLocalState();
          void this.adapter?.saveAppOptions(this.deviceClientId, {
            language: settings.language,
            theme: settings.theme,
          });
        },
        onExercises: (list: ExerciseDefinition[]) => {
          this.customExercises.set(list);
          this.persistLocalState();
        },
        onExerciseGuides: (list: ExerciseGuideRecord[]) => {
          this.exerciseGuides.set(list);
          this.persistLocalState();
        },
        onRoutines: (list: WorkoutRoutine[]) => {
          this.routines.set(list);
          this.persistLocalState();
        },
        onWorkouts: (list: WorkoutSession[]) => {
          this.workouts.set(list);
          this.persistLocalState();
        },
        onMeasurements: (list: BodyMeasurement[]) => {
          this.measurements.set(list);
          this.persistLocalState();
        },
        onReports: (list: ProgressReport[]) => {
          this.progressReports.set(list);
          this.persistLocalState();
        },
        onMealLogs: (list: MealLogEntry[]) => {
          this.mealLogs.set(list);
          this.persistLocalState();
        },
        onPantryItems: (list: PantryFoodItem[]) => {
          this.pantryItems.set(list);
          this.persistLocalState();
        },
        onMealPlans: (list: WeeklyMealPlan[]) => {
          this.mealPlans.set(list);
          this.persistLocalState();
        },
      };
      this.callbacksRef = callbacks;
      this.adapter.startAuthListener(callbacks);
    } catch (err) {
      console.error('Firebase initialization warning:', err);
      this.authReady.set(true);
    }
  }

  private async activateUserSession(
    firebaseUser: AuthUserSummary,
    seq: number,
    isNewAccount: boolean,
  ): Promise<void> {
    if (!this.adapter || !this.callbacksRef) return;

    const effectiveUser: AuthUserSummary =
      !firebaseUser.displayName && this.pendingSignupDisplayName
        ? {...firebaseUser, displayName: this.pendingSignupDisplayName}
        : firebaseUser;
    this.pendingSignupDisplayName = null;
    this.user.set(effectiveUser);

    this.adapter.clearCollectionListeners();
    this.resetInMemoryDomainState();
    this.activeUid = effectiveUser.uid;

    if (isNewAccount) {
      this.clearScopedStorageForUid(effectiveUser.uid);
      this.resetInMemoryDomainState();
      this.persistLocalState();
      this.lastSyncedIso.set(new Date().toISOString());
    } else {
      this.loadLocalStateForUid(effectiveUser.uid);
      this.loadActiveWorkoutDraftForUid(effectiveUser.uid);
      await this.flushOfflineQueueIfReady();
    }

    if (seq !== this.authSeq || this.activeUid !== effectiveUser.uid) {
      return;
    }

    this.adapter.attachCollectionListeners(effectiveUser.uid, this.callbacksRef);
  }

  private loadLocalStateForUid(uid: string): void {
    try {
      const keys = getScopedStorageKeys(uid);
      const raw = localStorage.getItem(keys.stateKey);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<LocalStoreSnapshot>;
        if (parsed.preferences) {
          this.preferences.set(parsed.preferences);
          this.i18n.setLanguage(parsed.preferences.language);
          this.themeService.setTheme(parsed.preferences.theme);
        }
        if (Array.isArray(parsed.customExercises)) this.customExercises.set(parsed.customExercises);
        if (Array.isArray(parsed.exerciseGuides)) this.exerciseGuides.set(parsed.exerciseGuides);
        if (Array.isArray(parsed.routines)) this.routines.set(parsed.routines);
        if (Array.isArray(parsed.workouts)) this.workouts.set(parsed.workouts);
        if (Array.isArray(parsed.measurements)) this.measurements.set(parsed.measurements);
        if (Array.isArray(parsed.progressReports)) this.progressReports.set(parsed.progressReports);
        if (Array.isArray(parsed.mealLogs)) this.mealLogs.set(parsed.mealLogs);
        if (Array.isArray(parsed.pantryItems)) this.pantryItems.set(parsed.pantryItems);
        if (Array.isArray(parsed.mealPlans)) this.mealPlans.set(parsed.mealPlans);
      }

      const rawQueue = localStorage.getItem(keys.queueKey);
      if (rawQueue) {
        const parsedQueue = JSON.parse(rawQueue) as OfflineMutation[];
        if (Array.isArray(parsedQueue)) {
          this.pendingQueue.set(parsedQueue);
        }
      }
    } catch {
      // Keep clean empty signals
    }
  }

  private persistLocalState(): void {
    const uid = this.user()?.uid;
    if (!isPlatformBrowser(this.platformId) || !uid) return;
    try {
      const keys = getScopedStorageKeys(uid);
      const snapshot: LocalStoreSnapshot = {
        preferences: this.preferences(),
        customExercises: this.customExercises(),
        exerciseGuides: this.exerciseGuides(),
        routines: this.routines(),
        workouts: this.workouts(),
        measurements: this.measurements(),
        progressReports: this.progressReports(),
        mealLogs: this.mealLogs(),
        pantryItems: this.pantryItems(),
        mealPlans: this.mealPlans(),
      };
      localStorage.setItem(keys.stateKey, JSON.stringify(snapshot));
      localStorage.setItem(keys.queueKey, JSON.stringify(this.pendingQueue()));
    } catch {
      // Ignore quota errors
    }
  }

  private loadActiveWorkoutDraftForUid(uid: string): void {
    try {
      const keys = getScopedStorageKeys(uid);
      const raw = localStorage.getItem(keys.activeWorkoutKey);
      if (raw) {
        const parsed = JSON.parse(raw) as ActiveWorkoutDraft;
        if (parsed && parsed.id && Array.isArray(parsed.entries)) {
          this.activeWorkout.set(parsed);
        }
      }
    } catch {
      // Ignore
    }
  }

  private persistActiveWorkoutDraft(): void {
    const uid = this.user()?.uid;
    if (!isPlatformBrowser(this.platformId) || !uid) return;
    try {
      const keys = getScopedStorageKeys(uid);
      const draft = this.activeWorkout();
      if (draft) {
        localStorage.setItem(keys.activeWorkoutKey, JSON.stringify(draft));
      } else {
        localStorage.removeItem(keys.activeWorkoutKey);
      }
    } catch {
      // Ignore
    }
  }

  private enqueueMutation(
    collectionName: OfflineMutation['collection'],
    action: OfflineMutation['action'],
    docId: string,
  ): void {
    const current = this.pendingQueue().filter(
      (item) => !(item.collection === collectionName && item.docId === docId),
    );
    current.push({
      id: makeDocId('mut'),
      collection: collectionName,
      action,
      docId,
      queuedAtIso: new Date().toISOString(),
    });
    this.pendingQueue.set(current);
    this.persistLocalState();
  }

  private dequeueMutation(collectionName: OfflineMutation['collection'], docId: string): void {
    this.pendingQueue.set(
      this.pendingQueue().filter((item) => !(item.collection === collectionName && item.docId === docId)),
    );
    this.persistLocalState();
  }

  enterCurrentAccount(): void {
    if (this.user()) {
      this.authError.set(null);
      this.authNotice.set(null);
      this.showLoginView.set(false);
    }
  }

  openLoginView(): void {
    this.authError.set(null);
    this.authNotice.set(null);
    this.authProviderNeedsSetup.set(false);
    this.showLoginView.set(true);
  }

  clearAuthMessages(): void {
    this.authError.set(null);
    this.authNotice.set(null);
    this.authProviderNeedsSetup.set(false);
  }

  private handleAuthFailure(err: unknown): void {
    const t = this.i18n.t();
    const msg = err instanceof Error ? err.message : String(err);
    const code =
      typeof err === 'object' && err !== null && 'code' in err
        ? String((err as {code?: unknown}).code ?? '')
        : '';

    if (msg === 'AUTH_NOT_IN_DATABASE') {
      this.authError.set(t.err_auth_not_in_database);
    } else if (msg === 'AUTH_DB_UNAVAILABLE') {
      this.authError.set(t.err_auth_db_unavailable);
    } else if (code === 'auth/email-already-in-use') {
      this.authError.set(t.err_auth_email_in_use);
    } else if (
      code === 'auth/invalid-credential' ||
      code === 'auth/wrong-password' ||
      code === 'auth/user-not-found'
    ) {
      this.authError.set(t.err_auth_invalid_credentials);
    } else if (code === 'auth/invalid-email') {
      this.authError.set(t.err_auth_invalid_email);
    } else if (code === 'auth/weak-password') {
      this.authError.set(t.err_auth_weak_password);
    } else if (code === 'auth/operation-not-allowed') {
      this.authProviderNeedsSetup.set(true);
      this.authError.set(t.err_auth_operation_not_allowed);
    } else if (code === 'auth/too-many-requests') {
      this.authError.set(t.err_auth_too_many_requests);
    } else {
      this.authError.set(msg || 'Authentication failed');
    }
  }

  async signUpWithEmail(displayName: string, email: string, password: string): Promise<void> {
    if (!this.adapter) return;
    this.authBusy.set(true);
    this.authActionInFlight = true;
    this.clearAuthMessages();
    this.pendingSignupDisplayName = displayName.trim().slice(0, 120) || null;
    try {
      const createdUser = await this.adapter.signUpWithEmail(displayName, email, password, {
        language: this.i18n.lang(),
        theme: this.themeService.theme(),
      });
      if (createdUser) {
        this.user.set(createdUser);
        await this.activateUserSession(createdUser, ++this.authSeq, true);
        this.showLoginView.set(false);
      }
    } catch (err) {
      this.pendingSignupDisplayName = null;
      this.handleAuthFailure(err);
    } finally {
      this.authActionInFlight = false;
      this.authBusy.set(false);
    }
  }

  async signInWithEmail(email: string, password: string): Promise<void> {
    if (!this.adapter) return;
    this.authBusy.set(true);
    this.authActionInFlight = true;
    this.clearAuthMessages();
    try {
      const signedInUser = await this.adapter.signInWithEmail(email, password);
      if (signedInUser) {
        this.user.set(signedInUser);
        if (this.activeUid !== signedInUser.uid) {
          await this.activateUserSession(signedInUser, ++this.authSeq, false);
        }
        this.showLoginView.set(false);
      }
    } catch (err) {
      this.handleAuthFailure(err);
    } finally {
      this.authActionInFlight = false;
      this.authBusy.set(false);
    }
  }

  async sendPasswordReset(email: string): Promise<void> {
    if (!this.adapter) return;
    this.authBusy.set(true);
    this.clearAuthMessages();
    try {
      await this.adapter.sendPasswordReset(email);
      this.authNotice.set(this.i18n.t().loginResetSent);
    } catch (err) {
      this.handleAuthFailure(err);
    } finally {
      this.authBusy.set(false);
    }
  }

  switchAccount(): void {
    this.openLoginView();
  }

  async signOut(): Promise<void> {
    if (!this.adapter) return;
    this.authBusy.set(true);
    this.clearAuthMessages();
    try {
      this.activeUid = null;
      this.authSeq += 1;
      this.adapter.clearCollectionListeners();
      this.resetInMemoryDomainState();
      await this.adapter.signOut();
      this.user.set(null);
      this.showLoginView.set(true);
    } finally {
      this.authBusy.set(false);
    }
  }

  async toggleOfflineMode(): Promise<void> {
    const next = !this.offlineModeEnabled();
    this.offlineModeEnabled.set(next);
    if (!this.adapter) return;
    try {
      await this.adapter.setOfflineNetwork(next);
      if (!next) {
        await this.flushOfflineQueueIfReady();
      }
    } catch (err) {
      console.error('Network toggle error:', err);
    }
  }

  private canSyncCloudNow(): boolean {
    return (
      isPlatformBrowser(this.platformId) &&
      this.adapter !== null &&
      this.user() !== null &&
      this.isOnline() &&
      !this.offlineModeEnabled()
    );
  }

  async flushOfflineQueueIfReady(): Promise<void> {
    if (!this.canSyncCloudNow() || !this.adapter || !this.user()) return;
    const queue = [...this.pendingQueue()];
    if (queue.length === 0) return;

    const uid = this.user()!.uid;
    for (const mut of queue) {
      if (mut.collection === 'profile') {
        await this.adapter.syncPreferences(uid, this.preferences());
      } else if (mut.action === 'delete') {
        await this.adapter.deleteSubdoc(uid, mut.collection, mut.docId);
      } else if (mut.collection === 'exercises') {
        const ex = this.customExercises().find((x) => x.id === mut.docId);
        if (ex) await this.adapter.upsertExercise(uid, ex);
      } else if (mut.collection === 'exerciseGuides') {
        const gd = this.exerciseGuides().find((x) => x.id === mut.docId);
        if (gd) await this.adapter.upsertExerciseGuide(uid, gd);
      } else if (mut.collection === 'routines') {
        const rt = this.routines().find((x) => x.id === mut.docId);
        if (rt) await this.adapter.upsertRoutine(uid, rt);
      } else if (mut.collection === 'workouts') {
        const wk = this.workouts().find((x) => x.id === mut.docId);
        if (wk) await this.adapter.upsertWorkout(uid, wk);
      } else if (mut.collection === 'measurements') {
        const ms = this.measurements().find((x) => x.id === mut.docId);
        if (ms) await this.adapter.upsertMeasurement(uid, ms);
      } else if (mut.collection === 'progressReports') {
        const rp = this.progressReports().find((x) => x.id === mut.docId);
        if (rp) await this.adapter.upsertReport(uid, rp);
      } else if (mut.collection === 'mealLogs') {
        const ml = this.mealLogs().find((x) => x.id === mut.docId);
        if (ml) await this.adapter.upsertMealLog(uid, ml);
      } else if (mut.collection === 'pantryItems') {
        const pi = this.pantryItems().find((x) => x.id === mut.docId);
        if (pi) await this.adapter.upsertPantryItem(uid, pi);
      } else if (mut.collection === 'mealPlans') {
        const mp = this.mealPlans().find((x) => x.id === mut.docId);
        if (mp) await this.adapter.upsertMealPlan(uid, mp);
      }
      this.dequeueMutation(mut.collection, mut.docId);
    }
    await this.adapter.syncStatsSummary(uid, this.workouts(), this.measurements());
    this.lastSyncedIso.set(new Date().toISOString());
  }

  private async dispatchCloudWrite(op: () => Promise<void>): Promise<void> {
    if (!this.isOnline() || this.offlineModeEnabled()) {
      this.hasPendingCloudWrites.set(true);
      void op();
      return;
    }
    await op();
  }

  // Device + Account View Options (Theme & Language saved in Firestore so Login View opens with them)
  async saveViewOptions(patch: {language?: LanguageCode; theme?: ThemeMode}): Promise<void> {
    this.userModifiedViewOptions = true;
    if (patch.language) this.i18n.setLanguage(patch.language);
    if (patch.theme) this.themeService.setTheme(patch.theme);

    const nextLang = patch.language ?? this.i18n.lang();
    const nextTheme = patch.theme ?? this.themeService.theme();
    this.preferences.update((prev) => ({
      ...prev,
      language: nextLang,
      theme: nextTheme,
    }));

    if (this.adapter && this.isOnline() && !this.offlineModeEnabled()) {
      void this.adapter.saveAppOptions(this.deviceClientId, {
        language: nextLang,
        theme: nextTheme,
      });
    }

    const uid = this.user()?.uid;
    if (uid && this.adapter) {
      this.persistLocalState();
      const adapter = this.adapter;
      const nextPrefs = this.preferences();
      await this.dispatchCloudWrite(() => adapter.syncPreferences(uid, nextPrefs));
    }
  }

  // Preferences
  async updatePreferences(patch: Partial<UserPreferences>): Promise<void> {
    if (patch.language || patch.theme) {
      this.userModifiedViewOptions = true;
    }
    const next: UserPreferences = {...this.preferences(), ...patch};
    this.preferences.set(next);
    if (patch.language) this.i18n.setLanguage(patch.language);
    if (patch.theme) this.themeService.setTheme(patch.theme);

    if (this.adapter && (patch.language || patch.theme) && this.isOnline() && !this.offlineModeEnabled()) {
      void this.adapter.saveAppOptions(this.deviceClientId, {
        language: next.language,
        theme: next.theme,
      });
    }

    const uid = this.user()?.uid;
    if (!uid || !this.adapter) return;

    this.persistLocalState();
    const adapter = this.adapter;
    await this.dispatchCloudWrite(() => adapter.syncPreferences(uid, next));
  }

  // Custom Exercises
  async addCustomExercise(input: Omit<ExerciseDefinition, 'id' | 'isCustom'>): Promise<ExerciseDefinition> {
    const created: ExerciseDefinition = {
      id: makeDocId('ex'),
      nameEn: input.nameEn.trim().slice(0, BLUEPRINT_LIMITS.maxNameLength),
      nameAr: (input.nameAr ?? '').trim().slice(0, BLUEPRINT_LIMITS.maxNameLength),
      muscleGroup: input.muscleGroup,
      equipment: input.equipment,
      trackingType: input.trackingType,
      notes: clampString(input.notes, BLUEPRINT_LIMITS.maxNotesLength),
      isCustom: true,
    };

    this.customExercises.set([created, ...this.customExercises()]);
    this.persistLocalState();

    const uid = this.user()?.uid;
    if (uid && this.adapter) {
      const adapter = this.adapter;
      await this.dispatchCloudWrite(() => adapter.upsertExercise(uid, created));
    }
    return created;
  }

  async deleteCustomExercise(exerciseId: string): Promise<void> {
    this.customExercises.set(this.customExercises().filter((e) => e.id !== exerciseId));
    this.persistLocalState();

    const uid = this.user()?.uid;
    if (uid && this.adapter) {
      const adapter = this.adapter;
      await this.dispatchCloudWrite(() => adapter.deleteSubdoc(uid, 'exercises', exerciseId));
    }
  }

  // Routines
  async saveRoutine(routine: Omit<WorkoutRoutine, 'id' | 'updatedAtIso'> & {id?: string}): Promise<WorkoutRoutine> {
    const id = routine.id ?? makeDocId('rt');
    const saved: WorkoutRoutine = {
      id,
      name: routine.name.trim().slice(0, BLUEPRINT_LIMITS.maxNameLength),
      goal: routine.goal,
      estimatedMinutes: Math.min(300, Math.max(5, Math.round(routine.estimatedMinutes))),
      notes: clampString(routine.notes, BLUEPRINT_LIMITS.maxNotesLength),
      exercises: routine.exercises.slice(0, BLUEPRINT_LIMITS.maxExercisesPerRoutine),
      updatedAtIso: new Date().toISOString(),
    };

    const exists = this.routines().some((r) => r.id === id);
    this.routines.set(
      exists ? this.routines().map((r) => (r.id === id ? saved : r)) : [saved, ...this.routines()],
    );
    this.persistLocalState();

    const uid = this.user()?.uid;
    if (uid && this.adapter) {
      const adapter = this.adapter;
      await this.dispatchCloudWrite(() => adapter.upsertRoutine(uid, saved));
    }
    return saved;
  }

  async deleteRoutine(routineId: string): Promise<void> {
    this.routines.set(this.routines().filter((r) => r.id !== routineId));
    this.persistLocalState();

    const uid = this.user()?.uid;
    if (uid && this.adapter) {
      const adapter = this.adapter;
      await this.dispatchCloudWrite(() => adapter.deleteSubdoc(uid, 'routines', routineId));
    }
  }

  // Active Workout Runner
  startWorkoutFromRoutine(routine: WorkoutRoutine): void {
    const entries: WorkoutEntry[] = routine.exercises.map((item) => {
      const prevBestWeight = this.findLastWeightForExercise(item.exerciseId) ?? 40;
      const sets = Array.from({length: Math.max(1, item.targetSets)}, (_, idx) => ({
        setNumber: idx + 1,
        weightKg: prevBestWeight,
        reps: 8,
        completed: false,
      }));
      return {
        exerciseId: item.exerciseId,
        exerciseName: item.exerciseName,
        muscleGroup: item.muscleGroup,
        sets,
      };
    });

    this.activeWorkout.set({
      id: makeDocId('wk'),
      title: routine.name,
      routineId: routine.id,
      startedAtMs: Date.now(),
      notes: '',
      entries,
    });
    this.persistActiveWorkoutDraft();
  }

  startEmptyWorkout(defaultTitle?: string): void {
    this.activeWorkout.set({
      id: makeDocId('wk'),
      title: defaultTitle?.trim() || this.i18n.t().defaultWorkoutTitle,
      startedAtMs: Date.now(),
      notes: '',
      entries: [],
    });
    this.persistActiveWorkoutDraft();
  }

  updateActiveWorkout(draft: ActiveWorkoutDraft): void {
    this.activeWorkout.set({...draft});
    this.persistActiveWorkoutDraft();
  }

  discardActiveWorkout(): void {
    this.activeWorkout.set(null);
    this.skipRestTimer();
    this.persistActiveWorkoutDraft();
  }

  async finishActiveWorkout(): Promise<WorkoutSession | null> {
    const draft = this.activeWorkout();
    if (!draft) return null;

    const nowMs = Date.now();
    const durationMinutes = Math.max(1, Math.min(480, Math.round((nowMs - draft.startedAtMs) / 60000) || 1));
    const totalVolumeKg = calculateWorkoutVolumeKg(draft.entries);
    const completedSetsCount = countCompletedSets(draft.entries);

    const session: WorkoutSession = {
      id: draft.id,
      title: (draft.title.trim() || this.i18n.t().defaultWorkoutTitle).slice(0, BLUEPRINT_LIMITS.maxTitleLength),
      routineId: draft.routineId,
      startedAtIso: new Date(draft.startedAtMs).toISOString(),
      completedAtIso: new Date(nowMs).toISOString(),
      durationMinutes,
      totalVolumeKg,
      completedSetsCount,
      notes: clampString(draft.notes, BLUEPRINT_LIMITS.maxLongNotesLength),
      entries: draft.entries.slice(0, BLUEPRINT_LIMITS.maxEntriesPerWorkout),
    };

    const nextWorkouts = [session, ...this.workouts()];
    this.workouts.set(nextWorkouts);
    this.activeWorkout.set(null);
    this.skipRestTimer();
    this.persistActiveWorkoutDraft();
    this.persistLocalState();

    const uid = this.user()?.uid;
    if (uid && this.adapter) {
      const adapter = this.adapter;
      await this.dispatchCloudWrite(async () => {
        await adapter.upsertWorkout(uid, session);
        await adapter.syncStatsSummary(uid, nextWorkouts, this.measurements());
      });
    }
    return session;
  }

  async deleteWorkout(workoutId: string): Promise<void> {
    const nextWorkouts = this.workouts().filter((w) => w.id !== workoutId);
    this.workouts.set(nextWorkouts);
    this.persistLocalState();

    const uid = this.user()?.uid;
    if (uid && this.adapter) {
      const adapter = this.adapter;
      await this.dispatchCloudWrite(async () => {
        await adapter.deleteSubdoc(uid, 'workouts', workoutId);
        await adapter.syncStatsSummary(uid, nextWorkouts, this.measurements());
      });
    }
  }

  findLastWeightForExercise(exerciseId: string): number | null {
    for (const w of this.sortedWorkouts()) {
      const found = w.entries.find((e) => e.exerciseId === exerciseId);
      if (found) {
        const completed = found.sets.find((s) => s.completed && s.weightKg > 0);
        if (completed) return completed.weightKg;
      }
    }
    return null;
  }

  // Rest Timer
  startRestTimer(seconds = 90): void {
    this.skipRestTimer();
    this.restSecondsLeft.set(seconds);
    if (!isPlatformBrowser(this.platformId)) return;
    this.restIntervalId = setInterval(() => {
      const left = this.restSecondsLeft();
      if (left <= 1) {
        this.skipRestTimer();
      } else {
        this.restSecondsLeft.set(left - 1);
      }
    }, 1000);
  }

  addRestSeconds(delta: number): void {
    const current = this.restSecondsLeft();
    if (current + delta <= 0) {
      this.skipRestTimer();
    } else if (current === 0 && delta > 0) {
      this.startRestTimer(delta);
    } else {
      this.restSecondsLeft.set(current + delta);
    }
  }

  skipRestTimer(): void {
    if (this.restIntervalId !== null) {
      clearInterval(this.restIntervalId);
      this.restIntervalId = null;
    }
    this.restSecondsLeft.set(0);
  }

  // Measurements
  async saveMeasurement(input: Omit<BodyMeasurement, 'id'> & {id?: string}): Promise<BodyMeasurement> {
    const id = input.id ?? makeDocId('ms');
    const saved: BodyMeasurement = {
      ...input,
      id,
      notes: clampString(input.notes, BLUEPRINT_LIMITS.maxNotesLength),
    };

    const exists = this.measurements().some((m) => m.id === id);
    const nextMeasurements = exists
      ? this.measurements().map((m) => (m.id === id ? saved : m))
      : [saved, ...this.measurements()];
    this.measurements.set(nextMeasurements);
    this.persistLocalState();

    const uid = this.user()?.uid;
    if (uid && this.adapter) {
      const adapter = this.adapter;
      await this.dispatchCloudWrite(async () => {
        await adapter.upsertMeasurement(uid, saved);
        await adapter.syncStatsSummary(uid, this.workouts(), nextMeasurements);
      });
    }
    return saved;
  }

  async deleteMeasurement(measurementId: string): Promise<void> {
    const nextMeasurements = this.measurements().filter((m) => m.id !== measurementId);
    this.measurements.set(nextMeasurements);
    this.persistLocalState();

    const uid = this.user()?.uid;
    if (uid && this.adapter) {
      const adapter = this.adapter;
      await this.dispatchCloudWrite(async () => {
        await adapter.deleteSubdoc(uid, 'measurements', measurementId);
        await adapter.syncStatsSummary(uid, this.workouts(), nextMeasurements);
      });
    }
  }

  // Progress Reports
  async createProgressReport(
    title: string,
    timeframe: TimeframeKey,
    notes?: string,
  ): Promise<ProgressReport> {
    const summary = computeProgressReportSummary(this.workouts(), this.measurements(), timeframe);
    const report: ProgressReport = {
      id: makeDocId('rp'),
      title: title.trim().slice(0, BLUEPRINT_LIMITS.maxTitleLength),
      timeframeLabel: timeframe,
      startDate: summary.startDate,
      endDate: summary.endDate,
      workoutsCount: summary.workoutsCount,
      totalVolumeKg: summary.totalVolumeKg,
      weightDeltaKg: summary.weightDeltaKg,
      topMuscleGroup: summary.topMuscleGroup,
      notes: clampString(notes, BLUEPRINT_LIMITS.maxLongNotesLength),
    };

    this.progressReports.set([report, ...this.progressReports()]);
    this.persistLocalState();

    const uid = this.user()?.uid;
    if (uid && this.adapter) {
      const adapter = this.adapter;
      await this.dispatchCloudWrite(() => adapter.upsertReport(uid, report));
    }
    return report;
  }

  async deleteProgressReport(reportId: string): Promise<void> {
    this.progressReports.set(this.progressReports().filter((r) => r.id !== reportId));
    this.persistLocalState();

    const uid = this.user()?.uid;
    if (uid && this.adapter) {
      const adapter = this.adapter;
      await this.dispatchCloudWrite(() => adapter.deleteSubdoc(uid, 'progressReports', reportId));
    }
  }

  async completeInitialBodySetup(input: {
    heightCm: number;
    weightKg: number;
    goal?: FitnessGoal;
  }): Promise<void> {
    await this.updatePreferences({
      heightCm: input.heightCm,
      goal: input.goal ?? this.preferences().goal,
    });
    await this.saveMeasurement({
      recordedDate: new Date().toISOString().slice(0, 10),
      weightKg: input.weightKg,
    });
  }

  // Exercise Muscle & Machine Guides
  async saveExerciseGuide(guide: ExerciseGuideRecord): Promise<ExerciseGuideRecord> {
    const id = guide.exerciseId.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, BLUEPRINT_LIMITS.maxIdLength) || makeDocId('gd');
    const saved: ExerciseGuideRecord = {
      ...guide,
      id,
      exerciseId: guide.exerciseId,
    };
    const exists = this.exerciseGuides().some((g) => g.id === id);
    this.exerciseGuides.set(
      exists ? this.exerciseGuides().map((g) => (g.id === id ? saved : g)) : [saved, ...this.exerciseGuides()],
    );
    this.persistLocalState();

    const uid = this.user()?.uid;
    if (uid && this.adapter) {
      const adapter = this.adapter;
      if (!this.isOnline() || this.offlineModeEnabled()) {
        this.enqueueMutation('exerciseGuides', 'upsert', saved.id);
      }
      await this.dispatchCloudWrite(() => adapter.upsertExerciseGuide(uid, saved));
    }
    return saved;
  }

  // Nutrition: Daily Meal Logs, Pantry Foods & 7-Day Weekly Meal Plans
  async saveMealLog(input: Omit<MealLogEntry, 'id'> & {id?: string}): Promise<MealLogEntry> {
    const id = input.id ?? makeDocId('ml');
    const saved: MealLogEntry = {
      ...input,
      id,
      title: input.title.trim().slice(0, BLUEPRINT_LIMITS.maxTitleLength),
      nutritionNote: clampString(input.nutritionNote, 600),
    };
    const exists = this.mealLogs().some((m) => m.id === id);
    this.mealLogs.set(
      exists ? this.mealLogs().map((m) => (m.id === id ? saved : m)) : [saved, ...this.mealLogs()],
    );
    this.persistLocalState();

    const uid = this.user()?.uid;
    if (uid && this.adapter) {
      const adapter = this.adapter;
      if (!this.isOnline() || this.offlineModeEnabled()) {
        this.enqueueMutation('mealLogs', 'upsert', saved.id);
      }
      await this.dispatchCloudWrite(() => adapter.upsertMealLog(uid, saved));
    }
    return saved;
  }

  async deleteMealLog(mealId: string): Promise<void> {
    this.mealLogs.set(this.mealLogs().filter((m) => m.id !== mealId));
    this.persistLocalState();

    const uid = this.user()?.uid;
    if (uid && this.adapter) {
      const adapter = this.adapter;
      if (!this.isOnline() || this.offlineModeEnabled()) {
        this.enqueueMutation('mealLogs', 'delete', mealId);
      }
      await this.dispatchCloudWrite(() => adapter.deleteSubdoc(uid, 'mealLogs', mealId));
    }
  }

  async addPantryItem(input: Omit<PantryFoodItem, 'id'>): Promise<PantryFoodItem> {
    const created: PantryFoodItem = {
      id: makeDocId('pi'),
      name: input.name.trim().slice(0, BLUEPRINT_LIMITS.maxNameLength),
      category: input.category,
      quantityHint: clampString(input.quantityHint, 60),
    };
    this.pantryItems.set([created, ...this.pantryItems()]);
    this.persistLocalState();

    const uid = this.user()?.uid;
    if (uid && this.adapter) {
      const adapter = this.adapter;
      if (!this.isOnline() || this.offlineModeEnabled()) {
        this.enqueueMutation('pantryItems', 'upsert', created.id);
      }
      await this.dispatchCloudWrite(() => adapter.upsertPantryItem(uid, created));
    }
    return created;
  }

  async deletePantryItem(itemId: string): Promise<void> {
    this.pantryItems.set(this.pantryItems().filter((p) => p.id !== itemId));
    this.persistLocalState();

    const uid = this.user()?.uid;
    if (uid && this.adapter) {
      const adapter = this.adapter;
      if (!this.isOnline() || this.offlineModeEnabled()) {
        this.enqueueMutation('pantryItems', 'delete', itemId);
      }
      await this.dispatchCloudWrite(() => adapter.deleteSubdoc(uid, 'pantryItems', itemId));
    }
  }

  async saveMealPlan(input: Omit<WeeklyMealPlan, 'id'> & {id?: string}): Promise<WeeklyMealPlan> {
    const id = input.id ?? makeDocId('mp');
    const saved: WeeklyMealPlan = {
      ...input,
      id,
      title: input.title.trim().slice(0, BLUEPRINT_LIMITS.maxTitleLength),
      notes: clampString(input.notes, 1000),
      days: input.days.slice(0, 7),
    };
    const exists = this.mealPlans().some((p) => p.id === id);
    this.mealPlans.set(
      exists ? this.mealPlans().map((p) => (p.id === id ? saved : p)) : [saved, ...this.mealPlans()],
    );
    this.persistLocalState();

    const uid = this.user()?.uid;
    if (uid && this.adapter) {
      const adapter = this.adapter;
      if (!this.isOnline() || this.offlineModeEnabled()) {
        this.enqueueMutation('mealPlans', 'upsert', saved.id);
      }
      await this.dispatchCloudWrite(() => adapter.upsertMealPlan(uid, saved));
    }
    return saved;
  }

  async deleteMealPlan(planId: string): Promise<void> {
    this.mealPlans.set(this.mealPlans().filter((p) => p.id !== planId));
    this.persistLocalState();

    const uid = this.user()?.uid;
    if (uid && this.adapter) {
      const adapter = this.adapter;
      if (!this.isOnline() || this.offlineModeEnabled()) {
        this.enqueueMutation('mealPlans', 'delete', planId);
      }
      await this.dispatchCloudWrite(() => adapter.deleteSubdoc(uid, 'mealPlans', planId));
    }
  }

  async resetAllData(): Promise<void> {
    const nextPrefs: UserPreferences = {
      goal: this.preferences().goal,
      preferredUnit: 'kg',
      language: this.i18n.lang(),
      theme: this.themeService.theme(),
      heightCm: undefined,
      targetWeightKg: undefined,
    };

    this.preferences.set(nextPrefs);
    this.customExercises.set([]);
    this.exerciseGuides.set([]);
    this.routines.set([]);
    this.workouts.set([]);
    this.measurements.set([]);
    this.progressReports.set([]);
    this.mealLogs.set([]);
    this.pantryItems.set([]);
    this.mealPlans.set([]);
    this.activeWorkout.set(null);
    this.pendingQueue.set([]);
    this.skipRestTimer();
    this.persistActiveWorkoutDraft();
    this.persistLocalState();

    const uid = this.user()?.uid;
    if (uid && this.adapter) {
      const adapter = this.adapter;
      await this.dispatchCloudWrite(() => adapter.clearCloudUserData(uid, nextPrefs));
    }
  }

  exportAllDataJson(): string {
    return JSON.stringify(
      {
        exportedAt: new Date().toISOString(),
        preferences: this.preferences(),
        customExercises: this.customExercises(),
        exerciseGuides: this.exerciseGuides(),
        routines: this.routines(),
        workouts: this.workouts(),
        measurements: this.measurements(),
        progressReports: this.progressReports(),
        mealLogs: this.mealLogs(),
        pantryItems: this.pantryItems(),
        mealPlans: this.mealPlans(),
      },
      null,
      2,
    );
  }
}
