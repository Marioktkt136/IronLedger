import {ChangeDetectionStrategy, Component, computed, inject, signal} from '@angular/core';
import {FormControl, FormGroup, ReactiveFormsModule} from '@angular/forms';
import {MuscleAnatomyMapComponent} from '../../components/muscle-anatomy-map/muscle-anatomy-map.component';
import {
  ALL_ANATOMY_MUSCLE_IDS,
  ANATOMY_MUSCLES,
  buildDefaultExerciseGuide,
  getExerciseAnatomyTargets,
} from '../../core/exercise-anatomy.data';
import {validateExerciseInput} from '../../core/fitness-math';
import {GeminiCoachService} from '../../core/gemini-coach.service';
import {GymStoreService} from '../../core/gym-store.service';
import {I18nService} from '../../core/i18n.service';
import {
  AnatomyMuscleId,
  EquipmentType,
  ExerciseChatMessage,
  ExerciseDefinition,
  ExerciseGuideRecord,
  MuscleGroup,
  TrackingType,
} from '../../core/models';

@Component({
  selector: 'app-exercises',
  imports: [ReactiveFormsModule, MuscleAnatomyMapComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-6">
      <!-- Page Header -->
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

      <!-- Add Custom Exercise Form (Reactive Forms) -->
      @if (showAddForm()) {
        <form
          [formGroup]="addForm"
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
                type="text"
                formControlName="nameEn"
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
                type="text"
                dir="rtl"
                formControlName="nameAr"
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
                formControlName="muscleGroup"
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
                formControlName="equipment"
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
                formControlName="trackingType"
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
                type="text"
                formControlName="notes"
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

      <!-- Section 1: Interactive Human-Every-Muscle Target Atlas & Machine Guide -->
      <section class="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
        <div class="flex flex-wrap items-start justify-between gap-3 border-b border-zinc-200 pb-4 dark:border-zinc-800">
          <div>
            <h2 class="font-display text-lg font-semibold text-zinc-900 dark:text-zinc-100">
              {{ i18n.t().anatomySectionTitle }}
            </h2>
            <p class="mt-0.5 text-xs text-zinc-600 dark:text-zinc-400">
              {{ i18n.t().anatomySectionSubtitle }}
            </p>
          </div>

          <div class="flex items-center gap-2">
            <label for="atlas-muscle-select" class="sr-only">{{ i18n.t().anatomySectionTitle }}</label>
            <select
              id="atlas-muscle-select"
              [value]="inspectedMuscle()"
              (change)="onInspectMuscle(asAnatomyId($event))"
              class="rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-xs font-medium text-zinc-900 focus:border-orange-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
            >
              @for (mId of allAnatomyIds; track mId) {
                <option [value]="mId" [selected]="mId === inspectedMuscle()">{{ muscleLabel(mId) }}</option>
              }
            </select>

            @if (filterAnatomyMuscle()) {
              <button
                type="button"
                (click)="filterAnatomyMuscle.set(null)"
                class="rounded-lg border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800 whitespace-nowrap"
              >
                {{ i18n.t().anatomyClearFilter }}
              </button>
            }
          </div>
        </div>

        <div class="mt-5 grid grid-cols-1 gap-6 lg:grid-cols-12">
          <div class="lg:col-span-6">
            <app-muscle-anatomy-map
              [primaryMuscles]="activeGuide()?.primaryMuscles ?? []"
              [secondaryMuscles]="activeGuide()?.secondaryMuscles ?? []"
              [selectedMuscle]="inspectedMuscle()"
              (muscleSelected)="onInspectMuscle($event)"
            />
          </div>

          <div class="space-y-4 lg:col-span-6">
            @let meta = inspectedMuscleMeta();
            <div class="rounded-lg border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-950/60">
              <div class="flex flex-wrap items-center justify-between gap-2">
                <h3 class="font-display text-base font-bold text-zinc-900 dark:text-zinc-100">
                  {{ i18n.lang() === 'ar' ? meta.nameAr : meta.nameEn }}
                </h3>
                <button
                  type="button"
                  (click)="toggleAnatomyExerciseFilter(meta.id)"
                  [class]="
                    filterAnatomyMuscle() === meta.id
                      ? 'rounded-lg bg-orange-600 px-3 py-1.5 text-xs font-semibold text-white dark:bg-orange-500 whitespace-nowrap'
                      : 'rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800 whitespace-nowrap'
                  "
                >
                  {{ i18n.t().anatomyFilterMatchingBtn }}
                </button>
              </div>
              <p class="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
                {{ i18n.lang() === 'ar' ? meta.roleAr : meta.roleEn }}
              </p>

              <div class="mt-4 space-y-2.5">
                <p class="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                  {{ i18n.t().anatomyMachinesForMuscle }}
                </p>
                @for (machine of inspectedMachines(); track $index) {
                  <div class="rounded-lg border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-900">
                    <div class="flex items-center gap-2">
                      <span class="material-icons text-base text-orange-600 dark:text-orange-400" aria-hidden="true">
                        precision_manufacturing
                      </span>
                      <span class="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                        {{ machine.machineName }}
                      </span>
                    </div>
                    <p class="mt-1 text-xs text-zinc-700 dark:text-zinc-300">{{ machine.setupCue }}</p>
                    <p class="mt-1 text-[11px] text-zinc-500 dark:text-zinc-400">{{ machine.targetBenefit }}</p>
                  </div>
                }
              </div>

              <div class="mt-4">
                <p class="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                  {{ i18n.t().anatomyCuesForMuscle }}
                </p>
                <ul class="mt-2 space-y-1.5 text-xs text-zinc-700 dark:text-zinc-300">
                  @for (cue of inspectedCues(); track $index; let idx = $index) {
                    <li class="flex items-start gap-2">
                      <span class="font-semibold text-orange-600 dark:text-orange-400 tabular-nums">{{ idx + 1 }}.</span>
                      <span>{{ cue }}</span>
                    </li>
                  }
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- Section 2: Exercise Library + Selected Exercise Coach & Gemini Chat -->
      <div class="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <!-- Left Column: Filterable Exercise Directory -->
        <section class="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900 lg:col-span-5">
          <div class="space-y-3 border-b border-zinc-200 pb-4 dark:border-zinc-800">
            <div>
              <label for="ex-search" class="sr-only">{{ i18n.t().searchExercisesPlaceholder }}</label>
              <input
                id="ex-search"
                type="search"
                [value]="searchTerm()"
                (input)="searchTerm.set(asInputValue($event))"
                [placeholder]="i18n.t().searchExercisesPlaceholder"
                class="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-orange-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
              />
            </div>

            <div class="grid grid-cols-2 gap-2.5">
              <div>
                <label for="ex-filter-muscle" class="sr-only">{{ i18n.t().muscleGroupLabel }}</label>
                <select
                  id="ex-filter-muscle"
                  [value]="filterMuscle()"
                  (change)="filterMuscle.set(asMuscleFilter($event))"
                  class="w-full rounded-lg border border-zinc-300 bg-white px-2.5 py-2 text-xs text-zinc-900 focus:border-orange-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
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
                  [value]="filterEquipment()"
                  (change)="filterEquipment.set(asEquipFilter($event))"
                  class="w-full rounded-lg border border-zinc-300 bg-white px-2.5 py-2 text-xs text-zinc-900 focus:border-orange-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                >
                  <option value="all">{{ i18n.t().allEquipment }}</option>
                  @for (eq of equipmentOptions; track eq) {
                    <option [value]="eq">{{ i18n.t().equipment[eq] }}</option>
                  }
                </select>
              </div>
            </div>
          </div>

          @if (filteredExercises().length === 0) {
            <p class="py-8 text-center text-sm text-zinc-500 dark:text-zinc-400">
              {{ i18n.t().noExercisesMatch }}
            </p>
          } @else {
            <div class="mt-2 max-h-[600px] divide-y divide-zinc-200 overflow-y-auto dark:divide-zinc-800">
              @for (ex of filteredExercises(); track ex.id) {
                <div
                  [class]="
                    selectedExercise()?.id === ex.id
                      ? 'flex items-center justify-between gap-2 rounded-lg bg-orange-50 px-3 py-3 dark:bg-orange-950/30'
                      : 'flex items-center justify-between gap-2 px-3 py-3 hover:bg-zinc-50 dark:hover:bg-zinc-800/40'
                  "
                >
                  <button
                    type="button"
                    (click)="selectExercise(ex)"
                    class="min-w-0 flex-1 text-start"
                  >
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
                      {{ ex.isCustom ? i18n.t().customTag : i18n.t().builtInTag }}
                    </p>
                  </button>

                  @if (ex.isCustom) {
                    <button
                      type="button"
                      (click)="store.deleteCustomExercise(ex.id)"
                      [attr.aria-label]="i18n.t().deleteBtn + ' ' + primaryName(ex)"
                      class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-zinc-200 text-zinc-500 hover:bg-zinc-100 hover:text-red-600 dark:border-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-red-400"
                    >
                      <span class="material-icons text-base" aria-hidden="true">delete_outline</span>
                    </button>
                  }
                </div>
              }
            </div>
          }
        </section>

        <!-- Right Column: Selected Exercise Guide & Gemini Chat -->
        <section class="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900 lg:col-span-7">
          @let currentEx = selectedExercise();
          @let guide = activeGuide();
          @if (!currentEx || !guide) {
            <p class="py-12 text-center text-sm text-zinc-500 dark:text-zinc-400">
              {{ i18n.t().exSelectPrompt }}
            </p>
          } @else {
            <div class="space-y-5">
              <!-- Exercise Inspector Header -->
              <div class="flex flex-wrap items-start justify-between gap-3 border-b border-zinc-200 pb-4 dark:border-zinc-800">
                <div class="min-w-0">
                  <h2 class="font-display text-lg font-bold text-zinc-900 dark:text-zinc-100">
                    {{ primaryName(currentEx) }}
                  </h2>
                  <p class="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                    {{ i18n.t().muscles[currentEx.muscleGroup] }} · {{ i18n.t().equipment[currentEx.equipment] }} ·
                    {{ i18n.t().trackingTypes[currentEx.trackingType] }}
                    @if (hasSavedCloudGuide()) {
                      · {{ i18n.t().exSavedGuideBadge }}
                    }
                  </p>
                </div>

                <button
                  type="button"
                  (click)="analyzeWithGemini(currentEx)"
                  [disabled]="analyzingExercise()"
                  class="inline-flex items-center gap-1.5 rounded-lg bg-zinc-900 px-3.5 py-2 text-xs font-semibold text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200 whitespace-nowrap"
                >
                  <span class="material-icons text-sm" aria-hidden="true">auto_awesome</span>
                  {{ analyzingExercise() ? i18n.t().exAnalyzingGemini : i18n.t().exAnalyzeGeminiBtn }}
                </button>
              </div>

              <!-- Sub-Tabs -->
              <div class="flex gap-2 border-b border-zinc-200 pb-3 dark:border-zinc-800">
                <button
                  type="button"
                  (click)="inspectorTab.set('guide')"
                  [class]="
                    inspectorTab() === 'guide'
                      ? 'inline-flex items-center gap-1.5 rounded-lg bg-orange-600 px-3.5 py-1.5 text-xs font-semibold text-white dark:bg-orange-500'
                      : 'inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 px-3.5 py-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800'
                  "
                >
                  <span class="material-icons text-sm" aria-hidden="true">accessibility_new</span>
                  {{ i18n.t().exTabGuide }}
                </button>
                <button
                  type="button"
                  (click)="inspectorTab.set('chat')"
                  [class]="
                    inspectorTab() === 'chat'
                      ? 'inline-flex items-center gap-1.5 rounded-lg bg-orange-600 px-3.5 py-1.5 text-xs font-semibold text-white dark:bg-orange-500'
                      : 'inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 px-3.5 py-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800'
                  "
                >
                  <span class="material-icons text-sm" aria-hidden="true">forum</span>
                  {{ i18n.t().exTabChat }}
                </button>
              </div>

              @if (coachError()) {
                <div class="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300">
                  {{ i18n.t().geminiErrorPrefix }}{{ coachError() }}
                </div>
              }

              @if (inspectorTab() === 'guide') {
                <div class="space-y-5">
                  <div class="rounded-lg border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-950/60">
                    <p class="text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
                      {{ guide.coachingSummary }}
                    </p>
                    <div class="mt-3 grid grid-cols-1 gap-2 border-t border-zinc-200 pt-3 text-xs dark:border-zinc-800 sm:grid-cols-2">
                      <div>
                        <span class="font-semibold text-orange-600 dark:text-orange-400">
                          {{ i18n.t().anatomyPrimaryLabel }}:
                        </span>
                        <span class="text-zinc-700 dark:text-zinc-300">
                          {{ joinMuscleNames(guide.primaryMuscles) }}
                        </span>
                      </div>
                      <div>
                        <span class="font-semibold text-amber-600 dark:text-amber-400">
                          {{ i18n.t().anatomySecondaryLabel }}:
                        </span>
                        <span class="text-zinc-700 dark:text-zinc-300">
                          {{ joinMuscleNames(guide.secondaryMuscles) || '—' }}
                        </span>
                      </div>
                    </div>
                  </div>

                  <!-- Recommended Gym Machines & How to Set Up -->
                  <div>
                    <h3 class="mb-2.5 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                      {{ i18n.t().exRecommendedMachinesTitle }}
                    </h3>
                    <div class="space-y-2.5">
                      @for (m of guide.recommendedMachines; track $index) {
                        <div class="rounded-lg border border-zinc-200 bg-zinc-50 p-3.5 dark:border-zinc-800 dark:bg-zinc-950/60">
                          <p class="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{{ m.machineName }}</p>
                          <p class="mt-1 text-xs text-zinc-700 dark:text-zinc-300">{{ m.setupCue }}</p>
                          <p class="mt-1 text-[11px] text-zinc-500 dark:text-zinc-400">{{ m.targetBenefit }}</p>
                        </div>
                      }
                    </div>
                  </div>

                  <!-- How to Use Steps + Common Mistakes -->
                  <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div class="rounded-lg border border-zinc-200 p-3.5 dark:border-zinc-800">
                      <h3 class="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                        {{ i18n.t().exHowToStepsTitle }}
                      </h3>
                      <ol class="space-y-1.5 text-xs text-zinc-700 dark:text-zinc-300">
                        @for (step of guide.howToUseSteps; track $index; let idx = $index) {
                          <li class="flex items-start gap-2">
                            <span class="font-semibold text-orange-600 dark:text-orange-400 tabular-nums">{{ idx + 1 }}.</span>
                            <span>{{ step }}</span>
                          </li>
                        }
                      </ol>
                    </div>

                    <div class="rounded-lg border border-zinc-200 p-3.5 dark:border-zinc-800">
                      <h3 class="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                        {{ i18n.t().exMistakesTitle }}
                      </h3>
                      <ul class="space-y-1.5 text-xs text-zinc-700 dark:text-zinc-300">
                        @for (err of guide.commonMistakes; track $index) {
                          <li class="flex items-start gap-2">
                            <span class="material-icons text-sm text-amber-500 shrink-0" aria-hidden="true">warning_amber</span>
                            <span>{{ err }}</span>
                          </li>
                        }
                      </ul>
                    </div>
                  </div>
                </div>
              } @else {
                <!-- Gemini Multi-Turn Exercise Chat -->
                <div class="space-y-4">
                  <div class="flex flex-wrap gap-2">
                    <button
                      type="button"
                      (click)="sendChatMessage(i18n.t().exQuickPromptForm)"
                      [disabled]="chatBusy()"
                      class="rounded-lg border border-zinc-200 px-2.5 py-1.5 text-xs text-zinc-700 hover:bg-zinc-100 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
                    >
                      {{ i18n.t().exQuickPromptForm }}
                    </button>
                    <button
                      type="button"
                      (click)="sendChatMessage(i18n.t().exQuickPromptMachine)"
                      [disabled]="chatBusy()"
                      class="rounded-lg border border-zinc-200 px-2.5 py-1.5 text-xs text-zinc-700 hover:bg-zinc-100 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
                    >
                      {{ i18n.t().exQuickPromptMachine }}
                    </button>
                    <button
                      type="button"
                      (click)="sendChatMessage(i18n.t().exQuickPromptProgress)"
                      [disabled]="chatBusy()"
                      class="rounded-lg border border-zinc-200 px-2.5 py-1.5 text-xs text-zinc-700 hover:bg-zinc-100 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
                    >
                      {{ i18n.t().exQuickPromptProgress }}
                    </button>
                  </div>

                  <div class="h-72 space-y-3 overflow-y-auto rounded-lg border border-zinc-200 bg-zinc-50 p-3.5 dark:border-zinc-800 dark:bg-zinc-950/60">
                    @if (activeChatMessages().length === 0) {
                      <p class="py-10 text-center text-xs text-zinc-500 dark:text-zinc-400">
                        {{ i18n.t().exChatWelcome }}
                      </p>
                    } @else {
                      @for (msg of activeChatMessages(); track $index) {
                        <div [class]="msg.role === 'user' ? 'flex justify-end' : 'flex justify-start'">
                          <div
                            [class]="
                              msg.role === 'user'
                                ? 'max-w-[85%] rounded-xl bg-orange-600 px-3.5 py-2 text-xs leading-relaxed text-white dark:bg-orange-500'
                                : 'max-w-[85%] rounded-xl border border-zinc-200 bg-white px-3.5 py-2 text-xs leading-relaxed text-zinc-800 whitespace-pre-line dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200'
                            "
                          >
                            {{ msg.text }}
                          </div>
                        </div>
                      }
                    }

                    @if (chatBusy()) {
                      <p class="text-xs italic text-zinc-500 dark:text-zinc-400">
                        {{ i18n.t().exChatThinking }}
                      </p>
                    }
                  </div>

                  <form (ngSubmit)="submitChatInput()" class="flex gap-2">
                    <label for="ex-chat-input" class="sr-only">{{ i18n.t().exChatPlaceholder }}</label>
                    <input
                      id="ex-chat-input"
                      type="text"
                      [formControl]="chatInput"
                      [placeholder]="i18n.t().exChatPlaceholder"
                      class="flex-1 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-orange-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                    />
                    <button
                      type="submit"
                      [disabled]="chatBusy()"
                      class="inline-flex items-center gap-1.5 rounded-lg bg-orange-600 px-4 py-2 text-xs font-semibold text-white hover:bg-orange-700 disabled:opacity-50 dark:bg-orange-500 dark:hover:bg-orange-600 whitespace-nowrap"
                    >
                      <span class="material-icons text-sm" aria-hidden="true">send</span>
                      {{ i18n.t().exChatSendBtn }}
                    </button>
                  </form>
                </div>
              }
            </div>
          }
        </section>
      </div>
    </div>
  `,
})
export class ExercisesComponent {
  readonly store = inject(GymStoreService);
  readonly i18n = inject(I18nService);
  private readonly gemini = inject(GeminiCoachService);

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
  readonly allAnatomyIds = ALL_ANATOMY_MUSCLE_IDS;

  readonly searchTerm = signal('');
  readonly filterMuscle = signal<MuscleGroup | 'all'>('all');
  readonly filterEquipment = signal<EquipmentType | 'all'>('all');
  readonly filterAnatomyMuscle = signal<AnatomyMuscleId | null>(null);

  readonly inspectedMuscle = signal<AnatomyMuscleId>('mid_chest');
  readonly selectedExerciseId = signal<string>('ex_bench_press');
  readonly inspectorTab = signal<'guide' | 'chat'>('guide');
  readonly analyzingExercise = signal(false);
  readonly chatBusy = signal(false);
  readonly coachError = signal<string | null>(null);
  readonly chatHistoryByExercise = signal<Record<string, ExerciseChatMessage[]>>({});

  readonly chatInput = new FormControl('', {nonNullable: true});

  readonly showAddForm = signal(false);
  readonly formError = signal<string | null>(null);

  readonly addForm = new FormGroup({
    nameEn: new FormControl('', {nonNullable: true}),
    nameAr: new FormControl('', {nonNullable: true}),
    muscleGroup: new FormControl<MuscleGroup>('chest', {nonNullable: true}),
    equipment: new FormControl<EquipmentType>('barbell', {nonNullable: true}),
    trackingType: new FormControl<TrackingType>('weight_reps', {nonNullable: true}),
    notes: new FormControl('', {nonNullable: true}),
  });

  readonly filteredExercises = computed(() => {
    const q = this.searchTerm().trim().toLowerCase();
    const m = this.filterMuscle();
    const eq = this.filterEquipment();
    const anatomyFilter = this.filterAnatomyMuscle();

    return this.store.allExercises().filter((ex) => {
      if (m !== 'all' && ex.muscleGroup !== m) return false;
      if (eq !== 'all' && ex.equipment !== eq) return false;
      if (anatomyFilter) {
        const saved = this.store.exerciseGuides().find((g) => g.exerciseId === ex.id);
        const targets = saved
          ? {primary: saved.primaryMuscles, secondary: saved.secondaryMuscles}
          : getExerciseAnatomyTargets(ex);
        if (!targets.primary.includes(anatomyFilter) && !targets.secondary.includes(anatomyFilter)) {
          return false;
        }
      }
      if (q && !ex.nameEn.toLowerCase().includes(q) && !ex.nameAr.toLowerCase().includes(q)) {
        return false;
      }
      return true;
    });
  });

  readonly selectedExercise = computed<ExerciseDefinition | null>(() => {
    const all = this.store.allExercises();
    const chosen = all.find((x) => x.id === this.selectedExerciseId());
    if (chosen) return chosen;
    const filtered = this.filteredExercises();
    return filtered.length > 0 ? filtered[0] : (all[0] ?? null);
  });

  readonly hasSavedCloudGuide = computed(() => {
    const ex = this.selectedExercise();
    if (!ex) return false;
    return this.store.exerciseGuides().some((g) => g.exerciseId === ex.id);
  });

  readonly activeGuide = computed<ExerciseGuideRecord | null>(() => {
    const ex = this.selectedExercise();
    if (!ex) return null;
    const saved = this.store.exerciseGuides().find((g) => g.exerciseId === ex.id);
    if (saved) return saved;
    return buildDefaultExerciseGuide(ex, this.i18n.lang());
  });

  readonly inspectedMuscleMeta = computed(() => ANATOMY_MUSCLES[this.inspectedMuscle()]);
  readonly inspectedMachines = computed(() => {
    const m = this.inspectedMuscleMeta();
    return this.i18n.lang() === 'ar' ? m.defaultMachinesAr : m.defaultMachinesEn;
  });
  readonly inspectedCues = computed(() => {
    const m = this.inspectedMuscleMeta();
    return this.i18n.lang() === 'ar' ? m.howToTargetAr : m.howToTargetEn;
  });

  readonly activeChatMessages = computed<ExerciseChatMessage[]>(() => {
    const ex = this.selectedExercise();
    if (!ex) return [];
    return this.chatHistoryByExercise()[ex.id] ?? [];
  });

  asInputValue(event: Event): string {
    return (event.target as HTMLInputElement).value;
  }

  asMuscleFilter(event: Event): MuscleGroup | 'all' {
    return (event.target as HTMLSelectElement).value as MuscleGroup | 'all';
  }

  asEquipFilter(event: Event): EquipmentType | 'all' {
    return (event.target as HTMLSelectElement).value as EquipmentType | 'all';
  }

  asAnatomyId(event: Event): AnatomyMuscleId {
    return (event.target as HTMLSelectElement).value as AnatomyMuscleId;
  }

  muscleLabel(id: AnatomyMuscleId): string {
    const meta = ANATOMY_MUSCLES[id];
    return this.i18n.lang() === 'ar' ? meta.nameAr : meta.nameEn;
  }

  joinMuscleNames(ids: AnatomyMuscleId[]): string {
    return ids.map((id) => this.muscleLabel(id)).join(', ');
  }

  primaryName(ex: ExerciseDefinition): string {
    return this.i18n.lang() === 'ar' && ex.nameAr ? ex.nameAr : ex.nameEn;
  }

  secondaryName(ex: ExerciseDefinition): string | null {
    if (!ex.nameAr || !ex.nameEn || ex.nameAr === ex.nameEn) return null;
    return this.i18n.lang() === 'ar' ? ex.nameEn : ex.nameAr;
  }

  onInspectMuscle(id: AnatomyMuscleId): void {
    this.inspectedMuscle.set(id);
  }

  toggleAnatomyExerciseFilter(id: AnatomyMuscleId): void {
    this.filterAnatomyMuscle.set(this.filterAnatomyMuscle() === id ? null : id);
  }

  selectExercise(ex: ExerciseDefinition): void {
    this.selectedExerciseId.set(ex.id);
    this.coachError.set(null);
    const guide =
      this.store.exerciseGuides().find((g) => g.exerciseId === ex.id) ??
      buildDefaultExerciseGuide(ex, this.i18n.lang());
    if (guide.primaryMuscles.length > 0) {
      this.inspectedMuscle.set(guide.primaryMuscles[0]);
    }
  }

  async analyzeWithGemini(ex: ExerciseDefinition): Promise<void> {
    this.analyzingExercise.set(true);
    this.coachError.set(null);
    try {
      const displayName = this.primaryName(ex);
      const res = await this.gemini.analyzeExercise({
        exerciseName: displayName,
        equipment: ex.equipment,
        muscleGroup: ex.muscleGroup,
        trackingType: ex.trackingType,
        userGoal: this.store.preferences().goal,
        userNotes: ex.notes,
        recentWeightKg: this.store.findLastWeightForExercise(ex.id),
        language: this.i18n.lang(),
      });

      const guide: ExerciseGuideRecord = {
        id: ex.id,
        exerciseId: ex.id,
        exerciseName: displayName,
        primaryMuscles: res.primaryMuscles,
        secondaryMuscles: res.secondaryMuscles,
        recommendedMachines: res.recommendedMachines,
        howToUseSteps: res.howToUseSteps,
        commonMistakes: res.commonMistakes,
        coachingSummary: res.coachingSummary,
      };
      await this.store.saveExerciseGuide(guide);
      if (guide.primaryMuscles.length > 0) {
        this.inspectedMuscle.set(guide.primaryMuscles[0]);
      }
      this.inspectorTab.set('guide');
    } catch (err) {
      this.coachError.set(err instanceof Error ? err.message : 'Unable to analyze exercise right now.');
    } finally {
      this.analyzingExercise.set(false);
    }
  }

  submitChatInput(): void {
    const text = this.chatInput.value.trim();
    if (!text) return;
    this.chatInput.setValue('');
    void this.sendChatMessage(text);
  }

  async sendChatMessage(messageText: string): Promise<void> {
    const ex = this.selectedExercise();
    const guide = this.activeGuide();
    if (!ex || !guide || this.chatBusy()) return;

    const clean = messageText.trim();
    if (!clean) return;

    const existing = this.chatHistoryByExercise()[ex.id] ?? [];
    const updatedWithUser: ExerciseChatMessage[] = [...existing, {role: 'user', text: clean}];
    this.chatHistoryByExercise.update((prev) => ({...prev, [ex.id]: updatedWithUser}));
    this.chatBusy.set(true);
    this.coachError.set(null);

    try {
      const reply = await this.gemini.chatExercise({
        exercise: {
          name: this.primaryName(ex),
          muscleGroup: ex.muscleGroup,
          equipment: ex.equipment,
          primaryMuscles: guide.primaryMuscles,
          secondaryMuscles: guide.secondaryMuscles,
        },
        userGoal: this.store.preferences().goal,
        recentWeightKg: this.store.findLastWeightForExercise(ex.id),
        history: existing,
        message: clean,
        language: this.i18n.lang(),
      });

      this.chatHistoryByExercise.update((prev) => ({
        ...prev,
        [ex.id]: [...updatedWithUser, {role: 'model', text: reply}],
      }));
    } catch (err) {
      this.coachError.set(err instanceof Error ? err.message : 'Unable to reach Gemini Coach.');
    } finally {
      this.chatBusy.set(false);
    }
  }

  openAddForm(): void {
    this.addForm.reset({
      nameEn: '',
      nameAr: '',
      muscleGroup: 'chest',
      equipment: 'barbell',
      trackingType: 'weight_reps',
      notes: '',
    });
    this.formError.set(null);
    this.showAddForm.set(true);
  }

  async submitExercise(): Promise<void> {
    const raw = this.addForm.getRawValue();
    const rawEn = raw.nameEn.trim();
    const rawAr = raw.nameAr.trim();
    const effectiveNameEn = rawEn || rawAr;

    const validation = validateExerciseInput({
      nameEn: effectiveNameEn,
      nameAr: rawAr,
      muscleGroup: raw.muscleGroup,
      equipment: raw.equipment,
      trackingType: raw.trackingType,
      notes: raw.notes,
    });

    if (!validation.valid) {
      const key = validation.errorKeys[0] as keyof ReturnType<typeof this.i18n.t>;
      this.formError.set(String(this.i18n.t()[key] ?? 'Invalid exercise'));
      return;
    }

    this.formError.set(null);
    const created = await this.store.addCustomExercise({
      nameEn: effectiveNameEn,
      nameAr: rawAr,
      muscleGroup: raw.muscleGroup,
      equipment: raw.equipment,
      trackingType: raw.trackingType,
      notes: raw.notes,
    });
    this.selectedExerciseId.set(created.id);
    this.showAddForm.set(false);
  }
}
