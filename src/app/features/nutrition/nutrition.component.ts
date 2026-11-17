import {ChangeDetectionStrategy, Component, computed, inject, signal} from '@angular/core';
import {FormControl, FormGroup, ReactiveFormsModule} from '@angular/forms';
import {computeDailyNutritionSummary} from '../../core/fitness-math';
import {GeminiCoachService, GeminiMealAnalysisResponse} from '../../core/gemini-coach.service';
import {GymStoreService} from '../../core/gym-store.service';
import {I18nService} from '../../core/i18n.service';
import {
  MealLogEntry,
  MealType,
  NutritionRecommendationResult,
  PantryCategory,
} from '../../core/models';

async function compressImageFileToJpeg(file: File): Promise<{
  base64: string;
  mimeType: string;
  previewDataUrl: string;
}> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ''));
    reader.onerror = () => reject(new Error('Failed to read selected image file.'));
    reader.readAsDataURL(file);
  });

  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const el = new Image();
    el.onload = () => resolve(el);
    el.onerror = () => reject(new Error('Invalid image format.'));
    el.src = dataUrl;
  });

  const maxSide = 960;
  const scale = Math.min(1, maxSide / Math.max(img.width || 1, img.height || 1));
  const width = Math.max(1, Math.round(img.width * scale));
  const height = Math.max(1, Math.round(img.height * scale));

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    const rawBase64 = dataUrl.includes(',') ? dataUrl.split(',')[1] : dataUrl;
    return {base64: rawBase64, mimeType: file.type || 'image/jpeg', previewDataUrl: dataUrl};
  }
  ctx.drawImage(img, 0, 0, width, height);
  const jpegUrl = canvas.toDataURL('image/jpeg', 0.78);
  const base64 = jpegUrl.split(',')[1] ?? '';
  return {base64, mimeType: 'image/jpeg', previewDataUrl: jpegUrl};
}

