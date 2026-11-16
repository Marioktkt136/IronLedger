import {ChangeDetectionStrategy, Component, effect, inject, output, signal} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {convertInputToKg, convertWeight, roundTo} from '../../core/fitness-math';
import {GymStoreService} from '../../core/gym-store.service';
import {I18nService} from '../../core/i18n.service';
import {BLUEPRINT_LIMITS, FitnessGoal, LanguageCode, ThemeMode, WeightUnit} from '../../core/models';

@Component({
  selector: 'app-account-modal',
  imports: [FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/60 p-4 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-labelledby="account-modal-title"
    >
      <div
        class="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-xl border border-zinc-200 bg-white p-6 text-zinc-900 shadow-xl dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100"
      >
        <div class="flex items-center justify-between gap-4 border-b border-zinc-200 pb-4 dark:border-zinc-800">
          <h2 id="account-modal-title" class="font-display text-lg font-bold tracking-tight">
            {{ i18n.t().accountModalTitle }}
          </h2>
          <button
            type="button"
            (click)="closed.emit()"
            class="flex h-10 w-10 items-center justify-center rounded-lg border border-zinc-200 text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:border-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
            [attr.aria-label]="i18n.t().closeModal"
          >
            <span class="material-icons text-xl" aria-hidden="true">close</span>
          </button>
        </div>

        <div class="mt-5 space-y-6">
          <!-- Cloud Account -->
          <section class="space-y-3">
            <h3 class="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              {{ i18n.t().cloudAccountSection }}
            </h3>
            @if (store.user(); as currentUser) {
              <div class="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-950/60">
                <div class="min-w-0">
                  <p class="text-xs text-zinc-500 dark:text-zinc-400">{{ i18n.t().signedInAs }}</p>
                  <p class="truncate text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                    {{ currentUser.displayName || currentUser.email }}
                  </p>
                  <p class="truncate font-mono text-xs text-zinc-500 dark:text-zinc-400">
                    {{ currentUser.email }}
                  </p>
                  <p class="mt-1 text-[11px] text-emerald-700 dark:text-emerald-400">
                    {{ i18n.t().isolatedAccountHint }}
                  </p>
                </div>
                <div class="flex flex-wrap items-center gap-2 shrink-0">
                  <button
                    type="button"
                    (click)="onSwitchAccount()"
                    [disabled]="store.authBusy()"
                    class="inline-flex items-center gap-1.5 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-xs font-medium text-zinc-800 hover:bg-zinc-100 disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800 whitespace-nowrap"
                  >
                    <span class="material-icons text-sm" aria-hidden="true">manage_accounts</span>
                    {{ i18n.t().switchAccountBtn }}
                  </button>
                  <button
                    type="button"
                    (click)="onSignOut()"
                    [disabled]="store.authBusy()"
                    class="inline-flex items-center gap-1.5 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-xs font-medium text-zinc-800 hover:bg-zinc-100 disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800 whitespace-nowrap"
                  >
                    <span class="material-icons text-sm" aria-hidden="true">logout</span>
                    {{ i18n.t().signOut }}
                  </button>
                </div>
              </div>
              @if (store.authError()) {
                <div class="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200">
                  <p class="font-medium">{{ store.authError() }}</p>
                  @if (store.authPopupBlocked() && store.isInsideIframe() && store.currentAppUrl()) {
                    <a
                      [href]="store.currentAppUrl()"
                      target="_blank"
                      rel="noopener noreferrer"
                      class="mt-2 inline-flex items-center gap-1.5 rounded-md border border-red-300 bg-white px-2.5 py-1 font-semibold text-red-800 hover:bg-red-100 dark:border-red-800 dark:bg-zinc-900 dark:text-red-200"
                    >
                      <span class="material-icons text-sm" aria-hidden="true">open_in_new</span>
                      <span>{{ i18n.t().authOpenInNewTab }}</span>
                    </a>
                  }
                </div>
              }
            } @else {
              <div class="rounded-lg border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-950/60">
                <p class="text-sm text-zinc-600 dark:text-zinc-400">
                  {{ i18n.t().notSignedInDesc }}
                </p>
                @if (store.authError()) {
                  <p class="mt-2 text-xs font-medium text-red-600 dark:text-red-400">
                    {{ store.authError() }}
                  </p>
                }
                <button
                  type="button"
                  (click)="store.signInWithGoogle()"
                  [disabled]="store.authBusy()"
                  class="mt-3 inline-flex items-center gap-2 rounded-lg bg-orange-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-orange-700 disabled:opacity-50 dark:bg-orange-500 dark:hover:bg-orange-600 whitespace-nowrap"
                >
                  <span class="material-icons text-base" aria-hidden="true">cloud_upload</span>
                  {{ i18n.t().signInGoogle }}
                </button>
              </div>
            }
          </section>

          <!-- Offline Persistence & Sync -->
          <section class="space-y-3 border-t border-zinc-200 pt-5 dark:border-zinc-800">
            <h3 class="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              {{ i18n.t().offlineSyncSection }}
            </h3>
            <div class="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
              <div class="max-w-sm space-y-1">
                <div class="flex items-center gap-2 text-sm font-medium">
                  <span>{{ store.offlineModeEnabled() || !store.isOnline() ? i18n.t().offlineToggleOn : i18n.t().offlineToggleOff }}</span>
                  <span aria-hidden="true">·</span>
                  <span class="font-mono text-xs tabular-nums text-zinc-500 dark:text-zinc-400">
                    {{ i18n.t().pendingWritesLabel }}: {{ store.pendingQueue().length + (store.hasPendingCloudWrites() ? 1 : 0) }}
                  </span>
                </div>
                <p class="text-xs text-zinc-500 dark:text-zinc-400">
                  {{ i18n.t().offlineModeDesc }}
                </p>
              </div>
              <button
                type="button"
                (click)="store.toggleOfflineMode()"
                class="rounded-lg border border-zinc-300 px-3.5 py-2 text-xs font-medium text-zinc-800 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800 whitespace-nowrap shrink-0"
              >
                {{ store.offlineModeEnabled() ? i18n.t().goOnline : i18n.t().goOffline }}
              </button>
            </div>
          </section>

          <!-- Profile & Training Preferences -->
          <section class="space-y-4 border-t border-zinc-200 pt-5 dark:border-zinc-800">
            <h3 class="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              {{ i18n.t().preferencesSection }}
            </h3>

            <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label for="pref-height" class="mb-1.5 block text-xs font-medium text-zinc-600 dark:text-zinc-400">
                  {{ i18n.t().setupHeightLabel }}
                </label>
                <input
                  id="pref-height"
                  type="number"
                  step="0.5"
                  min="100"
                  max="250"
                  [ngModel]="heightCmDraft()"
                  (ngModelChange)="heightCmDraft.set($event)"
                  [placeholder]="i18n.t().setupHeightPlaceholder"
                  class="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 font-mono text-sm tabular-nums text-zinc-900 focus:border-orange-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                />
              </div>

              <div>
                <label for="pref-target-weight" class="mb-1.5 block text-xs font-medium text-zinc-600 dark:text-zinc-400">
                  {{ i18n.t().targetWeightLabel }} ({{ i18n.unitLabel(unitDraft()) }})
                </label>
                <input
                  id="pref-target-weight"
                  type="number"
                  step="0.1"
                  min="20"
                  max="880"
                  [ngModel]="targetWeightDisplay()"
                  (ngModelChange)="targetWeightDisplay.set($event)"
                  [placeholder]="i18n.t().targetWeightPlaceholder"
                  class="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 font-mono text-sm tabular-nums text-zinc-900 focus:border-orange-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                />
              </div>

              <div>
                <label for="pref-goal" class="mb-1.5 block text-xs font-medium text-zinc-600 dark:text-zinc-400">
                  {{ i18n.t().fitnessGoalLabel }}
                </label>
                <select
                  id="pref-goal"
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
                <span class="mb-1.5 block text-xs font-medium text-zinc-600 dark:text-zinc-400">
                  {{ i18n.t().preferredUnitLabel }}
                </span>
                <div class="grid grid-cols-2 gap-1 rounded-lg bg-zinc-100 p-1 dark:bg-zinc-950">
                  @for (u of unitOptions; track u) {
                    <button
                      type="button"
                      (click)="onUnitSwitch(u)"
                      [class]="
                        unitDraft() === u
                          ? 'rounded-md bg-white py-1.5 text-xs font-semibold text-zinc-900 shadow-xs dark:bg-zinc-800 dark:text-zinc-100'
                          : 'rounded-md py-1.5 text-xs font-medium text-zinc-600 dark:text-zinc-400'
                      "
                    >
                      {{ i18n.unitLabel(u) }}
                    </button>
                  }
                </div>
              </div>

              <div>
                <span class="mb-1.5 block text-xs font-medium text-zinc-600 dark:text-zinc-400">
                  {{ i18n.t().themeLabel }}
                </span>
                <div class="grid grid-cols-2 gap-1 rounded-lg bg-zinc-100 p-1 dark:bg-zinc-950">
                  @for (th of themeOptions; track th) {
                    <button
                      type="button"
                      (click)="themeDraft.set(th)"
                      [class]="
                        themeDraft() === th
                          ? 'rounded-md bg-white py-1.5 text-xs font-semibold text-zinc-900 shadow-xs dark:bg-zinc-800 dark:text-zinc-100'
                          : 'rounded-md py-1.5 text-xs font-medium text-zinc-600 dark:text-zinc-400'
                      "
                    >
                      {{ th === 'light' ? i18n.t().themeLight : i18n.t().themeDark }}
                    </button>
                  }
                </div>
              </div>

              <div>
                <span class="mb-1.5 block text-xs font-medium text-zinc-600 dark:text-zinc-400">
                  {{ i18n.t().languageLabel }}
                </span>
                <div class="grid grid-cols-2 gap-1 rounded-lg bg-zinc-100 p-1 dark:bg-zinc-950">
                  <button
                    type="button"
                    (click)="langDraft.set('en')"
                    [class]="
                      langDraft() === 'en'
                        ? 'rounded-md bg-white py-1.5 text-xs font-semibold text-zinc-900 shadow-xs dark:bg-zinc-800 dark:text-zinc-100'
                        : 'rounded-md py-1.5 text-xs font-medium text-zinc-600 dark:text-zinc-400'
                    "
                  >
                    English
                  </button>
                  <button
                    type="button"
                    (click)="langDraft.set('ar')"
                    [class]="
                      langDraft() === 'ar'
                        ? 'rounded-md bg-white py-1.5 text-xs font-semibold text-zinc-900 shadow-xs dark:bg-zinc-800 dark:text-zinc-100'
                        : 'rounded-md py-1.5 text-xs font-medium text-zinc-600 dark:text-zinc-400'
                    "
                  >
                    العربية
                  </button>
                </div>
              </div>
            </div>

            @if (prefError()) {
              <p class="text-xs font-medium text-red-600 dark:text-red-400">{{ prefError() }}</p>
            }

            <div class="flex justify-end pt-1">
              <button
                type="button"
                (click)="savePreferences()"
                class="rounded-lg bg-orange-600 px-4 py-2 text-sm font-medium text-white hover:bg-orange-700 dark:bg-orange-500 dark:hover:bg-orange-600 whitespace-nowrap"
              >
                {{ i18n.t().saveBtn }}
              </button>
            </div>
          </section>

          <!-- Data Management -->
          <section class="space-y-3 border-t border-zinc-200 pt-5 dark:border-zinc-800">
            <h3 class="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              {{ i18n.t().dataManagementSection }}
            </h3>
            <p class="text-xs text-zinc-500 dark:text-zinc-400">
              {{ i18n.t().resetAllDataDesc }}
            </p>
            <div class="flex flex-wrap items-center gap-3">
              <button
                type="button"
                (click)="downloadJson()"
                class="rounded-lg border border-zinc-300 px-3.5 py-2 text-xs font-medium text-zinc-800 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800 whitespace-nowrap"
              >
                {{ i18n.t().exportAllJson }}
              </button>

              @if (!confirmReset()) {
                <button
                  type="button"
                  (click)="confirmReset.set(true)"
                  class="rounded-lg border border-red-300 px-3.5 py-2 text-xs font-medium text-red-700 hover:bg-red-50 dark:border-red-900/60 dark:text-red-400 dark:hover:bg-red-950/40 whitespace-nowrap"
                >
                  {{ i18n.t().resetAllDataBtn }}
                </button>
              } @else {
                <button
                  type="button"
                  (click)="resetAll()"
                  class="rounded-lg bg-red-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-red-700 whitespace-nowrap"
                >
                  {{ i18n.t().resetAllDataConfirm }}
                </button>
                <button
                  type="button"
                  (click)="confirmReset.set(false)"
                  class="rounded-lg border border-zinc-300 px-3 py-2 text-xs font-medium text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800 whitespace-nowrap"
                >
                  {{ i18n.t().cancelBtn }}
                </button>
              }
            </div>
          </section>
        </div>
      </div>
    </div>
  `,
})
export class AccountModalComponent {
  readonly store = inject(GymStoreService);
  readonly i18n = inject(I18nService);
  readonly closed = output<void>();

  readonly goalOptions: FitnessGoal[] = ['strength', 'hypertrophy', 'fat_loss', 'endurance', 'general'];
  readonly unitOptions: WeightUnit[] = ['kg', 'lbs'];
  readonly themeOptions: ThemeMode[] = ['light', 'dark'];

  readonly goalDraft = signal<FitnessGoal>('hypertrophy');
  readonly unitDraft = signal<WeightUnit>('kg');
  readonly langDraft = signal<LanguageCode>('en');
  readonly themeDraft = signal<ThemeMode>('light');
  readonly heightCmDraft = signal<number | null>(null);
  readonly targetWeightDisplay = signal<number | null>(null);
  readonly prefError = signal<string | null>(null);
  readonly confirmReset = signal(false);

  constructor() {
    effect(() => {
      const p = this.store.preferences();
      this.goalDraft.set(p.goal);
      this.unitDraft.set(p.preferredUnit);
      this.langDraft.set(p.language);
      this.themeDraft.set(p.theme);
      this.heightCmDraft.set(p.heightCm ?? null);
      this.targetWeightDisplay.set(
        p.targetWeightKg !== undefined ? convertWeight(p.targetWeightKg, p.preferredUnit) : null,
      );
    });
  }

  onUnitSwitch(nextUnit: WeightUnit): void {
    const prevUnit = this.unitDraft();
    if (prevUnit === nextUnit) return;
    const currentVal = this.targetWeightDisplay();
    if (currentVal !== null && Number.isFinite(currentVal)) {
      const asKg = convertInputToKg(currentVal, prevUnit);
      this.targetWeightDisplay.set(convertWeight(asKg, nextUnit));
    }
    this.unitDraft.set(nextUnit);
  }

  async savePreferences(): Promise<void> {
    const rawH = this.heightCmDraft();
    let heightCm: number | undefined = undefined;
    if (rawH !== null && String(rawH).trim() !== '') {
      const h = Number(rawH);
      if (!Number.isFinite(h) || h < BLUEPRINT_LIMITS.heightMinCm || h > BLUEPRINT_LIMITS.heightMaxCm) {
        this.prefError.set(this.i18n.t().val_invalid_height);
        return;
      }
      heightCm = roundTo(h, 1);
    }

    const unit = this.unitDraft();
    const rawTarget = this.targetWeightDisplay();
    let targetWeightKg: number | undefined = undefined;
    if (rawTarget !== null && String(rawTarget).trim() !== '' && Number.isFinite(Number(rawTarget))) {
      const kg = convertInputToKg(Number(rawTarget), unit);
      if (kg < BLUEPRINT_LIMITS.weightMinKg || kg > BLUEPRINT_LIMITS.weightMaxKg) {
        this.prefError.set(this.i18n.t().val_invalid_weight);
        return;
      }
      targetWeightKg = kg;
    }

    this.prefError.set(null);
    await this.store.updatePreferences({
      goal: this.goalDraft(),
      preferredUnit: unit,
      language: this.langDraft(),
      theme: this.themeDraft(),
      heightCm,
      targetWeightKg,
    });
    this.closed.emit();
  }

  downloadJson(): void {
    const json = this.store.exportAllDataJson();
    const blob = new Blob([json], {type: 'application/json'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ironledger-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async resetAll(): Promise<void> {
    await this.store.resetAllData();
    this.confirmReset.set(false);
    this.closed.emit();
  }

  async onSwitchAccount(): Promise<void> {
    await this.store.switchAccount();
    if (!this.store.authError()) {
      this.closed.emit();
    }
  }

  async onSignOut(): Promise<void> {
    await this.store.signOut();
    this.closed.emit();
  }
}

