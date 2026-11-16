import {ChangeDetectionStrategy, Component, computed, inject, output, signal} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {BodyTrendChartComponent} from '../../components/svg-charts/body-trend-chart.component';
import {VolumeChartComponent} from '../../components/svg-charts/volume-chart.component';
import {
  calculateBmi,
  computeMuscleVolumeBreakdown,
  computePersonalRecords,
  computeProgressReportSummary,
  convertWeight,
  filterByTimeframe,
  roundTo,
} from '../../core/fitness-math';
import {GymStoreService} from '../../core/gym-store.service';
import {I18nService} from '../../core/i18n.service';
import {MuscleGroup, NavTab, ProgressReport, TimeframeKey} from '../../core/models';

@Component({
  selector: 'app-dashboard',
  imports: [FormsModule, VolumeChartComponent, BodyTrendChartComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-6">
      <!-- Page Header + Timeframe Controls -->
      <div class="flex flex-wrap items-end justify-between gap-4">
        <div class="max-w-2xl">
          <h1 class="font-display text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 sm:text-3xl" style="text-wrap: balance;">
            {{ i18n.t().dashTitle }}
          </h1>
          <p class="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            {{ i18n.t().dashSubtitle }}
          </p>
        </div>

        <div class="flex flex-wrap items-center gap-3">
          <div
            class="inline-flex items-center gap-1 rounded-lg border border-zinc-200 bg-white p-1 dark:border-zinc-800 dark:bg-zinc-900"
            role="group"
            [attr.aria-label]="i18n.t().dashTitle"
          >
            @for (tf of timeframes; track tf) {
              <button
                type="button"
                (click)="timeframe.set(tf)"
                [class]="
                  timeframe() === tf
                    ? 'rounded-md bg-zinc-900 px-3 py-1.5 text-xs font-semibold text-white dark:bg-zinc-100 dark:text-zinc-900 whitespace-nowrap shrink-0'
                    : 'rounded-md px-3 py-1.5 text-xs font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 whitespace-nowrap shrink-0'
                "
              >
                {{ timeframeLabel(tf) }}
              </button>
            }
          </div>

          <button
            type="button"
            (click)="openReportForm()"
            class="inline-flex items-center gap-2 rounded-lg bg-orange-600 px-4 py-2 text-sm font-medium text-white hover:bg-orange-700 dark:bg-orange-500 dark:hover:bg-orange-600 whitespace-nowrap shrink-0"
          >
            <span class="material-icons text-base" aria-hidden="true">summarize</span>
            {{ i18n.t().saveReportBtn }}
          </button>
        </div>
      </div>

      <!-- Inline Save Progress Report Panel -->
      @if (showReportForm()) {
        <form
          (ngSubmit)="submitReport()"
          class="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900"
        >
          <div class="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-200 pb-3 dark:border-zinc-800">
            <h2 class="font-display text-base font-semibold text-zinc-900 dark:text-zinc-100">
              {{ i18n.t().saveReportBtn }} · {{ timeframeLabel(timeframe()) }}
            </h2>
            <span class="font-mono text-xs tabular-nums text-zinc-500 dark:text-zinc-400">
              {{ summary().startDate }} — {{ summary().endDate }}
            </span>
          </div>

          <div class="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label for="report-title" class="mb-1.5 block text-xs font-medium text-zinc-600 dark:text-zinc-400">
                {{ i18n.t().reportTitleLabel }}
              </label>
              <input
                id="report-title"
                name="reportTitle"
                type="text"
                required
                [ngModel]="reportTitle()"
                (ngModelChange)="reportTitle.set($event)"
                [placeholder]="i18n.t().reportTitlePlaceholder"
                class="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-orange-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
              />
            </div>
            <div>
              <label for="report-notes" class="mb-1.5 block text-xs font-medium text-zinc-600 dark:text-zinc-400">
                {{ i18n.t().reportNotesLabel }}
              </label>
              <input
                id="report-notes"
                name="reportNotes"
                type="text"
                [ngModel]="reportNotes()"
                (ngModelChange)="reportNotes.set($event)"
                [placeholder]="i18n.t().reportNotesPlaceholder"
                class="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-orange-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
              />
            </div>
          </div>

          @if (reportError()) {
            <p class="mt-2 text-xs font-medium text-red-600 dark:text-red-400">{{ reportError() }}</p>
          }

          <div class="mt-4 flex flex-wrap items-center justify-between gap-3">
            <div class="text-xs text-zinc-500 dark:text-zinc-400 font-mono tabular-nums">
              {{ summary().workoutsCount }} {{ i18n.t().sessionsCountLabel }} ·
              {{ convertDisplay(summary().totalVolumeKg).toLocaleString('en-US') }} {{ unitLabel() }}
            </div>
            <div class="flex items-center gap-2">
              <button
                type="button"
                (click)="showReportForm.set(false)"
                class="rounded-lg border border-zinc-300 px-3.5 py-2 text-xs font-medium text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
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
          </div>
        </form>
      }

      <!-- 4-Column KPI Strip -->
      <section class="grid grid-cols-2 gap-4 lg:grid-cols-4" [attr.aria-label]="i18n.t().kpiSectionAria">
        <div class="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
          <p class="text-xs font-medium text-zinc-500 dark:text-zinc-400">{{ i18n.t().kpiTotalVolume }}</p>
          <p class="mt-2 text-2xl font-semibold tabular-nums text-zinc-900 dark:text-zinc-100">
            <span class="font-mono">{{ convertDisplay(summary().totalVolumeKg).toLocaleString('en-US') }}</span>
            <span class="ms-1 text-sm font-normal text-zinc-500 dark:text-zinc-400">{{ unitLabel() }}</span>
          </p>
          <p class="mt-1 text-xs text-zinc-500 dark:text-zinc-400 tabular-nums">
            {{ summary().workoutsCount }} {{ i18n.t().sessionsCountLabel }}
          </p>
        </div>

        <div class="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
          <p class="text-xs font-medium text-zinc-500 dark:text-zinc-400">{{ i18n.t().kpiWeeklySessions }}</p>
          <p class="mt-2 font-mono text-2xl font-semibold tabular-nums text-zinc-900 dark:text-zinc-100">
            {{ store.weeklySessionsCount() }}
          </p>
          <p class="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
            {{ i18n.t().goals[store.preferences().goal] }}
          </p>
        </div>

        <div class="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
          <p class="text-xs font-medium text-zinc-500 dark:text-zinc-400">{{ i18n.t().kpiLatestWeight }}</p>
          @if (store.latestMeasurement(); as latest) {
            <p class="mt-2 text-2xl font-semibold tabular-nums text-zinc-900 dark:text-zinc-100">
              <span class="font-mono">{{ convertDisplay(latest.weightKg) }}</span>
              <span class="ms-1 text-sm font-normal text-zinc-500 dark:text-zinc-400">{{ unitLabel() }}</span>
            </p>
            <p class="mt-1 flex flex-wrap items-center gap-x-1.5 text-xs tabular-nums" [class]="deltaTextClass(summary().weightDeltaKg)">
              @if (store.measurements().length >= 2) {
                <span class="whitespace-nowrap">{{ summary().weightDeltaKg > 0 ? '+' : '' }}{{ convertDisplay(summary().weightDeltaKg) }} {{ unitLabel() }}</span>
                <span aria-hidden="true">·</span>
              }
              @if (store.preferences().heightCm; as h) {
                <span class="whitespace-nowrap text-zinc-500 dark:text-zinc-400">{{ h }} {{ i18n.t().unitCm }}</span>
              }
              @if (latestBmi(); as bmi) {
                <span aria-hidden="true" class="text-zinc-400">·</span>
                <span class="whitespace-nowrap text-zinc-500 dark:text-zinc-400">{{ i18n.t().bmiLabel }} {{ bmi }}</span>
              }
            </p>
          } @else {
            <p class="mt-2 text-sm font-medium text-zinc-500 dark:text-zinc-400">{{ i18n.t().kpiNoWeightYet }}</p>
          }
        </div>

        <div class="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
          <p class="text-xs font-medium text-zinc-500 dark:text-zinc-400">{{ i18n.t().kpiCompletedSets }}</p>
          <p class="mt-2 font-mono text-2xl font-semibold tabular-nums text-zinc-900 dark:text-zinc-100">
            {{ summary().completedSetsCount.toLocaleString('en-US') }}
          </p>
          <p class="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
            {{ topMuscleLabel() }}
          </p>
        </div>
      </section>

      <!-- Charts Row -->
      <section class="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <div class="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
          <div class="mb-4 flex items-start justify-between gap-4">
            <div>
              <h2 class="font-display text-base font-semibold text-zinc-900 dark:text-zinc-100">
                {{ i18n.t().chartVolumeTitle }}
              </h2>
              <p class="text-xs text-zinc-500 dark:text-zinc-400">
                {{ i18n.t().chartVolumeSubtitle }}
              </p>
            </div>
          </div>
          <app-volume-chart
            [workouts]="scopedWorkouts()"
            [unit]="unit()"
            [unitLabel]="unitLabel()"
            [emptyLabel]="i18n.t().noDataChart"
            [setsLabel]="i18n.t().setsCompleted"
            [ariaLabel]="i18n.t().chartVolumeTitle"
          />
        </div>

        <div class="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
          <div class="mb-4 flex items-start justify-between gap-4">
            <div>
              <h2 class="font-display text-base font-semibold text-zinc-900 dark:text-zinc-100">
                {{ i18n.t().chartBodyTitle }}
              </h2>
              <p class="text-xs text-zinc-500 dark:text-zinc-400">
                {{ i18n.t().chartBodySubtitle }}
              </p>
            </div>
          </div>
          <app-body-trend-chart
            [measurements]="scopedMeasurements()"
            [unit]="unit()"
            [unitLabel]="unitLabel()"
            [cmUnitLabel]="i18n.t().unitCm"
            [weightLabel]="i18n.t().bodyWeightLabel"
            [bodyFatLabel]="i18n.t().bodyFatLabel"
            [waistLabel]="i18n.t().waistLabel"
            [chestLabel]="i18n.t().chestLabel"
            [armsLabel]="i18n.t().armsLabel"
            [emptyLabel]="i18n.t().noDataChart"
            [ariaLabel]="i18n.t().chartBodyTitle"
          />
        </div>
      </section>

      <!-- Muscle Distribution + Estimated 1RMs -->
      <section class="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div class="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
          <h2 class="font-display text-base font-semibold text-zinc-900 dark:text-zinc-100">
            {{ i18n.t().chartMuscleTitle }}
          </h2>
          <p class="text-xs text-zinc-500 dark:text-zinc-400">
            {{ i18n.t().chartMuscleSubtitle }}
          </p>

          @if (muscleBreakdown().length === 0) {
            <p class="mt-6 text-sm text-zinc-500 dark:text-zinc-400">{{ i18n.t().noDataChart }}</p>
          } @else {
            <div class="mt-5 space-y-3.5">
              @for (item of muscleBreakdown(); track item.muscleGroup) {
                <div>
                  <div class="mb-1 flex items-center justify-between text-xs">
                    <span class="font-medium text-zinc-800 dark:text-zinc-200">
                      {{ i18n.t().muscles[item.muscleGroup] }}
                    </span>
                    <span class="tabular-nums text-zinc-500 dark:text-zinc-400">
                      {{ convertDisplay(item.volumeKg).toLocaleString('en-US') }} {{ unitLabel() }} · {{ item.percentage }}%
                    </span>
                  </div>
                  <div class="h-2 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
                    <div
                      class="h-full rounded-full bg-orange-600 dark:bg-orange-500"
                      [style.width.%]="item.percentage"
                    ></div>
                  </div>
                </div>
              }
            </div>
          }
        </div>

        <div class="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
          <h2 class="font-display text-base font-semibold text-zinc-900 dark:text-zinc-100">
            {{ i18n.t().personalRecordsTitle }}
          </h2>
          <p class="text-xs text-zinc-500 dark:text-zinc-400">
            {{ i18n.t().personalRecordsSubtitle }}
          </p>

          @if (prs().length === 0) {
            <p class="mt-6 text-sm text-zinc-500 dark:text-zinc-400">{{ i18n.t().noWorkoutsYet }}</p>
          } @else {
            <div class="mt-4 divide-y divide-zinc-200 dark:divide-zinc-800">
              @for (pr of prs(); track pr.exerciseId) {
                <div class="flex items-center justify-between gap-4 py-2.5">
                  <div class="min-w-0">
                    <p class="truncate text-sm font-medium text-zinc-900 dark:text-zinc-100">
                      {{ i18n.exerciseDisplayName(pr.exerciseId, pr.exerciseName, store.allExercises()) }}
                    </p>
                    <p class="font-mono text-xs tabular-nums text-zinc-500 dark:text-zinc-400">
                      {{ pr.dateIso.slice(0, 10) }}
                    </p>
                  </div>
                  <div class="text-end tabular-nums shrink-0">
                    <p class="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                      {{ convertDisplay(pr.estimated1RmKg) }} {{ unitLabel() }}
                    </p>
                    <p class="text-[11px] text-zinc-500 dark:text-zinc-400">
                      {{ i18n.t().estOneRm }} · {{ convertDisplay(pr.maxWeightKg) }} {{ unitLabel() }}
                    </p>
                  </div>
                </div>
              }
            </div>
          }
        </div>
      </section>

      <!-- Saved Progress Reports + Recent Workouts -->
      <section class="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div class="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
          <div class="flex items-center justify-between gap-3">
            <div>
              <h2 class="font-display text-base font-semibold text-zinc-900 dark:text-zinc-100">
                {{ i18n.t().reportsTitle }}
              </h2>
              <p class="text-xs text-zinc-500 dark:text-zinc-400">
                {{ i18n.t().reportsSubtitle }}
              </p>
            </div>
            @if (store.progressReports().length > 0) {
              <button
                type="button"
                (click)="exportReportsCsv()"
                class="rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800 whitespace-nowrap shrink-0"
              >
                {{ i18n.t().exportCsv }}
              </button>
            }
          </div>

          @if (store.progressReports().length === 0) {
            <p class="mt-5 text-sm text-zinc-500 dark:text-zinc-400">{{ i18n.t().noReportsYet }}</p>
          } @else {
            <div class="mt-4 divide-y divide-zinc-200 dark:divide-zinc-800">
              @for (rep of store.progressReports(); track rep.id) {
                <div class="py-3">
                  <div class="flex items-start justify-between gap-3">
                    <div class="min-w-0">
                      <h3 class="truncate text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                        {{ rep.title }}
                      </h3>
                      <p class="mt-0.5 text-xs tabular-nums text-zinc-500 dark:text-zinc-400">
                        <span dir="ltr" class="font-mono whitespace-nowrap">{{ rep.startDate }} — {{ rep.endDate }}</span> · {{ rep.workoutsCount }} {{ i18n.t().sessionsCountLabel }} ·
                        <span class="whitespace-nowrap">{{ convertDisplay(rep.totalVolumeKg).toLocaleString('en-US') }} {{ unitLabel() }}</span>
                      </p>
                      @if (rep.notes) {
                        <p class="mt-1 text-xs text-zinc-600 dark:text-zinc-400">{{ rep.notes }}</p>
                      }
                    </div>
                    <button
                      type="button"
                      (click)="store.deleteProgressReport(rep.id)"
                      [attr.aria-label]="i18n.t().deleteBtn + ' ' + rep.title"
                      class="flex h-8 w-8 items-center justify-center rounded-md text-zinc-400 hover:bg-zinc-100 hover:text-red-600 dark:hover:bg-zinc-800 dark:hover:text-red-400 shrink-0"
                    >
                      <span class="material-icons text-base" aria-hidden="true">delete_outline</span>
                    </button>
                  </div>
                </div>
              }
            </div>
          }
        </div>

        <div class="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
          <div class="flex items-center justify-between gap-3">
            <h2 class="font-display text-base font-semibold text-zinc-900 dark:text-zinc-100">
              {{ i18n.t().recentWorkoutsTitle }}
            </h2>
            <button
              type="button"
              (click)="navigateTab.emit('workouts')"
              class="text-xs font-medium text-orange-600 hover:underline dark:text-orange-400 whitespace-nowrap"
            >
              {{ i18n.t().viewAllWorkouts }}
            </button>
          </div>

          @if (store.sortedWorkouts().length === 0) {
            <div class="mt-5 space-y-3">
              <p class="text-sm text-zinc-500 dark:text-zinc-400">{{ i18n.t().noWorkoutsYet }}</p>
              <button
                type="button"
                (click)="navigateTab.emit('workouts')"
                class="rounded-lg bg-orange-600 px-4 py-2 text-xs font-semibold text-white hover:bg-orange-700"
              >
                {{ i18n.t().logFirstWorkout }}
              </button>
            </div>
          } @else {
            <div class="mt-4 divide-y divide-zinc-200 dark:divide-zinc-800">
              @for (wk of store.sortedWorkouts().slice(0, 5); track wk.id) {
                <div class="flex items-center justify-between gap-4 py-2.5">
                  <div class="min-w-0">
                    <p class="truncate text-sm font-medium text-zinc-900 dark:text-zinc-100">{{ wk.title }}</p>
                    <p class="text-xs tabular-nums text-zinc-500 dark:text-zinc-400">
                      <span class="font-mono" dir="ltr">{{ wk.completedAtIso.slice(0, 10) }}</span> · {{ wk.durationMinutes }} {{ i18n.t().minutesShort }} ·
                      {{ wk.completedSetsCount }} {{ i18n.t().setsCompleted }}
                    </p>
                  </div>
                  <span class="text-sm font-semibold tabular-nums text-zinc-900 dark:text-zinc-100 shrink-0">
                    {{ convertDisplay(wk.totalVolumeKg).toLocaleString('en-US') }} {{ unitLabel() }}
                  </span>
                </div>
              }
            </div>
          }
        </div>
      </section>
    </div>
  `,
})
export class DashboardComponent {
  readonly store = inject(GymStoreService);
  readonly i18n = inject(I18nService);
  readonly navigateTab = output<NavTab>();

  readonly timeframe = signal<TimeframeKey>('30d');
  readonly timeframes: TimeframeKey[] = ['7d', '30d', '90d', 'all'];

  readonly showReportForm = signal(false);
  readonly reportTitle = signal('');
  readonly reportNotes = signal('');
  readonly reportError = signal<string | null>(null);

  readonly unit = computed(() => this.store.preferences().preferredUnit);
  readonly unitLabel = computed(() => this.i18n.unitLabel(this.unit()));

  readonly latestBmi = computed(() => {
    const h = this.store.preferences().heightCm;
    const w = this.store.latestMeasurement()?.weightKg;
    return h && w ? calculateBmi(w, h) : null;
  });

  readonly scopedWorkouts = computed(() =>
    filterByTimeframe(this.store.sortedWorkouts(), (w) => w.completedAtIso, this.timeframe()),
  );

  readonly scopedMeasurements = computed(() =>
    filterByTimeframe(
      this.store.sortedMeasurements(),
      (m) => `${m.recordedDate}T12:00:00.000Z`,
      this.timeframe(),
    ),
  );

  readonly summary = computed(() =>
    computeProgressReportSummary(this.store.workouts(), this.store.measurements(), this.timeframe()),
  );

  readonly muscleBreakdown = computed(() => computeMuscleVolumeBreakdown(this.scopedWorkouts()));
  readonly prs = computed(() => computePersonalRecords(this.store.workouts()));

  readonly topMuscleLabel = computed(() => {
    const top = this.summary().topMuscleGroup;
    if (top === 'none') return '—';
    return this.i18n.t().muscles[top as MuscleGroup] ?? top;
  });

  timeframeLabel(tf: TimeframeKey): string {
    const t = this.i18n.t();
    if (tf === '7d') return t.timeframe7d;
    if (tf === '30d') return t.timeframe30d;
    if (tf === '90d') return t.timeframe90d;
    return t.timeframeAll;
  }

  convertDisplay(kg: number): number {
    return roundTo(convertWeight(kg, this.unit()), 1);
  }

  deltaTextClass(delta: number): string {
    if (delta === 0) return 'text-zinc-500 dark:text-zinc-400';
    return 'text-emerald-700 dark:text-emerald-400';
  }

  openReportForm(): void {
    this.reportTitle.set('');
    this.reportNotes.set('');
    this.reportError.set(null);
    this.showReportForm.set(true);
  }

  async submitReport(): Promise<void> {
    const title = this.reportTitle().trim();
    if (title.length < 2) {
      this.reportError.set(this.i18n.t().val_report_title);
      return;
    }
    this.reportError.set(null);
    await this.store.createProgressReport(title, this.timeframe(), this.reportNotes());
    this.showReportForm.set(false);
  }

  exportReportsCsv(): void {
    const t = this.i18n.t();
    const rows = [
      t.csvHeaders,
      ...this.store.progressReports().map((r: ProgressReport) => [
        `"${r.title.replace(/"/g, '""')}"`,
        r.timeframeLabel,
        r.startDate,
        r.endDate,
        String(r.workoutsCount),
        String(r.totalVolumeKg),
        String(r.weightDeltaKg),
        r.topMuscleGroup === 'none'
          ? '—'
          : (t.muscles[r.topMuscleGroup as MuscleGroup] ?? r.topMuscleGroup),
        `"${(r.notes ?? '').replace(/"/g, '""')}"`,
      ]),
    ];
    const csv = '\uFEFF' + rows.map((r) => r.join(',')).join('\n');
    const blob = new Blob([csv], {type: 'text/csv;charset=utf-8;'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ironledger-progress-reports-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }
}
