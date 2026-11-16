import {isPlatformBrowser} from '@angular/common';
import {ChangeDetectionStrategy, Component, PLATFORM_ID, computed, inject, signal} from '@angular/core';
import {AccountModalComponent} from './components/account-modal/account-modal.component';
import {BodySetupModalComponent} from './components/body-setup-modal/body-setup-modal.component';
import {LoginViewComponent} from './components/login-view/login-view.component';
import {GymStoreService} from './core/gym-store.service';
import {I18nService} from './core/i18n.service';
import {NavTab} from './core/models';
import {ThemeService} from './core/theme.service';
import {DashboardComponent} from './features/dashboard/dashboard.component';
import {ExercisesComponent} from './features/exercises/exercises.component';
import {MeasurementsComponent} from './features/measurements/measurements.component';
import {RoutinesComponent} from './features/routines/routines.component';
import {WorkoutsComponent} from './features/workouts/workouts.component';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-root',
  imports: [
    DashboardComponent,
    WorkoutsComponent,
    RoutinesComponent,
    ExercisesComponent,
    MeasurementsComponent,
    AccountModalComponent,
    BodySetupModalComponent,
    LoginViewComponent,
  ],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  readonly store = inject(GymStoreService);
  readonly i18n = inject(I18nService);
  readonly theme = inject(ThemeService);
  private readonly platformId = inject(PLATFORM_ID);

  readonly activeTab = signal<NavTab>('dashboard');
  readonly showAccountModal = signal(false);

  readonly navItems = computed<{key: NavTab; icon: string; label: string}[]>(() => {
    const t = this.i18n.t();
    return [
      {key: 'dashboard', icon: 'analytics', label: t.navDashboard},
      {key: 'workouts', icon: 'fitness_center', label: t.navWorkouts},
      {key: 'routines', icon: 'view_list', label: t.navRoutines},
      {key: 'exercises', icon: 'sports_gymnastics', label: t.navExercises},
      {key: 'measurements', icon: 'straighten', label: t.navMeasurements},
    ];
  });

  readonly syncLabel = computed(() => {
    const t = this.i18n.t();
    const s = this.store.syncStatus();
    if (!s.isOnline || s.offlineModeEnabled) {
      return t.offlineSavedLocally;
    }
    if (!s.isAuthenticated) {
      return t.localGuestMode;
    }
    if (s.hasPendingCloudWrites || s.pendingOfflineCount > 0) {
      return t.syncingPending;
    }
    return t.cloudSynced;
  });

  readonly syncIcon = computed(() => {
    const s = this.store.syncStatus();
    if (!s.isOnline || s.offlineModeEnabled) return 'cloud_off';
    if (!s.isAuthenticated) return 'save';
    if (s.hasPendingCloudWrites || s.pendingOfflineCount > 0) return 'sync';
    return 'cloud_done';
  });

  constructor() {
    if (isPlatformBrowser(this.platformId)) {
      const params = new URLSearchParams(window.location.search);
      const tab = params.get('tab');
      if (
        tab === 'dashboard' ||
        tab === 'workouts' ||
        tab === 'routines' ||
        tab === 'exercises' ||
        tab === 'measurements'
      ) {
        this.activeTab.set(tab);
      }
      if (params.get('autostart') === '1' && !this.store.activeWorkout()) {
        const firstRoutine = this.store.routines()[0];
        if (firstRoutine) {
          this.store.startWorkoutFromRoutine(firstRoutine);
          this.activeTab.set('workouts');
        }
      }
    }
  }

  selectTab(tab: NavTab): void {
    this.activeTab.set(tab);
  }

  onToggleTheme(): void {
    const next = this.theme.toggleTheme();
    void this.store.updatePreferences({theme: next});
  }

  onToggleLanguage(): void {
    const next = this.i18n.toggleLanguage();
    void this.store.updatePreferences({language: next});
  }

  startOrResumeWorkout(): void {
    if (!this.store.activeWorkout()) {
      const firstRoutine = this.store.routines()[0];
      if (firstRoutine) {
        this.store.startWorkoutFromRoutine(firstRoutine);
      } else {
        this.store.startEmptyWorkout();
      }
    }
    this.activeTab.set('workouts');
  }
}
