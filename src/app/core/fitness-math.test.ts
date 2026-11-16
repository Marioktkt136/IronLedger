import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateBmi,
  calculateOneRepMaxKg,
  calculateSetVolumeKg,
  calculateWorkoutVolumeKg,
  computeMuscleVolumeBreakdown,
  computePersonalRecords,
  computeProgressReportSummary,
  computeUserStatsSummary,
  convertInputToKg,
  convertWeight,
  countCompletedSets,
  createCleanAccountSnapshot,
  filterByTimeframe,
  getScopedStorageKeys,
  hashAccountEmail,
  sha256Hex,
  validateExerciseInput,
  validateInitialBodySetup,
  validateMeasurementInput,
  validateRoutineInput,
} from './fitness-math';
import type {BodyMeasurement, WorkoutSession} from './models';

test('calculateSetVolumeKg and calculateWorkoutVolumeKg count only completed sets', () => {
  assert.equal(calculateSetVolumeKg(80, 10), 800);
  assert.equal(calculateSetVolumeKg(-5, 10), 0);

  const entries = [
    {
      exerciseId: 'bench',
      exerciseName: 'Barbell Bench Press',
      muscleGroup: 'chest' as const,
      sets: [
        {setNumber: 1, weightKg: 80, reps: 8, completed: true},
        {setNumber: 2, weightKg: 80, reps: 8, completed: true},
        {setNumber: 3, weightKg: 85, reps: 6, completed: false},
      ],
    },
  ];

  assert.equal(calculateWorkoutVolumeKg(entries), 1280);
  assert.equal(countCompletedSets(entries), 2);
});

test('calculateOneRepMaxKg applies Epley formula cleanly', () => {
  assert.equal(calculateOneRepMaxKg(100, 1), 100);
  assert.equal(calculateOneRepMaxKg(100, 10), 133.3);
  assert.equal(calculateOneRepMaxKg(0, 10), 0);
});

test('weight unit conversion kg <-> lbs is reversible within 0.1', () => {
  const lbs = convertWeight(100, 'lbs');
  assert.equal(lbs, 220.5);
  const backToKg = convertInputToKg(lbs, 'lbs');
  assert.ok(Math.abs(backToKg - 100) < 0.05);
});

test('timeframe filtering and progress report aggregation work deterministically', () => {
  const now = new Date('2026-11-16T12:00:00.000Z');
  const workouts: WorkoutSession[] = [
    {
      id: 'w1',
      title: 'Push A',
      startedAtIso: '2026-11-14T10:00:00.000Z',
      completedAtIso: '2026-11-14T10:50:00.000Z',
      durationMinutes: 50,
      totalVolumeKg: 4200,
      completedSetsCount: 12,
      entries: [
        {
          exerciseId: 'bench',
          exerciseName: 'Barbell Bench Press',
          muscleGroup: 'chest',
          sets: [{setNumber: 1, weightKg: 100, reps: 6, completed: true}],
        },
      ],
    },
    {
      id: 'w2',
      title: 'Old Session',
      startedAtIso: '2026-09-01T10:00:00.000Z',
      completedAtIso: '2026-09-01T10:45:00.000Z',
      durationMinutes: 45,
      totalVolumeKg: 3000,
      completedSetsCount: 10,
      entries: [
        {
          exerciseId: 'squat',
          exerciseName: 'Back Squat',
          muscleGroup: 'legs',
          sets: [{setNumber: 1, weightKg: 120, reps: 5, completed: true}],
        },
      ],
    },
  ];

  const measurements: BodyMeasurement[] = [
    {id: 'm1', recordedDate: '2026-11-01', weightKg: 82.5, waistCm: 84},
    {id: 'm2', recordedDate: '2026-11-15', weightKg: 81.2, waistCm: 82.5},
    {id: 'm3', recordedDate: '2026-08-15', weightKg: 85.0},
  ];

  const last7 = filterByTimeframe(workouts, (w) => w.completedAtIso, '7d', now);
  assert.equal(last7.length, 1);
  assert.equal(last7[0].id, 'w1');

  const summary30 = computeProgressReportSummary(workouts, measurements, '30d', now);
  assert.equal(summary30.workoutsCount, 1);
  assert.equal(summary30.totalVolumeKg, 4200);
  assert.equal(summary30.weightDeltaKg, -1.3);
  assert.equal(summary30.topMuscleGroup, 'chest');

  const breakdown = computeMuscleVolumeBreakdown(workouts);
  assert.equal(breakdown.length, 2);
  assert.equal(breakdown[0].muscleGroup, 'chest');

  const prs = computePersonalRecords(workouts);
  assert.equal(prs[0].exerciseId, 'squat');
});