@Component({
  selector: 'app-nutrition',
  imports: [ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-6">
      <!-- Page Header & Date Selector -->
      <div class="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 class="font-display text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 sm:text-3xl">
            {{ i18n.t().nutritionTitle }}
          </h1>
          <p class="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            {{ i18n.t().nutritionSubtitle }}
          </p>
        </div>

        <div class="flex items-center gap-2">
          <label for="nutri-date" class="text-xs font-medium text-zinc-600 dark:text-zinc-400">
            {{ i18n.t().nutriDateLabel }}
          </label>
          <input
            id="nutri-date"
            type="date"
            [value]="selectedDate()"
            (change)="selectedDate.set(asInputValue($event))"
            class="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 tabular-nums focus:border-orange-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
          />
        </div>
      </div>

      <!-- Daily Calorie & Macro Summary KPIs -->
      <section class="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div class="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
          <p class="text-xs font-medium text-zinc-500 dark:text-zinc-400">{{ i18n.t().nutriDailyTarget }}</p>
          <p class="mt-1 font-display text-2xl font-bold text-zinc-900 tabular-nums dark:text-zinc-100">
            {{ target().calories }}
            <span class="text-xs font-normal text-zinc-500">{{ i18n.t().nutriKcalUnit }}</span>
          </p>
          <p class="mt-1 text-[11px] text-zinc-500 dark:text-zinc-400">
            {{ i18n.t().goals[store.preferences().goal] }}
          </p>
        </div>

        <div class="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
          <p class="text-xs font-medium text-zinc-500 dark:text-zinc-400">{{ i18n.t().nutriConsumed }}</p>
          <p class="mt-1 font-display text-2xl font-bold text-orange-600 tabular-nums dark:text-orange-400">
            {{ daySummary().consumedCalories }}
            <span class="text-xs font-normal text-zinc-500">{{ i18n.t().nutriKcalUnit }}</span>
          </p>
          <div class="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
            <div
              class="h-full rounded-full bg-orange-600 transition-all dark:bg-orange-500"
              [style.width.%]="progressWidthPct()"
            ></div>
          </div>
        </div>

        <div class="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
          <p class="text-xs font-medium text-zinc-500 dark:text-zinc-400">{{ i18n.t().nutriRemaining }}</p>
          <p class="mt-1 font-display text-2xl font-bold text-emerald-600 tabular-nums dark:text-emerald-400">
            {{ daySummary().remainingCalories }}
            <span class="text-xs font-normal text-zinc-500">{{ i18n.t().nutriKcalUnit }}</span>
          </p>
          <p class="mt-1 text-[11px] text-zinc-500 tabular-nums dark:text-zinc-400">
            {{ daySummary().caloriePct }}%
          </p>
        </div>

        <div class="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
          <p class="text-xs font-medium text-zinc-500 dark:text-zinc-400">
            {{ i18n.t().nutriProtein }} · {{ i18n.t().nutriCarbs }} · {{ i18n.t().nutriFat }}
          </p>
          <p class="mt-1 font-display text-lg font-bold text-zinc-900 tabular-nums dark:text-zinc-100">
            {{ daySummary().proteinG }} / {{ daySummary().carbsG }} / {{ daySummary().fatG }}
            <span class="text-xs font-normal text-zinc-500">{{ i18n.t().nutriGramUnit }}</span>
          </p>
          <p class="mt-1 text-[11px] text-zinc-500 tabular-nums dark:text-zinc-400">
            {{ i18n.t().nutriProtein }} {{ target().proteinG }}{{ i18n.t().nutriGramUnit }}
          </p>
        </div>
      </section>

      <!-- Row 2: Log Meal (Text / Image / Manual) + Today's Meals & AI Recommendation -->
      <div class="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <!-- Left: Add What I Ate Today -->
        <section class="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900 lg:col-span-6">
          <div class="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-200 pb-3 dark:border-zinc-800">
            <h2 class="font-display text-base font-semibold text-zinc-900 dark:text-zinc-100">
              {{ i18n.t().nutriLogMealTitle }}
            </h2>

            <div class="flex items-center gap-2">
              <label for="nutri-meal-slot" class="sr-only">{{ i18n.t().nutriMealTypeLabel }}</label>
              <select
                id="nutri-meal-slot"
                [value]="mealSlot()"
                (change)="mealSlot.set(asMealType($event))"
                class="rounded-lg border border-zinc-300 bg-white px-2.5 py-1.5 text-xs font-medium text-zinc-900 focus:border-orange-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
              >
                @for (slot of mealSlotOptions; track slot) {
                  <option [value]="slot">{{ i18n.t().nutriMealTypes[slot] }}</option>
                }
              </select>
            </div>
          </div>

          <!-- Input Mode Tabs -->
          <div class="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              (click)="inputMode.set('text')"
              [class]="
                inputMode() === 'text'
                  ? 'inline-flex items-center gap-1.5 rounded-lg bg-orange-600 px-3 py-1.5 text-xs font-semibold text-white dark:bg-orange-500'
                  : 'inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800'
              "
            >
              <span class="material-icons text-sm" aria-hidden="true">notes</span>
              {{ i18n.t().nutriTabText }}
            </button>
            <button
              type="button"
              (click)="inputMode.set('image')"
              [class]="
                inputMode() === 'image'
                  ? 'inline-flex items-center gap-1.5 rounded-lg bg-orange-600 px-3 py-1.5 text-xs font-semibold text-white dark:bg-orange-500'
                  : 'inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800'
              "
            >
              <span class="material-icons text-sm" aria-hidden="true">photo_camera</span>
              {{ i18n.t().nutriTabImage }}
            </button>
            <button
              type="button"
              (click)="inputMode.set('manual')"
              [class]="
                inputMode() === 'manual'
                  ? 'inline-flex items-center gap-1.5 rounded-lg bg-orange-600 px-3 py-1.5 text-xs font-semibold text-white dark:bg-orange-500'
                  : 'inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800'
              "
            >
              <span class="material-icons text-sm" aria-hidden="true">edit_note</span>
              {{ i18n.t().nutriTabManual }}
            </button>
          </div>

          @if (nutriError()) {
            <div class="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300">
              {{ i18n.t().geminiErrorPrefix }}{{ nutriError() }}
            </div>
          }

          @if (inputMode() === 'text' || inputMode() === 'image') {
            <div class="mt-4 space-y-4">
              @if (inputMode() === 'image') {
                <div class="rounded-lg border border-dashed border-zinc-300 bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-950/50">
                  <p class="text-xs text-zinc-600 dark:text-zinc-400">
                    {{ i18n.t().nutriPhotoHint }}
                  </p>
                  <div class="mt-3 flex flex-wrap items-center gap-3">
                    <label
                      for="nutri-photo-input"
                      class="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-zinc-300 bg-white px-3.5 py-2 text-xs font-semibold text-zinc-800 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
                    >
                      <span class="material-icons text-sm" aria-hidden="true">upload</span>
                      {{ imagePreviewUrl() ? i18n.t().nutriChangePhotoBtn : i18n.t().nutriUploadPhotoBtn }}
                    </label>
                    <input
                      id="nutri-photo-input"
                      type="file"
                      accept="image/*"
                      (change)="onImageSelected($event)"
                      class="sr-only"
                    />
                  </div>
                  @if (imagePreviewUrl()) {
                    <div class="mt-3">
                      <img
                        [src]="imagePreviewUrl()"
                        alt="Selected meal photo"
                        class="max-h-48 w-auto rounded-lg border border-zinc-200 object-cover dark:border-zinc-800"
                      />
                    </div>
                  }
                </div>
              }

              <div>
                <label for="nutri-meal-text" class="mb-1.5 block text-xs font-medium text-zinc-600 dark:text-zinc-400">
                  {{ i18n.t().nutriMealTextLabel }}
                </label>
                <textarea
                  id="nutri-meal-text"
                  rows="3"
                  [formControl]="mealTextInput"
                  [placeholder]="i18n.t().nutriMealTextPlaceholder"
                  class="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-orange-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                ></textarea>
              </div>

              <button
                type="button"
                (click)="analyzeMealWithGemini()"
                [disabled]="analyzingMeal()"
                class="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-zinc-900 px-4 py-2.5 text-xs font-semibold text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
              >
                <span class="material-icons text-sm" aria-hidden="true">auto_awesome</span>
                {{ analyzingMeal() ? i18n.t().nutriAnalyzingMeal : i18n.t().nutriAnalyzeMealBtn }}
              </button>

              <!-- Gemini Analysis Preview -->
              @let preview = mealPreview();
              @if (preview) {
                <div class="rounded-lg border border-orange-200 bg-orange-50/50 p-4 dark:border-orange-900/50 dark:bg-orange-950/20">
                  <div class="flex flex-wrap items-baseline justify-between gap-2">
                    <div>
                      <p class="text-[11px] font-semibold uppercase tracking-wide text-orange-700 dark:text-orange-400">
                        {{ i18n.t().nutriPreviewTitle }}
                      </p>
                      <h3 class="text-sm font-bold text-zinc-900 dark:text-zinc-100">{{ preview.title }}</h3>
                    </div>
                    <p class="font-display text-lg font-bold text-zinc-900 tabular-nums dark:text-zinc-100">
                      {{ preview.totalCalories }} {{ i18n.t().nutriKcalUnit }}
                    </p>
                  </div>

                  <p class="mt-1 text-xs text-zinc-600 tabular-nums dark:text-zinc-300">
                    {{ i18n.t().nutriProtein }} {{ preview.proteinG }}{{ i18n.t().nutriGramUnit }} ·
                    {{ i18n.t().nutriCarbs }} {{ preview.carbsG }}{{ i18n.t().nutriGramUnit }} ·
                    {{ i18n.t().nutriFat }} {{ preview.fatG }}{{ i18n.t().nutriGramUnit }} ·
                    {{ i18n.t().nutriFiber }} {{ preview.fiberG }}{{ i18n.t().nutriGramUnit }}
                  </p>

                  @if (preview.items.length > 0) {
                    <ul class="mt-2.5 divide-y divide-zinc-200 text-xs dark:divide-zinc-800">
                      @for (it of preview.items; track $index) {
                        <li class="flex items-center justify-between gap-2 py-1.5">
                          <span class="text-zinc-800 dark:text-zinc-200">{{ it.name }} ({{ it.portion }})</span>
                          <span class="font-medium text-zinc-700 tabular-nums dark:text-zinc-300">
                            {{ it.calories }} {{ i18n.t().nutriKcalUnit }}
                          </span>
                        </li>
                      }
                    </ul>
                  }

                  @if (preview.nutritionNote) {
                    <p class="mt-2 text-xs text-zinc-600 dark:text-zinc-400">{{ preview.nutritionNote }}</p>
                  }

                  <div class="mt-3 flex justify-end gap-2">
                    <button
                      type="button"
                      (click)="discardMealPreview()"
                      class="rounded-lg border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
                    >
                      {{ i18n.t().nutriDiscardPreviewBtn }}
                    </button>
                    <button
                      type="button"
                      (click)="saveAnalyzedMeal()"
                      class="rounded-lg bg-orange-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-orange-700 dark:bg-orange-500 dark:hover:bg-orange-600"
                    >
                      {{ i18n.t().nutriSaveMealBtn }}
                    </button>
                  </div>
                </div>
              }
            </div>
          } @else {
            <!-- Quick Manual Entry Form -->
            <form [formGroup]="manualMealForm" (ngSubmit)="saveManualMeal()" class="mt-4 space-y-3">
              <div>
                <label for="nutri-manual-title" class="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400">
                  {{ i18n.t().nutriManualTitleLabel }}
                </label>
                <input
                  id="nutri-manual-title"
                  type="text"
                  formControlName="title"
                  [placeholder]="i18n.t().nutriManualTitlePlaceholder"
                  class="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-orange-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                />
              </div>

              <div class="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div>
                  <label for="nutri-manual-kcal" class="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400">
                    {{ i18n.t().nutriManualCalsLabel }}
                  </label>
                  <input
                    id="nutri-manual-kcal"
                    type="number"
                    min="0"
                    formControlName="calories"
                    class="w-full rounded-lg border border-zinc-300 bg-white px-2.5 py-2 text-sm tabular-nums text-zinc-900 focus:border-orange-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                  />
                </div>
                <div>
                  <label for="nutri-manual-p" class="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400">
                    {{ i18n.t().nutriProtein }} ({{ i18n.t().nutriGramUnit }})
                  </label>
                  <input
                    id="nutri-manual-p"
                    type="number"
                    min="0"
                    formControlName="proteinG"
                    class="w-full rounded-lg border border-zinc-300 bg-white px-2.5 py-2 text-sm tabular-nums text-zinc-900 focus:border-orange-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                  />
                </div>
                <div>
                  <label for="nutri-manual-c" class="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400">
                    {{ i18n.t().nutriCarbs }} ({{ i18n.t().nutriGramUnit }})
                  </label>
                  <input
                    id="nutri-manual-c"
                    type="number"
                    min="0"
                    formControlName="carbsG"
                    class="w-full rounded-lg border border-zinc-300 bg-white px-2.5 py-2 text-sm tabular-nums text-zinc-900 focus:border-orange-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                  />
                </div>
                <div>
                  <label for="nutri-manual-f" class="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400">
                    {{ i18n.t().nutriFat }} ({{ i18n.t().nutriGramUnit }})
                  </label>
                  <input
                    id="nutri-manual-f"
                    type="number"
                    min="0"
                    formControlName="fatG"
                    class="w-full rounded-lg border border-zinc-300 bg-white px-2.5 py-2 text-sm tabular-nums text-zinc-900 focus:border-orange-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                  />
                </div>
              </div>

              <button
                type="submit"
                class="w-full rounded-lg bg-orange-600 px-4 py-2.5 text-xs font-semibold text-white hover:bg-orange-700 dark:bg-orange-500 dark:hover:bg-orange-600"
              >
                {{ i18n.t().nutriSaveMealBtn }}
              </button>
            </form>
          }
        </section>

        <!-- Right: Meals Logged Today + Gemini Nutrition Recommendations -->
        <div class="space-y-6 lg:col-span-6">
          <!-- Meals Logged List -->
          <section class="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
            <h2 class="border-b border-zinc-200 pb-3 font-display text-base font-semibold text-zinc-900 dark:border-zinc-800 dark:text-zinc-100">
              {{ i18n.t().nutriMealsLoggedTitle }}
            </h2>

            @if (mealsForSelectedDate().length === 0) {
              <p class="py-6 text-center text-xs text-zinc-500 dark:text-zinc-400">
                {{ i18n.t().nutriNoMealsToday }}
              </p>
            } @else {
              <div class="divide-y divide-zinc-200 dark:divide-zinc-800">
                @for (meal of mealsForSelectedDate(); track meal.id) {
                  <div class="flex items-start justify-between gap-3 py-3.5">
                    <div class="min-w-0 flex-1">
                      <div class="flex flex-wrap items-baseline gap-2">
                        <h3 class="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{{ meal.title }}</h3>
                        <span class="text-xs text-zinc-500 dark:text-zinc-400">
                          {{ i18n.t().nutriMealTypes[meal.mealType] }}
                        </span>
                      </div>
                      <p class="mt-0.5 text-xs text-zinc-600 tabular-nums dark:text-zinc-400">
                        {{ meal.totalCalories }} {{ i18n.t().nutriKcalUnit }} ·
                        P {{ meal.proteinG }}{{ i18n.t().nutriGramUnit }} ·
                        C {{ meal.carbsG }}{{ i18n.t().nutriGramUnit }} ·
                        F {{ meal.fatG }}{{ i18n.t().nutriGramUnit }}
                      </p>
                      @if (meal.nutritionNote) {
                        <p class="mt-1 text-[11px] text-zinc-500 dark:text-zinc-400">{{ meal.nutritionNote }}</p>
                      }
                    </div>
                    <button
                      type="button"
                      (click)="store.deleteMealLog(meal.id)"
                      [attr.aria-label]="i18n.t().deleteBtn"
                      class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-zinc-200 text-zinc-500 hover:bg-zinc-100 hover:text-red-600 dark:border-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-red-400"
                    >
                      <span class="material-icons text-base" aria-hidden="true">delete_outline</span>
                    </button>
                  </div>
                }
              </div>
            }
          </section>

          <!-- Gemini Nutrition Advisor ("What to Eat Next") -->
          <section class="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
            <div class="flex flex-wrap items-start justify-between gap-3 border-b border-zinc-200 pb-3 dark:border-zinc-800">
              <div>
                <h2 class="font-display text-base font-semibold text-zinc-900 dark:text-zinc-100">
                  {{ i18n.t().nutriAiAdvisorTitle }}
                </h2>
                <p class="mt-0.5 text-xs text-zinc-600 dark:text-zinc-400">
                  {{ i18n.t().nutriAiAdvisorSubtitle }}
                </p>
              </div>
              <button
                type="button"
                (click)="fetchNutritionAdvice()"
                [disabled]="gettingAdvice()"
                class="inline-flex items-center gap-1.5 rounded-lg bg-zinc-900 px-3.5 py-2 text-xs font-semibold text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200 whitespace-nowrap"
              >
                <span class="material-icons text-sm" aria-hidden="true">psychology</span>
                {{ gettingAdvice() ? i18n.t().nutriGettingAdvice : i18n.t().nutriGetAdviceBtn }}
              </button>
            </div>

            @let advice = nutritionAdvice();
            @if (advice) {
              <div class="mt-4 space-y-3">
                <p class="text-xs leading-relaxed text-zinc-700 dark:text-zinc-300">{{ advice.summary }}</p>

                <div class="space-y-2.5">
                  @for (sug of advice.suggestions; track sug.title) {
                    <div class="rounded-lg border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-800 dark:bg-zinc-950/60">
                      <div class="flex flex-wrap items-baseline justify-between gap-2">
                        <h3 class="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{{ sug.title }}</h3>
                        <span class="text-xs font-semibold text-orange-600 tabular-nums dark:text-orange-400">
                          {{ sug.estimatedCalories }} {{ i18n.t().nutriKcalUnit }}
                        </span>
                      </div>
                      <p class="mt-1 text-xs text-zinc-600 dark:text-zinc-400">{{ sug.reason }}</p>
                      <p class="mt-1 text-[11px] text-zinc-500 tabular-nums dark:text-zinc-400">
                        P {{ sug.proteinG }}{{ i18n.t().nutriGramUnit }} ·
                        C {{ sug.carbsG }}{{ i18n.t().nutriGramUnit }} ·
                        F {{ sug.fatG }}{{ i18n.t().nutriGramUnit }}
                        @if (sug.usesPantry) {
                          · {{ i18n.t().nutriPantryMatchTag }}
                        }
                      </p>
                    </div>
                  }
                </div>

                @if (advice.hydrationOrTimingTip) {
                  <p class="text-xs text-zinc-600 dark:text-zinc-400">{{ advice.hydrationOrTimingTip }}</p>
                }
              </div>
            }
          </section>
        </div>
      </div>

      <!-- Row 3: Foods I Have (Pantry) & 7-Day Weekly Meal Plan Generator -->
      <section class="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
        <div class="flex flex-wrap items-start justify-between gap-3 border-b border-zinc-200 pb-4 dark:border-zinc-800">
          <div>
            <h2 class="font-display text-lg font-semibold text-zinc-900 dark:text-zinc-100">
              {{ i18n.t().nutriPantryTitle }}
            </h2>
            <p class="mt-0.5 text-xs text-zinc-600 dark:text-zinc-400">
              {{ i18n.t().nutriPantrySubtitle }}
            </p>
          </div>
          <button
            type="button"
            (click)="quickAddGymStaples()"
            class="inline-flex items-center gap-1.5 rounded-lg border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800 whitespace-nowrap"
          >
            <span class="material-icons text-sm" aria-hidden="true">playlist_add</span>
            {{ i18n.t().nutriQuickAddCommonBtn }}
          </button>
        </div>

        <!-- Add Pantry Item Form -->
        <form [formGroup]="pantryForm" (ngSubmit)="submitPantryItem()" class="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-12">
          <div class="sm:col-span-5">
            <label for="pantry-name" class="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400">
              {{ i18n.t().nutriPantryFoodLabel }}
            </label>
            <input
              id="pantry-name"
              type="text"
              formControlName="name"
              [placeholder]="i18n.t().nutriPantryFoodPlaceholder"
              class="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-orange-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
            />
          </div>

          <div class="sm:col-span-3">
            <label for="pantry-cat" class="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400">
              {{ i18n.t().nutriPantryCategoryLabel }}
            </label>
            <select
              id="pantry-cat"
              formControlName="category"
              class="w-full rounded-lg border border-zinc-300 bg-white px-2.5 py-2 text-sm text-zinc-900 focus:border-orange-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
            >
              @for (cat of pantryCategories; track cat) {
                <option [value]="cat">{{ i18n.t().nutriPantryCategories[cat] }}</option>
              }
            </select>
          </div>

          <div class="sm:col-span-2">
            <label for="pantry-qty" class="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400">
              {{ i18n.t().nutriPantryQtyLabel }}
            </label>
            <input
              id="pantry-qty"
              type="text"
              formControlName="quantityHint"
              [placeholder]="i18n.t().nutriPantryQtyPlaceholder"
              class="w-full rounded-lg border border-zinc-300 bg-white px-2.5 py-2 text-sm text-zinc-900 focus:border-orange-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
            />
          </div>

          <div class="flex items-end sm:col-span-2">
            <button
              type="submit"
              class="w-full rounded-lg bg-orange-600 px-3 py-2 text-xs font-semibold text-white hover:bg-orange-700 dark:bg-orange-500 dark:hover:bg-orange-600"
            >
              {{ i18n.t().nutriAddPantryBtn }}
            </button>
          </div>
        </form>

        <!-- Pantry Items List -->
        @if (store.pantryItems().length === 0) {
          <p class="mt-4 rounded-lg border border-dashed border-zinc-300 py-5 text-center text-xs text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
            {{ i18n.t().nutriNoPantryYet }}
          </p>
        } @else {
          <div class="mt-4 grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
            @for (item of store.pantryItems(); track item.id) {
              <div class="flex items-center justify-between gap-2 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 dark:border-zinc-800 dark:bg-zinc-950/60">
                <div class="min-w-0">
                  <p class="truncate text-sm font-medium text-zinc-900 dark:text-zinc-100">{{ item.name }}</p>
                  <p class="text-[11px] text-zinc-500 dark:text-zinc-400">
                    {{ i18n.t().nutriPantryCategories[item.category] }}
                    @if (item.quantityHint) {
                      · {{ item.quantityHint }}
                    }
                  </p>
                </div>
                <button
                  type="button"
                  (click)="store.deletePantryItem(item.id)"
                  [attr.aria-label]="i18n.t().deleteBtn"
                  class="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-zinc-400 hover:bg-zinc-200 hover:text-red-600 dark:hover:bg-zinc-800 dark:hover:text-red-400"
                >
                  <span class="material-icons text-base" aria-hidden="true">close</span>
                </button>
              </div>
            }
          </div>
        }

        <!-- Generate Weekly Meal Plan Controls -->
        <div class="mt-5 grid grid-cols-1 gap-3 border-t border-zinc-200 pt-5 dark:border-zinc-800 sm:grid-cols-12">
          <div class="sm:col-span-8">
            <label for="nutri-plan-notes" class="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400">
              {{ i18n.t().nutriPlanNotesLabel }}
            </label>
            <input
              id="nutri-plan-notes"
              type="text"
              [formControl]="planNotesInput"
              [placeholder]="i18n.t().nutriPlanNotesPlaceholder"
              class="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-orange-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
            />
          </div>

          <div class="flex items-end sm:col-span-4">
            <button
              type="button"
              (click)="generateWeeklyPlan()"
              [disabled]="generatingPlan() || store.pantryItems().length === 0"
              class="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-zinc-900 px-4 py-2.5 text-xs font-semibold text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              <span class="material-icons text-sm" aria-hidden="true">calendar_month</span>
              {{ generatingPlan() ? i18n.t().nutriGeneratingPlan : i18n.t().nutriGeneratePlanBtn }}
            </button>
          </div>
        </div>

        <!-- Saved 7-Day Weekly Meal Plans -->
        <div class="mt-6 space-y-4">
          <h3 class="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            {{ i18n.t().nutriSavedPlansTitle }}
          </h3>

          @if (store.mealPlans().length === 0) {
            <p class="py-4 text-xs text-zinc-500 dark:text-zinc-400">
              {{ i18n.t().nutriNoPlansYet }}
            </p>
          } @else {
            @for (plan of store.mealPlans(); track plan.id) {
              <div class="rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-950/60">
                <div class="flex flex-wrap items-start justify-between gap-2 border-b border-zinc-200 pb-3 dark:border-zinc-800">
                  <div>
                    <h4 class="font-display text-base font-bold text-zinc-900 dark:text-zinc-100">
                      {{ plan.title }}
                    </h4>
                    <p class="mt-0.5 text-xs text-zinc-500 tabular-nums dark:text-zinc-400">
                      {{ i18n.t().goals[plan.goal] }} · {{ plan.dailyTargetCalories }} {{ i18n.t().nutriKcalUnit }}/day
                    </p>
                    @if (plan.notes) {
                      <p class="mt-1 text-xs text-zinc-600 dark:text-zinc-400">{{ plan.notes }}</p>
                    }
                  </div>
                  <button
                    type="button"
                    (click)="store.deleteMealPlan(plan.id)"
                    [attr.aria-label]="i18n.t().deleteBtn"
                    class="flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-200 text-zinc-500 hover:bg-zinc-100 hover:text-red-600 dark:border-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-red-400"
                  >
                    <span class="material-icons text-base" aria-hidden="true">delete_outline</span>
                  </button>
                </div>

                <div class="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
                  @for (day of plan.days; track $index) {
                    <div class="rounded-lg border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-900">
                      <div class="flex items-baseline justify-between gap-2 border-b border-zinc-200 pb-1.5 dark:border-zinc-800">
                        <span class="text-xs font-bold text-zinc-900 dark:text-zinc-100">{{ day.dayLabel }}</span>
                        <span class="text-[11px] font-semibold text-orange-600 tabular-nums dark:text-orange-400">
                          {{ day.totalCalories }} {{ i18n.t().nutriKcalUnit }} · {{ day.proteinG }}{{ i18n.t().nutriGramUnit }} P
                        </span>
                      </div>
                      <dl class="mt-2 space-y-1.5 text-xs">
                        <div>
                          <dt class="font-semibold text-zinc-500 dark:text-zinc-400">{{ i18n.t().nutriMealBreakfast }}</dt>
                          <dd class="text-zinc-800 dark:text-zinc-200">{{ day.breakfast }}</dd>
                        </div>
                        <div>
                          <dt class="font-semibold text-zinc-500 dark:text-zinc-400">{{ i18n.t().nutriMealLunch }}</dt>
                          <dd class="text-zinc-800 dark:text-zinc-200">{{ day.lunch }}</dd>
                        </div>
                        <div>
                          <dt class="font-semibold text-zinc-500 dark:text-zinc-400">{{ i18n.t().nutriMealDinner }}</dt>
                          <dd class="text-zinc-800 dark:text-zinc-200">{{ day.dinner }}</dd>
                        </div>
                        <div>
                          <dt class="font-semibold text-zinc-500 dark:text-zinc-400">{{ i18n.t().nutriMealSnack }}</dt>
                          <dd class="text-zinc-800 dark:text-zinc-200">{{ day.snack }}</dd>
                        </div>
                      </dl>
                    </div>
                  }
                </div>
              </div>
            }
          }
        </div>
      </section>
    </div>
  `,
})
export class NutritionComponent {
  readonly store = inject(GymStoreService);
  readonly i18n = inject(I18nService);
  private readonly gemini = inject(GeminiCoachService);

  readonly mealSlotOptions: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack'];
  readonly pantryCategories: PantryCategory[] = ['protein', 'carbs', 'fats', 'produce', 'dairy', 'other'];

  readonly selectedDate = signal(new Date().toISOString().slice(0, 10));
  readonly mealSlot = signal<MealType>('lunch');
  readonly inputMode = signal<'text' | 'image' | 'manual'>('text');

  readonly mealTextInput = new FormControl('', {nonNullable: true});
  readonly planNotesInput = new FormControl('', {nonNullable: true});

  readonly imagePreviewUrl = signal<string | null>(null);
  private pendingImageBase64: string | null = null;
  private pendingImageMime: string | null = null;

  readonly analyzingMeal = signal(false);
  readonly mealPreview = signal<GeminiMealAnalysisResponse | null>(null);
  readonly gettingAdvice = signal(false);
  readonly nutritionAdvice = signal<NutritionRecommendationResult | null>(null);
  readonly generatingPlan = signal(false);
  readonly nutriError = signal<string | null>(null);

  readonly manualMealForm = new FormGroup({
    title: new FormControl('', {nonNullable: true}),
    calories: new FormControl(450, {nonNullable: true}),
    proteinG: new FormControl(35, {nonNullable: true}),
    carbsG: new FormControl(45, {nonNullable: true}),
    fatG: new FormControl(12, {nonNullable: true}),
  });

  readonly pantryForm = new FormGroup({
    name: new FormControl('', {nonNullable: true}),
    category: new FormControl<PantryCategory>('protein', {nonNullable: true}),
    quantityHint: new FormControl('', {nonNullable: true}),
  });

  readonly target = computed(() => this.store.dailyNutritionTarget());

  readonly mealsForSelectedDate = computed<MealLogEntry[]>(() => {
    const d = this.selectedDate();
    return this.store.mealLogs().filter((m) => m.loggedDate === d);
  });

  readonly daySummary = computed(() =>
    computeDailyNutritionSummary(
      this.store.mealLogs(),
      this.selectedDate(),
      this.target().calories,
    ),
  );

  readonly progressWidthPct = computed(() => Math.min(100, this.daySummary().caloriePct));

  asInputValue(event: Event): string {
    return (event.target as HTMLInputElement).value;
  }

  asMealType(event: Event): MealType {
    return (event.target as HTMLSelectElement).value as MealType;
  }

  async onImageSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    this.nutriError.set(null);
    try {
      const processed = await compressImageFileToJpeg(file);
      this.pendingImageBase64 = processed.base64;
      this.pendingImageMime = processed.mimeType;
      this.imagePreviewUrl.set(processed.previewDataUrl);
    } catch (err) {
      this.nutriError.set(err instanceof Error ? err.message : 'Unable to process image.');
    }
  }

  async analyzeMealWithGemini(): Promise<void> {
    const text = this.mealTextInput.value.trim();
    const hasImage = this.inputMode() === 'image' && Boolean(this.pendingImageBase64);
    if (!text && !hasImage) {
      this.nutriError.set(
        this.i18n.lang() === 'ar'
          ? 'أدخل وصف الوجبة أو ارفع صورة لها أولاً.'
          : 'Describe your meal or upload a photo first.',
      );
      return;
    }

    this.analyzingMeal.set(true);
    this.nutriError.set(null);
    try {
      const res = await this.gemini.analyzeMeal({
        textDescription: text,
        imageBase64: hasImage ? (this.pendingImageBase64 ?? undefined) : undefined,
        imageMimeType: hasImage ? (this.pendingImageMime ?? 'image/jpeg') : undefined,
        mealType: this.mealSlot(),
        userGoal: this.store.preferences().goal,
        language: this.i18n.lang(),
      });
      this.mealPreview.set(res);
    } catch (err) {
      this.nutriError.set(err instanceof Error ? err.message : 'Unable to analyze meal.');
    } finally {
      this.analyzingMeal.set(false);
    }
  }

  discardMealPreview(): void {
    this.mealPreview.set(null);
  }

  async saveAnalyzedMeal(): Promise<void> {
    const p = this.mealPreview();
    if (!p) return;
    await this.store.saveMealLog({
      loggedDate: this.selectedDate(),
      mealType: this.mealSlot(),
      title: p.title,
      sourceMode: this.inputMode() === 'image' && this.pendingImageBase64 ? 'image' : 'text',
      totalCalories: p.totalCalories,
      proteinG: p.proteinG,
      carbsG: p.carbsG,
      fatG: p.fatG,
      fiberG: p.fiberG,
      items: p.items,
      nutritionNote: p.nutritionNote,
    });
    this.mealPreview.set(null);
    this.mealTextInput.setValue('');
    this.imagePreviewUrl.set(null);
    this.pendingImageBase64 = null;
    this.pendingImageMime = null;
  }

  async saveManualMeal(): Promise<void> {
    const v = this.manualMealForm.getRawValue();
    const title = v.title.trim();
    if (title.length < 2) {
      this.nutriError.set(
        this.i18n.lang() === 'ar' ? 'أدخل اسم الوجبة.' : 'Enter a meal title.',
      );
      return;
    }
    this.nutriError.set(null);
    await this.store.saveMealLog({
      loggedDate: this.selectedDate(),
      mealType: this.mealSlot(),
      title,
      sourceMode: 'manual',
      totalCalories: Math.max(0, Math.round(Number(v.calories) || 0)),
      proteinG: Math.max(0, Number(v.proteinG) || 0),
      carbsG: Math.max(0, Number(v.carbsG) || 0),
      fatG: Math.max(0, Number(v.fatG) || 0),
      items: [],
    });
    this.manualMealForm.reset({
      title: '',
      calories: 450,
      proteinG: 35,
      carbsG: 45,
      fatG: 12,
    });
  }

  async fetchNutritionAdvice(): Promise<void> {
    this.gettingAdvice.set(true);
    this.nutriError.set(null);
    try {
      const summary = this.daySummary();
      const target = this.target();
      const advice = await this.gemini.recommendNutrition({
        dailyTargetCalories: target.calories,
        consumedCalories: summary.consumedCalories,
        consumedProteinG: summary.proteinG,
        targetProteinG: target.proteinG,
        mealsToday: this.mealsForSelectedDate().map((m) => ({
          title: m.title,
          totalCalories: m.totalCalories,
          proteinG: m.proteinG,
        })),
        pantryItems: this.store.pantryItems().map((p) => p.name),
        userGoal: this.store.preferences().goal,
        weightKg: this.store.latestMeasurement()?.weightKg ?? this.store.preferences().targetWeightKg,
        heightCm: this.store.preferences().heightCm,
        language: this.i18n.lang(),
      });
      this.nutritionAdvice.set(advice);
    } catch (err) {
      this.nutriError.set(err instanceof Error ? err.message : 'Unable to fetch nutrition advice.');
    } finally {
      this.gettingAdvice.set(false);
    }
  }

  async submitPantryItem(): Promise<void> {
    const v = this.pantryForm.getRawValue();
    const name = v.name.trim();
    if (!name) return;
    await this.store.addPantryItem({
      name,
      category: v.category,
      quantityHint: v.quantityHint,
    });
    this.pantryForm.reset({name: '', category: v.category, quantityHint: ''});
  }

  async quickAddGymStaples(): Promise<void> {
    const existing = new Set(this.store.pantryItems().map((i) => i.name.toLowerCase()));
    const staples: {nameEn: string; nameAr: string; category: PantryCategory; qty: string}[] = [
      {nameEn: 'Chicken Breast', nameAr: 'صدور دجاج', category: 'protein', qty: '1 kg'},
      {nameEn: 'Eggs', nameAr: 'بيض', category: 'protein', qty: '12 pcs'},
      {nameEn: 'Basmati Rice', nameAr: 'أرز بسمتي', category: 'carbs', qty: '1 kg'},
      {nameEn: 'Rolled Oats', nameAr: 'شوفان', category: 'carbs', qty: '500 g'},
      {nameEn: 'Greek Yogurt', nameAr: 'زبادي يوناني', category: 'dairy', qty: '500 g'},
      {nameEn: 'Olive Oil', nameAr: 'زيت زيتون', category: 'fats', qty: '250 ml'},
      {nameEn: 'Mixed Vegetables & Banana', nameAr: 'خضار مشكلة وموز', category: 'produce', qty: 'Fresh'},
    ];
    const isAr = this.i18n.lang() === 'ar';
    for (const s of staples) {
      const label = isAr ? s.nameAr : s.nameEn;
      if (!existing.has(label.toLowerCase())) {
        await this.store.addPantryItem({
          name: label,
          category: s.category,
          quantityHint: s.qty,
        });
      }
    }
  }

  async generateWeeklyPlan(): Promise<void> {
    const pantry = this.store.pantryItems();
    if (pantry.length === 0) return;

    this.generatingPlan.set(true);
    this.nutriError.set(null);
    try {
      const target = this.target();
      const res = await this.gemini.generateWeeklyMealPlan({
        pantryItems: pantry.map((p) => (p.quantityHint ? `${p.name} (${p.quantityHint})` : p.name)),
        dailyTargetCalories: target.calories,
        targetProteinG: target.proteinG,
        userGoal: this.store.preferences().goal,
        preferencesNote: this.planNotesInput.value.trim(),
        language: this.i18n.lang(),
      });

      await this.store.saveMealPlan({
        title: res.title,
        goal: this.store.preferences().goal,
        dailyTargetCalories: target.calories,
        language: this.i18n.lang(),
        notes: res.notes,
        days: res.days,
      });
    } catch (err) {
      this.nutriError.set(err instanceof Error ? err.message : 'Unable to generate weekly plan.');
    } finally {
      this.generatingPlan.set(false);
    }
  }
}
