import {ChangeDetectionStrategy, Component, computed, input, signal} from '@angular/core';
import {convertWeight, roundTo} from '../../core/fitness-math';
import {BodyMeasurement, WeightUnit} from '../../core/models';

export type BodyMetricKey = 'weightKg' | 'bodyFatPct' | 'waistCm' | 'chestCm' | 'armsCm' | 'thighsCm';

interface MetricPoint {
  id: string;
  date: string;
  shortDate: string;
  value: number;
  x: number;
  y: number;
}

@Component({
  selector: 'app-body-trend-chart',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="w-full">
      <!-- Metric Switcher -->
      <div class="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div class="inline-flex flex-wrap items-center gap-0.5 rounded-lg bg-zinc-100 p-1 dark:bg-zinc-950">
          @for (opt of metricOptions(); track opt.key) {
            <button
              type="button"
              (click)="selectMetric(opt.key)"
              [class]="
                activeMetric() === opt.key
                  ? 'rounded-md bg-white px-2 py-1 text-[11px] font-medium text-zinc-900 shadow-xs dark:bg-zinc-800 dark:text-zinc-100 whitespace-nowrap shrink-0'
                  : 'rounded-md px-2 py-1 text-[11px] font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 whitespace-nowrap shrink-0'
              "
            >
              {{ opt.label }}
            </button>
          }
        </div>

        @if (activePoint(); as pt) {
          <div class="flex items-center gap-2 text-xs tabular-nums whitespace-nowrap shrink-0">
            <span class="font-mono text-zinc-500 dark:text-zinc-400" dir="ltr">{{ pt.date }}</span>
            <span class="font-semibold text-zinc-900 dark:text-zinc-100">
              <span class="font-mono">{{ pt.value }}</span> {{ metricUnitSuffix() }}
            </span>
          </div>
        }
      </div>

      @if (points().length === 0) {
        <div
          class="flex h-52 items-center justify-center rounded-lg border border-dashed border-zinc-200 bg-zinc-50/60 px-6 text-center text-sm text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900/40 dark:text-zinc-400"
        >
          {{ emptyLabel() }}
        </div>
      } @else {
        <div dir="ltr">
          <svg
            [attr.viewBox]="'0 0 ' + svgWidth + ' ' + svgHeight"
            class="h-52 w-full overflow-visible select-none"
            role="img"
            [attr.aria-label]="ariaLabel()"
          >
            <defs>
              <linearGradient id="bodyTrendFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stop-color="#ea580c" stop-opacity="0.22" />
                <stop offset="100%" stop-color="#ea580c" stop-opacity="0.0" />
              </linearGradient>
            </defs>

            @for (tick of yTicks(); track tick.y) {
              <line
                [attr.x1]="padLeft"
                [attr.x2]="svgWidth - padRight"
                [attr.y1]="tick.y"
                [attr.y2]="tick.y"
                class="stroke-zinc-200 dark:stroke-zinc-800"
                stroke-width="1"
                stroke-dasharray="3 3"
              />
              <text
                [attr.x]="padLeft - 8"
                [attr.y]="tick.y + 4"
                text-anchor="end"
                class="fill-zinc-400 dark:fill-zinc-500 font-mono text-[10px]"
              >
                {{ tick.label }}
              </text>
            }

            @if (points().length > 1) {
              <path [attr.d]="areaPath()" fill="url(#bodyTrendFill)" />
              <polyline
                [attr.points]="linePoints()"
                fill="none"
                class="stroke-orange-600 dark:stroke-orange-500"
                stroke-width="2.25"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            }

            @for (pt of points(); track pt.id; let idx = $index) {
              <g>
                <circle
                  [attr.cx]="pt.x"
                  [attr.cy]="pt.y"
                  [attr.r]="selectedIdx() === idx ? 5.5 : 4"
                  [class]="
                    selectedIdx() === idx
                      ? 'fill-orange-600 stroke-white dark:fill-orange-400 dark:stroke-zinc-950 cursor-pointer'
                      : 'fill-white stroke-orange-600 dark:fill-zinc-950 dark:stroke-orange-500 hover:fill-orange-600 cursor-pointer'
                  "
                  stroke-width="2"
                  tabindex="0"
                  role="button"
                  [attr.aria-label]="pt.date + ' ' + pt.value + ' ' + metricUnitSuffix()"
                  (mouseenter)="hoveredIdx.set(idx)"
                  (mouseleave)="hoveredIdx.set(null)"
                  (focus)="hoveredIdx.set(idx)"
                  (click)="hoveredIdx.set(idx)"
                  (keydown.enter)="hoveredIdx.set(idx)"
                />
                @if (showDateLabel(idx, points().length)) {
                  <text
                    [attr.x]="pt.x"
                    [attr.y]="svgHeight - 6"
                    text-anchor="middle"
                    class="fill-zinc-500 dark:fill-zinc-400 font-mono text-[10px]"
                  >
                    {{ pt.shortDate }}
                  </text>
                }
              </g>
            }
          </svg>
        </div>
      }
    </div>
  `,
})
export class BodyTrendChartComponent {
  readonly measurements = input.required<BodyMeasurement[]>();
  readonly unit = input.required<WeightUnit>();
  readonly unitLabel = input<string | null>(null);
  readonly cmUnitLabel = input('cm');
  readonly weightLabel = input('Weight');
  readonly bodyFatLabel = input('Body Fat %');
  readonly waistLabel = input('Waist');
  readonly chestLabel = input('Chest');
  readonly armsLabel = input('Arms');
  readonly emptyLabel = input('Log measurements to visualize trends.');
  readonly ariaLabel = input('Body metrics trend chart');

  readonly activeMetric = signal<BodyMetricKey>('weightKg');
  readonly hoveredIdx = signal<number | null>(null);

  readonly svgWidth = 600;
  readonly svgHeight = 206;
  readonly padLeft = 44;
  readonly padRight = 18;
  readonly padTop = 14;
  readonly padBottom = 26;

  readonly metricOptions = computed<{key: BodyMetricKey; label: string}[]>(() => [
    {key: 'weightKg', label: this.weightLabel()},
    {key: 'bodyFatPct', label: this.bodyFatLabel()},
    {key: 'waistCm', label: this.waistLabel()},
    {key: 'chestCm', label: this.chestLabel()},
    {key: 'armsCm', label: this.armsLabel()},
  ]);

  readonly metricUnitSuffix = computed(() => {
    const m = this.activeMetric();
    if (m === 'weightKg') return this.unitLabel() ?? this.unit();
    if (m === 'bodyFatPct') return '%';
    return this.cmUnitLabel();
  });

  selectMetric(key: BodyMetricKey): void {
    this.activeMetric.set(key);
    this.hoveredIdx.set(null);
  }

  private readonly seriesValues = computed(() => {
    const key = this.activeMetric();
    const unit = this.unit();
    return [...this.measurements()]
      .sort((a, b) => a.recordedDate.localeCompare(b.recordedDate))
      .map((m) => {
        const raw = m[key];
        if (typeof raw !== 'number' || !Number.isFinite(raw)) return null;
        const val = key === 'weightKg' ? convertWeight(raw, unit) : roundTo(raw, 1);
        return {id: m.id, date: m.recordedDate, value: val};
      })
      .filter((x): x is {id: string; date: string; value: number} => x !== null)
      .slice(-14);
  });

  private readonly bounds = computed(() => {
    const vals = this.seriesValues().map((s) => s.value);
    if (vals.length === 0) return {min: 0, max: 100};
    const rawMin = Math.min(...vals);
    const rawMax = Math.max(...vals);
    const span = Math.max(2, rawMax - rawMin);
    return {
      min: Math.floor((rawMin - span * 0.25) * 10) / 10,
      max: Math.ceil((rawMax + span * 0.25) * 10) / 10,
    };
  });

  readonly yTicks = computed(() => {
    const {min, max} = this.bounds();
    const plotH = this.svgHeight - this.padTop - this.padBottom;
    return [0, 0.5, 1].map((ratio) => {
      const val = roundTo(min + (max - min) * ratio, 1);
      const y = this.padTop + plotH * (1 - ratio);
      return {y, label: `${val}`};
    });
  });

  readonly points = computed<MetricPoint[]>(() => {
    const list = this.seriesValues();
    if (list.length === 0) return [];
    const {min, max} = this.bounds();
    const plotW = this.svgWidth - this.padLeft - this.padRight;
    const plotH = this.svgHeight - this.padTop - this.padBottom;
    const span = Math.max(0.5, max - min);

    return list.map((item, i) => {
      const x =
        list.length === 1
          ? this.padLeft + plotW / 2
          : this.padLeft + (plotW * i) / (list.length - 1);
      const ratio = (item.value - min) / span;
      const y = this.padTop + plotH * (1 - ratio);
      return {
        id: item.id,
        date: item.date,
        shortDate: item.date.slice(5),
        value: item.value,
        x,
        y,
      };
    });
  });

  readonly linePoints = computed(() => {
    return this.points()
      .map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`)
      .join(' ');
  });

  readonly areaPath = computed(() => {
    const pts = this.points();
    if (pts.length < 2) return '';
    const baseY = this.svgHeight - this.padBottom;
    const head = `M ${pts[0].x.toFixed(1)} ${baseY} L ${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)}`;
    const mids = pts
      .slice(1)
      .map((p) => `L ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
      .join(' ');
    const tail = `L ${pts[pts.length - 1].x.toFixed(1)} ${baseY} Z`;
    return `${head} ${mids} ${tail}`;
  });

  readonly selectedIdx = computed(() => {
    const pts = this.points();
    if (pts.length === 0) return -1;
    const h = this.hoveredIdx();
    if (h !== null && h >= 0 && h < pts.length) return h;
    return pts.length - 1;
  });

  readonly activePoint = computed(() => {
    const idx = this.selectedIdx();
    const pts = this.points();
    return idx >= 0 && idx < pts.length ? pts[idx] : null;
  });

  showDateLabel(idx: number, total: number): boolean {
    if (total <= 7) return true;
    return idx === 0 || idx === total - 1 || idx % 2 === 0;
  }
}
