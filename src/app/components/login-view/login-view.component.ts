import {ChangeDetectionStrategy, Component, inject, signal} from '@angular/core';
import {FormControl, FormGroup, ReactiveFormsModule} from '@angular/forms';
import {GymStoreService} from '../../core/gym-store.service';
import {I18nService} from '../../core/i18n.service';
import {ThemeService} from '../../core/theme.service';

const CONSOLE_AUTH_PROVIDERS_URL =
  'https://console.firebase.google.com/project/gen-lang-client-0406940693/authentication/providers';

type AuthValidationKey =
  | 'val_auth_name'
  | 'val_auth_email'
  | 'val_auth_password'
  | 'val_auth_password_mismatch';

@Component({
  selector: 'app-login-view',
  imports: [ReactiveFormsModule],
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

        <div class="flex shrink-0 items-center gap-2">
          <button
            type="button"
            (click)="toggleLanguage()"
            class="flex h-9 items-center justify-center whitespace-nowrap rounded-lg border border-zinc-200 bg-white px-3 text-xs font-semibold text-zinc-700 hover:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
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

          @if (!store.authReady()) {
            <div class="mt-4 flex items-center gap-2.5 rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-xs font-medium text-zinc-600 dark:border-zinc-800 dark:bg-zinc-950/60 dark:text-zinc-400">
              <span class="material-icons animate-spin text-base" aria-hidden="true">sync</span>
              <span>{{ i18n.t().loginCheckingSession }}</span>
            </div>
          }

          @if (store.user(); as currentUser) {
            <div class="mt-5 rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-950/60">
              <div class="flex items-start justify-between gap-3">
                <div class="min-w-0">
                  <p class="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                    {{ i18n.t().signedInAs }}
                  </p>
                  <p class="mt-0.5 truncate text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                    {{ currentUser.displayName || currentUser.email }}
                  </p>
                  @if (currentUser.email) {
                    <p class="truncate font-mono text-xs text-zinc-500 dark:text-zinc-400">
                      {{ currentUser.email }}
                    </p>
                  }
                </div>
                <button
                  type="button"
                  (click)="store.signOut()"
                  [disabled]="store.authBusy()"
                  class="inline-flex shrink-0 items-center gap-1 rounded-lg border border-zinc-300 bg-white px-2.5 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-100 disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
                >
                  <span class="material-icons text-sm" aria-hidden="true">logout</span>
                  <span>{{ i18n.t().signOut }}</span>
                </button>
              </div>

              <button
                type="button"
                (click)="store.enterCurrentAccount()"
                [disabled]="store.authBusy()"
                class="mt-3 flex w-full items-center justify-center gap-2 rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-zinc-800 disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
              >
                <span class="material-icons text-base" aria-hidden="true">login</span>
                <span class="truncate">
                  {{ i18n.t().loginContinueAs }} {{ currentUser.displayName || currentUser.email }}
                </span>
              </button>
            </div>
          }

          <!-- Mode Tabs: Sign In vs Create Account -->
          <div
            class="mt-5 grid grid-cols-2 gap-1 rounded-xl bg-zinc-100 p-1 dark:bg-zinc-950"
            role="tablist"
            [attr.aria-label]="i18n.t().loginTitle"
          >
            <button
              type="button"
              role="tab"
              [attr.aria-selected]="authMode() === 'signin'"
              (click)="setMode('signin')"
              [class]="
                authMode() === 'signin'
                  ? 'rounded-lg bg-white py-2 text-xs font-semibold text-zinc-900 shadow-xs dark:bg-zinc-800 dark:text-zinc-100'
                  : 'rounded-lg py-2 text-xs font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200'
              "
            >
              {{ i18n.t().loginTabSignIn }}
            </button>
            <button
              type="button"
              role="tab"
              [attr.aria-selected]="authMode() === 'signup'"
              (click)="setMode('signup')"
              [class]="
                authMode() === 'signup'
                  ? 'rounded-lg bg-white py-2 text-xs font-semibold text-zinc-900 shadow-xs dark:bg-zinc-800 dark:text-zinc-100'
                  : 'rounded-lg py-2 text-xs font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200'
              "
            >
              {{ i18n.t().loginTabSignUp }}
            </button>
          </div>

          @if (store.authNotice()) {
            <div
              role="status"
              class="mt-4 flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3.5 text-xs font-medium text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-200"
            >
              <span class="material-icons mt-0.5 shrink-0 text-base" aria-hidden="true">check_circle</span>
              <span>{{ store.authNotice() }}</span>
            </div>
          }

          @if (localValidationMessage() || store.authError()) {
            <div
              role="alert"
              class="mt-4 rounded-xl border border-red-200 bg-red-50 p-3.5 text-xs text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200"
            >
              <p class="font-medium leading-relaxed">{{ localValidationMessage() || store.authError() }}</p>
              @if (store.authProviderNeedsSetup() && !localValidationMessage()) {
                <a
                  [href]="consoleProvidersUrl"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="mt-2.5 inline-flex items-center gap-1.5 rounded-lg border border-red-300 bg-white px-3 py-1.5 font-semibold text-red-800 hover:bg-red-100 dark:border-red-800 dark:bg-zinc-900 dark:text-red-200 dark:hover:bg-red-950/60"
                >
                  <span class="material-icons text-sm" aria-hidden="true">open_in_new</span>
                  <span>{{ i18n.t().loginConsoleProviderLink }}</span>
                </a>
              }
            </div>
          }

          <!-- Manual Email & Password Form -->
          <form [formGroup]="loginForm" (ngSubmit)="submitForm()" class="mt-5 space-y-4">
            @if (authMode() === 'signup') {
              <div>
                <label for="auth-name" class="mb-1.5 block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                  {{ i18n.t().loginNameLabel }}
                </label>
                <input
                  id="auth-name"
                  type="text"
                  autocomplete="name"
                  formControlName="displayName"
                  [placeholder]="i18n.t().loginNamePlaceholder"
                  class="w-full rounded-lg border border-zinc-300 bg-white px-3.5 py-2.5 text-sm text-zinc-900 focus:border-orange-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                />
              </div>
            }

            <div>
              <label for="auth-email" class="mb-1.5 block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                {{ i18n.t().loginEmailLabel }}
              </label>
              <input
                id="auth-email"
                type="email"
                dir="ltr"
                autocomplete="email"
                formControlName="email"
                [placeholder]="i18n.t().loginEmailPlaceholder"
                class="w-full rounded-lg border border-zinc-300 bg-white px-3.5 py-2.5 text-sm text-zinc-900 focus:border-orange-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
              />
            </div>

            <div>
              <div class="mb-1.5 flex items-center justify-between gap-2">
                <label for="auth-password" class="block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                  {{ i18n.t().loginPasswordLabel }}
                </label>
                @if (authMode() === 'signin') {
                  <button
                    type="button"
                    (click)="onForgotPassword()"
                    [disabled]="store.authBusy() || !store.authReady()"
                    class="text-xs font-medium text-orange-600 hover:text-orange-700 disabled:opacity-50 dark:text-orange-400 dark:hover:text-orange-300"
                  >
                    {{ i18n.t().loginForgotPassword }}
                  </button>
                }
              </div>
              <div class="relative" dir="ltr">
                <input
                  id="auth-password"
                  [type]="showPassword() ? 'text' : 'password'"
                  [attr.autocomplete]="authMode() === 'signup' ? 'new-password' : 'current-password'"
                  formControlName="password"
                  [placeholder]="i18n.t().loginPasswordPlaceholder"
                  class="w-full rounded-lg border border-zinc-300 bg-white py-2.5 pl-3.5 pr-11 text-sm text-zinc-900 focus:border-orange-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                />
                <button
                  type="button"
                  (click)="showPassword.set(!showPassword())"
                  class="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200"
                  [attr.aria-label]="showPassword() ? i18n.t().loginHidePassword : i18n.t().loginShowPassword"
                >
                  <span class="material-icons text-lg" aria-hidden="true">
                    {{ showPassword() ? 'visibility_off' : 'visibility' }}
                  </span>
                </button>
              </div>
            </div>

            @if (authMode() === 'signup') {
              <div>
                <label for="auth-confirm-password" class="mb-1.5 block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                  {{ i18n.t().loginConfirmPasswordLabel }}
                </label>
                <input
                  id="auth-confirm-password"
                  [type]="showPassword() ? 'text' : 'password'"
                  dir="ltr"
                  autocomplete="new-password"
                  formControlName="confirmPassword"
                  [placeholder]="i18n.t().loginPasswordPlaceholder"
                  class="w-full rounded-lg border border-zinc-300 bg-white px-3.5 py-2.5 text-sm text-zinc-900 focus:border-orange-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                />
              </div>
            }

            <button
              type="submit"
              [disabled]="store.authBusy() || !store.authReady()"
              class="flex w-full items-center justify-center gap-2 rounded-lg bg-orange-600 px-4 py-3 text-sm font-semibold text-white hover:bg-orange-700 disabled:opacity-60 dark:bg-orange-500 dark:hover:bg-orange-600"
            >
              @if (store.authBusy()) {
                <span class="material-icons animate-spin text-lg" aria-hidden="true">sync</span>
              } @else if (authMode() === 'signup') {
                <span class="material-icons text-lg" aria-hidden="true">person_add</span>
              } @else {
                <span class="material-icons text-lg" aria-hidden="true">login</span>
              }
              <span>
                {{ authMode() === 'signup' ? i18n.t().loginSubmitSignUp : i18n.t().loginSubmitSignIn }}
              </span>
            </button>
          </form>

          <div class="mt-6 space-y-2.5 border-t border-zinc-200 pt-5 dark:border-zinc-800">
            <div class="flex items-start gap-2.5 text-xs leading-relaxed text-zinc-600 dark:text-zinc-400">
              <span class="material-icons mt-0.5 shrink-0 text-base text-zinc-500 dark:text-zinc-400" aria-hidden="true">lock</span>
              <span>{{ i18n.t().loginIsolatedNote }}</span>
            </div>
            <div class="flex items-start gap-2.5 text-xs leading-relaxed text-zinc-600 dark:text-zinc-400">
              <span class="material-icons mt-0.5 shrink-0 text-base text-zinc-500 dark:text-zinc-400" aria-hidden="true">restart_alt</span>
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

  readonly consoleProvidersUrl = CONSOLE_AUTH_PROVIDERS_URL;
  readonly authMode = signal<'signin' | 'signup'>('signin');
  readonly showPassword = signal(false);
  readonly localValidationKey = signal<AuthValidationKey | null>(null);

  readonly loginForm = new FormGroup({
    displayName: new FormControl('', {nonNullable: true}),
    email: new FormControl('', {nonNullable: true}),
    password: new FormControl('', {nonNullable: true}),
    confirmPassword: new FormControl('', {nonNullable: true}),
  });

  localValidationMessage(): string | null {
    const key = this.localValidationKey();
    return key ? this.i18n.t()[key] : null;
  }

  setMode(mode: 'signin' | 'signup'): void {
    this.authMode.set(mode);
    this.localValidationKey.set(null);
    this.store.clearAuthMessages();
  }

  private isValidEmail(raw: string): boolean {
    const trimmed = raw.trim();
    const atIdx = trimmed.indexOf('@');
    const dotIdx = trimmed.lastIndexOf('.');
    return atIdx > 0 && dotIdx > atIdx + 1 && dotIdx < trimmed.length - 1;
  }

  async submitForm(): Promise<void> {
    this.localValidationKey.set(null);
    const {displayName, email, password, confirmPassword} = this.loginForm.getRawValue();

    if (this.authMode() === 'signup' && displayName.trim().length < 2) {
      this.localValidationKey.set('val_auth_name');
      return;
    }

    if (!this.isValidEmail(email)) {
      this.localValidationKey.set('val_auth_email');
      return;
    }

    if (password.length < 6) {
      this.localValidationKey.set('val_auth_password');
      return;
    }

    if (this.authMode() === 'signup' && password !== confirmPassword) {
      this.localValidationKey.set('val_auth_password_mismatch');
      return;
    }

    if (this.authMode() === 'signup') {
      await this.store.signUpWithEmail(displayName, email, password);
    } else {
      await this.store.signInWithEmail(email, password);
    }
  }

  async onForgotPassword(): Promise<void> {
    this.localValidationKey.set(null);
    const email = this.loginForm.controls.email.value;
    if (!this.isValidEmail(email)) {
      this.localValidationKey.set('val_auth_email');
      return;
    }
    await this.store.sendPasswordReset(email);
  }

  toggleLanguage(): void {
    const next = this.i18n.toggleLanguage();
    void this.store.saveViewOptions({language: next});
  }

  toggleTheme(): void {
    const next = this.theme.toggleTheme();
    void this.store.saveViewOptions({theme: next});
  }
}
