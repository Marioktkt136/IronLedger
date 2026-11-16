import {ChangeDetectionStrategy, Component, computed, input, signal} from '@angular/core';
import {convertWeight} from '../../core/fitness-math';
import {WeightUnit, WorkoutSession} from '../../core/models';

interface VolumePoint {
  id: string;
  label: string;
  fullDate: string;
  title: string;
  volumeDisplay: number;
  sets: number;
  x: number;
  y: number;
  barHeight: number;
  barWidth: number;
}

@Component({
  selector: 'app-volume-chart',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="w-full" dir="ltr">
      @if (points().length === 0) {
        <div
          class="flex h-60 items-center justify-center rounded-lg border border-dashed border-zinc-200 bg-zinc-50/60 px-6 text-center text-sm text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900/40 dark:text-zinc-400"
        >
          {{ emptyLabel() }}
        </div>
      } @else {
        <div class="relative">
          <!-- Active Point Readout -->
          <div class="mb-3 flex flex-wrap items-center justify-between gap-2 text-xs text-zinc-600 dark:text-zinc-400">
            @if (activePoint(); as pt) {
              <div class="flex items-center gap-2">
                <span class="font-medium text-zinc-900 dark:text-zinc-100">{{ pt.title }}</span>
                <span aria-hidden="true">·</span>
                <span class="font-mono tabular-nums">{{ pt.fullDate }}</span>
              </div>
              <div class="font-mono tabular-nums font-semibold text-orange-600 dark:text-orange-400">
                {{ pt.volumeDisplay.toLocaleString('en-US') }} {{ unitLabel() ?? unit() }} ({{ pt.sets }} {{ setsLabel() }})
              </div>
            }
          </div>

          <svg
            [attr.viewBox]="'0 0 ' + svgWidth + ' ' + svgHeight"
            class="h-56 w-full overflow-visible select-none"
            role="img"
            [attr.aria-label]="ariaLabel()"
          >
            <!-- Horizontal Gridlines -->
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

            <!-- Trend Polyline -->
            @if (points().length > 1) {
              <polyline
                [attr.points]="trendLinePoints()"
                fill="none"
                class="stroke-orange-500/45 dark:stroke-orange-400/45"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            }

            <!-- Bars + Interactive Targets -->
            @for (pt of points(); track pt.id; let idx = $index) {
              <g>
                <rect
                  [attr.x]="pt.x - pt.barWidth / 2"
                  [attr.y]="pt.y"
                  [attr.width]="pt.barWidth"
                  [attr.height]="pt.barHeight"
                  rx="4"
                  [class]="
                    selectedIdx() === idx
                      ? 'fill-orange-600 dark:fill-orange-500 transition-colors'
                      : 'fill-zinc-800/80 hover:fill-orange-600 dark:fill-zinc-300/80 dark:hover:fill-orange-400 transition-colors cursor-pointer'
                  "
                  tabindex="0"
                  role="button"
                  [attr.aria-label]="pt.title + ' ' + pt.volumeDisplay + ' ' + (unitLabel() ?? unit())"
                  (mouseenter)="hoveredIdx.set(idx)"
                  (mouseleave)="hoveredIdx.set(null)"
                  (focus)="hoveredIdx.set(idx)"
                  (click)="hoveredIdx.set(idx)"
                  (keydown.enter)="hoveredIdx.set(idx)"
                />
                <text
                  [attr.x]="pt.x"
                  [attr.y]="svgHeight - 6"
                  text-anchor="middle"
                  class="fill-zinc-500 dark:fill-zinc-400 font-mono text-[10px]"
                >
                  {{ pt.label }}
                </text>
              </g>
            }
          </svg>
        </div>
      }
    </div>
  `,
})
export class VolumeChartComponent {
  readonly workouts = input.required<WorkoutSession[]>();
  readonly unit = input.required<WeightUnit>();
  readonly unitLabel = input<string | null>(null);
  readonly emptyLabel = input('No workouts in selected timeframe.');
  readonly setsLabel = input('sets');
  readonly ariaLabel = input('Workout volume trend chart');

  readonly hoveredIdx = signal<number | null>(null);

  readonly svgWidth = 600;
  readonly svgHeight = 220;
  readonly padLeft = 48;
  readonly padRight = 16;
  readonly padTop = 14;
  readonly padBottom = 26;

  private readonly chronological = computed(() => {
    return [...this.workouts()]
      .sort((a, b) => a.completedAtIso.localeCompare(b.completedAtIso))
      .slice(-12);
  });

  private readonly maxVol = computed(() => {
    const unit = this.unit();
    const vols = this.chronological().map((w) => convertWeight(w.totalVolumeKg, unit));
    const max = Math.max(...vols, 100);
    return Math.ceil(max / 500) * 500;
  });

  readonly yTicks = computed(() => {
    const max = this.maxVol();
    const chartH = this.svgHeight - this.padTop - this.padBottom;
    return [0, 0.5, 1].map((ratio) => {
      const val = Math.round(max * ratio);
      const y = this.padTop + chartH * (1 - ratio);
      const label = val >= 1000 ? `${(val / 1000).toFixed(1)}k` : `${val}`;
      return {y, label};
    });
  });

  readonly points = computed<VolumePoint[]>(() => {
    const list = this.chronological();
    if (list.length === 0) return [];
    const unit = this.unit();
    const max = this.maxVol();
    const plotW = this.svgWidth - this.padLeft - this.padRight;
    const plotH = this.svgHeight - this.padTop - this.padBottom;
    const step = plotW / list.length;
    const barWidth = Math.min(34, Math.max(12, step * 0.54));

    return list.map((w, i) => {
      const vol = Math.round(convertWeight(w.totalVolumeKg, unit));
      const ratio = max > 0 ? vol / max : 0;
      const barHeight = Math.max(4, ratio * plotH);
      const x = this.padLeft + step * i + step / 2;
      const y = this.padTop + (plotH - barHeight);
      const dateStr = w.completedAtIso.slice(5, 10);
      return {
        id: w.id,
        label: dateStr,
        fullDate: w.completedAtIso.slice(0, 10),
        title: w.title,
        volumeDisplay: vol,
        sets: w.completedSetsCount,
        x,
        y,
        barHeight,
        barWidth,
      };
    });
  });

  readonly trendLinePoints = computed(() => {
    return this.points()
      .map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`)
      .join(' ');
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
}