test('validators reject out-of-range measurements, empty exercise names, and empty routines', () => {
  const badMeasurement = validateMeasurementInput({
    recordedDate: '16-11-2026',
    weightKg: 500,
  });
  assert.equal(badMeasurement.valid, false);
  assert.ok(badMeasurement.errorKeys.includes('val_invalid_date'));
  assert.ok(badMeasurement.errorKeys.includes('val_invalid_weight'));

  const goodMeasurement = validateMeasurementInput({
    recordedDate: '2026-11-16',
    weightKg: 79.4,
    waistCm: 81.5,
  });
  assert.equal(goodMeasurement.valid, true);
  assert.equal(goodMeasurement.sanitized?.weightKg, 79.4);

  const badEx = validateExerciseInput({
    nameEn: 'A',
    muscleGroup: 'chest',
    equipment: 'barbell',
    trackingType: 'weight_reps',
  });
  assert.equal(badEx.valid, false);

  const badRoutine = validateRoutineInput({
    name: 'Push Day',
    goal: 'hypertrophy',
    estimatedMinutes: 50,
    exercises: [],
  });
  assert.equal(badRoutine.valid, false);
});

test('validateInitialBodySetup and calculateBmi enforce heightCm and weightKg bounds', () => {
  const bad = validateInitialBodySetup({heightCm: 50, weightKg: 10});
  assert.equal(bad.valid, false);
  assert.ok(bad.errorKeys.includes('val_invalid_height'));
  assert.ok(bad.errorKeys.includes('val_invalid_weight'));

  const ok = validateInitialBodySetup({heightCm: 178.4, weightKg: 76.5});
  assert.equal(ok.valid, true);
  assert.equal(ok.heightCm, 178.4);
  assert.equal(ok.weightKg, 76.5);
  assert.equal(calculateBmi(ok.weightKg!, ok.heightCm!), 24);
});

test('getScopedStorageKeys isolates each user account and createCleanAccountSnapshot resets all data', () => {
  const keysA = getScopedStorageKeys('user_alpha_123');
  const keysB = getScopedStorageKeys('user_beta_456');

  assert.notEqual(keysA.stateKey, keysB.stateKey);
  assert.notEqual(keysA.queueKey, keysB.queueKey);
  assert.notEqual(keysA.activeWorkoutKey, keysB.activeWorkoutKey);
  assert.throws(() => getScopedStorageKeys('   '));

  const fresh = createCleanAccountSnapshot('ar', 'dark');
  assert.equal(fresh.preferences.language, 'ar');
  assert.equal(fresh.preferences.theme, 'dark');
  assert.equal(fresh.preferences.heightCm, undefined);
  assert.equal(fresh.preferences.targetWeightKg, undefined);
  assert.equal(fresh.customExercises.length, 0);
  assert.equal(fresh.routines.length, 0);
  assert.equal(fresh.workouts.length, 0);
  assert.equal(fresh.measurements.length, 0);
  assert.equal(fresh.progressReports.length, 0);
});

test('hashAccountEmail normalizes whitespace/case and matches standard SHA-256 hex digest', () => {
  assert.equal(sha256Hex('abc'), 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
  assert.equal(hashAccountEmail('  Athlete@IronLedger.App '), hashAccountEmail('athlete@ironledger.app'));
  assert.equal(hashAccountEmail('test@example.com').length, 64);
});

test('computeUserStatsSummary aggregates workouts and latest measurement cleanly', () => {
  const summary = computeUserStatsSummary(
    [
      {
        id: 'w1',
        title: 'Push',
        startedAtIso: '2026-11-10T10:00:00Z',
        completedAtIso: '2026-11-10T10:45:00Z',
        durationMinutes: 45,
        totalVolumeKg: 2500.4,
        completedSetsCount: 10,
        entries: [],
      },
      {
        id: 'w2',
        title: 'Pull',
        startedAtIso: '2026-11-12T10:00:00Z',
        completedAtIso: '2026-11-12T10:50:00Z',
        durationMinutes: 50,
        totalVolumeKg: 3100.2,
        completedSetsCount: 12,
        entries: [],
      },
    ],
    [
      {id: 'm1', recordedDate: '2026-11-01', weightKg: 80.5},
      {id: 'm2', recordedDate: '2026-11-15', weightKg: 79.2},
    ],
  );

  assert.equal(summary.totalWorkouts, 2);
  assert.equal(summary.totalVolumeKg, 5600.6);
  assert.equal(summary.totalCompletedSets, 22);
  assert.equal(summary.latestWeightKg, 79.2);
  assert.equal(summary.latestMeasurementDate, '2026-11-15');
});



