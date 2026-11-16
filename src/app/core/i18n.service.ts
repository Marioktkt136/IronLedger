import {DOCUMENT, isPlatformBrowser} from '@angular/common';
import {Injectable, PLATFORM_ID, computed, inject, signal} from '@angular/core';
import {
  EquipmentType,
  ExerciseDefinition,
  FitnessGoal,
  LanguageCode,
  MuscleGroup,
  TrackingType,
  WeightUnit,
} from './models';

export interface Translations {
  appName: string;
  navDashboard: string;
  navWorkouts: string;
  navRoutines: string;
  navExercises: string;
  navMeasurements: string;
  sidebarAria: string;
  mainNavAria: string;
  mobileNavAria: string;
  startWorkout: string;
  resumeWorkout: string;
  accountAndSync: string;
  signInGoogle: string;
  signOut: string;
  cloudSynced: string;
  syncingPending: string;
  offlineSavedLocally: string;
  localGuestMode: string;
  offlineToggleOn: string;
  offlineToggleOff: string;
  goOffline: string;
  goOnline: string;
  themeLight: string;
  themeDark: string;
  themeLabel: string;
  languageLabel: string;
  switchToArabic: string;
  switchToEnglish: string;

  // Units
  unitKg: string;
  unitLbs: string;
  unitCm: string;
  unitSec: string;

  // Initial Body Setup (Height cm + Weight kg)
  setupTitle: string;
  setupSubtitle: string;
  setupHeightLabel: string;
  setupHeightPlaceholder: string;
  setupWeightLabel: string;
  setupWeightPlaceholder: string;
  setupGoalLabel: string;
  setupBmiPreview: string;
  setupSubmitBtn: string;
  setupOrSignIn: string;
  heightLabel: string;
  bmiLabel: string;

  // Startup Login View & Account Isolation
  loginBadge: string;
  loginTitle: string;
  loginSubtitle: string;
  loginEnterAccountBtn: string;
  loginContinueAs: string;
  loginUseAnotherAccount: string;
  loginIsolatedNote: string;
  loginNewAccountNote: string;
  loginCheckingSession: string;
  switchAccountBtn: string;
  isolatedAccountHint: string;

  // Dashboard
  dashTitle: string;
  dashSubtitle: string;
  kpiSectionAria: string;
  timeframe7d: string;
  timeframe30d: string;
  timeframe90d: string;
  timeframeAll: string;
  kpiTotalVolume: string;
  kpiWeeklySessions: string;
  kpiLatestWeight: string;
  kpiCompletedSets: string;
  kpiNoWeightYet: string;
  chartVolumeTitle: string;
  chartVolumeSubtitle: string;
  chartBodyTitle: string;
  chartBodySubtitle: string;
  chartMuscleTitle: string;
  chartMuscleSubtitle: string;
  personalRecordsTitle: string;
  personalRecordsSubtitle: string;
  estOneRm: string;
  reportsTitle: string;
  reportsSubtitle: string;
  saveReportBtn: string;
  reportTitleLabel: string;
  reportTitlePlaceholder: string;
  reportNotesLabel: string;
  reportNotesPlaceholder: string;
  exportCsv: string;
  csvHeaders: string[];
  recentWorkoutsTitle: string;
  viewAllWorkouts: string;
  noDataChart: string;
  noWorkoutsYet: string;
  noReportsYet: string;
  logFirstWorkout: string;

  // Workouts
  workoutsTitle: string;
  workoutsSubtitle: string;
  activeSessionBadge: string;
  defaultWorkoutTitle: string;
  sessionTitlePlaceholder: string;
  elapsedTime: string;
  restTimer: string;
  restStart: string;
  restSkip: string;
  restAdd15: string;
  finishWorkout: string;
  discardWorkout: string;
  addExerciseToSession: string;
  addSet: string;
  setLabel: string;
  prevLabel: string;
  weightLabel: string;
  repsLabel: string;
  doneLabel: string;
  sessionNotesLabel: string;
  sessionNotesPlaceholder: string;
  quickStartTitle: string;
  noRoutinesQuickDesc: string;
  createFirstRoutine: string;
  blankWorkout: string;
  startFromRoutine: string;
  workoutHistoryTitle: string;
  searchWorkoutsPlaceholder: string;
  noWorkoutsMatchSearch: string;
  setsCompleted: string;
  sessionsCountLabel: string;
  exercisesCountLabel: string;
  minutesShort: string;
  confirmDelete: string;
  deleteBtn: string;
  editBtn: string;
  cancelBtn: string;
  saveBtn: string;

