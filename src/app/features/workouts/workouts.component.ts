import {isPlatformBrowser} from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  PLATFORM_ID,
  computed,
  inject,
  output,
  signal,
} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {
  calculateWorkoutVolumeKg,
  convertInputToKg,
  convertWeight,
  countCompletedSets,
} from '../../core/fitness-math';
import {GymStoreService} from '../../core/gym-store.service';
import {I18nService} from '../../core/i18n.service';
import {ActiveWorkoutDraft, ExerciseDefinition} from '../../core/models';

@Component({
  selector: 'app-workouts',
  imports: [FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-6">
      <!-- Page Header -->
      <div class="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 class="font-display text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 sm:text-3xl">
            {{ i18n.t().workoutsTitle }}
          </h1>
          <p class="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            {{ i18n.t().workoutsSubtitle }}
          </p>
        </div>

        @if (!store.activeWorkout()) {
          <button
            type="button"
            (click)="store.startEmptyWorkout()"
            class="inline-flex items-center gap-2 rounded-lg bg-orange-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-orange-700 dark:bg-orange-500 dark:hover:bg-orange-600 whitespace-nowrap"
          >
            <span class="material-icons text-base" aria-hidden="true">play_arrow</span>
            {{ i18n.t().blankWorkout }}
          </button>
        }
      </div>

      <!-- Active Session Runner -->
      @if (store.activeWorkout(); as draft) {
        <section
          class="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900"
          [attr.aria-label]="i18n.t().activeSessionBadge"
        >
          <!-- Live Session Header -->
          <div class="flex flex-wrap items-center justify-between gap-4 border-b border-zinc-200 pb-4 dark:border-zinc-800">
            <div class="min-w-0 flex-1 space-y-2">
              <div class="flex flex-wrap items-center gap-2 text-xs font-medium text-orange-600 dark:text-orange-400">
                <span>{{ i18n.t().activeSessionBadge }}</span>
                <span aria-hidden="true">·</span>
                <span class="tabular-nums text-zinc-600 dark:text-zinc-400">
                  {{ i18n.t().elapsedTime }}: <span class="font-mono" dir="ltr">{{ elapsedFormatted() }}</span>
                </span>
                <span aria-hidden="true">·</span>
                <span class="tabular-nums text-zinc-600 dark:text-zinc-400">
                  {{ liveVolumeDisplay() }} {{ unitLabel() }} · {{ liveCompletedSets() }} {{ i18n.t().setsCompleted }}
                </span>
              </div>
              <div>
                <label for="active-session-title" class="sr-only">{{ i18n.t().workoutsTitle }}</label>
                <input
                  id="active-session-title"
                  type="text"
                  [ngModel]="draft.title"
                  (ngModelChange)="updateTitle($event)"
                  [placeholder]="i18n.t().sessionTitlePlaceholder"
                  class="w-full max-w-md rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-1.5 font-display text-base font-bold text-zinc-900 focus:border-orange-500 focus:bg-white focus:outline-none dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100"
                />
              </div>
            </div>

            <!-- Rest Timer + Finish/Discard -->
            <div class="flex flex-wrap items-center gap-2">
              @if (store.restTimerRunning()) {
                <div class="flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-1.5 dark:border-zinc-800 dark:bg-zinc-950">
                  <span class="font-mono text-sm font-semibold tabular-nums text-orange-600 dark:text-orange-400">
                    {{ formatSeconds(store.restSecondsLeft()) }}
                  </span>
                  <button
                    type="button"
                    (click)="store.addRestSeconds(15)"
                    class="rounded px-2 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-200 dark:text-zinc-300 dark:hover:bg-zinc-800"
                  >
                    {{ i18n.t().restAdd15 }}
                  </button>
                  <button
                    type="button"
                    (click)="store.skipRestTimer()"
                    class="rounded px-2 py-1 text-xs font-medium text-zinc-600 hover:bg-zinc-200 dark:text-zinc-400 dark:hover:bg-zinc-800"
                  >
                    {{ i18n.t().restSkip }}
                  </button>
                </div>
              } @else {
                <button
                  type="button"
                  (click)="store.startRestTimer(90)"
                  class="rounded-lg border border-zinc-300 px-3 py-2 text-xs font-medium text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800 whitespace-nowrap"
                >
                  {{ i18n.t().restStart }}
                </button>
              }

              <button
                type="button"
                (click)="store.discardActiveWorkout()"
                class="rounded-lg border border-zinc-300 px-3.5 py-2 text-xs font-medium text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800 whitespace-nowrap"
              >
                {{ i18n.t().discardWorkout }}
              </button>

              <button
                type="button"
                (click)="finishSession()"
                class="rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-700 whitespace-nowrap"
              >
                {{ i18n.t().finishWorkout }}
              </button>
            </div>
          </div>

          <!-- Active Exercise Entries -->
          <div class="mt-5 space-y-5">
            @for (entry of draft.entries; track entry.exerciseId + '-' + $index; let eIdx = $index) {
              <div class="border-b border-zinc-200 pb-5 last:border-b-0 dark:border-zinc-800">
                <div class="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h3 class="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                      {{ i18n.exerciseDisplayName(entry.exerciseId, entry.exerciseName, store.allExercises()) }}
                    </h3>
                    <p class="text-xs text-zinc-500 dark:text-zinc-400">
                      {{ i18n.t().muscles[entry.muscleGroup] }}
                    </p>
                  </div>
                  <div class="flex items-center gap-2">
                    <button
                      type="button"
                      (click)="addSetToEntry(eIdx)"
                      class="rounded-lg border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
                    >
                      + {{ i18n.t().addSet }}
                    </button>
                    <button
                      type="button"
                      (click)="removeEntry(eIdx)"
                      [attr.aria-label]="i18n.t().removeLabel + ' ' + i18n.exerciseDisplayName(entry.exerciseId, entry.exerciseName, store.allExercises())"
                      class="flex h-8 w-8 items-center justify-center rounded-md text-zinc-400 hover:bg-zinc-100 hover:text-red-600 dark:hover:bg-zinc-800 dark:hover:text-red-400"
                    >
                      <span class="material-icons text-base" aria-hidden="true">close</span>
                    </button>
                  </div>
                </div>

                <!-- Sets Grid -->
                <div class="overflow-x-auto">
                  <table class="w-full min-w-[420px] text-sm">
                    <thead>
                      <tr class="text-start text-xs text-zinc-500 dark:text-zinc-400">
                        <th class="pb-2 text-start font-medium">{{ i18n.t().setLabel }}</th>
                        <th class="pb-2 text-start font-medium">{{ i18n.t().weightLabel }} ({{ unitLabel() }})</th>
                        <th class="pb-2 text-start font-medium">{{ i18n.t().repsLabel }}</th>
                        <th class="pb-2 text-end font-medium">{{ i18n.t().doneLabel }}</th>
                      </tr>
                    </thead>
                    <tbody class="divide-y divide-zinc-100 dark:divide-zinc-800/80">
                      @for (s of entry.sets; track s.setNumber; let sIdx = $index) {
                        <tr>
                          <td class="py-2 font-mono text-xs tabular-nums text-zinc-500 dark:text-zinc-400">
                            {{ s.setNumber }}
                          </td>
                          <td class="py-2 pe-3">
                            <label [for]="'w-' + eIdx + '-' + sIdx" class="sr-only">{{ i18n.t().weightLabel }}</label>
                            <input
                              [id]="'w-' + eIdx + '-' + sIdx"
                              type="number"
                              step="0.5"
                              min="0"
                              max="1000"
                              [ngModel]="displaySetWeight(s.weightKg)"
                              (ngModelChange)="updateSetWeight(eIdx, sIdx, $event)"
                              class="w-24 rounded-md border border-zinc-300 bg-white px-2.5 py-1.5 font-mono text-sm tabular-nums text-zinc-900 focus:border-orange-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                            />
                          </td>
                          <td class="py-2 pe-3">
                            <label [for]="'r-' + eIdx + '-' + sIdx" class="sr-only">{{ i18n.t().repsLabel }}</label>
                            <input
                              [id]="'r-' + eIdx + '-' + sIdx"
                              type="number"
                              step="1"
                              min="0"
                              max="500"
                              [ngModel]="s.reps"
                              (ngModelChange)="updateSetReps(eIdx, sIdx, $event)"
                              class="w-20 rounded-md border border-zinc-300 bg-white px-2.5 py-1.5 font-mono text-sm tabular-nums text-zinc-900 focus:border-orange-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                            />
                          </td>
                          <td class="py-2 text-end">
                            <button
                              type="button"
                              (click)="toggleSetCompleted(eIdx, sIdx)"
                              [attr.aria-pressed]="s.completed"
                              [attr.aria-label]="i18n.t().doneLabel + ' ' + i18n.exerciseDisplayName(entry.exerciseId, entry.exerciseName, store.allExercises()) + ' ' + s.setNumber"
                              [class]="
                                s.completed
                                  ? 'inline-flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-600 text-white'
                                  : 'inline-flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-300 text-zinc-500 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800'
                              "
                            >
                              <span class="material-icons text-base" aria-hidden="true">check</span>
                            </button>
                          </td>
                        </tr>
                      }
                    </tbody>
                  </table>
                </div>
              </div>
            }

            <!-- Add Exercise Picker + Session Notes -->
            <div class="grid grid-cols-1 gap-4 pt-2 md:grid-cols-2">
              <div>
                <label for="add-ex-select" class="mb-1.5 block text-xs font-medium text-zinc-600 dark:text-zinc-400">
                  {{ i18n.t().addExerciseToSession }}
                </label>
                <div class="flex gap-2">
                  <select
                    id="add-ex-select"
                    [ngModel]="selectedExerciseId()"
                    (ngModelChange)="selectedExerciseId.set($event)"
                    class="min-w-0 flex-1 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-orange-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                  >
                    @for (ex of store.allExercises(); track ex.id) {
                      <option [value]="ex.id">{{ exerciseLabel(ex) }}</option>
                    }
                  </select>
                  <button
                    type="button"
                    (click)="addSelectedExercise()"
                    class="rounded-lg bg-zinc-900 px-4 py-2 text-xs font-semibold text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200 whitespace-nowrap shrink-0"
                  >
                    + {{ i18n.t().addExerciseToSession }}
                  </button>
                </div>
              </div>

              <div>
                <label for="session-notes" class="mb-1.5 block text-xs font-medium text-zinc-600 dark:text-zinc-400">
                  {{ i18n.t().sessionNotesLabel }}
                </label>
                <input
                  id="session-notes"
                  type="text"
                  [ngModel]="draft.notes"
                  (ngModelChange)="updateNotes($event)"
                  [placeholder]="i18n.t().sessionNotesPlaceholder"
                  class="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-orange-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                />
              </div>
            </div>
          </div>
        </section>
      } @else {
        <!-- Quick Start Routines -->
        <section class="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
          <h2 class="font-display text-base font-semibold text-zinc-900 dark:text-zinc-100">
            {{ i18n.t().quickStartTitle }}
          </h2>
          @if (store.routines().length === 0) {
            <div class="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-dashed border-zinc-200 p-4 dark:border-zinc-800">
              <p class="text-sm text-zinc-500 dark:text-zinc-400">{{ i18n.t().noRoutinesQuickDesc }}</p>
              <button
                type="button"
                (click)="openRoutines.emit()"
                class="rounded-lg border border-zinc-300 px-3.5 py-2 text-xs font-semibold text-zinc-800 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800 whitespace-nowrap shrink-0"
              >
                {{ i18n.t().createFirstRoutine }}
              </button>
            </div>
          } @else {
            <div class="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
              @for (rt of store.routines(); track rt.id) {
                <div class="flex items-center justify-between gap-3 rounded-lg border border-zinc-200 p-3.5 dark:border-zinc-800">
                  <div class="min-w-0">
                    <p class="truncate text-sm font-semibold text-zinc-900 dark:text-zinc-100">{{ rt.name }}</p>
                    <p class="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400 tabular-nums">
                      {{ rt.exercises.length }} {{ i18n.t().exercisesCountLabel }} · {{ rt.estimatedMinutes }} {{ i18n.t().minutesShort }}
                    </p>
                  </div>
                  <button
                    type="button"
                    (click)="store.startWorkoutFromRoutine(rt)"
                    class="rounded-lg bg-orange-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-orange-700 dark:bg-orange-500 dark:hover:bg-orange-600 whitespace-nowrap shrink-0"
                  >
                    {{ i18n.t().startFromRoutine }}
                  </button>
                </div>
              }
            </div>
          }
        </section>
      }

      <!-- Workout History -->
      <section class="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
        <div class="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-200 pb-4 dark:border-zinc-800">
          <h2 class="font-display text-base font-semibold text-zinc-900 dark:text-zinc-100">
            {{ i18n.t().workoutHistoryTitle }}
          </h2>
          <div class="w-full sm:w-72">
            <label for="search-workouts" class="sr-only">{{ i18n.t().searchWorkoutsPlaceholder }}</label>
            <input
              id="search-workouts"
              type="search"
              [ngModel]="searchTerm()"
              (ngModelChange)="searchTerm.set($event)"
              [placeholder]="i18n.t().searchWorkoutsPlaceholder"
              class="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-orange-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
            />
          </div>
        </div>

        @if (filteredHistory().length === 0) {
          <p class="py-8 text-center text-sm text-zinc-500 dark:text-zinc-400">
            {{ searchTerm().trim() ? i18n.t().noWorkoutsMatchSearch : i18n.t().noWorkoutsYet }}
          </p>
        } @else {
          <div class="divide-y divide-zinc-200 dark:divide-zinc-800">
            @for (wk of filteredHistory(); track wk.id) {
              <div class="py-4">
                <div class="flex flex-wrap items-center justify-between gap-3">
                  <button
                    type="button"
                    (click)="toggleExpand(wk.id)"
                    [attr.aria-expanded]="expandedWorkoutId() === wk.id"
                    class="min-w-0 flex-1 text-start"
                  >
                    <p class="truncate text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                      {{ wk.title }}
                    </p>
                    <p class="mt-0.5 text-xs tabular-nums text-zinc-500 dark:text-zinc-400">
                      <span class="font-mono" dir="ltr">{{ wk.completedAtIso.slice(0, 10) }}</span> · {{ wk.durationMinutes }} {{ i18n.t().minutesShort }} ·
                      {{ wk.completedSetsCount }} {{ i18n.t().setsCompleted }} ·
                      {{ displayWeightVal(wk.totalVolumeKg).toLocaleString('en-US') }} {{ unitLabel() }}
                    </p>
                  </button>

                  <div class="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      (click)="toggleExpand(wk.id)"
                      [attr.aria-label]="wk.title"
                      class="flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-200 text-zinc-600 hover:bg-zinc-100 dark:border-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-800"
                    >
                      <span class="material-icons text-base" aria-hidden="true">
                        {{ expandedWorkoutId() === wk.id ? 'expand_less' : 'expand_more' }}
                      </span>
                    </button>
                    <button
                      type="button"
                      (click)="store.deleteWorkout(wk.id)"
                      [attr.aria-label]="i18n.t().deleteBtn + ' ' + wk.title"
                      class="flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-200 text-zinc-500 hover:bg-zinc-100 hover:text-red-600 dark:border-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-red-400"
                    >
                      <span class="material-icons text-base" aria-hidden="true">delete_outline</span>
                    </button>
                  </div>
                </div>

                @if (expandedWorkoutId() === wk.id) {
                  <div class="mt-3 space-y-2 border-t border-zinc-100 pt-3 dark:border-zinc-800/80">
                    @if (wk.notes) {
                      <p class="text-xs text-zinc-600 dark:text-zinc-400">{{ wk.notes }}</p>
                    }
                    <div class="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      @for (entry of wk.entries; track entry.exerciseId + '-' + $index) {
                        <div class="rounded-lg bg-zinc-50 p-3 dark:bg-zinc-950/60">
                          <p class="text-xs font-semibold text-zinc-800 dark:text-zinc-200">
                            {{ i18n.exerciseDisplayName(entry.exerciseId, entry.exerciseName, store.allExercises()) }}
                          </p>
                          <p class="mt-1 text-xs tabular-nums text-zinc-500 dark:text-zinc-400">
                            @for (s of entry.sets; track s.setNumber; let last = $last) {
                              @if (s.completed) {
                                {{ displayWeightVal(s.weightKg) }}{{ unitLabel() }}×{{ s.reps }}@if (!last) { · }
                              }
                            }
                          </p>
                        </div>
                      }
                    </div>
                  </div>
                }
              </div>
            }
          </div>
        }
      </section>
    </div>
  `,
})
export class WorkoutsComponent implements OnDestroy {
  readonly store = inject(GymStoreService);
  readonly i18n = inject(I18nService);
  private readonly platformId = inject(PLATFORM_ID);

  readonly openRoutines = output<void>();

  readonly searchTerm = signal('');
  readonly expandedWorkoutId = signal<string | null>(null);
  readonly selectedExerciseId = signal('ex_bench_press');
  readonly nowTickMs = signal(Date.now());

  private tickTimer: ReturnType<typeof setInterval> | null = null;

  readonly unit = computed(() => this.store.preferences().preferredUnit);
  readonly unitLabel = computed(() => this.i18n.unitLabel(this.unit()));

  readonly filteredHistory = computed(() => {
    const q = this.searchTerm().trim().toLowerCase();
    const list = this.store.sortedWorkouts();
    if (!q) return list;
    const allEx = this.store.allExercises();
    return list.filter(
      (w) =>
        w.title.toLowerCase().includes(q) ||
        w.entries.some((e) => {
          if (e.exerciseName.toLowerCase().includes(q)) return true;
          const def = allEx.find((ex) => ex.id === e.exerciseId);
          return def
            ? def.nameEn.toLowerCase().includes(q) || def.nameAr.toLowerCase().includes(q)
            : false;
        }),
    );
  });

  readonly elapsedFormatted = computed(() => {
    const draft = this.store.activeWorkout();
    if (!draft) return '00:00';
    const secs = Math.max(0, Math.floor((this.nowTickMs() - draft.startedAtMs) / 1000));
    return this.formatSeconds(secs);
  });

  readonly liveVolumeDisplay = computed(() => {
    const draft = this.store.activeWorkout();
    if (!draft) return 0;
    return Math.round(convertWeight(calculateWorkoutVolumeKg(draft.entries), this.unit()));
  });

  readonly liveCompletedSets = computed(() => {
    const draft = this.store.activeWorkout();
    return draft ? countCompletedSets(draft.entries) : 0;
  });

  constructor() {
    if (isPlatformBrowser(this.platformId)) {
      this.tickTimer = setInterval(() => {
        if (this.store.activeWorkout()) {
          this.nowTickMs.set(Date.now());
        }
      }, 1000);
    }
  }

  ngOnDestroy(): void {
    if (this.tickTimer !== null) {
      clearInterval(this.tickTimer);
    }
  }

  formatSeconds(totalSeconds: number): string {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }

  exerciseLabel(ex: ExerciseDefinition): string {
    return this.i18n.lang() === 'ar' && ex.nameAr ? ex.nameAr : ex.nameEn;
  }

  displayWeightVal(kg: number): number {
    return convertWeight(kg, this.unit());
  }

  displaySetWeight(kg: number): number {
    return convertWeight(kg, this.unit());
  }

  updateTitle(title: string): void {
    const draft = this.store.activeWorkout();
    if (!draft) return;
    this.store.updateActiveWorkout({...draft, title});
  }

  updateNotes(notes: string): void {
    const draft = this.store.activeWorkout();
    if (!draft) return;
    this.store.updateActiveWorkout({...draft, notes});
  }

  addSelectedExercise(): void {
    const draft = this.store.activeWorkout();
    if (!draft) return;
    const ex = this.store.allExercises().find((e) => e.id === this.selectedExerciseId());
    if (!ex) return;

    const prevWeight = this.store.findLastWeightForExercise(ex.id) ?? 40;
    const nextDraft: ActiveWorkoutDraft = {
      ...draft,
      entries: [
        ...draft.entries,
        {
          exerciseId: ex.id,
          exerciseName: this.exerciseLabel(ex),
          muscleGroup: ex.muscleGroup,
          sets: [
            {setNumber: 1, weightKg: prevWeight, reps: 10, completed: false},
            {setNumber: 2, weightKg: prevWeight, reps: 10, completed: false},
            {setNumber: 3, weightKg: prevWeight, reps: 10, completed: false},
          ],
        },
      ],
    };
    this.store.updateActiveWorkout(nextDraft);
  }

  removeEntry(entryIndex: number): void {
    const draft = this.store.activeWorkout();
    if (!draft) return;
    this.store.updateActiveWorkout({
      ...draft,
      entries: draft.entries.filter((_, idx) => idx !== entryIndex),
    });
  }

  addSetToEntry(entryIndex: number): void {
    const draft = this.store.activeWorkout();
    if (!draft) return;
    const entries = draft.entries.map((entry, idx) => {
      if (idx !== entryIndex) return entry;
      const last = entry.sets[entry.sets.length - 1];
      return {
        ...entry,
        sets: [
          ...entry.sets,
          {
            setNumber: entry.sets.length + 1,
            weightKg: last ? last.weightKg : 40,
            reps: last ? last.reps : 10,
            completed: false,
          },
        ],
      };
    });
    this.store.updateActiveWorkout({...draft, entries});
  }

  updateSetWeight(entryIndex: number, setIndex: number, displayValue: number): void {
    const draft = this.store.activeWorkout();
    if (!draft) return;
    const weightKg = Math.max(0, convertInputToKg(Number(displayValue) || 0, this.unit()));
    const entries = draft.entries.map((entry, eIdx) => {
      if (eIdx !== entryIndex) return entry;
      return {
        ...entry,
        sets: entry.sets.map((s, sIdx) => (sIdx === setIndex ? {...s, weightKg} : s)),
      };
    });
    this.store.updateActiveWorkout({...draft, entries});
  }

  updateSetReps(entryIndex: number, setIndex: number, repsValue: number): void {
    const draft = this.store.activeWorkout();
    if (!draft) return;
    const reps = Math.max(0, Math.round(Number(repsValue) || 0));
    const entries = draft.entries.map((entry, eIdx) => {
      if (eIdx !== entryIndex) return entry;
      return {
        ...entry,
        sets: entry.sets.map((s, sIdx) => (sIdx === setIndex ? {...s, reps} : s)),
      };
    });
    this.store.updateActiveWorkout({...draft, entries});
  }

  toggleSetCompleted(entryIndex: number, setIndex: number): void {
    const draft = this.store.activeWorkout();
    if (!draft) return;
    let becameCompleted = false;
    const entries = draft.entries.map((entry, eIdx) => {
      if (eIdx !== entryIndex) return entry;
      return {
        ...entry,
        sets: entry.sets.map((s, sIdx) => {
          if (sIdx !== setIndex) return s;
          becameCompleted = !s.completed;
          return {...s, completed: !s.completed};
        }),
      };
    });
    this.store.updateActiveWorkout({...draft, entries});
    if (becameCompleted) {
      this.store.startRestTimer(90);
    }
  }

  async finishSession(): Promise<void> {
    await this.store.finishActiveWorkout();
  }

  toggleExpand(id: string): void {
    this.expandedWorkoutId.set(this.expandedWorkoutId() === id ? null : id);
  }
}
