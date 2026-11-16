import {ChangeDetectionStrategy, Component, computed, inject, signal} from '@angular/core';
import {FormControl, FormGroup, ReactiveFormsModule} from '@angular/forms';
import {calculateBmi, validateInitialBodySetup} from '../../core/fitness-math';
import {GymStoreService} from '../../core/gym-store.service';
import {I18nService} from '../../core/i18n.service';
import {FitnessGoal} from '../../core/models';
import {ThemeService} from '../../core/theme.service';

@Component({
  selector: 'app-body-setup-modal',
  imports: [ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/70 p-4 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-labelledby="body-setup-title"
    >
      <div
        class="max-h-[92vh] w-full max-w-md overflow-y-auto rounded-2xl border border-zinc-200 bg-white p-6 text-zinc-900 shadow-xl dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100"
      >
        <!-- Top Utility Bar: Brand + Language + Theme -->
        <div class="flex items-center justify-between gap-3 border-b border-zinc-200 pb-4 dark:border-zinc-800">
          <span class="font-display text-lg font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
            {{ i18n.t().appName }}
          </span>
          <div class="flex items-center gap-2">
            <button
              type="button"
              (click)="toggleLanguage()"
              class="flex h-9 items-center justify-center rounded-lg border border-zinc-200 px-2.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-100 dark:border-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-800 whitespace-nowrap"
            >
              {{ i18n.lang() === 'en' ? i18n.t().switchToArabic : i18n.t().switchToEnglish }}
            </button>
            <button
              type="button"
              (click)="toggleTheme()"
              class="flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-200 text-zinc-700 hover:bg-zinc-100 dark:border-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-800"
              [attr.aria-label]="theme.theme() === 'light' ? i18n.t().themeDark : i18n.t().themeLight"
            >
              <span class="material-icons text-lg" aria-hidden="true">
                {{ theme.theme() === 'light' ? 'dark_mode' : 'light_mode' }}
              </span>
            </button>
          </div>
        </div>

        <div class="mt-5">
          <h1 id="body-setup-title" class="font-display text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
            {{ i18n.t().setupTitle }}
          </h1>
          <p class="mt-1.5 text-sm text-zinc-600 dark:text-zinc-400">
            {{ i18n.t().setupSubtitle }}
          </p>
        </div>

        <form [formGroup]="setupForm" (ngSubmit)="submit()" class="mt-5 space-y-4">
          <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label for="setup-height" class="mb-1.5 block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                {{ i18n.t().setupHeightLabel }}
              </label>
              <input
                id="setup-height"
                type="number"
                step="0.5"
                min="100"
                max="250"
                required
                formControlName="heightCm"
                (input)="syncPreview()"
                [placeholder]="i18n.t().setupHeightPlaceholder"
                class="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2.5 font-mono text-sm tabular-nums text-zinc-900 focus:border-orange-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
              />
            </div>

            <div>
              <label for="setup-weight" class="mb-1.5 block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                {{ i18n.t().setupWeightLabel }}
              </label>
              <input
                id="setup-weight"
                type="number"
                step="0.1"
                min="20"
                max="400"
                required
                formControlName="weightKg"
                (input)="syncPreview()"
                [placeholder]="i18n.t().setupWeightPlaceholder"
                class="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2.5 font-mono text-sm tabular-nums text-zinc-900 focus:border-orange-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
              />
            </div>
          </div>

          <div>
            <label for="setup-goal" class="mb-1.5 block text-xs font-medium text-zinc-700 dark:text-zinc-300">
              {{ i18n.t().setupGoalLabel }}
            </label>
            <select
              id="setup-goal"
              formControlName="goal"
              class="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2.5 text-sm text-zinc-900 focus:border-orange-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
            >
              @for (g of goalOptions; track g) {
                <option [value]="g">{{ i18n.t().goals[g] }}</option>
              }
            </select>
          </div>

          @if (previewBmi(); as bmi) {
            <div class="flex items-center justify-between rounded-lg border border-zinc-200 bg-zinc-50 px-3.5 py-2.5 text-xs dark:border-zinc-800 dark:bg-zinc-950/60">
              <span class="font-medium text-zinc-600 dark:text-zinc-400">{{ i18n.t().setupBmiPreview }}</span>
              <span class="font-mono text-sm font-semibold tabular-nums text-zinc-900 dark:text-zinc-100">{{ bmi }}</span>
            </div>
          }

          @if (formError()) {
            <p class="text-xs font-medium text-red-600 dark:text-red-400">{{ formError() }}</p>
          }

          <button
            type="submit"
            [disabled]="saving()"
            class="flex w-full items-center justify-center gap-2 rounded-lg bg-orange-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-orange-700 disabled:opacity-60 dark:bg-orange-500 dark:hover:bg-orange-600"
          >
            <span class="material-icons text-base" aria-hidden="true">check_circle</span>
            {{ i18n.t().setupSubmitBtn }}
          </button>
        </form>

        @if (store.user(); as currentUser) {
          <div class="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-zinc-200 pt-4 text-xs dark:border-zinc-800">
            <span class="truncate text-zinc-500 dark:text-zinc-400">
              {{ currentUser.email || currentUser.displayName }}
            </span>
            <button
              type="button"
              (click)="store.switchAccount()"
              [disabled]="store.authBusy()"
              class="inline-flex items-center gap-1 font-medium text-zinc-700 hover:text-orange-600 dark:text-zinc-300 dark:hover:text-orange-400 whitespace-nowrap"
            >
              <span class="material-icons text-sm" aria-hidden="true">manage_accounts</span>
              {{ i18n.t().switchAccountBtn }}
            </button>
          </div>
        } @else {
          <div class="mt-4 border-t border-zinc-200 pt-4 text-center dark:border-zinc-800">
            <button
              type="button"
              (click)="store.signInWithGoogle()"
              [disabled]="store.authBusy()"
              class="inline-flex items-center gap-1.5 text-xs font-medium text-zinc-600 hover:text-orange-600 dark:text-zinc-400 dark:hover:text-orange-400"
            >
              <span class="material-icons text-sm" aria-hidden="true">cloud_upload</span>
              {{ i18n.t().setupOrSignIn }}
            </button>
          </div>
        }
      </div>
    </div>
  `,
})
export class BodySetupModalComponent {
  readonly store = inject(GymStoreService);
  readonly i18n = inject(I18nService);
  readonly theme = inject(ThemeService);

  readonly goalOptions: FitnessGoal[] = ['strength', 'hypertrophy', 'fat_loss', 'endurance', 'general'];
  readonly formError = signal<string | null>(null);
  readonly saving = signal(false);

  private readonly heightPreview = signal<number | null>(null);
  private readonly weightPreview = signal<number | null>(null);

  readonly previewBmi = computed(() => {
    const h = this.heightPreview();
    const w = this.weightPreview();
    if (h === null || w === null || h < 100 || h > 250 || w < 20 || w > 400) return null;
    return calculateBmi(w, h);
  });

  readonly setupForm = new FormGroup({
    heightCm: new FormControl<number | null>(this.store.preferences().heightCm ?? null),
    weightKg: new FormControl<number | null>(this.store.latestMeasurement()?.weightKg ?? null),
    goal: new FormControl<FitnessGoal>(this.store.preferences().goal, {nonNullable: true}),
  });

  constructor() {
    this.syncPreview();
  }

  syncPreview(): void {
    const hRaw = this.setupForm.controls.heightCm.value;
    const wRaw = this.setupForm.controls.weightKg.value;
    this.heightPreview.set(hRaw !== null && Number.isFinite(Number(hRaw)) ? Number(hRaw) : null);
    this.weightPreview.set(wRaw !== null && Number.isFinite(Number(wRaw)) ? Number(wRaw) : null);
  }

  toggleLanguage(): void {
    const next = this.i18n.toggleLanguage();
    void this.store.updatePreferences({language: next});
  }

  toggleTheme(): void {
    const next = this.theme.toggleTheme();
    void this.store.updatePreferences({theme: next});
  }

  async submit(): Promise<void> {
    const hRaw = this.setupForm.controls.heightCm.value;
    const wRaw = this.setupForm.controls.weightKg.value;

    const validation = validateInitialBodySetup({
      heightCm: hRaw !== null && String(hRaw).trim() !== '' ? Number(hRaw) : null,
      weightKg: wRaw !== null && String(wRaw).trim() !== '' ? Number(wRaw) : null,
    });

    if (!validation.valid || validation.heightCm === undefined || validation.weightKg === undefined) {
      const key = validation.errorKeys[0] as keyof ReturnType<typeof this.i18n.t>;
      this.formError.set(String(this.i18n.t()[key] ?? this.i18n.t().val_invalid_weight));
      return;
    }

    this.formError.set(null);
    this.saving.set(true);
    try {
      await this.store.completeInitialBodySetup({
        heightCm: validation.heightCm,
        weightKg: validation.weightKg,
        goal: this.setupForm.controls.goal.value,
      });
    } finally {
      this.saving.set(false);
    }
  }
}