  // Routines
  routinesTitle: string;
  routinesSubtitle: string;
  createRoutineBtn: string;
  editRoutineTitle: string;
  newRoutineTitle: string;
  routineNameLabel: string;
  routineNamePlaceholder: string;
  routineGoalLabel: string;
  routineDurationLabel: string;
  routineNotesLabel: string;
  routineNotesPlaceholder: string;
  routineExercisesLabel: string;
  addExerciseToRoutine: string;
  targetSetsLabel: string;
  targetRepsLabel: string;
  restSecLabel: string;
  moveUp: string;
  moveDown: string;
  removeLabel: string;
  noRoutinesYet: string;

  // Exercises
  exercisesTitle: string;
  exercisesSubtitle: string;
  addExerciseBtn: string;
  searchExercisesPlaceholder: string;
  allMuscles: string;
  allEquipment: string;
  exerciseNameEnLabel: string;
  exerciseNameEnPlaceholder: string;
  exerciseNameArLabel: string;
  exerciseNameArPlaceholder: string;
  exerciseNotesPlaceholder: string;
  muscleGroupLabel: string;
  equipmentLabel: string;
  trackingTypeLabel: string;
  customTag: string;
  builtInTag: string;
  noExercisesMatch: string;

  // Measurements
  measurementsTitle: string;
  measurementsSubtitle: string;
  logMeasurementBtn: string;
  recordedDateLabel: string;
  bodyWeightLabel: string;
  bodyFatLabel: string;
  chestLabel: string;
  waistLabel: string;
  hipsLabel: string;
  armsLabel: string;
  thighsLabel: string;
  notesLabel: string;
  measurementNotesPlaceholder: string;
  metricHistoryTitle: string;
  deltaFromStart: string;
  noMeasurementsYet: string;

  // Account & Preferences Modal
  accountModalTitle: string;
  cloudAccountSection: string;
  signedInAs: string;
  notSignedInDesc: string;
  preferencesSection: string;
  fitnessGoalLabel: string;
  preferredUnitLabel: string;
  targetWeightLabel: string;
  targetWeightPlaceholder: string;
  offlineSyncSection: string;
  offlineModeLabel: string;
  offlineModeDesc: string;
  pendingWritesLabel: string;
  dataManagementSection: string;
  exportAllJson: string;
  resetAllDataBtn: string;
  resetAllDataConfirm: string;
  resetAllDataDesc: string;
  closeModal: string;

  // Enums
  goals: Record<FitnessGoal, string>;
  muscles: Record<MuscleGroup, string>;
  equipment: Record<EquipmentType, string>;
  trackingTypes: Record<TrackingType, string>;

  // Validation
  val_invalid_date: string;
  val_invalid_weight: string;
  val_invalid_height: string;
  val_invalid_bodyfat: string;
  val_invalid_measurement: string;
  val_notes_too_long: string;
  val_exercise_name: string;
  val_routine_name: string;
  val_routine_duration: string;
  val_routine_exercises: string;
  val_report_title: string;
}

