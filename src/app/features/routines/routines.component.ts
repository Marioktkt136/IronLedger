import {ChangeDetectionStrategy, Component, inject, output, signal} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {validateRoutineInput} from '../../core/fitness-math';
import {GymStoreService} from '../../core/gym-store.service';
import {I18nService} from '../../core/i18n.service';
import {
  ExerciseDefinition,
  FitnessGoal,
  RoutineExerciseItem,
  WorkoutRoutine,
} from '../../core/models';

@Component({
  selector: 'app-routines',
  imports: [FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-6">
      <div class="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 class="font-display text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 sm:text-3xl">
            {{ i18n.t().routinesTitle }}
          </h1>
          <p class="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            {{ i18n.t().routinesSubtitle }}
          </p>
        </div>

        <button
          type="button"
          (click)="openNewRoutine()"
          class="inline-flex items-center gap-2 rounded-lg bg-orange-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-orange-700 dark:bg-orange-500 dark:hover:bg-orange-600 whitespace-nowrap"
        >
          <span class="material-icons text-base" aria-hidden="true">add</span>
          {{ i18n.t().createRoutineBtn }}
        </button>
      </div>

      <!-- Create / Edit Routine Form -->
      @if (editingOpen()) {
        <form
          (ngSubmit)="saveRoutine()"
          class="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900"
        >
          <div class="flex items-center justify-between border-b border-zinc-200 pb-3 dark:border-zinc-800">
            <h2 class="font-display text-base font-semibold text-zinc-900 dark:text-zinc-100">
              {{ editingId() ? i18n.t().editRoutineTitle : i18n.t().newRoutineTitle }}
            </h2>
            <button
              type="button"
              (click)="editingOpen.set(false)"
              [attr.aria-label]="i18n.t().cancelBtn"
              class="flex h-8 w-8 items-center justify-center rounded-md text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
            >
              <span class="material-icons text-base" aria-hidden="true">close</span>
            </button>
          </div>

          <div class="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
            <div>
              <label for="rt-name" class="mb-1.5 block text-xs font-medium text-zinc-600 dark:text-zinc-400">
                {{ i18n.t().routineNameLabel }}
              </label>
              <input
                id="rt-name"
                name="routineName"
                type="text"
                required
                [ngModel]="nameDraft()"
                (ngModelChange)="nameDraft.set($event)"
                [placeholder]="i18n.t().routineNamePlaceholder"
                class="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-orange-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
              />
            </div>

            <div>
              <label for="rt-goal" class="mb-1.5 block text-xs font-medium text-zinc-600 dark:text-zinc-400">
                {{ i18n.t().routineGoalLabel }}
              </label>
              <select
                id="rt-goal"
                name="routineGoal"
                [ngModel]="goalDraft()"
                (ngModelChange)="goalDraft.set($event)"
                class="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-orange-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
              >
                @for (g of goalOptions; track g) {
                  <option [value]="g">{{ i18n.t().goals[g] }}</option>
                }
              </select>
            </div>

            <div>
              <label for="rt-duration" class="mb-1.5 block text-xs font-medium text-zinc-600 dark:text-zinc-400">
                {{ i18n.t().routineDurationLabel }}
              </label>
              <input
                id="rt-duration"
                name="routineDuration"
                type="number"
                min="5"
                max="300"
                [ngModel]="durationDraft()"
                (ngModelChange)="durationDraft.set($event)"
                class="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 font-mono text-sm tabular-nums text-zinc-900 focus:border-orange-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
              />
            </div>
          </div>

          <div class="mt-4">
            <label for="rt-notes" class="mb-1.5 block text-xs font-medium text-zinc-600 dark:text-zinc-400">
              {{ i18n.t().routineNotesLabel }}
            </label>
            <input
              id="rt-notes"
              name="routineNotes"
              type="text"
              [ngModel]="notesDraft()"
              (ngModelChange)="notesDraft.set($event)"
              [placeholder]="i18n.t().routineNotesPlaceholder"
              class="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-orange-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
            />
          </div>

          <!-- Exercise Picker -->
          <div class="mt-5 border-t border-zinc-200 pt-4 dark:border-zinc-800">
            <label for="rt-add-ex" class="mb-1.5 block text-xs font-medium text-zinc-600 dark:text-zinc-400">
              {{ i18n.t().addExerciseToRoutine }}
            </label>
            <div class="flex flex-wrap gap-2">
              <select
                id="rt-add-ex"
                name="pickerEx"
                [ngModel]="pickerExerciseId()"
                (ngModelChange)="pickerExerciseId.set($event)"
                class="min-w-0 flex-1 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-orange-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
              >
                @for (ex of store.allExercises(); track ex.id) {
                  <option [value]="ex.id">{{ exerciseLabel(ex) }} ({{ i18n.t().muscles[ex.muscleGroup] }})</option>
                }
              </select>
              <button
                type="button"
                (click)="appendExercise()"
                class="rounded-lg bg-zinc-900 px-4 py-2 text-xs font-semibold text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200 whitespace-nowrap"
              >
                + {{ i18n.t().addExerciseToRoutine }}
              </button>
            </div>

            <!-- Selected Exercises List -->
            @if (exercisesDraft().length > 0) {
              <div class="mt-4 divide-y divide-zinc-200 dark:divide-zinc-800">
                @for (item of exercisesDraft(); track item.exerciseId + '-' + $index; let idx = $index) {
                  <div class="flex flex-wrap items-center justify-between gap-3 py-3">
                    <div class="min-w-0 flex-1">
                      <p class="truncate text-sm font-medium text-zinc-900 dark:text-zinc-100">
                        {{ i18n.exerciseDisplayName(item.exerciseId, item.exerciseName, store.allExercises()) }}
                      </p>
                      <p class="text-xs text-zinc-500 dark:text-zinc-400">
                        {{ i18n.t().muscles[item.muscleGroup] }}
                      </p>
                    </div>

                    <div class="flex flex-wrap items-center gap-2">
                      <div>
                        <label [for]="'rt-sets-' + idx" class="me-1 text-[11px] text-zinc-500 dark:text-zinc-400">
                          {{ i18n.t().targetSetsLabel }}
                        </label>
                        <input
                          [id]="'rt-sets-' + idx"
                          type="number"
                          min="1"
                          max="20"
                          [ngModel]="item.targetSets"
                          [ngModelOptions]="{standalone: true}"
                          (ngModelChange)="updateItemField(idx, 'targetSets', $event)"
                          class="w-16 rounded-md border border-zinc-300 bg-white px-2 py-1 font-mono text-xs tabular-nums text-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                        />
                      </div>
                      <div>
                        <label [for]="'rt-reps-' + idx" class="me-1 text-[11px] text-zinc-500 dark:text-zinc-400">
                          {{ i18n.t().targetRepsLabel }}
                        </label>
                        <input
                          [id]="'rt-reps-' + idx"
                          type="text"
                          [ngModel]="item.targetReps"
                          [ngModelOptions]="{standalone: true}"
                          (ngModelChange)="updateItemField(idx, 'targetReps', $event)"
                          class="w-16 rounded-md border border-zinc-300 bg-white px-2 py-1 font-mono text-xs tabular-nums text-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                        />
                      </div>
                      <div>
                        <label [for]="'rt-rest-' + idx" class="me-1 text-[11px] text-zinc-500 dark:text-zinc-400">
                          {{ i18n.t().restSecLabel }}
                        </label>
                        <input
                          [id]="'rt-rest-' + idx"
                          type="number"
                          min="15"
                          max="600"
                          step="15"
                          [ngModel]="item.restSeconds"
                          [ngModelOptions]="{standalone: true}"
                          (ngModelChange)="updateItemField(idx, 'restSeconds', $event)"
                          class="w-16 rounded-md border border-zinc-300 bg-white px-2 py-1 font-mono text-xs tabular-nums text-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                        />
                      </div>

                      <button
                        type="button"
                        (click)="moveItem(idx, -1)"
                        [disabled]="idx === 0"
                        [attr.aria-label]="i18n.t().moveUp"
                        class="flex h-8 w-8 items-center justify-center rounded border border-zinc-200 text-zinc-500 hover:bg-zinc-100 disabled:opacity-30 dark:border-zinc-800 dark:hover:bg-zinc-800"
                      >
                        <span class="material-icons text-sm" aria-hidden="true">arrow_upward</span>
                      </button>
                      <button
                        type="button"
                        (click)="moveItem(idx, 1)"
                        [disabled]="idx === exercisesDraft().length - 1"
                        [attr.aria-label]="i18n.t().moveDown"
                        class="flex h-8 w-8 items-center justify-center rounded border border-zinc-200 text-zinc-500 hover:bg-zinc-100 disabled:opacity-30 dark:border-zinc-800 dark:hover:bg-zinc-800"
                      >
                        <span class="material-icons text-sm" aria-hidden="true">arrow_downward</span>
                      </button>
                      <button
                        type="button"
                        (click)="removeItem(idx)"
                        [attr.aria-label]="i18n.t().removeLabel"
                        class="flex h-8 w-8 items-center justify-center rounded border border-zinc-200 text-zinc-400 hover:text-red-600 dark:border-zinc-800 dark:hover:text-red-400"
                      >
                        <span class="material-icons text-sm" aria-hidden="true">close</span>
                      </button>
                    </div>
                  </div>
                }
              </div>
            }
          </div>

          @if (formError()) {
            <p class="mt-3 text-xs font-medium text-red-600 dark:text-red-400">{{ formError() }}</p>
          }

          <div class="mt-5 flex justify-end gap-2 border-t border-zinc-200 pt-4 dark:border-zinc-800">
            <button
              type="button"
              (click)="editingOpen.set(false)"
              class="rounded-lg border border-zinc-300 px-4 py-2 text-xs font-medium text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              {{ i18n.t().cancelBtn }}
            </button>
            <button
              type="submit"
              class="rounded-lg bg-orange-600 px-5 py-2 text-xs font-semibold text-white hover:bg-orange-700 dark:bg-orange-500 dark:hover:bg-orange-600"
            >
              {{ i18n.t().saveBtn }}
            </button>
          </div>
        </form>
      }

      <!-- Routines Grid -->
      @if (store.routines().length === 0) {
        <div class="rounded-xl border border-dashed border-zinc-300 bg-white p-8 text-center dark:border-zinc-800 dark:bg-zinc-900">
          <p class="text-sm text-zinc-500 dark:text-zinc-400">{{ i18n.t().noRoutinesYet }}</p>
        </div>
      } @else {
        <div class="grid grid-cols-1 gap-4 lg:grid-cols-2">
          @for (rt of store.routines(); track rt.id) {
            <article class="flex flex-col justify-between rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
              <div>
                <div class="flex items-start justify-between gap-3">
                  <div class="min-w-0">
                    <h2 class="truncate font-display text-base font-bold text-zinc-900 dark:text-zinc-100">
                      {{ rt.name }}
                    </h2>
                    <p class="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400 tabular-nums">
                      {{ i18n.t().goals[rt.goal] }} · {{ rt.estimatedMinutes }} {{ i18n.t().minutesShort }} ·
                      {{ rt.exercises.length }} {{ i18n.t().exercisesCountLabel }}
                    </p>
                  </div>
                </div>

                @if (rt.notes) {
                  <p class="mt-2.5 text-xs text-zinc-600 dark:text-zinc-400">{{ rt.notes }}</p>
                }

                <div class="mt-4 divide-y divide-zinc-100 border-t border-zinc-100 dark:divide-zinc-800/80 dark:border-zinc-800">
                  @for (ex of rt.exercises; track ex.exerciseId + '-' + $index) {
                    <div class="flex items-center justify-between gap-3 py-2 text-xs">
                      <span class="truncate font-medium text-zinc-800 dark:text-zinc-200">
                        {{ i18n.exerciseDisplayName(ex.exerciseId, ex.exerciseName, store.allExercises()) }}
                      </span>
                      <span class="tabular-nums text-zinc-500 dark:text-zinc-400 shrink-0">
                        {{ ex.targetSets }} × {{ ex.targetReps }} · {{ ex.restSeconds }}{{ i18n.t().unitSec }}
                      </span>
                    </div>
                  }
                </div>
              </div>

              <div class="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-zinc-200 pt-4 dark:border-zinc-800">
                <div class="flex items-center gap-2">
                  <button
                    type="button"
                    (click)="openEditRoutine(rt)"
                    class="rounded-lg border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
                  >
                    {{ i18n.t().editBtn }}
                  </button>
                  <button
                    type="button"
                    (click)="store.deleteRoutine(rt.id)"
                    [attr.aria-label]="i18n.t().deleteBtn + ' ' + rt.name"
                    class="rounded-lg border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-600 hover:text-red-600 dark:border-zinc-700 dark:text-zinc-400 dark:hover:text-red-400"
                  >
                    {{ i18n.t().deleteBtn }}
                  </button>
                </div>

                <button
                  type="button"
                  (click)="launchRoutine(rt)"
                  class="inline-flex items-center gap-1.5 rounded-lg bg-orange-600 px-4 py-2 text-xs font-semibold text-white hover:bg-orange-700 dark:bg-orange-500 dark:hover:bg-orange-600 whitespace-nowrap"
                >
                  <span class="material-icons text-sm" aria-hidden="true">play_arrow</span>
                  {{ i18n.t().startWorkout }}
                </button>
              </div>
            </article>
          }
        </div>
      }
    </div>
  `,
})
export class RoutinesComponent {
  readonly store = inject(GymStoreService);
  readonly i18n = inject(I18nService);
  readonly startedSession = output<void>();

  readonly goalOptions: FitnessGoal[] = ['strength', 'hypertrophy', 'fat_loss', 'endurance', 'general'];

  readonly editingOpen = signal(false);
  readonly editingId = signal<string | undefined>(undefined);
  readonly nameDraft = signal('');
  readonly goalDraft = signal<FitnessGoal>('hypertrophy');
  readonly durationDraft = signal(45);
  readonly notesDraft = signal('');
  readonly exercisesDraft = signal<RoutineExerciseItem[]>([]);
  readonly pickerExerciseId = signal('ex_bench_press');
  readonly formError = signal<string | null>(null);

  exerciseLabel(ex: ExerciseDefinition): string {
    return this.i18n.lang() === 'ar' && ex.nameAr ? ex.nameAr : ex.nameEn;
  }

  openNewRoutine(): void {
    this.editingId.set(undefined);
    this.nameDraft.set('');
    this.goalDraft.set(this.store.preferences().goal);
    this.durationDraft.set(50);
    this.notesDraft.set('');
    this.exercisesDraft.set([]);
    this.formError.set(null);
    this.editingOpen.set(true);
  }

  openEditRoutine(rt: WorkoutRoutine): void {
    this.editingId.set(rt.id);
    this.nameDraft.set(rt.name);
    this.goalDraft.set(rt.goal);
    this.durationDraft.set(rt.estimatedMinutes);
    this.notesDraft.set(rt.notes ?? '');
    this.exercisesDraft.set(rt.exercises.map((e) => ({...e})));
    this.formError.set(null);
    this.editingOpen.set(true);
  }

  appendExercise(): void {
    const ex = this.store.allExercises().find((e) => e.id === this.pickerExerciseId());
    if (!ex) return;
    this.exercisesDraft.set([
      ...this.exercisesDraft(),
      {
        exerciseId: ex.id,
        exerciseName: this.exerciseLabel(ex),
        muscleGroup: ex.muscleGroup,
        targetSets: 3,
        targetReps: '8-10',
        restSeconds: 90,
      },
    ]);
  }

  updateItemField(index: number, field: 'targetSets' | 'targetReps' | 'restSeconds', value: unknown): void {
    this.exercisesDraft.set(
      this.exercisesDraft().map((item, idx) => {
        if (idx !== index) return item;
        if (field === 'targetSets') return {...item, targetSets: Math.max(1, Math.min(20, Number(value) || 3))};
        if (field === 'restSeconds') return {...item, restSeconds: Math.max(15, Math.min(600, Number(value) || 90))};
        return {...item, targetReps: String(value ?? '8-10').slice(0, 16)};
      }),
    );
  }

  moveItem(index: number, dir: -1 | 1): void {
    const list = [...this.exercisesDraft()];
    const target = index + dir;
    if (target < 0 || target >= list.length) return;
    const temp = list[index];
    list[index] = list[target];
    list[target] = temp;
    this.exercisesDraft.set(list);
  }

  removeItem(index: number): void {
    this.exercisesDraft.set(this.exercisesDraft().filter((_, idx) => idx !== index));
  }

  async saveRoutine(): Promise<void> {
    const validation = validateRoutineInput({
      name: this.nameDraft(),
      goal: this.goalDraft(),
      estimatedMinutes: Number(this.durationDraft()),
      notes: this.notesDraft(),
      exercises: this.exercisesDraft(),
    });

    if (!validation.valid) {
      const firstKey = validation.errorKeys[0] as keyof ReturnType<typeof this.i18n.t>;
      this.formError.set(String(this.i18n.t()[firstKey] ?? 'Invalid routine input'));
      return;
    }

    this.formError.set(null);
    await this.store.saveRoutine({
      id: this.editingId(),
      name: this.nameDraft().trim(),
      goal: this.goalDraft(),
      estimatedMinutes: Number(this.durationDraft()),
      notes: this.notesDraft(),
      exercises: this.exercisesDraft(),
    });
    this.editingOpen.set(false);
  }

  launchRoutine(rt: WorkoutRoutine): void {
    this.store.startWorkoutFromRoutine(rt);
    this.startedSession.emit();
  }
}
