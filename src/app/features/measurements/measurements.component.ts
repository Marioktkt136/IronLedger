import {ChangeDetectionStrategy, Component, computed, inject, signal} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {BodyTrendChartComponent} from '../../components/svg-charts/body-trend-chart.component';
import {
  calculateBmi,
  convertInputToKg,
  convertWeight,
  roundTo,
  validateMeasurementInput,
} from '../../core/fitness-math';
import {GymStoreService} from '../../core/gym-store.service';
import {I18nService} from '../../core/i18n.service';

@Component({
  selector: 'app-measurements',
  imports: [FormsModule, BodyTrendChartComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-6">
      <div class="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 class="font-display text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 sm:text-3xl">
            {{ i18n.t().measurementsTitle }}
          </h1>
          <p class="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            {{ i18n.t().measurementsSubtitle }}
          </p>
        </div>

        <button
          type="button"
          (click)="openForm()"
          class="inline-flex items-center gap-2 rounded-lg bg-orange-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-orange-700 dark:bg-orange-500 dark:hover:bg-orange-600 whitespace-nowrap"
        >
          <span class="material-icons text-base" aria-hidden="true">monitor_weight</span>
          {{ i18n.t().logMeasurementBtn }}
        </button>
      </div>

      <!-- Log Measurement Form -->
      @if (showForm()) {
        <form
          (ngSubmit)="submitMeasurement()"
          class="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900"
        >
          <div class="flex items-center justify-between border-b border-zinc-200 pb-3 dark:border-zinc-800">
            <h2 class="font-display text-base font-semibold text-zinc-900 dark:text-zinc-100">
              {{ i18n.t().logMeasurementBtn }}
            </h2>
            <button
              type="button"
              (click)="showForm.set(false)"
              [attr.aria-label]="i18n.t().cancelBtn"
              class="flex h-8 w-8 items-center justify-center rounded-md text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
            >
              <span class="material-icons text-base" aria-hidden="true">close</span>
            </button>
          </div>

          <div class="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <label for="ms-date" class="mb-1.5 block text-xs font-medium text-zinc-600 dark:text-zinc-400">
                {{ i18n.t().recordedDateLabel }}
              </label>
              <input
                id="ms-date"
                name="recordedDate"
                type="date"
                required
                [ngModel]="recordedDate()"
                (ngModelChange)="recordedDate.set($event)"
                class="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 font-mono text-sm tabular-nums text-zinc-900 focus:border-orange-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
              />
            </div>

            <div>
              <label for="ms-weight" class="mb-1.5 block text-xs font-medium text-zinc-600 dark:text-zinc-400">
                {{ i18n.t().bodyWeightLabel }} ({{ unitLabel() }})
              </label>
              <input
                id="ms-weight"
                name="weight"
                type="number"
                step="0.1"
                required
                [ngModel]="weightDisplay()"
                (ngModelChange)="weightDisplay.set($event)"
                class="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 font-mono text-sm tabular-nums text-zinc-900 focus:border-orange-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
              />
            </div>

            <div>
              <label for="ms-bf" class="mb-1.5 block text-xs font-medium text-zinc-600 dark:text-zinc-400">
                {{ i18n.t().bodyFatLabel }}
              </label>
              <input
                id="ms-bf"
                name="bodyFat"
                type="number"
                step="0.1"
                [ngModel]="bodyFatPct()"
                (ngModelChange)="bodyFatPct.set($event)"
                class="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 font-mono text-sm tabular-nums text-zinc-900 focus:border-orange-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
              />
            </div>

            <div>
              <label for="ms-waist" class="mb-1.5 block text-xs font-medium text-zinc-600 dark:text-zinc-400">
                {{ i18n.t().waistLabel }}
              </label>
              <input
                id="ms-waist"
                name="waist"
                type="number"
                step="0.1"
                [ngModel]="waistCm()"
                (ngModelChange)="waistCm.set($event)"
                class="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 font-mono text-sm tabular-nums text-zinc-900 focus:border-orange-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
              />
            </div>

            <div>
              <label for="ms-chest" class="mb-1.5 block text-xs font-medium text-zinc-600 dark:text-zinc-400">
                {{ i18n.t().chestLabel }}
              </label>
              <input
                id="ms-chest"
                name="chest"
                type="number"
                step="0.1"
                [ngModel]="chestCm()"
                (ngModelChange)="chestCm.set($event)"
                class="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 font-mono text-sm tabular-nums text-zinc-900 focus:border-orange-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
              />
            </div>

            <div>
              <label for="ms-arms" class="mb-1.5 block text-xs font-medium text-zinc-600 dark:text-zinc-400">
                {{ i18n.t().armsLabel }}
              </label>
              <input
                id="ms-arms"
                name="arms"
                type="number"
                step="0.1"
                [ngModel]="armsCm()"
                (ngModelChange)="armsCm.set($event)"
                class="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 font-mono text-sm tabular-nums text-zinc-900 focus:border-orange-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
              />
            </div>

            <div>
              <label for="ms-thighs" class="mb-1.5 block text-xs font-medium text-zinc-600 dark:text-zinc-400">
                {{ i18n.t().thighsLabel }}
              </label>
              <input
                id="ms-thighs"
                name="thighs"
                type="number"
                step="0.1"
                [ngModel]="thighsCm()"
                (ngModelChange)="thighsCm.set($event)"
                class="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 font-mono text-sm tabular-nums text-zinc-900 focus:border-orange-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
              />
            </div>

            <div>
              <label for="ms-notes" class="mb-1.5 block text-xs font-medium text-zinc-600 dark:text-zinc-400">
                {{ i18n.t().notesLabel }}
              </label>
              <input
                id="ms-notes"
                name="notes"
                type="text"
                [ngModel]="notes()"
                (ngModelChange)="notes.set($event)"
                [placeholder]="i18n.t().measurementNotesPlaceholder"
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
              (click)="showForm.set(false)"
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

      <!-- Latest Metrics Summary Strip -->
      @if (store.latestMeasurement(); as latest) {
        <section class="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          <div class="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
            <p class="text-xs text-zinc-500 dark:text-zinc-400">{{ i18n.t().bodyWeightLabel }}</p>
            <p class="mt-1 text-xl font-semibold tabular-nums text-zinc-900 dark:text-zinc-100">
              <span class="font-mono">{{ displayWeight(latest.weightKg) }}</span>
              <span class="ms-1 text-sm font-normal text-zinc-500 dark:text-zinc-400">{{ unitLabel() }}</span>
            </p>
            <p class="mt-0.5 text-xs tabular-nums text-zinc-500 dark:text-zinc-400">
              {{ weightDeltaLabel() }}
            </p>
          </div>

          <div class="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
            <p class="text-xs text-zinc-500 dark:text-zinc-400">{{ i18n.t().heightLabel }}</p>
            <p class="mt-1 text-xl font-semibold tabular-nums text-zinc-900 dark:text-zinc-100">
              @if (store.preferences().heightCm; as h) {
                <span class="font-mono">{{ h }}</span>
                <span class="ms-1 text-sm font-normal text-zinc-500 dark:text-zinc-400">{{ i18n.t().unitCm }}</span>
              } @else {
                —
              }
            </p>
            @if (latestBmi(); as bmi) {
              <p class="mt-0.5 text-xs tabular-nums text-zinc-500 dark:text-zinc-400">
                {{ i18n.t().bmiLabel }}: <span class="font-mono">{{ bmi }}</span>
              </p>
            }
          </div>

          <div class="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
            <p class="text-xs text-zinc-500 dark:text-zinc-400">{{ i18n.t().bodyFatLabel }}</p>
            <p class="mt-1 font-mono text-xl font-semibold tabular-nums text-zinc-900 dark:text-zinc-100">
              {{ latest.bodyFatPct !== undefined ? latest.bodyFatPct + '%' : '—' }}
            </p>
          </div>

          <div class="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
            <p class="text-xs text-zinc-500 dark:text-zinc-400">{{ i18n.t().waistLabel }}</p>
            <p class="mt-1 text-xl font-semibold tabular-nums text-zinc-900 dark:text-zinc-100">
              @if (latest.waistCm !== undefined) {
                <span class="font-mono">{{ latest.waistCm }}</span>
                <span class="ms-1 text-sm font-normal text-zinc-500 dark:text-zinc-400">{{ i18n.t().unitCm }}</span>
              } @else {
                —
              }
            </p>
          </div>

          <div class="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
            <p class="text-xs text-zinc-500 dark:text-zinc-400">{{ i18n.t().chestLabel }}</p>
            <p class="mt-1 text-xl font-semibold tabular-nums text-zinc-900 dark:text-zinc-100">
              @if (latest.chestCm !== undefined) {
                <span class="font-mono">{{ latest.chestCm }}</span>
                <span class="ms-1 text-sm font-normal text-zinc-500 dark:text-zinc-400">{{ i18n.t().unitCm }}</span>
              } @else {
                —
              }
            </p>
          </div>

          <div class="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
            <p class="text-xs text-zinc-500 dark:text-zinc-400">{{ i18n.t().armsLabel }}</p>
            <p class="mt-1 text-xl font-semibold tabular-nums text-zinc-900 dark:text-zinc-100">
              @if (latest.armsCm !== undefined) {
                <span class="font-mono">{{ latest.armsCm }}</span>
                <span class="ms-1 text-sm font-normal text-zinc-500 dark:text-zinc-400">{{ i18n.t().unitCm }}</span>
              } @else {
                —
              }
            </p>
          </div>
        </section>
      }

      <!-- Trend Chart -->
      <section class="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
        <app-body-trend-chart
          [measurements]="store.sortedMeasurements()"
          [unit]="unit()"
          [unitLabel]="unitLabel()"
          [cmUnitLabel]="i18n.t().unitCm"
          [weightLabel]="i18n.t().bodyWeightLabel"
          [bodyFatLabel]="i18n.t().bodyFatLabel"
          [waistLabel]="i18n.t().waistLabel"
          [chestLabel]="i18n.t().chestLabel"
          [armsLabel]="i18n.t().armsLabel"
          [emptyLabel]="i18n.t().noMeasurementsYet"
          [ariaLabel]="i18n.t().measurementsTitle"
        />
      </section>

      <!-- Measurement History Table -->
      <section class="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
        <h2 class="font-display text-base font-semibold text-zinc-900 dark:text-zinc-100">
          {{ i18n.t().metricHistoryTitle }}
        </h2>

        @if (store.sortedMeasurements().length === 0) {
          <p class="py-8 text-center text-sm text-zinc-500 dark:text-zinc-400">
            {{ i18n.t().noMeasurementsYet }}
          </p>
        } @else {
          <div class="mt-4 overflow-x-auto">
            <table class="w-full min-w-[640px] text-sm">
              <thead>
                <tr class="border-b border-zinc-200 text-xs text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
                  <th class="pb-2.5 text-start font-medium">{{ i18n.t().recordedDateLabel }}</th>
                  <th class="pb-2.5 text-end font-medium">{{ i18n.t().bodyWeightLabel }} ({{ unitLabel() }})</th>
                  <th class="pb-2.5 text-end font-medium">{{ i18n.t().bodyFatLabel }}</th>
                  <th class="pb-2.5 text-end font-medium">{{ i18n.t().waistLabel }}</th>
                  <th class="pb-2.5 text-end font-medium">{{ i18n.t().chestLabel }}</th>
                  <th class="pb-2.5 text-end font-medium">{{ i18n.t().armsLabel }}</th>
                  <th class="pb-2.5 text-end font-medium">{{ i18n.t().deleteBtn }}</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-zinc-200 dark:divide-zinc-800">
                @for (m of store.sortedMeasurements(); track m.id) {
                  <tr class="hover:bg-zinc-50 dark:hover:bg-zinc-950/40">
                    <td class="py-3 font-mono text-xs tabular-nums text-zinc-900 dark:text-zinc-100">
                      {{ m.recordedDate }}
                      @if (m.notes) {
                        <span class="block font-sans text-xs text-zinc-500 dark:text-zinc-400">{{ m.notes }}</span>
                      }
                    </td>
                    <td class="py-3 text-end font-mono text-sm font-semibold tabular-nums text-zinc-900 dark:text-zinc-100">
                      {{ displayWeight(m.weightKg) }}
                    </td>
                    <td class="py-3 text-end font-mono text-xs tabular-nums text-zinc-600 dark:text-zinc-400">
                      {{ m.bodyFatPct !== undefined ? m.bodyFatPct + '%' : '—' }}
                    </td>
                    <td class="py-3 text-end font-mono text-xs tabular-nums text-zinc-600 dark:text-zinc-400">
                      {{ m.waistCm !== undefined ? m.waistCm : '—' }}
                    </td>
                    <td class="py-3 text-end font-mono text-xs tabular-nums text-zinc-600 dark:text-zinc-400">
                      {{ m.chestCm !== undefined ? m.chestCm : '—' }}
                    </td>
                    <td class="py-3 text-end font-mono text-xs tabular-nums text-zinc-600 dark:text-zinc-400">
                      {{ m.armsCm !== undefined ? m.armsCm : '—' }}
                    </td>
                    <td class="py-3 text-end">
                      <button
                        type="button"
                        (click)="store.deleteMeasurement(m.id)"
                        [attr.aria-label]="i18n.t().deleteBtn + ' ' + m.recordedDate"
                        class="inline-flex h-8 w-8 items-center justify-center rounded-md text-zinc-400 hover:bg-zinc-100 hover:text-red-600 dark:hover:bg-zinc-800 dark:hover:text-red-400"
                      >
                        <span class="material-icons text-base" aria-hidden="true">delete_outline</span>
                      </button>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }
      </section>
    </div>
  `,
})
export class MeasurementsComponent {
  readonly store = inject(GymStoreService);
  readonly i18n = inject(I18nService);

  readonly unit = computed(() => this.store.preferences().preferredUnit);
  readonly unitLabel = computed(() => this.i18n.unitLabel(this.unit()));

  readonly latestBmi = computed(() => {
    const h = this.store.preferences().heightCm;
    const w = this.store.latestMeasurement()?.weightKg;
    return h && w ? calculateBmi(w, h) : null;
  });

  readonly showForm = signal(false);
  readonly recordedDate = signal(new Date().toISOString().slice(0, 10));
  readonly weightDisplay = signal<number | null>(null);
  readonly bodyFatPct = signal<number | null>(null);
  readonly waistCm = signal<number | null>(null);
  readonly chestCm = signal<number | null>(null);
  readonly armsCm = signal<number | null>(null);
  readonly thighsCm = signal<number | null>(null);
  readonly notes = signal('');
  readonly formError = signal<string | null>(null);

  readonly weightDeltaLabel = computed(() => {
    const latest = this.store.latestMeasurement();
    const base = this.store.baselineMeasurement();
    if (!latest || !base || latest.id === base.id) return this.i18n.t().deltaFromStart;
    const diff = roundTo(convertWeight(latest.weightKg - base.weightKg, this.unit()), 1);
    const sign = diff > 0 ? '+' : '';
    return `${sign}${diff} ${this.unitLabel()} · ${this.i18n.t().deltaFromStart}`;
  });

  displayWeight(kg: number): number {
    return convertWeight(kg, this.unit());
  }

  openForm(): void {
    const latest = this.store.latestMeasurement();
    this.recordedDate.set(new Date().toISOString().slice(0, 10));
    this.weightDisplay.set(latest ? convertWeight(latest.weightKg, this.unit()) : null);
    this.bodyFatPct.set(latest?.bodyFatPct ?? null);
    this.waistCm.set(latest?.waistCm ?? null);
    this.chestCm.set(latest?.chestCm ?? null);
    this.armsCm.set(latest?.armsCm ?? null);
    this.thighsCm.set(latest?.thighsCm ?? null);
    this.notes.set('');
    this.formError.set(null);
    this.showForm.set(true);
  }

  async submitMeasurement(): Promise<void> {
    const rawW = this.weightDisplay();
    const weightKg = rawW !== null && Number.isFinite(Number(rawW))
      ? convertInputToKg(Number(rawW), this.unit())
      : null;

    const toOptNum = (val: number | null): number | null =>
      val === null || val === undefined || String(val).trim() === '' ? null : Number(val);

    const validation = validateMeasurementInput({
      recordedDate: this.recordedDate(),
      weightKg,
      bodyFatPct: toOptNum(this.bodyFatPct()),
      waistCm: toOptNum(this.waistCm()),
      chestCm: toOptNum(this.chestCm()),
      armsCm: toOptNum(this.armsCm()),
      thighsCm: toOptNum(this.thighsCm()),
      notes: this.notes(),
    });

    if (!validation.valid || !validation.sanitized) {
      const key = validation.errorKeys[0] as keyof ReturnType<typeof this.i18n.t>;
      this.formError.set(String(this.i18n.t()[key] ?? 'Invalid measurement'));
      return;
    }

    this.formError.set(null);
    await this.store.saveMeasurement(validation.sanitized);
    this.showForm.set(false);
  }
}