const EN_DICT: Translations = {
  appName: 'IronLedger',
  navDashboard: 'Dashboard',
  navWorkouts: 'Workouts',
  navRoutines: 'Routines',
  navExercises: 'Exercises',
  navMeasurements: 'Body Metrics',
  sidebarAria: 'Primary sidebar',
  mainNavAria: 'Main navigation',
  mobileNavAria: 'Mobile navigation',
  startWorkout: 'Start Workout',
  resumeWorkout: 'Resume Session',
  accountAndSync: 'Account & Sync',
  signInGoogle: 'Sign in with Google',
  signOut: 'Sign Out',
  cloudSynced: 'Cloud Synced',
  syncingPending: 'Syncing pending changes',
  offlineSavedLocally: 'Offline · Saved locally until sync',
  localGuestMode: 'Local storage · Sign in to sync',
  offlineToggleOn: 'Offline Mode Active',
  offlineToggleOff: 'Online Sync Active',
  goOffline: 'Work Offline',
  goOnline: 'Reconnect & Sync',
  themeLight: 'Light',
  themeDark: 'Dark',
  themeLabel: 'Appearance',
  languageLabel: 'Language',
  switchToArabic: 'العربية',
  switchToEnglish: 'English',

  unitKg: 'kg',
  unitLbs: 'lbs',
  unitCm: 'cm',
  unitSec: 's',

  setupTitle: 'Body Profile Setup',
  setupSubtitle: 'Enter your height and current weight to personalize your training log and body trend baseline.',
  setupHeightLabel: 'Height / Length (cm)',
  setupHeightPlaceholder: 'e.g. 176',
  setupWeightLabel: 'Weight (kg)',
  setupWeightPlaceholder: 'e.g. 78.5',
  setupGoalLabel: 'Primary Fitness Goal',
  setupBmiPreview: 'Estimated BMI',
  setupSubmitBtn: 'Save & Continue',
  setupOrSignIn: 'Already have cloud data? Sign in with Google',
  heightLabel: 'Height',
  bmiLabel: 'BMI',

  loginBadge: 'Isolated Account Database',
  loginTitle: 'Enter your training account',
  loginSubtitle: 'Sign in or select a specific Google account to load your private workouts, routines, and body metrics.',
  loginEnterAccountBtn: 'Enter Specific Google Account',
  loginContinueAs: 'Continue as',
  loginUseAnotherAccount: 'Enter Different Account',
  loginIsolatedNote: 'Every account has its own strictly isolated cloud database and offline cache.',
  loginNewAccountNote: 'Creating a new account resets all data to empty and requests your height (cm) and weight (kg) first.',
  loginCheckingSession: 'Checking active account session...',
  switchAccountBtn: 'Switch Account',
  isolatedAccountHint: 'Isolated database active for this account',

  dashTitle: 'Performance Dashboard',
  dashSubtitle: 'Track training load, body composition trends, and saved progress reports.',
  kpiSectionAria: 'Key performance metrics',
  timeframe7d: '7D',
  timeframe30d: '30D',
  timeframe90d: '90D',
  timeframeAll: 'All',
  kpiTotalVolume: 'Volume Lifted',
  kpiWeeklySessions: 'Sessions (7d)',
  kpiLatestWeight: 'Latest Weight',
  kpiCompletedSets: 'Completed Sets',
  kpiNoWeightYet: 'No entry yet',
  chartVolumeTitle: 'Training Volume Trend',
  chartVolumeSubtitle: 'Total load moved per completed workout session',
  chartBodyTitle: 'Body Weight & Metrics Trend',
  chartBodySubtitle: 'Long-term body composition trajectory',
  chartMuscleTitle: 'Volume by Muscle Group',
  chartMuscleSubtitle: 'Distribution of completed working volume',
  personalRecordsTitle: 'Estimated 1RM Benchmarks',
  personalRecordsSubtitle: 'Calculated from your heaviest completed sets',
  estOneRm: 'Est. 1RM',
  reportsTitle: 'Saved Progress Reports',
  reportsSubtitle: 'Snapshot key training blocks for long-term review',
  saveReportBtn: 'Save Progress Report',
  reportTitleLabel: 'Report Title',
  reportTitlePlaceholder: 'e.g. November Strength Block',
  reportNotesLabel: 'Summary Notes',
  reportNotesPlaceholder: 'e.g. Strength gains and waist reduction...',
  exportCsv: 'Export CSV',
  csvHeaders: ['Title', 'Timeframe', 'Start Date', 'End Date', 'Workouts', 'Total Volume (kg)', 'Weight Delta (kg)', 'Top Muscle', 'Notes'],
  recentWorkoutsTitle: 'Recent Workouts',
  viewAllWorkouts: 'View All',
  noDataChart: 'Log workouts or measurements in this range to plot your trend.',
  noWorkoutsYet: 'No workout sessions logged yet.',
  noReportsYet: 'No saved progress reports yet. Save a snapshot of the current period.',
  logFirstWorkout: 'Start First Workout',

  workoutsTitle: 'Workouts & Session Runner',
  workoutsSubtitle: 'Run a live session from a routine or review completed training logs.',
  activeSessionBadge: 'Live Session',
  defaultWorkoutTitle: 'Custom Gym Session',
  sessionTitlePlaceholder: 'Session name (e.g. Upper Push)',
  elapsedTime: 'Elapsed',
  restTimer: 'Rest Timer',
  restStart: '90s Rest',
  restSkip: 'Skip',
  restAdd15: '+15s',
  finishWorkout: 'Finish & Save',
  discardWorkout: 'Discard',
  addExerciseToSession: 'Add Exercise',
  addSet: 'Add Set',
  setLabel: 'Set',
  prevLabel: 'Best',
  weightLabel: 'Weight',
  repsLabel: 'Reps',
  doneLabel: 'Done',
  sessionNotesLabel: 'Session Notes',
  sessionNotesPlaceholder: 'How did the lifts feel today?',
  quickStartTitle: 'Start a Session',
  noRoutinesQuickDesc: 'No custom routines yet. Start a quick workout or build a reusable routine template.',
  createFirstRoutine: 'Create Routine',
  blankWorkout: 'Empty Quick Workout',
  startFromRoutine: 'Start',
  workoutHistoryTitle: 'Workout History',
  searchWorkoutsPlaceholder: 'Search sessions or exercises...',
  noWorkoutsMatchSearch: 'No workout sessions match your search.',
  setsCompleted: 'sets',
  sessionsCountLabel: 'sessions',
  exercisesCountLabel: 'exercises',
  minutesShort: 'min',
  confirmDelete: 'Confirm Delete',
  deleteBtn: 'Delete',
  editBtn: 'Edit',
  cancelBtn: 'Cancel',
  saveBtn: 'Save',

  routinesTitle: 'Workout Routines',
  routinesSubtitle: 'Build and personalize split templates tailored to your training goal.',
  createRoutineBtn: 'New Routine',
  editRoutineTitle: 'Edit Routine',
  newRoutineTitle: 'Create Custom Routine',
  routineNameLabel: 'Routine Name',
  routineNamePlaceholder: 'e.g. Upper Push — Strength',
  routineGoalLabel: 'Training Goal',
  routineDurationLabel: 'Estimated Duration (min)',
  routineNotesLabel: 'Coaching Notes',
  routineNotesPlaceholder: 'Tempo cues or progression rules...',
  routineExercisesLabel: 'Exercises in Routine',
  addExerciseToRoutine: 'Add Exercise to Routine',
  targetSetsLabel: 'Sets',
  targetRepsLabel: 'Reps',
  restSecLabel: 'Rest (s)',
  moveUp: 'Move up',
  moveDown: 'Move down',
  removeLabel: 'Remove',
  noRoutinesYet: 'No custom routines yet. Create one to launch sessions in one click.',

  exercisesTitle: 'Exercise Library',
  exercisesSubtitle: 'Browse built-in movements or add custom exercises for your program.',
  addExerciseBtn: 'Add Exercise',
  searchExercisesPlaceholder: 'Search by name (English or Arabic)...',
  allMuscles: 'All Muscles',
  allEquipment: 'All Equipment',
  exerciseNameEnLabel: 'Exercise Name (English)',
  exerciseNameEnPlaceholder: 'e.g. Pendlay Barbell Row',
  exerciseNameArLabel: 'Exercise Name (Arabic)',
  exerciseNameArPlaceholder: 'e.g. سحب بالبار بندلاي',
  exerciseNotesPlaceholder: 'Form cues or seat settings...',
  muscleGroupLabel: 'Target Muscle',
  equipmentLabel: 'Equipment',
  trackingTypeLabel: 'Tracking Format',
  customTag: 'Custom',
  builtInTag: 'Library',
  noExercisesMatch: 'No exercises match your current search filters.',

  measurementsTitle: 'Weight & Body Measurements',
  measurementsSubtitle: 'Record weight, body fat, and circumferences to monitor long-term progress.',
  logMeasurementBtn: 'Log Measurement',
  recordedDateLabel: 'Date',
  bodyWeightLabel: 'Weight',
  bodyFatLabel: 'Body Fat %',
  chestLabel: 'Chest (cm)',
  waistLabel: 'Waist (cm)',
  hipsLabel: 'Hips (cm)',
  armsLabel: 'Arms (cm)',
  thighsLabel: 'Thighs (cm)',
  notesLabel: 'Notes',
  measurementNotesPlaceholder: 'e.g. Morning fasted weigh-in',
  metricHistoryTitle: 'Measurement Log',
  deltaFromStart: 'vs baseline',
  noMeasurementsYet: 'No body measurements recorded yet.',

  accountModalTitle: 'Account, Preferences & Offline Sync',
  cloudAccountSection: 'Cloud Account',
  signedInAs: 'Signed in as',
  notSignedInDesc: 'Sign in with Google to back up workouts, routines, and body metrics securely to Cloud Firestore across devices.',
  preferencesSection: 'Profile & Training Preferences',
  fitnessGoalLabel: 'Primary Goal',
  preferredUnitLabel: 'Weight Unit',
  targetWeightLabel: 'Target Weight',
  targetWeightPlaceholder: 'e.g. 75',
  offlineSyncSection: 'Offline Persistence & Sync',
  offlineModeLabel: 'Network & Cache State',
  offlineModeDesc: 'Changes made while offline are saved locally and automatically synced to Cloud Firestore when reconnected.',
  pendingWritesLabel: 'Pending offline changes',
  dataManagementSection: 'Data & Reset',
  exportAllJson: 'Export JSON Backup',
  resetAllDataBtn: 'Reset All Data to Empty',
  resetAllDataConfirm: 'Confirm Reset All Data',
  resetAllDataDesc: 'Clears all workouts, routines, custom exercises, measurements, reports, height, and target weight.',
  closeModal: 'Close',

  goals: {
    strength: 'Strength',
    hypertrophy: 'Hypertrophy',
    fat_loss: 'Fat Loss',
    endurance: 'Endurance',
    general: 'General Fitness',
  },
  muscles: {
    chest: 'Chest',
    back: 'Back',
    legs: 'Legs',
    shoulders: 'Shoulders',
    arms: 'Arms',
    core: 'Core',
    full_body: 'Full Body',
  },
  equipment: {
    barbell: 'Barbell',
    dumbbell: 'Dumbbell',
    machine: 'Machine',
    cable: 'Cable',
    bodyweight: 'Bodyweight',
    kettlebell: 'Kettlebell',
    other: 'Other',
  },
  trackingTypes: {
    weight_reps: 'Weight & Reps',
    bodyweight_reps: 'Bodyweight Reps',
    duration: 'Duration (sec)',
  },

  val_invalid_date: 'Enter a valid date (YYYY-MM-DD).',
  val_invalid_weight: 'Body weight must be between 20 kg and 400 kg.',
  val_invalid_height: 'Height must be between 100 cm and 250 cm.',
  val_invalid_bodyfat: 'Body fat percentage must be between 2% and 70%.',
  val_invalid_measurement: 'Circumference measurement is outside valid range.',
  val_notes_too_long: 'Notes exceed maximum allowed length.',
  val_exercise_name: 'Exercise name must be between 2 and 100 characters.',
  val_routine_name: 'Routine name must be between 2 and 100 characters.',
  val_routine_duration: 'Duration must be between 5 and 300 minutes.',
  val_routine_exercises: 'Add at least 1 exercise (max 30) to the routine.',
  val_report_title: 'Report title must be at least 2 characters.',
};

