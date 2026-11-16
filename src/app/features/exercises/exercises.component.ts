import {ChangeDetectionStrategy, Component, computed, inject, signal} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {validateExerciseInput} from '../../core/fitness-math';
import {GymStoreService} from '../../core/gym-store.service';
import {I18nService} from '../../core/i18n.service';
import {EquipmentType, ExerciseDefinition, MuscleGroup, TrackingType} from '../../core/models';

@Component({
  selector: 'app-exercises',
  imports: [FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-6">
      <div class="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 class="font-display text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 sm:text-3xl">
            {{ i18n.t().exercisesTitle }}
          </h1>
          <p class="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            {{ i18n.t().exercisesSubtitle }}
          </p>
        </div>

        <button
          type="button"
          (click)="openAddForm()"
          class="inline-flex items-center gap-2 rounded-lg bg-orange-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-orange-700 dark:bg-orange-500 dark:hover:bg-orange-600 whitespace-nowrap"
        >
          <span class="material-icons text-base" aria-hidden="true">add</span>
          {{ i18n.t().addExerciseBtn }}
        </button>
      </div>

      <!-- Add Custom Exercise Form -->
      @if (showAddForm()) {
        <form
          (ngSubmit)="submitExercise()"
          class="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900"
        >
          <div class="flex items-center justify-between border-b border-zinc-200 pb-3 dark:border-zinc-800">
            <h2 class="font-display text-base font-semibold text-zinc-900 dark:text-zinc-100">
              {{ i18n.t().addExerciseBtn }}
            </h2>
            <button
              type="button"
              (click)="showAddForm.set(false)"
              [attr.aria-label]="i18n.t().cancelBtn"
              class="flex h-8 w-8 items-center justify-center rounded-md text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
            >
              <span class="material-icons text-base" aria-hidden="true">close</span>
            </button>
          </div>

          <div class="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label for="ex-name-en" class="mb-1.5 block text-xs font-medium text-zinc-600 dark:text-zinc-400">
                {{ i18n.t().exerciseNameEnLabel }}
              </label>
              <input
                id="ex-name-en"
                name="nameEn"
                type="text"
                [ngModel]="nameEn()"
                (ngModelChange)="nameEn.set($event)"
                [placeholder]="i18n.t().exerciseNameEnPlaceholder"
                class="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-orange-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
              />
            </div>

            <div>
              <label for="ex-name-ar" class="mb-1.5 block text-xs font-medium text-zinc-600 dark:text-zinc-400">
                {{ i18n.t().exerciseNameArLabel }}
              </label>
              <input
                id="ex-name-ar"
                name="nameAr"
                type="text"
                dir="rtl"
                [ngModel]="nameAr()"
                (ngModelChange)="nameAr.set($event)"
                [placeholder]="i18n.t().exerciseNameArPlaceholder"
                class="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-orange-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
              />
            </div>

            <div>
              <label for="ex-muscle" class="mb-1.5 block text-xs font-medium text-zinc-600 dark:text-zinc-400">
                {{ i18n.t().muscleGroupLabel }}
              </label>
              <select
                id="ex-muscle"
                name="muscleGroup"
                [ngModel]="muscleGroup()"
                (ngModelChange)="muscleGroup.set($event)"
                class="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-orange-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
              >
                @for (m of muscleOptions; track m) {
                  <option [value]="m">{{ i18n.t().muscles[m] }}</option>
                }
              </select>
            </div>

            <div>
              <label for="ex-equip" class="mb-1.5 block text-xs font-medium text-zinc-600 dark:text-zinc-400">
                {{ i18n.t().equipmentLabel }}
              </label>
              <select
                id="ex-equip"
                name="equipment"
                [ngModel]="equipment()"
                (ngModelChange)="equipment.set($event)"
                class="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-orange-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
              >
                @for (eq of equipmentOptions; track eq) {
                  <option [value]="eq">{{ i18n.t().equipment[eq] }}</option>
                }
              </select>
            </div>

            <div>
              <label for="ex-tracking" class="mb-1.5 block text-xs font-medium text-zinc-600 dark:text-zinc-400">
                {{ i18n.t().trackingTypeLabel }}
              </label>
              <select
                id="ex-tracking"
                name="trackingType"
                [ngModel]="trackingType()"
                (ngModelChange)="trackingType.set($event)"
                class="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-orange-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
              >
                @for (tr of trackingOptions; track tr) {
                  <option [value]="tr">{{ i18n.t().trackingTypes[tr] }}</option>
                }
              </select>
            </div>

            <div>
              <label for="ex-notes" class="mb-1.5 block text-xs font-medium text-zinc-600 dark:text-zinc-400">
                {{ i18n.t().notesLabel }}
              </label>
              <input
                id="ex-notes"
                name="notes"
                type="text"
                [ngModel]="notes()"
                (ngModelChange)="notes.set($event)"
                [placeholder]="i18n.t().exerciseNotesPlaceholder"
                class="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-orange-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
              />
            </div>
          </div>

          @if (formError()) {
            <p class="mt-3 text-xs font-medium text-red-600 dark:text-red-400">{{ formError() }}</p>
          }

          <div class="mt-4 flex justify-end gap-2">
            <button
              type="button"
              (click)="showAddForm.set(false)"
              class="rounded-lg border border-zinc-300 px-4 py-2 text-xs font-medium text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              {{ i18n.t().cancelBtn }}
            </button>
            <button
              type="submit"
              class="rounded-lg bg-orange-600 px-4 py-2 text-xs font-semibold text-white hover:bg-orange-700 dark:bg-orange-500 dark:hover:bg-orange-600"
            >
              {{ i18n.t().saveBtn }}
            </button>
          </div>
        </form>
      }

      <!-- Filters + Table -->
      <section class="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
        <div class="grid grid-cols-1 gap-3 border-b border-zinc-200 pb-4 sm:grid-cols-3 dark:border-zinc-800">
          <div>
            <label for="ex-search" class="sr-only">{{ i18n.t().searchExercisesPlaceholder }}</label>
            <input
              id="ex-search"
              type="search"
              [ngModel]="searchTerm()"
              (ngModelChange)="searchTerm.set($event)"
              [placeholder]="i18n.t().searchExercisesPlaceholder"
              class="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-orange-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
            />
          </div>

          <div>
            <label for="ex-filter-muscle" class="sr-only">{{ i18n.t().muscleGroupLabel }}</label>
            <select
              id="ex-filter-muscle"
              [ngModel]="filterMuscle()"
              (ngModelChange)="filterMuscle.set($event)"
              class="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-orange-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
            >
              <option value="all">{{ i18n.t().allMuscles }}</option>
              @for (m of muscleOptions; track m) {
                <option [value]="m">{{ i18n.t().muscles[m] }}</option>
              }
            </select>
          </div>

          <div>
            <label for="ex-filter-equip" class="sr-only">{{ i18n.t().equipmentLabel }}</label>
            <select
              id="ex-filter-equip"
              [ngModel]="filterEquipment()"
              (ngModelChange)="filterEquipment.set($event)"
              class="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-orange-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
            >
              <option value="all">{{ i18n.t().allEquipment }}</option>
              @for (eq of equipmentOptions; track eq) {
                <option [value]="eq">{{ i18n.t().equipment[eq] }}</option>
              }
            </select>
          </div>
        </div>

        @if (filteredExercises().length === 0) {
          <p class="py-8 text-center text-sm text-zinc-500 dark:text-zinc-400">
            {{ i18n.t().noExercisesMatch }}
          </p>
        } @else {
          <div class="divide-y divide-zinc-200 dark:divide-zinc-800">
            @for (ex of filteredExercises(); track ex.id) {
              <div class="flex flex-wrap items-center justify-between gap-3 py-3.5">
                <div class="min-w-0 flex-1">
                  <div class="flex flex-wrap items-baseline gap-2">
                    <h3 class="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                      {{ primaryName(ex) }}
                    </h3>
                    @if (secondaryName(ex)) {
                      <span class="text-xs text-zinc-500 dark:text-zinc-400">{{ secondaryName(ex) }}</span>
                    }
                  </div>
                  <p class="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                    {{ i18n.t().muscles[ex.muscleGroup] }} · {{ i18n.t().equipment[ex.equipment] }} ·
                    {{ i18n.t().trackingTypes[ex.trackingType] }} ·
                    {{ ex.isCustom ? i18n.t().customTag : i18n.t().builtInTag }}
                  </p>
                  @if (ex.notes) {
                    <p class="mt-1 text-xs text-zinc-600 dark:text-zinc-400">{{ ex.notes }}</p>
                  }
                </div>

                @if (ex.isCustom) {
                  <button
                    type="button"
                    (click)="store.deleteCustomExercise(ex.id)"
                    [attr.aria-label]="i18n.t().deleteBtn + ' ' + primaryName(ex)"
                    class="flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-200 text-zinc-500 hover:bg-zinc-100 hover:text-red-600 dark:border-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-red-400 shrink-0"
                  >
                    <span class="material-icons text-base" aria-hidden="true">delete_outline</span>
                  </button>
                }
              </div>
            }
          </div>
        }
      </section>
    </div>
  `,
})
export class ExercisesComponent {
  readonly store = inject(GymStoreService);
  readonly i18n = inject(I18nService);

  readonly muscleOptions: MuscleGroup[] = ['chest', 'back', 'legs', 'shoulders', 'arms', 'core', 'full_body'];
  readonly equipmentOptions: EquipmentType[] = [
    'barbell',
    'dumbbell',
    'machine',
    'cable',
    'bodyweight',
    'kettlebell',
    'other',
  ];
  readonly trackingOptions: TrackingType[] = ['weight_reps', 'bodyweight_reps', 'duration'];

  readonly searchTerm = signal('');
  readonly filterMuscle = signal<MuscleGroup | 'all'>('all');
  readonly filterEquipment = signal<EquipmentType | 'all'>('all');

  readonly showAddForm = signal(false);
  readonly nameEn = signal('');
  readonly nameAr = signal('');
  readonly muscleGroup = signal<MuscleGroup>('chest');
  readonly equipment = signal<EquipmentType>('barbell');
  readonly trackingType = signal<TrackingType>('weight_reps');
  readonly notes = signal('');
  readonly formError = signal<string | null>(null);

  readonly filteredExercises = computed(() => {
    const q = this.searchTerm().trim().toLowerCase();
    const m = this.filterMuscle();
    const eq = this.filterEquipment();
    return this.store.allExercises().filter((ex) => {
      if (m !== 'all' && ex.muscleGroup !== m) return false;
      if (eq !== 'all' && ex.equipment !== eq) return false;
      if (q && !ex.nameEn.toLowerCase().includes(q) && !ex.nameAr.toLowerCase().includes(q)) {
        return false;
      }
      return true;
    });
  });

  primaryName(ex: ExerciseDefinition): string {
    return this.i18n.lang() === 'ar' && ex.nameAr ? ex.nameAr : ex.nameEn;
  }

  secondaryName(ex: ExerciseDefinition): string | null {
    if (!ex.nameAr || !ex.nameEn || ex.nameAr === ex.nameEn) return null;
    if (this.i18n.lang() === 'ar') {
      return ex.nameEn;
    }
    return ex.nameAr;
  }

  openAddForm(): void {
    this.nameEn.set('');
    this.nameAr.set('');
    this.muscleGroup.set('chest');
    this.equipment.set('barbell');
    this.trackingType.set('weight_reps');
    this.notes.set('');
    this.formError.set(null);
    this.showAddForm.set(true);
  }

  async submitExercise(): Promise<void> {
    const rawEn = this.nameEn().trim();
    const rawAr = this.nameAr().trim();
    const effectiveNameEn = rawEn || rawAr;

    const validation = validateExerciseInput({
      nameEn: effectiveNameEn,
      nameAr: rawAr,
      muscleGroup: this.muscleGroup(),
      equipment: this.equipment(),
      trackingType: this.trackingType(),
      notes: this.notes(),
    });

    if (!validation.valid) {
      const key = validation.errorKeys[0] as keyof ReturnType<typeof this.i18n.t>;
      this.formError.set(String(this.i18n.t()[key] ?? 'Invalid exercise'));
      return;
    }

    this.formError.set(null);
    await this.store.addCustomExercise({
      nameEn: effectiveNameEn,
      nameAr: rawAr,
      muscleGroup: this.muscleGroup(),
      equipment: this.equipment(),
      trackingType: this.trackingType(),
      notes: this.notes(),
    });
    this.showAddForm.set(false);
  }
}
