import {
  GoogleAuthProvider,
  User,
  onAuthStateChanged,
  signInWithPopup,
  signOut as firebaseSignOut,
} from 'firebase/auth';
import {
  Unsubscribe,
  collection,
  deleteDoc,
  deleteField,
  disableNetwork,
  doc,
  enableNetwork,
  getDoc,
  getDocs,
  onSnapshot,
  serverTimestamp,
  setDoc,
  where,
  writeBatch,
  query,
} from 'firebase/firestore';
import {OperationType, getFirebaseClients, handleFirestoreError} from './firebase-client';
import {roundTo} from './fitness-math';
import {
  BLUEPRINT_LIMITS,
  BodyMeasurement,
  ExerciseDefinition,
  LanguageCode,
  ProgressReport,
  ThemeMode,
  UserPreferences,
  WorkoutRoutine,
  WorkoutSession,
} from './models';

export interface AuthUserSummary {
  uid: string;
  email: string | null;
  displayName: string | null;
}

export interface CloudSyncCallbacks {
  onAuthChange: (user: AuthUserSummary | null) => void;
  onSyncMeta: (hasPendingWrites: boolean, fromCache: boolean) => void;
  onProfile: (prefs: UserPreferences) => void;
  onExercises: (list: ExerciseDefinition[]) => void;
  onRoutines: (list: WorkoutRoutine[]) => void;
  onWorkouts: (list: WorkoutSession[]) => void;
  onMeasurements: (list: BodyMeasurement[]) => void;
  onReports: (list: ProgressReport[]) => void;
}

function toUserSummary(user: User | null): AuthUserSummary | null {
  if (!user) return null;
  return {
    uid: user.uid,
    email: user.email,
    displayName: user.displayName,
  };
}

export class FirebaseSyncAdapter {
  private readonly clients = getFirebaseClients();
  private unsubAuth: Unsubscribe | null = null;
  private unsubCollections: Unsubscribe[] = [];
  private knownCloudIds = new Set<string>();

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

  async signInWithGoogle(): Promise<AuthUserSummary | null> {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({prompt: 'select_account'});
    const cred = await signInWithPopup(this.clients.auth, provider);
    return toUserSummary(cred.user);
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

  async ensureCloudBootstrap(
    user: AuthUserSummary,
    uiPrefs: {
      language: LanguageCode;
      theme: ThemeMode;
    },
  ): Promise<'created' | 'existing'> {
    const {db, auth} = this.clients;
    const uid = user.uid;
    const profileRef = doc(db, 'users', uid);
    const privateRef = doc(db, 'users', uid, 'private', 'info');

    try {
      const existingProfile = await getDoc(profileRef);
      if (existingProfile.exists()) {
        return 'existing';
      }

      // Reset all data at the start when creating a brand-new account:
      // initialize empty profile (no heightCm/targetWeightKg) and no preloaded collections.
      const batch = writeBatch(db);
      batch.set(profileRef, {
        ownerId: uid,
        goal: 'hypertrophy',
        preferredUnit: 'kg',
        language: uiPrefs.language,
        theme: uiPrefs.theme,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      const safeEmail = (user.email?.trim() || 'athlete@ironledger.app').slice(0, 254);
      const safeName = (user.displayName?.trim() || 'Athlete').slice(0, 120);
      batch.set(privateRef, {
        ownerId: uid,
        email: safeEmail.length >= 3 ? safeEmail : 'athlete@ironledger.app',
        displayName: safeName,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      await batch.commit();
      return 'created';
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `users/${uid}`, auth);
    }
  }

  attachCollectionListeners(uid: string, callbacks: CloudSyncCallbacks): void {
    this.clearCollectionListeners();
    const {db, auth} = this.clients;

    const profilePath = `users/${uid}`;
    this.unsubCollections.push(
      onSnapshot(
        doc(db, profilePath),
        {includeMetadataChanges: true},
        (snap) => {
          callbacks.onSyncMeta(snap.metadata.hasPendingWrites, snap.metadata.fromCache);
          if (snap.exists()) {
            const d = snap.data();
            callbacks.onProfile({
              goal: d['goal'] ?? 'hypertrophy',
              preferredUnit: d['preferredUnit'] ?? 'kg',
              language: d['language'] ?? 'en',
              theme: d['theme'] ?? 'light',
              heightCm: typeof d['heightCm'] === 'number' ? d['heightCm'] : undefined,
              targetWeightKg: typeof d['targetWeightKg'] === 'number' ? d['targetWeightKg'] : undefined,
            });
          }
        },
        (error) => handleFirestoreError(error, OperationType.GET, profilePath, auth),
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
  }

  async syncPreferences(uid: string, prefs: UserPreferences): Promise<void> {
    const {db, auth} = this.clients;
    const ref = doc(db, 'users', uid);
    try {
      const payload: Record<string, unknown> = {
        ownerId: uid,
        goal: prefs.goal,
        preferredUnit: prefs.preferredUnit,
        language: prefs.language,
        theme: prefs.theme,
        updatedAt: serverTimestamp(),
      };
      if (prefs.heightCm !== undefined && Number.isFinite(prefs.heightCm)) {
        payload['heightCm'] = roundTo(
          Math.min(BLUEPRINT_LIMITS.heightMaxCm, Math.max(BLUEPRINT_LIMITS.heightMinCm, prefs.heightCm)),
          1,
        );
      } else {
        payload['heightCm'] = deleteField();
      }
      if (prefs.targetWeightKg !== undefined && Number.isFinite(prefs.targetWeightKg)) {
        payload['targetWeightKg'] = roundTo(
          Math.min(BLUEPRINT_LIMITS.weightMaxKg, Math.max(BLUEPRINT_LIMITS.weightMinKg, prefs.targetWeightKg)),
          1,
        );
      } else {
        payload['targetWeightKg'] = deleteField();
      }
      await setDoc(ref, payload, {merge: true});
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `users/${uid}`, auth);
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

  async deleteSubdoc(
    uid: string,
    col: 'exercises' | 'routines' | 'workouts' | 'measurements' | 'progressReports',
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
      const deleteBatch = writeBatch(db);
      let hasDeletes = false;
      for (const colName of ['exercises', 'routines', 'workouts', 'measurements', 'progressReports'] as const) {
        const snap = await getDocs(query(collection(db, 'users', uid, colName), where('ownerId', '==', uid)));
        for (const d of snap.docs) {
          deleteBatch.delete(d.ref);
          this.knownCloudIds.delete(`${colName}/${d.id}`);
          hasDeletes = true;
        }
      }
      if (hasDeletes) {
        await deleteBatch.commit();
      }

      await setDoc(
        doc(db, 'users', uid),
        {
          ownerId: uid,
          goal: prefs.goal,
          preferredUnit: prefs.preferredUnit,
          language: prefs.language,
          theme: prefs.theme,
          heightCm: deleteField(),
          targetWeightKg: deleteField(),
          updatedAt: serverTimestamp(),
        },
        {merge: true},
      );
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
}