const AR_DICT: Translations = {
  appName: 'آيرون ليدجر',
  navDashboard: 'لوحة الأداء',
  navWorkouts: 'الجلسات',
  navRoutines: 'البرامج',
  navExercises: 'مكتبة التمارين',
  navMeasurements: 'قياسات الجسم',
  sidebarAria: 'القائمة الجانبية الرئيسية',
  mainNavAria: 'التنقل الرئيسي',
  mobileNavAria: 'شريط التنقل السفلي',
  startWorkout: 'بدء تمرين',
  resumeWorkout: 'متابعة التمرين',
  accountAndSync: 'الحساب والمزامنة',
  signInGoogle: 'تسجيل الدخول عبر Google',
  signOut: 'تسجيل الخروج',
  cloudSynced: 'متزامن سحابياً',
  syncingPending: 'جارٍ مزامنة التغييرات',
  offlineSavedLocally: 'غير متصل · محفوظ محلياً حتى المزامنة',
  localGuestMode: 'تخزين محلي · سجّل الدخول للمزامنة',
  offlineToggleOn: 'وضع عدم الاتصال نشط',
  offlineToggleOff: 'المزامنة السحابية نشطة',
  goOffline: 'العمل بدون إنترنت',
  goOnline: 'إعادة الاتصال والمزامنة',
  themeLight: 'فاتح',
  themeDark: 'داكن',
  themeLabel: 'المظهر',
  languageLabel: 'اللغة',
  switchToArabic: 'العربية',
  switchToEnglish: 'English',

  unitKg: 'كجم',
  unitLbs: 'رطل',
  unitCm: 'سم',
  unitSec: 'ث',

  setupTitle: 'إعداد البيانات الجسدية',
  setupSubtitle: 'أدخل طولك ووزنك الحالي أولاً لتهيئة ملفك التدريبي ومتابعة تطورك بدقة.',
  setupHeightLabel: 'الطول (سم)',
  setupHeightPlaceholder: 'مثال: 176',
  setupWeightLabel: 'الوزن الحالي (كجم)',
  setupWeightPlaceholder: 'مثال: 78.5',
  setupGoalLabel: 'الهدف التدريبي الأساسي',
  setupBmiPreview: 'مؤشر كتلة الجسم التقديري (BMI)',
  setupSubmitBtn: 'حفظ والمتابعة',
  setupOrSignIn: 'لديك بيانات سحابية محفوظة؟ سجّل الدخول عبر Google',
  heightLabel: 'الطول',
  bmiLabel: 'مؤشر الكتلة',

  loginBadge: 'قاعدة بيانات معزولة لكل حساب',
  loginTitle: 'تسجيل الدخول إلى حسابك التدريبي',
  loginSubtitle: 'أدخل أو اختر حساب Google محدد لفتح تمارينك وبرامجك وقياسات جسمك المعزولة عن الآخرين.',
  loginEnterAccountBtn: 'الدخول بحساب Google محدد',
  loginContinueAs: 'المتابعة بحساب',
  loginUseAnotherAccount: 'الدخول بحساب آخر',
  loginIsolatedNote: 'يمتلك كل حساب قاعدة بيانات سحابية وتخزيناً محلياً معزولاً تماماً عن الحسابات الأخرى.',
  loginNewAccountNote: 'عند إنشاء حساب جديد تُمسح البيانات وتبدأ فارغة تماماً مع طلب الطول (سم) والوزن (كجم) أولاً.',
  loginCheckingSession: 'جارٍ التحقق من الجلسة النشطة...',
  switchAccountBtn: 'تبديل الحساب',
  isolatedAccountHint: 'قاعدة البيانات المعزولة نشطة لهذا الحساب',

  dashTitle: 'لوحة تحليلات الأداء',
  dashSubtitle: 'تتبّع أحمال التدريب وتغيّرات الوزن وتقارير التقدم المحفوظة.',
  kpiSectionAria: 'مؤشرات الأداء الرئيسية',
  timeframe7d: '٧ أيام',
  timeframe30d: '٣٠ يوماً',
  timeframe90d: '٩٠ يوماً',
  timeframeAll: 'الكل',
  kpiTotalVolume: 'إجمالي الحجم التدريبي',
  kpiWeeklySessions: 'جلسات آخر ٧ أيام',
  kpiLatestWeight: 'أحدث وزن',
  kpiCompletedSets: 'المجموعات المكتملة',
  kpiNoWeightYet: 'لا توجد قراءات بعد',
  chartVolumeTitle: 'تطور الحجم التدريبي',
  chartVolumeSubtitle: 'إجمالي الأوزان المرفوعة في كل جلسة مكتملة',
  chartBodyTitle: 'منحنى الوزن وقياسات الجسم',
  chartBodySubtitle: 'المسار طويل المدى لتكوين الجسم',
  chartMuscleTitle: 'توزيع الحجم حسب العضلة',
  chartMuscleSubtitle: 'نسبة المجهود التدريبي لكل مجموعة عضلية',
  personalRecordsTitle: 'الأرقام القياسية التقديرية (1RM)',
  personalRecordsSubtitle: 'محسوبة من أثقل مجموعاتك المكتملة',
  estOneRm: 'تقدير 1RM',
  reportsTitle: 'تقارير التقدم المحفوظة',
  reportsSubtitle: 'احفظ ملخصات الفترات التدريبية للمراجعة المستمرة',
  saveReportBtn: 'حفظ تقرير تقدم',
  reportTitleLabel: 'عنوان التقرير',
  reportTitlePlaceholder: 'مثال: مرحلة القوة — نوفمبر',
  reportNotesLabel: 'ملاحظات الملخص',
  reportNotesPlaceholder: 'مثال: تطور الأوزان وثبات محيط الخصر...',
  exportCsv: 'تصدير CSV',
  csvHeaders: ['العنوان', 'الفترة', 'تاريخ البداية', 'تاريخ النهاية', 'عدد الجلسات', 'إجمالي الحجم (كجم)', 'تغير الوزن (كجم)', 'أكثر عضلة', 'ملاحظات'],
  recentWorkoutsTitle: 'أحدث الجلسات',
  viewAllWorkouts: 'عرض الكل',
  noDataChart: 'سجّل تمارين أو قياسات في هذه الفترة لعرض الرسم البياني.',
  noWorkoutsYet: 'لم يتم تسجيل أي جلسات تمرين بعد.',
  noReportsYet: 'لا توجد تقارير محفوظة بعد. احفظ لقطة للفترة الحالية.',
  logFirstWorkout: 'ابدأ أول تمرين',

  workoutsTitle: 'الجلسات وسجل التمارين',
  workoutsSubtitle: 'ابدأ جلسة مباشرة من برنامجك أو استعرض سجل التمارين السابقة.',
  activeSessionBadge: 'جلسة جارية',
  defaultWorkoutTitle: 'جلسة تدريب حرة',
  sessionTitlePlaceholder: 'اسم الجلسة (مثال: تمرين الجزء العلوي)',
  elapsedTime: 'المدة',
  restTimer: 'مؤقت الراحة',
  restStart: 'راحة ٩٠ ث',
  restSkip: 'تخطي',
  restAdd15: '+١٥ ث',
  finishWorkout: 'إنهاء وحفظ',
  discardWorkout: 'إلغاء الجلسة',
  addExerciseToSession: 'إضافة تمرين',
  addSet: 'إضافة مجموعة',
  setLabel: 'مجموعة',
  prevLabel: 'الأفضل',
  weightLabel: 'الوزن',
  repsLabel: 'التكرارات',
  doneLabel: 'تم',
  sessionNotesLabel: 'ملاحظات الجلسة',
  sessionNotesPlaceholder: 'كيف كان أداؤك ومستوى الطاقة اليوم؟',
  quickStartTitle: 'بدء جلسة تدريب',
  noRoutinesQuickDesc: 'لا توجد برامج مخصصة بعد. يمكنك بدء تمرين حر سريع أو إنشاء برنامج ثابت.',
  createFirstRoutine: 'إنشاء برنامج',
  blankWorkout: 'تمرين حر سريع',
  startFromRoutine: 'ابدأ',
  workoutHistoryTitle: 'سجل الجلسات المكتملة',
  searchWorkoutsPlaceholder: 'ابحث في الجلسات أو التمارين...',
  noWorkoutsMatchSearch: 'لا توجد جلسات تطابق عبارة البحث.',
  setsCompleted: 'مجموعات',
  sessionsCountLabel: 'جلسات',
  exercisesCountLabel: 'تمارين',
  minutesShort: 'د',
  confirmDelete: 'تأكيد الحذف',
  deleteBtn: 'حذف',
  editBtn: 'تعديل',
  cancelBtn: 'إلغاء',
  saveBtn: 'حفظ',

  routinesTitle: 'البرامج التدريبية',
  routinesSubtitle: 'أنشئ وخصّص برامجك التدريبية بما يناسب أهدافك.',
  createRoutineBtn: 'برنامج جديد',
  editRoutineTitle: 'تعديل البرنامج',
  newRoutineTitle: 'إنشاء برنامج مخصص',
  routineNameLabel: 'اسم البرنامج',
  routineNamePlaceholder: 'مثال: دفع علوي — قوة وتضخيم',
  routineGoalLabel: 'الهدف التدريبي',
  routineDurationLabel: 'المدة المتوقعة (دقيقة)',
  routineNotesLabel: 'ملاحظات التوجيه',
  routineNotesPlaceholder: 'تعليمات الأداء أو خطة زيادة الأوزان...',
  routineExercisesLabel: 'تمارين البرنامج',
  addExerciseToRoutine: 'إضافة تمرين للبرنامج',
  targetSetsLabel: 'المجموعات',
  targetRepsLabel: 'التكرارات',
  restSecLabel: 'الراحة (ث)',
  moveUp: 'نقل لأعلى',
  moveDown: 'نقل لأسفل',
  removeLabel: 'إزالة',
  noRoutinesYet: 'لا توجد برامج مخصصة بعد. أنشئ برنامجاً لبدء التدريب بضغطة واحدة.',

  exercisesTitle: 'مكتبة التمارين',
  exercisesSubtitle: 'تصفح التمارين الأساسية أو أضف تمارينك الخاصة.',
  addExerciseBtn: 'إضافة تمرين',
  searchExercisesPlaceholder: 'ابحث بالاسم (عربي أو إنجليزي)...',
  allMuscles: 'كل العضلات',
  allEquipment: 'كل الأدوات',
  exerciseNameEnLabel: 'اسم التمرين (بالإنجليزية)',
  exerciseNameEnPlaceholder: 'مثال: Pendlay Barbell Row',
  exerciseNameArLabel: 'اسم التمرين (بالعربية)',
  exerciseNameArPlaceholder: 'مثال: سحب بالبار بندلاي',
  exerciseNotesPlaceholder: 'ملاحظات التكنيك أو ضبط المقعد...',
  muscleGroupLabel: 'العضلة المستهدفة',
  equipmentLabel: 'الأداة المستخدمة',
  trackingTypeLabel: 'نوع التتبع',
  customTag: 'مخصص',
  builtInTag: 'أساسي',
  noExercisesMatch: 'لا توجد تمارين مطابقة لخيارات البحث الحالية.',

  measurementsTitle: 'الوزن وقياسات الجسم',
  measurementsSubtitle: 'سجّل الوزن ونسبة الدهون ومحيطات الجسم لمتابعة التطور على المدى الطويل.',
  logMeasurementBtn: 'تسجيل قياس',
  recordedDateLabel: 'التاريخ',
  bodyWeightLabel: 'الوزن',
  bodyFatLabel: 'نسبة الدهون %',
  chestLabel: 'الصدر (سم)',
  waistLabel: 'الخصر (سم)',
  hipsLabel: 'الأرداف (سم)',
  armsLabel: 'الذراع (سم)',
  thighsLabel: 'الفخذ (سم)',
  notesLabel: 'ملاحظات',
  measurementNotesPlaceholder: 'مثال: قياس صباحي قبل الإفطار',
  metricHistoryTitle: 'سجل القياسات',
  deltaFromStart: 'مقارنة بالبداية',
  noMeasurementsYet: 'لم يتم تسجيل أي قياسات للجسم بعد.',

  accountModalTitle: 'الحساب والتفضيلات والمزامنة',
  cloudAccountSection: 'الحساب السحابي',
  signedInAs: 'تم تسجيل الدخول بحساب',
  notSignedInDesc: 'سجّل الدخول بحساب Google لحفظ تمارينك وبرامجك وقياساتك بأمان في السحابة عبر أجهزتك.',
  preferencesSection: 'الملف الشخصي وتفضيلات التدريب',
  fitnessGoalLabel: 'الهدف الأساسي',
  preferredUnitLabel: 'وحدة الوزن',
  targetWeightLabel: 'الوزن المستهدف',
  targetWeightPlaceholder: 'مثال: 75',
  offlineSyncSection: 'العمل بدون إنترنت والمزامنة',
  offlineModeLabel: 'حالة الاتصال والتخزين المؤقت',
  offlineModeDesc: 'تُحفظ التغييرات محلياً عند انقطاع الاتصال وتُرفع تلقائياً إلى Cloud Firestore فور عودة الاتصال.',
  pendingWritesLabel: 'تغييرات بانتظار المزامنة',
  dataManagementSection: 'إدارة البيانات وإعادة التعيين',
  exportAllJson: 'تصدير نسخة JSON',
  resetAllDataBtn: 'مسح جميع البيانات (إعادة تعيين)',
  resetAllDataConfirm: 'تأكيد مسح جميع البيانات',
  resetAllDataDesc: 'يمسح جميع الجلسات والبرامج والتمارين المخصصة والقياسات والتقارير والطول.',
  closeModal: 'إغلاق',

  goals: {
    strength: 'القوة البدنية',
    hypertrophy: 'الضخامة العضلية',
    fat_loss: 'خسارة الدهون',
    endurance: 'التحمل',
    general: 'لياقة عامة',
  },
  muscles: {
    chest: 'الصدر',
    back: 'الظهر',
    legs: 'الأرجل',
    shoulders: 'الأكتاف',
    arms: 'الذراعان',
    core: 'البطن والجذع',
    full_body: 'كامل الجسم',
  },
  equipment: {
    barbell: 'بار حديدي',
    dumbbell: 'دمبل',
    machine: 'جهاز',
    cable: 'كابل',
    bodyweight: 'وزن الجسم',
    kettlebell: 'كيتل بل',
    other: 'أخرى',
  },
  trackingTypes: {
    weight_reps: 'وزن وتكرارات',
    bodyweight_reps: 'تكرارات بوزن الجسم',
    duration: 'مدة زمنية (ث)',
  },

  val_invalid_date: 'أدخل تاريخاً صحيحاً (YYYY-MM-DD).',
  val_invalid_weight: 'يجب أن يكون الوزن بين ٢٠ و ٤٠٠ كجم.',
  val_invalid_height: 'يجب أن يكون الطول بين ١٠٠ و ٢٥٠ سم.',
  val_invalid_bodyfat: 'يجب أن تكون نسبة الدهون بين ٢٪ و ٧٠٪.',
  val_invalid_measurement: 'قيمة القياس خارج النطاق المسموح.',
  val_notes_too_long: 'الملاحظات تتجاوز الحد المسموح.',
  val_exercise_name: 'يجب أن يكون اسم التمرين بين حرفين و ١٠٠ حرف.',
  val_routine_name: 'يجب أن يكون اسم البرنامج بين حرفين و ١٠٠ حرف.',
  val_routine_duration: 'يجب أن تكون المدة بين ٥ و ٣٠٠ دقيقة.',
  val_routine_exercises: 'أضف تمريناً واحداً على الأقل (بحد أقصى ٣٠).',
  val_report_title: 'يجب أن يكون عنوان التقرير حرفين على الأقل.',
};

