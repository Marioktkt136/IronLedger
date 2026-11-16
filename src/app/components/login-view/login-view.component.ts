import {ChangeDetectionStrategy, Component, inject} from '@angular/core';
import {GymStoreService} from '../../core/gym-store.service';
import {I18nService} from '../../core/i18n.service';
import {ThemeService} from '../../core/theme.service';

@Component({
  selector: 'app-login-view',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="flex min-h-screen flex-col justify-between bg-zinc-50 px-4 py-6 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100 sm:px-6"
    >
      <!-- Top Utility Bar -->
      <header class="mx-auto flex w-full max-w-md items-center justify-between gap-3">
        <div class="flex items-center gap-2.5">
          <span
            class="flex h-9 w-9 items-center justify-center rounded-lg bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
            aria-hidden="true"
          >
            <span class="material-icons text-lg">fitness_center</span>
          </span>
          <span class="font-display text-lg font-bold tracking-tight">
            {{ i18n.t().appName }}
          </span>
        </div>

        <div class="flex items-center gap-2 shrink-0">
          <button
            type="button"
            (click)="toggleLanguage()"
            class="flex h-9 items-center justify-center rounded-lg border border-zinc-200 bg-white px-3 text-xs font-semibold text-zinc-700 hover:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800 whitespace-nowrap"
            [attr.aria-label]="i18n.lang() === 'en' ? i18n.t().switchToArabic : i18n.t().switchToEnglish"
          >
            {{ i18n.lang() === 'en' ? i18n.t().switchToArabic : i18n.t().switchToEnglish }}
          </button>

          <button
            type="button"
            (click)="toggleTheme()"
            class="flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
            [attr.aria-label]="theme.theme() === 'light' ? i18n.t().themeDark : i18n.t().themeLight"
          >
            <span class="material-icons text-lg" aria-hidden="true">
              {{ theme.theme() === 'light' ? 'dark_mode' : 'light_mode' }}
            </span>
          </button>
        </div>
      </header>

      <!-- Centered Login Card -->
      <main class="mx-auto my-8 w-full max-w-md">
        <section
          class="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 sm:p-8"
          aria-labelledby="login-view-title"
        >
          <div class="inline-flex items-center gap-1.5 rounded-md border border-zinc-200 bg-zinc-50 px-2.5 py-1 text-xs font-medium text-zinc-700 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300">
            <span class="material-icons text-sm text-orange-600 dark:text-orange-400" aria-hidden="true">verified_user</span>
            <span>{{ i18n.t().loginBadge }}</span>
          </div>

          <h1
            id="login-view-title"
            class="mt-4 font-display text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100"
          >
            {{ i18n.t().loginTitle }}
          </h1>
          <p class="mt-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
            {{ i18n.t().loginSubtitle }}
          </p>

          @if (store.authError()) {
            <div
              role="alert"
              class="mt-4 rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs font-medium text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300"
            >
              {{ store.authError() }}
            </div>
          }

          <div class="mt-6 space-y-3">
            @if (!store.authReady()) {
              <div class="flex items-center gap-2.5 rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-xs font-medium text-zinc-600 dark:border-zinc-800 dark:bg-zinc-950/60 dark:text-zinc-400">
                <span class="material-icons animate-spin text-base" aria-hidden="true">sync</span>
                <span>{{ i18n.t().loginCheckingSession }}</span>
              </div>
            }

            @if (store.user(); as currentUser) {
              <div class="rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-950/60">
                <p class="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                  {{ i18n.t().signedInAs }}
                </p>
                <p class="mt-0.5 truncate text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                  {{ currentUser.displayName || currentUser.email }}
                </p>
                @if (currentUser.email) {
                  <p class="truncate text-xs text-zinc-500 dark:text-zinc-400">
                    {{ currentUser.email }}
                  </p>
                }

                <button
                  type="button"
                  (click)="store.enterCurrentAccount()"
                  [disabled]="store.authBusy()"
                  class="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-orange-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-orange-700 disabled:opacity-60 dark:bg-orange-500 dark:hover:bg-orange-600"
                >
                  <span class="material-icons text-base" aria-hidden="true">login</span>
                  <span class="truncate">
                    {{ i18n.t().loginContinueAs }} {{ currentUser.displayName || currentUser.email }}
                  </span>
                </button>
              </div>

              <div class="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <button
                  type="button"
                  (click)="store.switchAccount()"
                  [disabled]="store.authBusy()"
                  class="flex items-center justify-center gap-1.5 rounded-lg border border-zinc-300 bg-white px-3 py-2.5 text-xs font-semibold text-zinc-800 hover:bg-zinc-100 disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
                >
                  <span class="material-icons text-base" aria-hidden="true">manage_accounts</span>
                  <span>{{ i18n.t().loginUseAnotherAccount }}</span>
                </button>

                <button
                  type="button"
                  (click)="store.signOut()"
                  [disabled]="store.authBusy()"
                  class="flex items-center justify-center gap-1.5 rounded-lg border border-zinc-300 bg-white px-3 py-2.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-100 disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
                >
                  <span class="material-icons text-base" aria-hidden="true">logout</span>
                  <span>{{ i18n.t().signOut }}</span>
                </button>
              </div>
            } @else {
              <button
                type="button"
                (click)="store.signInWithGoogle()"
                [disabled]="store.authBusy() || !store.authReady()"
                class="flex w-full items-center justify-center gap-2 rounded-lg bg-orange-600 px-4 py-3 text-sm font-semibold text-white hover:bg-orange-700 disabled:opacity-60 dark:bg-orange-500 dark:hover:bg-orange-600"
              >
                <span class="material-icons text-lg" aria-hidden="true">account_circle</span>
                <span>{{ i18n.t().loginEnterAccountBtn }}</span>
              </button>
            }
          </div>

          <div class="mt-6 space-y-2.5 border-t border-zinc-200 pt-5 dark:border-zinc-800">
            <div class="flex items-start gap-2.5 text-xs leading-relaxed text-zinc-600 dark:text-zinc-400">
              <span class="material-icons mt-0.5 text-base shrink-0 text-zinc-500 dark:text-zinc-400" aria-hidden="true">lock</span>
              <span>{{ i18n.t().loginIsolatedNote }}</span>
            </div>
            <div class="flex items-start gap-2.5 text-xs leading-relaxed text-zinc-600 dark:text-zinc-400">
              <span class="material-icons mt-0.5 text-base shrink-0 text-zinc-500 dark:text-zinc-400" aria-hidden="true">restart_alt</span>
              <span>{{ i18n.t().loginNewAccountNote }}</span>
            </div>
          </div>
        </section>
      </main>

      <footer class="mx-auto w-full max-w-md text-center text-xs text-zinc-500 dark:text-zinc-500">
        {{ i18n.t().appName }}
      </footer>
    </div>
  `,
})
export class LoginViewComponent {
  readonly store = inject(GymStoreService);
  readonly i18n = inject(I18nService);
  readonly theme = inject(ThemeService);

  toggleLanguage(): void {
    const next = this.i18n.toggleLanguage();
    void this.store.updatePreferences({language: next});
  }

  toggleTheme(): void {
    const next = this.theme.toggleTheme();
    void this.store.updatePreferences({theme: next});
  }
}
