import {
  User,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  updateProfile,
} from 'firebase/auth';
import {
  DocumentReference,
  DocumentSnapshot,
  Unsubscribe,
  collection,
  deleteDoc,
  deleteField,
  disableNetwork,
  doc,
  enableNetwork,
  getDoc,
  getDocFromServer,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import {OperationType, getFirebaseClients, handleFirestoreError} from './firebase-client';
import {computeUserStatsSummary, hashAccountEmail, roundTo} from './fitness-math';
import {
  AnatomyMuscleId,
  BLUEPRINT_LIMITS,
  BodyMeasurement,
  ExerciseDefinition,
  ExerciseGuideRecord,
  FitnessGoal,
  LanguageCode,
  MealLogEntry,
  MealType,
  PantryCategory,
  PantryFoodItem,
  ProgressReport,
  ThemeMode,
  UserPreferences,
  WeeklyMealPlan,
  WeightUnit,
  WorkoutRoutine,
  WorkoutSession,
} from './models';

export interface AuthUserSummary {
  uid: string;
  email: string | null;
  displayName: string | null;
}

export interface ViewOptionsState {
  language: LanguageCode;
  theme: ThemeMode;
}

export interface CloudSyncCallbacks {
  onAuthChange: (user: AuthUserSummary | null) => void;
  onSyncMeta: (hasPendingWrites: boolean, fromCache: boolean) => void;
  onAccountRoot: (biometrics: {heightCm?: number; targetWeightKg?: number}) => void;
  onSettings: (settings: {
    goal: FitnessGoal;
    preferredUnit: WeightUnit;
    language: LanguageCode;
    theme: ThemeMode;
  }) => void;
  onExercises: (list: ExerciseDefinition[]) => void;
  onExerciseGuides: (list: ExerciseGuideRecord[]) => void;
  onRoutines: (list: WorkoutRoutine[]) => void;
  onWorkouts: (list: WorkoutSession[]) => void;
  onMeasurements: (list: BodyMeasurement[]) => void;
  onReports: (list: ProgressReport[]) => void;
  onMealLogs: (list: MealLogEntry[]) => void;
  onPantryItems: (list: PantryFoodItem[]) => void;
  onMealPlans: (list: WeeklyMealPlan[]) => void;
}

function toUserSummary(user: User | null): AuthUserSummary | null {
  if (!user) return null;
  return {
    uid: user.uid,
    email: user.email,
    displayName: user.displayName,
  };
}

function isOfflineReadError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message.toLowerCase() : String(err).toLowerCase();
  const code =
    typeof err === 'object' && err !== null && 'code' in err
      ? String((err as {code?: unknown}).code ?? '').toLowerCase()
      : '';
  return (
    code === 'unavailable' ||
    code === 'failed-precondition' ||
    msg.includes('offline') ||
    msg.includes('unavailable')
  );
}

export class FirebaseSyncAdapter {
  private readonly clients = getFirebaseClients();
  private unsubAuth: Unsubscribe | null = null;
  private unsubCollections: Unsubscribe[] = [];
  private knownCloudIds = new Set<string>();
  private appOptionsWriteQueue: Promise<void> = Promise.resolve();

  startAuthListener(callbacks: CloudSyncCallbacks): void {
    this.unsubAuth = onAuthStateChanged(this.clients.auth, (user) => {
      callbacks.onAuthChange(toUserSummary(user));
    });
  }

  getCurrentUserSummary(): AuthUserSummary | null {
    return toUserSummary(this.clients.auth.currentUser);
  }

  dispose(): void {
    if (this.unsubAuth) {
      this.unsubAuth();
      this.unsubAuth = null;
    }
    this.clearCollectionListeners();
  }

  clearCollectionListeners(): void {
    for (const unsub of this.unsubCollections) {
      unsub();
    }
    this.unsubCollections = [];
    this.knownCloudIds.clear();
  }

  private async getDocPreferServer(
    ref: DocumentReference,
    path: string,
  ): Promise<DocumentSnapshot> {
    try {
      return await getDocFromServer(ref);
    } catch (serverErr) {
      if (isOfflineReadError(serverErr)) {
        try {
          return await getDoc(ref);
        } catch (cacheErr) {
          if (isOfflineReadError(cacheErr)) {
            throw new Error('AUTH_DB_UNAVAILABLE');
          }
          handleFirestoreError(cacheErr, OperationType.GET, path, this.clients.auth);
        }
      }
      handleFirestoreError(serverErr, OperationType.GET, path, this.clients.auth);
    }
  }

  async loadAppOptions(clientId: string): Promise<ViewOptionsState | null> {
    const path = `appOptions/${clientId}`;
    const ref = doc(this.clients.db, path);
    try {
      let snap: DocumentSnapshot;
      try {
        snap = await getDocFromServer(ref);
      } catch (serverErr) {
        if (!isOfflineReadError(serverErr)) {
          handleFirestoreError(serverErr, OperationType.GET, path, this.clients.auth);
        }
        snap = await getDoc(ref);
      }
      if (!snap.exists()) {
        return null;
      }
      this.knownCloudIds.add(path);
      const d = snap.data();
      return {
        language: d['language'] === 'ar' ? 'ar' : 'en',
        theme: d['theme'] === 'dark' ? 'dark' : 'light',
      };
    } catch {
      return null;
    }
  }