const STORAGE_LANG_KEY = 'ironledger_lang';

@Injectable({providedIn: 'root'})
export class I18nService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly document = inject(DOCUMENT);

  readonly lang = signal<LanguageCode>('en');
  readonly dir = computed<'ltr' | 'rtl'>(() => (this.lang() === 'ar' ? 'rtl' : 'ltr'));
  readonly t = computed<Translations>(() => (this.lang() === 'ar' ? AR_DICT : EN_DICT));

  constructor() {
    if (isPlatformBrowser(this.platformId)) {
      try {
        const saved = localStorage.getItem(STORAGE_LANG_KEY);
        if (saved === 'ar' || saved === 'en') {
          this.setLanguage(saved);
        } else {
          this.applyDomLang(this.lang());
        }
      } catch {
        this.applyDomLang(this.lang());
      }
    }
  }

  unitLabel(unit: WeightUnit): string {
    const dict = this.t();
    return unit === 'lbs' ? dict.unitLbs : dict.unitKg;
  }

  exerciseDisplayName(
    exerciseId: string,
    fallbackName: string,
    exercises: ExerciseDefinition[],
  ): string {
    const found = exercises.find((e) => e.id === exerciseId);
    if (!found) return fallbackName;
    if (this.lang() === 'ar') {
      return found.nameAr || found.nameEn || fallbackName;
    }
    return found.nameEn || found.nameAr || fallbackName;
  }

  setLanguage(lang: LanguageCode): void {
    this.lang.set(lang);
    if (isPlatformBrowser(this.platformId)) {
      try {
        localStorage.setItem(STORAGE_LANG_KEY, lang);
      } catch {
        // Ignore storage error
      }
      this.applyDomLang(lang);
    }
  }

  toggleLanguage(): LanguageCode {
    const next: LanguageCode = this.lang() === 'en' ? 'ar' : 'en';
    this.setLanguage(next);
    return next;
  }

  private applyDomLang(lang: LanguageCode): void {
    const html = this.document.documentElement;
    html.lang = lang;
    html.dir = lang === 'ar' ? 'rtl' : 'ltr';
  }
}