  saveAppOptions(clientId: string, opts: ViewOptionsState): Promise<void> {
    const task = this.appOptionsWriteQueue.then(async () => {
      const path = `appOptions/${clientId}`;
      const ref = doc(this.clients.db, path);
      try {
        let exists = this.knownCloudIds.has(path);
        if (!exists) {
          try {
            const snap = await getDocFromServer(ref);
            exists = snap.exists();
          } catch (serverErr) {
            if (!isOfflineReadError(serverErr)) {
              handleFirestoreError(serverErr, OperationType.GET, path, this.clients.auth);
            }
            const cacheSnap = await getDoc(ref);
            exists = cacheSnap.exists();
          }
        }
        if (exists) {
          await setDoc(
            ref,
            {
              language: opts.language,
              theme: opts.theme,
              updatedAt: serverTimestamp(),
            },
            {merge: true},
          );
        } else {
          await setDoc(ref, {
            clientId,
            language: opts.language,
            theme: opts.theme,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        }
        this.knownCloudIds.add(path);
      } catch (error) {
        if (!isOfflineReadError(error)) {
          handleFirestoreError(error, OperationType.WRITE, path, this.clients.auth);
        }
      }
    });
    this.appOptionsWriteQueue = task.catch(() => undefined);
    return task;
  }

  async signUpWithEmail(
    displayName: string,
    email: string,
    password: string,
    uiPrefs: ViewOptionsState,
  ): Promise<AuthUserSummary | null> {
    const {auth, db} = this.clients;
    const cleanName = displayName.trim().slice(0, 120);
    const cleanEmail = email.trim();
    const emailHash = hashAccountEmail(cleanEmail);

    const cred = await createUserWithEmailAndPassword(auth, cleanEmail, password);
    if (cleanName) {
      await updateProfile(cred.user, {displayName: cleanName});
    }

    const uid = cred.user.uid;
    const batch = writeBatch(db);
    batch.set(doc(db, 'accountIndex', emailHash), {
      ownerId: uid,
      status: 'active',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    batch.set(doc(db, 'users', uid), {
      ownerId: uid,
      status: 'active',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    const safeEmail = (cleanEmail || 'athlete@ironledger.app').slice(0, 254);
    const safeName = (cleanName || 'Athlete').slice(0, 120);
    batch.set(doc(db, 'users', uid, 'private', 'info'), {
      ownerId: uid,
      email: safeEmail.length >= 3 ? safeEmail : 'athlete@ironledger.app',
      displayName: safeName,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    batch.set(doc(db, 'users', uid, 'settings', 'preferences'), {
      ownerId: uid,
      goal: 'hypertrophy',
      preferredUnit: 'kg',
      language: uiPrefs.language,
      theme: uiPrefs.theme,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    batch.set(doc(db, 'users', uid, 'stats', 'summary'), {
      ownerId: uid,
      totalWorkouts: 0,
      totalVolumeKg: 0,
      totalCompletedSets: 0,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    try {
      await batch.commit();
      this.knownCloudIds.add('settings/preferences');
      this.knownCloudIds.add('stats/summary');
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `users/${uid}`, auth);
    }

    return {
      uid,
      email: cred.user.email,
      displayName: cleanName || cred.user.displayName,
    };
  }

  async signInWithEmail(email: string, password: string): Promise<AuthUserSummary | null> {
    const {auth, db} = this.clients;
    const cleanEmail = email.trim();
    const emailHash = hashAccountEmail(cleanEmail);
    const indexPath = `accountIndex/${emailHash}`;

    // 1. Pre-login database verification: confirm account exists in Firestore BEFORE logging in
    const indexSnap = await this.getDocPreferServer(doc(db, indexPath), indexPath);
    if (!indexSnap.exists()) {
      throw new Error('AUTH_NOT_IN_DATABASE');
    }

    // 2. Authenticate credentials via Firebase Auth
    const cred = await signInWithEmailAndPassword(auth, cleanEmail, password);

    // 3. Post-auth database verification: confirm user profile document exists in Firestore
    const uid = cred.user.uid;
    const profilePath = `users/${uid}`;
    const profileSnap = await this.getDocPreferServer(doc(db, profilePath), profilePath);
    if (!profileSnap.exists()) {
      await firebaseSignOut(auth);
      throw new Error('AUTH_NOT_IN_DATABASE');
    }

    return toUserSummary(cred.user);
  }

  async verifyUserExistsInDatabase(uid: string): Promise<boolean> {
    const path = `users/${uid}`;
    const snap = await this.getDocPreferServer(doc(this.clients.db, path), path);
    return snap.exists();
  }

  async sendPasswordReset(email: string): Promise<void> {
    const cleanEmail = email.trim();
    const emailHash = hashAccountEmail(cleanEmail);
    const indexPath = `accountIndex/${emailHash}`;
    const indexSnap = await this.getDocPreferServer(doc(this.clients.db, indexPath), indexPath);
    if (!indexSnap.exists()) {
      throw new Error('AUTH_NOT_IN_DATABASE');
    }
    await sendPasswordResetEmail(this.clients.auth, cleanEmail);
  }

  async signOut(): Promise<void> {
    this.clearCollectionListeners();
    await firebaseSignOut(this.clients.auth);
  }

  async setOfflineNetwork(offline: boolean): Promise<void> {
    if (offline) {
      await disableNetwork(this.clients.db);
    } else {
      await enableNetwork(this.clients.db);
    }
  }

  attachCollectionListeners(uid: string, callbacks: CloudSyncCallbacks): void {
    this.clearCollectionListeners();
    const {db, auth} = this.clients;

    const rootPath = `users/${uid}`;
    this.unsubCollections.push(
      onSnapshot(
        doc(db, rootPath),
        {includeMetadataChanges: true},
        (snap) => {
          callbacks.onSyncMeta(snap.metadata.hasPendingWrites, snap.metadata.fromCache);
          if (snap.exists()) {
            const d = snap.data();
            callbacks.onAccountRoot({
              heightCm: typeof d['heightCm'] === 'number' ? d['heightCm'] : undefined,
              targetWeightKg: typeof d['targetWeightKg'] === 'number' ? d['targetWeightKg'] : undefined,
            });
          }
        },
        (error) => handleFirestoreError(error, OperationType.GET, rootPath, auth),
      ),
    );

    const settingsPath = `users/${uid}/settings/preferences`;
    this.unsubCollections.push(
      onSnapshot(
        doc(db, settingsPath),
        {includeMetadataChanges: true},
        (snap) => {
          callbacks.onSyncMeta(snap.metadata.hasPendingWrites, snap.metadata.fromCache);
          if (snap.exists()) {
            this.knownCloudIds.add('settings/preferences');
            const d = snap.data();
            callbacks.onSettings({
              goal: (d['goal'] as FitnessGoal) ?? 'hypertrophy',
              preferredUnit: d['preferredUnit'] === 'lbs' ? 'lbs' : 'kg',
              language: d['language'] === 'ar' ? 'ar' : 'en',
              theme: d['theme'] === 'dark' ? 'dark' : 'light',
            });
          }
        },
        (error) => handleFirestoreError(error, OperationType.GET, settingsPath, auth),
      ),
    );

    const statsPath = `users/${uid}/stats/summary`;
    this.unsubCollections.push(
      onSnapshot(
        doc(db, statsPath),
        {includeMetadataChanges: true},
        (snap) => {
          if (snap.exists()) {
            this.knownCloudIds.add('stats/summary');
          }
        },
        (error) => handleFirestoreError(error, OperationType.GET, statsPath, auth),
      ),
    );

    const exercisesPath = `users/${uid}/exercises`;
    this.unsubCollections.push(
      onSnapshot(
        query(collection(db, exercisesPath), where('ownerId', '==', uid)),
        {includeMetadataChanges: true},
        (snap) => {
          callbacks.onSyncMeta(snap.metadata.hasPendingWrites, snap.metadata.fromCache);
          for (const d of snap.docs) this.knownCloudIds.add(`exercises/${d.id}`);
          callbacks.onExercises(
            snap.docs.map((d) => {
              const data = d.data();
              return {
                id: d.id,
                nameEn: String(data['nameEn'] ?? ''),
                nameAr: String(data['nameAr'] ?? ''),
                muscleGroup: data['muscleGroup'],
                equipment: data['equipment'],
                trackingType: data['trackingType'],
                notes: typeof data['notes'] === 'string' ? data['notes'] : undefined,
                isCustom: true,
              };
            }),
          );
        },
        (error) => handleFirestoreError(error, OperationType.LIST, exercisesPath, auth),
      ),
    );

    const routinesPath = `users/${uid}/routines`;
    this.unsubCollections.push(
      onSnapshot(
        query(collection(db, routinesPath), where('ownerId', '==', uid)),
        {includeMetadataChanges: true},
        (snap) => {
          callbacks.onSyncMeta(snap.metadata.hasPendingWrites, snap.metadata.fromCache);
          for (const d of snap.docs) this.knownCloudIds.add(`routines/${d.id}`);
          callbacks.onRoutines(
            snap.docs.map((d) => {
              const data = d.data();
              return {
                id: d.id,
                name: String(data['name'] ?? ''),
                goal: data['goal'],
                estimatedMinutes: Number(data['estimatedMinutes'] ?? 45),
                notes: typeof data['notes'] === 'string' ? data['notes'] : undefined,
                exercises: Array.isArray(data['exercises']) ? data['exercises'] : [],
                updatedAtIso: new Date().toISOString(),
              };
            }),
          );
        },
        (error) => handleFirestoreError(error, OperationType.LIST, routinesPath, auth),
      ),
    );

    const workoutsPath = `users/${uid}/workouts`;
    this.unsubCollections.push(
      onSnapshot(
        query(collection(db, workoutsPath), where('ownerId', '==', uid)),
        {includeMetadataChanges: true},
        (snap) => {
          callbacks.onSyncMeta(snap.metadata.hasPendingWrites, snap.metadata.fromCache);
          for (const d of snap.docs) this.knownCloudIds.add(`workouts/${d.id}`);
          const list: WorkoutSession[] = snap.docs.map((d) => {
            const data = d.data();
            return {
              id: d.id,
              title: String(data['title'] ?? ''),
              routineId: typeof data['routineId'] === 'string' ? data['routineId'] : undefined,
              startedAtIso: String(data['startedAtIso'] ?? ''),
              completedAtIso: String(data['completedAtIso'] ?? ''),
              durationMinutes: Number(data['durationMinutes'] ?? 45),
              totalVolumeKg: Number(data['totalVolumeKg'] ?? 0),
              completedSetsCount: Number(data['completedSetsCount'] ?? 0),
              notes: typeof data['notes'] === 'string' ? data['notes'] : undefined,
              entries: Array.isArray(data['entries']) ? data['entries'] : [],
            };
          });
          list.sort((a, b) => b.completedAtIso.localeCompare(a.completedAtIso));
          callbacks.onWorkouts(list);
        },
        (error) => handleFirestoreError(error, OperationType.LIST, workoutsPath, auth),
      ),
    );

    const measurementsPath = `users/${uid}/measurements`;
    this.unsubCollections.push(
      onSnapshot(
        query(collection(db, measurementsPath), where('ownerId', '==', uid)),
        {includeMetadataChanges: true},
        (snap) => {
          callbacks.onSyncMeta(snap.metadata.hasPendingWrites, snap.metadata.fromCache);
          for (const d of snap.docs) this.knownCloudIds.add(`measurements/${d.id}`);
          const list: BodyMeasurement[] = snap.docs.map((d) => {
            const data = d.data();
            return {
              id: d.id,
              recordedDate: String(data['recordedDate'] ?? ''),
              weightKg: Number(data['weightKg'] ?? 0),
              bodyFatPct: typeof data['bodyFatPct'] === 'number' ? data['bodyFatPct'] : undefined,
              chestCm: typeof data['chestCm'] === 'number' ? data['chestCm'] : undefined,
              waistCm: typeof data['waistCm'] === 'number' ? data['waistCm'] : undefined,
              hipsCm: typeof data['hipsCm'] === 'number' ? data['hipsCm'] : undefined,
              armsCm: typeof data['armsCm'] === 'number' ? data['armsCm'] : undefined,
              thighsCm: typeof data['thighsCm'] === 'number' ? data['thighsCm'] : undefined,
              notes: typeof data['notes'] === 'string' ? data['notes'] : undefined,
            };
          });
          list.sort((a, b) => b.recordedDate.localeCompare(a.recordedDate));
          callbacks.onMeasurements(list);
        },
        (error) => handleFirestoreError(error, OperationType.LIST, measurementsPath, auth),
      ),
    );

    const reportsPath = `users/${uid}/progressReports`;
    this.unsubCollections.push(
      onSnapshot(
        query(collection(db, reportsPath), where('ownerId', '==', uid)),
        {includeMetadataChanges: true},
        (snap) => {
          callbacks.onSyncMeta(snap.metadata.hasPendingWrites, snap.metadata.fromCache);
          for (const d of snap.docs) this.knownCloudIds.add(`progressReports/${d.id}`);
          callbacks.onReports(
            snap.docs.map((d) => {
              const data = d.data();
              return {
                id: d.id,
                title: String(data['title'] ?? ''),
                timeframeLabel: String(data['timeframeLabel'] ?? '30d'),
                startDate: String(data['startDate'] ?? ''),
                endDate: String(data['endDate'] ?? ''),
                workoutsCount: Number(data['workoutsCount'] ?? 0),
                totalVolumeKg: Number(data['totalVolumeKg'] ?? 0),
                weightDeltaKg: Number(data['weightDeltaKg'] ?? 0),
                topMuscleGroup: String(data['topMuscleGroup'] ?? 'none'),
                notes: typeof data['notes'] === 'string' ? data['notes'] : undefined,
              };
            }),
          );
        },
        (error) => handleFirestoreError(error, OperationType.LIST, reportsPath, auth),
      ),
    );

    const guidesPath = `users/${uid}/exerciseGuides`;
    this.unsubCollections.push(
      onSnapshot(
        query(collection(db, guidesPath), where('ownerId', '==', uid)),
        {includeMetadataChanges: true},
        (snap) => {
          callbacks.onSyncMeta(snap.metadata.hasPendingWrites, snap.metadata.fromCache);
          for (const d of snap.docs) this.knownCloudIds.add(`exerciseGuides/${d.id}`);
          callbacks.onExerciseGuides(
            snap.docs.map((d) => {
              const data = d.data();
              return {
                id: d.id,
                exerciseId: String(data['exerciseId'] ?? d.id),
                exerciseName: String(data['exerciseName'] ?? ''),
                primaryMuscles: Array.isArray(data['primaryMuscles'])
                  ? (data['primaryMuscles'] as AnatomyMuscleId[])
                  : [],
                secondaryMuscles: Array.isArray(data['secondaryMuscles'])
                  ? (data['secondaryMuscles'] as AnatomyMuscleId[])
                  : [],
                recommendedMachines: Array.isArray(data['recommendedMachines'])
                  ? data['recommendedMachines']
                  : [],
                howToUseSteps: Array.isArray(data['howToUseSteps']) ? data['howToUseSteps'].map(String) : [],
                commonMistakes: Array.isArray(data['commonMistakes']) ? data['commonMistakes'].map(String) : [],
                coachingSummary: String(data['coachingSummary'] ?? ''),
              };
            }),
          );
        },
        (error) => handleFirestoreError(error, OperationType.LIST, guidesPath, auth),
      ),
    );

    const mealLogsPath = `users/${uid}/mealLogs`;
    this.unsubCollections.push(
      onSnapshot(
        query(collection(db, mealLogsPath), where('ownerId', '==', uid)),
        {includeMetadataChanges: true},
        (snap) => {
          callbacks.onSyncMeta(snap.metadata.hasPendingWrites, snap.metadata.fromCache);
          for (const d of snap.docs) this.knownCloudIds.add(`mealLogs/${d.id}`);
          const list: MealLogEntry[] = snap.docs.map((d) => {
            const data = d.data();
            return {
              id: d.id,
              loggedDate: String(data['loggedDate'] ?? ''),
              mealType: (data['mealType'] as MealType) ?? 'lunch',
              title: String(data['title'] ?? ''),
              sourceMode: (data['sourceMode'] as MealLogEntry['sourceMode']) ?? 'text',
              totalCalories: Number(data['totalCalories'] ?? 0),
              proteinG: Number(data['proteinG'] ?? 0),
              carbsG: Number(data['carbsG'] ?? 0),
              fatG: Number(data['fatG'] ?? 0),
              fiberG: typeof data['fiberG'] === 'number' ? data['fiberG'] : undefined,
              items: Array.isArray(data['items']) ? data['items'] : [],
              nutritionNote: typeof data['nutritionNote'] === 'string' ? data['nutritionNote'] : undefined,
            };
          });
          list.sort((a, b) => b.loggedDate.localeCompare(a.loggedDate));
          callbacks.onMealLogs(list);
        },
        (error) => handleFirestoreError(error, OperationType.LIST, mealLogsPath, auth),
      ),
    );

    const pantryPath = `users/${uid}/pantryItems`;
    this.unsubCollections.push(
      onSnapshot(
        query(collection(db, pantryPath), where('ownerId', '==', uid)),
        {includeMetadataChanges: true},
        (snap) => {
          callbacks.onSyncMeta(snap.metadata.hasPendingWrites, snap.metadata.fromCache);
          for (const d of snap.docs) this.knownCloudIds.add(`pantryItems/${d.id}`);
          callbacks.onPantryItems(
            snap.docs.map((d) => {
              const data = d.data();
              return {
                id: d.id,
                name: String(data['name'] ?? ''),
                category: (data['category'] as PantryCategory) ?? 'other',
                quantityHint: typeof data['quantityHint'] === 'string' ? data['quantityHint'] : undefined,
              };
            }),
          );
        },
        (error) => handleFirestoreError(error, OperationType.LIST, pantryPath, auth),
      ),
    );

    const mealPlansPath = `users/${uid}/mealPlans`;
    this.unsubCollections.push(
      onSnapshot(
        query(collection(db, mealPlansPath), where('ownerId', '==', uid)),
        {includeMetadataChanges: true},
        (snap) => {
          callbacks.onSyncMeta(snap.metadata.hasPendingWrites, snap.metadata.fromCache);
          for (const d of snap.docs) this.knownCloudIds.add(`mealPlans/${d.id}`);
          callbacks.onMealPlans(
            snap.docs.map((d) => {
              const data = d.data();
              return {
                id: d.id,
                title: String(data['title'] ?? ''),
                goal: (data['goal'] as FitnessGoal) ?? 'hypertrophy',
                dailyTargetCalories: Number(data['dailyTargetCalories'] ?? 2200),
                language: data['language'] === 'ar' ? 'ar' : 'en',
                notes: typeof data['notes'] === 'string' ? data['notes'] : undefined,
                days: Array.isArray(data['days']) ? data['days'] : [],
              };
            }),
          );
        },
        (error) => handleFirestoreError(error, OperationType.LIST, mealPlansPath, auth),
      ),
    );
  }

  async syncPreferences(uid: string, prefs: UserPreferences): Promise<void> {
    const {db, auth} = this.clients;
    const rootRef = doc(db, 'users', uid);
    const settingsRef = doc(db, 'users', uid, 'settings', 'preferences');

    try {
      const batch = writeBatch(db);

      const rootPayload: Record<string, unknown> = {
        updatedAt: serverTimestamp(),
      };
      if (prefs.heightCm !== undefined && Number.isFinite(prefs.heightCm)) {
        rootPayload['heightCm'] = roundTo(
          Math.min(BLUEPRINT_LIMITS.heightMaxCm, Math.max(BLUEPRINT_LIMITS.heightMinCm, prefs.heightCm)),
          1,
        );
      } else {
        rootPayload['heightCm'] = deleteField();
      }
      if (prefs.targetWeightKg !== undefined && Number.isFinite(prefs.targetWeightKg)) {
        rootPayload['targetWeightKg'] = roundTo(
          Math.min(BLUEPRINT_LIMITS.weightMaxKg, Math.max(BLUEPRINT_LIMITS.weightMinKg, prefs.targetWeightKg)),
          1,
        );
      } else {
        rootPayload['targetWeightKg'] = deleteField();
      }
      batch.set(rootRef, rootPayload, {merge: true});

      let settingsExists = this.knownCloudIds.has('settings/preferences');
      if (!settingsExists) {
        const snap = await getDoc(settingsRef);
        settingsExists = snap.exists();
      }

      if (settingsExists) {
        batch.set(
          settingsRef,
          {
            goal: prefs.goal,
            preferredUnit: prefs.preferredUnit,
            language: prefs.language,
            theme: prefs.theme,
            updatedAt: serverTimestamp(),
          },
          {merge: true},
        );
      } else {
        batch.set(settingsRef, {
          ownerId: uid,
          goal: prefs.goal,
          preferredUnit: prefs.preferredUnit,
          language: prefs.language,
          theme: prefs.theme,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }

      await batch.commit();
      this.knownCloudIds.add('settings/preferences');
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `users/${uid}/settings/preferences`, auth);
    }
  }

  async syncStatsSummary(
    uid: string,
    workouts: WorkoutSession[],
    measurements: BodyMeasurement[],
  ): Promise<void> {
    const {db, auth} = this.clients;
    const statsPath = `users/${uid}/stats/summary`;
    const statsRef = doc(db, statsPath);
    const computed = computeUserStatsSummary(workouts, measurements);

    try {
      let exists = this.knownCloudIds.has('stats/summary');
      if (!exists) {
        const snap = await getDoc(statsRef);
        exists = snap.exists();
      }

      const payload: Record<string, unknown> = {
        totalWorkouts: computed.totalWorkouts,
        totalVolumeKg: computed.totalVolumeKg,
        totalCompletedSets: computed.totalCompletedSets,
        updatedAt: serverTimestamp(),
      };
      if (computed.latestWeightKg !== undefined && computed.latestMeasurementDate) {
        payload['latestWeightKg'] = computed.latestWeightKg;
        payload['latestMeasurementDate'] = computed.latestMeasurementDate;
      } else if (exists) {
        payload['latestWeightKg'] = deleteField();
        payload['latestMeasurementDate'] = deleteField();
      }

      if (!exists) {
        payload['ownerId'] = uid;
        payload['createdAt'] = serverTimestamp();
        await setDoc(statsRef, payload);
      } else {
        await setDoc(statsRef, payload, {merge: true});
      }
      this.knownCloudIds.add('stats/summary');
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, statsPath, auth);
    }
  }

  async upsertExercise(uid: string, ex: ExerciseDefinition): Promise<void> {
    const path = `users/${uid}/exercises/${ex.id}`;
    const isUpdate = this.knownCloudIds.has(`exercises/${ex.id}`);
    try {
      await setDoc(doc(this.clients.db, path), this.toFirestoreExercise(uid, ex, isUpdate), isUpdate ? {merge: true} : {});
      this.knownCloudIds.add(`exercises/${ex.id}`);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path, this.clients.auth);
    }
  }

  async upsertRoutine(uid: string, rt: WorkoutRoutine): Promise<void> {
    const path = `users/${uid}/routines/${rt.id}`;
    const isUpdate = this.knownCloudIds.has(`routines/${rt.id}`);
    try {
      await setDoc(doc(this.clients.db, path), this.toFirestoreRoutine(uid, rt, isUpdate), isUpdate ? {merge: true} : {});
      this.knownCloudIds.add(`routines/${rt.id}`);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path, this.clients.auth);
    }
  }

  async upsertWorkout(uid: string, wk: WorkoutSession): Promise<void> {
    const path = `users/${uid}/workouts/${wk.id}`;
    const isUpdate = this.knownCloudIds.has(`workouts/${wk.id}`);
    try {
      await setDoc(doc(this.clients.db, path), this.toFirestoreWorkout(uid, wk, isUpdate), isUpdate ? {merge: true} : {});
      this.knownCloudIds.add(`workouts/${wk.id}`);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path, this.clients.auth);
    }
  }

  async upsertMeasurement(uid: string, ms: BodyMeasurement): Promise<void> {
    const path = `users/${uid}/measurements/${ms.id}`;
    const isUpdate = this.knownCloudIds.has(`measurements/${ms.id}`);
    try {
      await setDoc(doc(this.clients.db, path), this.toFirestoreMeasurement(uid, ms, isUpdate), isUpdate ? {merge: true} : {});
      this.knownCloudIds.add(`measurements/${ms.id}`);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path, this.clients.auth);
    }
  }

  async upsertReport(uid: string, rp: ProgressReport): Promise<void> {
    const path = `users/${uid}/progressReports/${rp.id}`;
    const isUpdate = this.knownCloudIds.has(`progressReports/${rp.id}`);
    try {
      await setDoc(doc(this.clients.db, path), this.toFirestoreReport(uid, rp, isUpdate), isUpdate ? {merge: true} : {});
      this.knownCloudIds.add(`progressReports/${rp.id}`);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path, this.clients.auth);
    }
  }

  async upsertExerciseGuide(uid: string, guide: ExerciseGuideRecord): Promise<void> {
    const path = `users/${uid}/exerciseGuides/${guide.id}`;
    const isUpdate = this.knownCloudIds.has(`exerciseGuides/${guide.id}`);
    try {
      await setDoc(
        doc(this.clients.db, path),
        this.toFirestoreExerciseGuide(uid, guide, isUpdate),
        isUpdate ? {merge: true} : {},
      );
      this.knownCloudIds.add(`exerciseGuides/${guide.id}`);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path, this.clients.auth);
    }
  }

  async upsertMealLog(uid: string, meal: MealLogEntry): Promise<void> {
    const path = `users/${uid}/mealLogs/${meal.id}`;
    const isUpdate = this.knownCloudIds.has(`mealLogs/${meal.id}`);
    try {
      await setDoc(
        doc(this.clients.db, path),
        this.toFirestoreMealLog(uid, meal, isUpdate),
        isUpdate ? {merge: true} : {},
      );
      this.knownCloudIds.add(`mealLogs/${meal.id}`);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path, this.clients.auth);
    }
  }

  async upsertPantryItem(uid: string, item: PantryFoodItem): Promise<void> {
    const path = `users/${uid}/pantryItems/${item.id}`;
    const isUpdate = this.knownCloudIds.has(`pantryItems/${item.id}`);
    try {
      await setDoc(
        doc(this.clients.db, path),
        this.toFirestorePantryItem(uid, item, isUpdate),
        isUpdate ? {merge: true} : {},
      );
      this.knownCloudIds.add(`pantryItems/${item.id}`);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path, this.clients.auth);
    }
  }

  async upsertMealPlan(uid: string, plan: WeeklyMealPlan): Promise<void> {
    const path = `users/${uid}/mealPlans/${plan.id}`;
    const isUpdate = this.knownCloudIds.has(`mealPlans/${plan.id}`);
    try {
      await setDoc(
        doc(this.clients.db, path),
        this.toFirestoreMealPlan(uid, plan, isUpdate),
        isUpdate ? {merge: true} : {},
      );
      this.knownCloudIds.add(`mealPlans/${plan.id}`);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path, this.clients.auth);
    }
  }

  async deleteSubdoc(
    uid: string,
    col:
      | 'exercises'
      | 'exerciseGuides'
      | 'routines'
      | 'workouts'
      | 'measurements'
      | 'progressReports'
      | 'mealLogs'
      | 'pantryItems'
      | 'mealPlans',
    docId: string,
  ): Promise<void> {
    const path = `users/${uid}/${col}/${docId}`;
    try {
      await deleteDoc(doc(this.clients.db, path));
      this.knownCloudIds.delete(`${col}/${docId}`);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path, this.clients.auth);
    }
  }

  async clearCloudUserData(uid: string, prefs: UserPreferences): Promise<void> {
    const {db, auth} = this.clients;
    try {
      const batch = writeBatch(db);
      for (const colName of [
        'exercises',
        'exerciseGuides',
        'routines',
        'workouts',
        'measurements',
        'progressReports',
        'mealLogs',
        'pantryItems',
        'mealPlans',
      ] as const) {
        const snap = await getDocs(query(collection(db, 'users', uid, colName), where('ownerId', '==', uid)));
        for (const d of snap.docs) {
          batch.delete(d.ref);
          this.knownCloudIds.delete(`${colName}/${d.id}`);
        }
      }

      batch.set(
        doc(db, 'users', uid),
        {
          heightCm: deleteField(),
          targetWeightKg: deleteField(),
          updatedAt: serverTimestamp(),
        },
        {merge: true},
      );

      const settingsRef = doc(db, 'users', uid, 'settings', 'preferences');
      if (this.knownCloudIds.has('settings/preferences')) {
        batch.set(
          settingsRef,
          {
            goal: prefs.goal,
            preferredUnit: prefs.preferredUnit,
            language: prefs.language,
            theme: prefs.theme,
            updatedAt: serverTimestamp(),
          },
          {merge: true},
        );
      } else {
        batch.set(settingsRef, {
          ownerId: uid,
          goal: prefs.goal,
          preferredUnit: prefs.preferredUnit,
          language: prefs.language,
          theme: prefs.theme,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }

      const statsRef = doc(db, 'users', uid, 'stats', 'summary');
      if (this.knownCloudIds.has('stats/summary')) {
        batch.set(
          statsRef,
          {
            totalWorkouts: 0,
            totalVolumeKg: 0,
            totalCompletedSets: 0,
            latestWeightKg: deleteField(),
            latestMeasurementDate: deleteField(),
            updatedAt: serverTimestamp(),
          },
          {merge: true},
        );
      } else {
        batch.set(statsRef, {
          ownerId: uid,
          totalWorkouts: 0,
          totalVolumeKg: 0,
          totalCompletedSets: 0,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }

      await batch.commit();
      this.knownCloudIds.add('settings/preferences');
      this.knownCloudIds.add('stats/summary');
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `users/${uid}`, auth);
    }
  }

  private toFirestoreExercise(uid: string, ex: ExerciseDefinition, isUpdate = false): Record<string, unknown> {
    const nameEn = ex.nameEn.trim().slice(0, BLUEPRINT_LIMITS.maxNameLength);
    const payload: Record<string, unknown> = {
      ownerId: uid,
      nameEn: nameEn.length >= 2 ? nameEn : 'Exercise',
      muscleGroup: ex.muscleGroup,
      equipment: ex.equipment,
      trackingType: ex.trackingType,
      updatedAt: serverTimestamp(),
    };
    if (!isUpdate) payload['createdAt'] = serverTimestamp();
    if (ex.nameAr) payload['nameAr'] = ex.nameAr.slice(0, BLUEPRINT_LIMITS.maxNameLength);
    else if (isUpdate) payload['nameAr'] = deleteField();
    if (ex.notes) payload['notes'] = ex.notes.slice(0, BLUEPRINT_LIMITS.maxNotesLength);
    else if (isUpdate) payload['notes'] = deleteField();
    return payload;
  }

  private toFirestoreRoutine(uid: string, rt: WorkoutRoutine, isUpdate = false): Record<string, unknown> {
    const name = rt.name.trim().slice(0, BLUEPRINT_LIMITS.maxNameLength);
    const payload: Record<string, unknown> = {
      ownerId: uid,
      name: name.length >= 2 ? name : 'Routine',
      goal: rt.goal,
      estimatedMinutes: Math.min(300, Math.max(5, Math.round(rt.estimatedMinutes || 45))),
      exercises: rt.exercises.slice(0, BLUEPRINT_LIMITS.maxExercisesPerRoutine).map((item) => ({
        exerciseId: item.exerciseId,
        exerciseName: item.exerciseName,
        muscleGroup: item.muscleGroup,
        targetSets: item.targetSets,
        targetReps: item.targetReps,
        restSeconds: item.restSeconds,
      })),
      updatedAt: serverTimestamp(),
    };
    if (!isUpdate) payload['createdAt'] = serverTimestamp();
    if (rt.notes) payload['notes'] = rt.notes.slice(0, BLUEPRINT_LIMITS.maxNotesLength);
    else if (isUpdate) payload['notes'] = deleteField();
    return payload;
  }

  private toFirestoreWorkout(uid: string, wk: WorkoutSession, isUpdate = false): Record<string, unknown> {
    const title = wk.title.trim().slice(0, BLUEPRINT_LIMITS.maxTitleLength);
    const payload: Record<string, unknown> = {
      ownerId: uid,
      title: title.length >= 2 ? title : 'Gym Session',
      startedAtIso: wk.startedAtIso.slice(0, 40),
      completedAtIso: wk.completedAtIso.slice(0, 40),
      durationMinutes: Math.min(480, Math.max(1, Math.round(wk.durationMinutes || 1))),
      totalVolumeKg: Math.min(250000, Math.max(0, roundTo(wk.totalVolumeKg || 0, 1))),
      completedSetsCount: Math.min(300, Math.max(0, Math.round(wk.completedSetsCount || 0))),
      entries: wk.entries.slice(0, BLUEPRINT_LIMITS.maxEntriesPerWorkout).map((entry) => ({
        exerciseId: entry.exerciseId,
        exerciseName: entry.exerciseName,
        muscleGroup: entry.muscleGroup,
        sets: entry.sets.map((s) => ({
          setNumber: s.setNumber,
          weightKg: s.weightKg,
          reps: s.reps,
          completed: Boolean(s.completed),
        })),
      })),
      updatedAt: serverTimestamp(),
    };
    if (!isUpdate) payload['createdAt'] = serverTimestamp();
    if (wk.routineId) payload['routineId'] = wk.routineId.slice(0, BLUEPRINT_LIMITS.maxIdLength);
    else if (isUpdate) payload['routineId'] = deleteField();
    if (wk.notes) payload['notes'] = wk.notes.slice(0, BLUEPRINT_LIMITS.maxLongNotesLength);
    else if (isUpdate) payload['notes'] = deleteField();
    return payload;
  }

  private toFirestoreMeasurement(uid: string, ms: BodyMeasurement, isUpdate = false): Record<string, unknown> {
    const payload: Record<string, unknown> = {
      ownerId: uid,
      recordedDate: ms.recordedDate,
      weightKg: Math.min(BLUEPRINT_LIMITS.weightMaxKg, Math.max(BLUEPRINT_LIMITS.weightMinKg, ms.weightKg)),
      updatedAt: serverTimestamp(),
    };
    if (!isUpdate) payload['createdAt'] = serverTimestamp();
    if (ms.bodyFatPct !== undefined) payload['bodyFatPct'] = ms.bodyFatPct;
    else if (isUpdate) payload['bodyFatPct'] = deleteField();
    if (ms.chestCm !== undefined) payload['chestCm'] = ms.chestCm;
    else if (isUpdate) payload['chestCm'] = deleteField();
    if (ms.waistCm !== undefined) payload['waistCm'] = ms.waistCm;
    else if (isUpdate) payload['waistCm'] = deleteField();
    if (ms.hipsCm !== undefined) payload['hipsCm'] = ms.hipsCm;
    else if (isUpdate) payload['hipsCm'] = deleteField();
    if (ms.armsCm !== undefined) payload['armsCm'] = ms.armsCm;
    else if (isUpdate) payload['armsCm'] = deleteField();
    if (ms.thighsCm !== undefined) payload['thighsCm'] = ms.thighsCm;
    else if (isUpdate) payload['thighsCm'] = deleteField();
    if (ms.notes) payload['notes'] = ms.notes.slice(0, BLUEPRINT_LIMITS.maxNotesLength);
    else if (isUpdate) payload['notes'] = deleteField();
    return payload;
  }

  private toFirestoreReport(uid: string, rp: ProgressReport, isUpdate = false): Record<string, unknown> {
    const title = rp.title.trim().slice(0, BLUEPRINT_LIMITS.maxTitleLength);
    const payload: Record<string, unknown> = {
      ownerId: uid,
      title: title.length >= 2 ? title : 'Progress Report',
      timeframeLabel: rp.timeframeLabel.slice(0, 40) || '30d',
      startDate: rp.startDate,
      endDate: rp.endDate,
      workoutsCount: Math.min(5000, Math.max(0, Math.round(rp.workoutsCount || 0))),
      totalVolumeKg: Math.min(10000000, Math.max(0, roundTo(rp.totalVolumeKg || 0, 1))),
      weightDeltaKg: Math.min(200, Math.max(-200, roundTo(rp.weightDeltaKg || 0, 1))),
      topMuscleGroup: (rp.topMuscleGroup || 'none').slice(0, 32),
      updatedAt: serverTimestamp(),
    };
    if (!isUpdate) payload['createdAt'] = serverTimestamp();
    if (rp.notes) payload['notes'] = rp.notes.slice(0, BLUEPRINT_LIMITS.maxLongNotesLength);
    else if (isUpdate) payload['notes'] = deleteField();
    return payload;
  }

  private toFirestoreExerciseGuide(
    uid: string,
    guide: ExerciseGuideRecord,
    isUpdate = false,
  ): Record<string, unknown> {
    const name = guide.exerciseName.trim().slice(0, BLUEPRINT_LIMITS.maxTitleLength);
    const payload: Record<string, unknown> = {
      ownerId: uid,
      exerciseId: guide.exerciseId.slice(0, BLUEPRINT_LIMITS.maxIdLength),
      exerciseName: name.length >= 2 ? name : 'Exercise',
      primaryMuscles: guide.primaryMuscles.slice(0, 8),
      secondaryMuscles: guide.secondaryMuscles.slice(0, 8),
      recommendedMachines: guide.recommendedMachines.slice(0, 6).map((m) => ({
        machineName: String(m.machineName ?? '').slice(0, 120),
        setupCue: String(m.setupCue ?? '').slice(0, 300),
        targetBenefit: String(m.targetBenefit ?? '').slice(0, 300),
      })),
      howToUseSteps: guide.howToUseSteps.slice(0, 10).map((s) => String(s).slice(0, 300)),
      commonMistakes: guide.commonMistakes.slice(0, 8).map((s) => String(s).slice(0, 300)),
      coachingSummary: String(guide.coachingSummary ?? '').slice(0, 1200),
      updatedAt: serverTimestamp(),
    };
    if (!isUpdate) payload['createdAt'] = serverTimestamp();
    return payload;
  }

  private toFirestoreMealLog(uid: string, meal: MealLogEntry, isUpdate = false): Record<string, unknown> {
    const title = meal.title.trim().slice(0, BLUEPRINT_LIMITS.maxTitleLength);
    const payload: Record<string, unknown> = {
      ownerId: uid,
      loggedDate: meal.loggedDate.slice(0, 10),
      mealType: meal.mealType,
      title: title.length >= 1 ? title : 'Meal',
      sourceMode: meal.sourceMode,
      totalCalories: Math.min(10000, Math.max(0, Math.round(meal.totalCalories || 0))),
      proteinG: Math.min(1000, Math.max(0, roundTo(meal.proteinG || 0, 1))),
      carbsG: Math.min(1500, Math.max(0, roundTo(meal.carbsG || 0, 1))),
      fatG: Math.min(500, Math.max(0, roundTo(meal.fatG || 0, 1))),
      items: meal.items.slice(0, 20).map((it) => ({
        name: String(it.name ?? '').slice(0, 100),
        portion: String(it.portion ?? '').slice(0, 80),
        calories: Math.max(0, Math.round(Number(it.calories) || 0)),
        proteinG: Math.max(0, roundTo(Number(it.proteinG) || 0, 1)),
        carbsG: Math.max(0, roundTo(Number(it.carbsG) || 0, 1)),
        fatG: Math.max(0, roundTo(Number(it.fatG) || 0, 1)),
      })),
      updatedAt: serverTimestamp(),
    };
    if (!isUpdate) payload['createdAt'] = serverTimestamp();
    if (meal.fiberG !== undefined && Number.isFinite(meal.fiberG)) {
      payload['fiberG'] = Math.min(300, Math.max(0, roundTo(meal.fiberG, 1)));
    } else if (isUpdate) {
      payload['fiberG'] = deleteField();
    }
    if (meal.nutritionNote) payload['nutritionNote'] = meal.nutritionNote.slice(0, 600);
    else if (isUpdate) payload['nutritionNote'] = deleteField();
    return payload;
  }

  private toFirestorePantryItem(uid: string, item: PantryFoodItem, isUpdate = false): Record<string, unknown> {
    const name = item.name.trim().slice(0, BLUEPRINT_LIMITS.maxNameLength);
    const payload: Record<string, unknown> = {
      ownerId: uid,
      name: name.length >= 1 ? name : 'Food',
      category: item.category,
      updatedAt: serverTimestamp(),
    };
    if (!isUpdate) payload['createdAt'] = serverTimestamp();
    if (item.quantityHint) payload['quantityHint'] = item.quantityHint.slice(0, 60);
    else if (isUpdate) payload['quantityHint'] = deleteField();
    return payload;
  }

  private toFirestoreMealPlan(uid: string, plan: WeeklyMealPlan, isUpdate = false): Record<string, unknown> {
    const title = plan.title.trim().slice(0, BLUEPRINT_LIMITS.maxTitleLength);
    const payload: Record<string, unknown> = {
      ownerId: uid,
      title: title.length >= 2 ? title : 'Weekly Meal Plan',
      goal: plan.goal,
      dailyTargetCalories: Math.min(8000, Math.max(800, Math.round(plan.dailyTargetCalories || 2200))),
      language: plan.language,
      days: plan.days.slice(0, 7).map((d) => ({
        dayLabel: String(d.dayLabel ?? '').slice(0, 60),
        totalCalories: Math.max(0, Math.round(Number(d.totalCalories) || 0)),
        proteinG: Math.max(0, roundTo(Number(d.proteinG) || 0, 1)),
        breakfast: String(d.breakfast ?? '').slice(0, 350),
        lunch: String(d.lunch ?? '').slice(0, 350),
        dinner: String(d.dinner ?? '').slice(0, 350),
        snack: String(d.snack ?? '').slice(0, 300),
      })),
      updatedAt: serverTimestamp(),
    };
    if (!isUpdate) payload['createdAt'] = serverTimestamp();
    if (plan.notes) payload['notes'] = plan.notes.slice(0, 1000);
    else if (isUpdate) payload['notes'] = deleteField();
    return payload;
  }
}
