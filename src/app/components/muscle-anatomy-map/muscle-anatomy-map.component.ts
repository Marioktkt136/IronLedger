import {ChangeDetectionStrategy, Component, inject, input, output} from '@angular/core';
import {ANATOMY_MUSCLES} from '../../core/exercise-anatomy.data';
import {I18nService} from '../../core/i18n.service';
import {AnatomyMuscleId} from '../../core/models';

@Component({
  selector: 'app-muscle-anatomy-map',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-3">
      <!-- Legend -->
      <div class="flex flex-wrap items-center justify-between gap-2 text-xs text-zinc-600 dark:text-zinc-400">
        <div class="flex flex-wrap items-center gap-4">
          <span class="inline-flex items-center gap-1.5">
            <span class="h-2.5 w-2.5 rounded-xs bg-orange-600 dark:bg-orange-500"></span>
            {{ i18n.t().anatomyPrimaryLabel }}
          </span>
          <span class="inline-flex items-center gap-1.5">
            <span class="h-2.5 w-2.5 rounded-xs bg-amber-400 dark:bg-amber-400"></span>
            {{ i18n.t().anatomySecondaryLabel }}
          </span>
        </div>
      </div>

      <!-- Dual Anterior + Posterior SVG Diagrams -->
      <div [class]="compact() ? 'grid grid-cols-2 gap-3' : 'grid grid-cols-1 gap-4 sm:grid-cols-2'">
        <!-- Anterior (Front) -->
        <div class="rounded-lg border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-800 dark:bg-zinc-950/60">
          <p class="mb-2 text-center text-xs font-semibold tracking-wide text-zinc-600 uppercase dark:text-zinc-400">
            {{ i18n.t().anatomyViewFront }}
          </p>
          <svg
            viewBox="0 0 220 390"
            class="mx-auto block w-full max-w-[205px] select-none"
            role="img"
            [attr.aria-label]="i18n.t().anatomyViewFront"
          >
            <!-- Head & Neck Silhouette (non-target frame) -->
            <ellipse cx="110" cy="30" rx="17" ry="20" class="fill-zinc-300 dark:fill-zinc-700" />
            <rect x="101" y="48" width="18" height="14" rx="4" class="fill-zinc-300 dark:fill-zinc-700" />

            <!-- Upper Traps (Front Collar) -->
            <path
              d="M100,56 L78,66 L96,74 Z M120,56 L142,66 L124,74 Z"
              role="button"
              tabindex="0"
              (click)="selectMuscle('traps')"
              (keydown.enter)="selectMuscle('traps')"
              (keydown.space)="$event.preventDefault(); selectMuscle('traps')"
              [class]="muscleClass('traps')"
            >
              <title>{{ muscleName('traps') }}</title>
            </path>

            <!-- Anterior Deltoids -->
            <path
              d="M77,67 C65,69 59,78 60,92 L73,90 L79,74 Z M143,67 C155,69 161,78 160,92 L147,90 L141,74 Z"
              role="button"
              tabindex="0"
              (click)="selectMuscle('anterior_delts')"
              (keydown.enter)="selectMuscle('anterior_delts')"
              (keydown.space)="$event.preventDefault(); selectMuscle('anterior_delts')"
              [class]="muscleClass('anterior_delts')"
            >
              <title>{{ muscleName('anterior_delts') }}</title>
            </path>

            <!-- Lateral Deltoids (Outer Shoulder Caps) -->
            <path
              d="M60,72 C53,79 51,92 56,102 L62,96 Z M160,72 C167,79 169,92 164,102 L158,96 Z"
              role="button"
              tabindex="0"
              (click)="selectMuscle('lateral_delts')"
              (keydown.enter)="selectMuscle('lateral_delts')"
              (keydown.space)="$event.preventDefault(); selectMuscle('lateral_delts')"
              [class]="muscleClass('lateral_delts')"
            >
              <title>{{ muscleName('lateral_delts') }}</title>
            </path>

            <!-- Upper Chest (Clavicular Pecs) -->
            <path
              d="M80,71 L108,77 L108,89 L78,86 Z M140,71 L112,77 L112,89 L142,86 Z"
              role="button"
              tabindex="0"
              (click)="selectMuscle('upper_chest')"
              (keydown.enter)="selectMuscle('upper_chest')"
              (keydown.space)="$event.preventDefault(); selectMuscle('upper_chest')"
              [class]="muscleClass('upper_chest')"
            >
              <title>{{ muscleName('upper_chest') }}</title>
            </path>

            <!-- Mid & Lower Chest (Sternal Pecs) -->
            <path
              d="M78,88 L108,91 L108,112 C94,113 80,108 77,98 Z M142,88 L112,91 L112,112 C126,113 140,108 143,98 Z"
              role="button"
              tabindex="0"
              (click)="selectMuscle('mid_chest')"
              (keydown.enter)="selectMuscle('mid_chest')"
              (keydown.space)="$event.preventDefault(); selectMuscle('mid_chest')"
              [class]="muscleClass('mid_chest')"
            >
              <title>{{ muscleName('mid_chest') }}</title>
            </path>

            <!-- Lats Front Flare -->
            <path
              d="M76,106 L82,113 L79,136 L71,122 Z M144,106 L138,113 L141,136 L149,122 Z"
              role="button"
              tabindex="0"
              (click)="selectMuscle('lats')"
              (keydown.enter)="selectMuscle('lats')"
              (keydown.space)="$event.preventDefault(); selectMuscle('lats')"
              [class]="muscleClass('lats')"
            >
              <title>{{ muscleName('lats') }}</title>
            </path>

            <!-- Biceps -->
            <path
              d="M57,100 C51,114 52,132 59,144 L69,140 C69,126 70,111 71,98 Z M163,100 C169,114 168,132 161,144 L151,140 C151,126 150,111 149,98 Z"
              role="button"
              tabindex="0"
              (click)="selectMuscle('biceps')"
              (keydown.enter)="selectMuscle('biceps')"
              (keydown.space)="$event.preventDefault(); selectMuscle('biceps')"
              [class]="muscleClass('biceps')"
            >
              <title>{{ muscleName('biceps') }}</title>
            </path>

            <!-- Forearms -->
            <path
              d="M56,147 C47,165 44,185 45,204 L55,205 C59,187 64,167 66,147 Z M164,147 C173,165 176,185 175,204 L165,205 C161,187 156,167 154,147 Z"
              role="button"
              tabindex="0"
              (click)="selectMuscle('forearms')"
              (keydown.enter)="selectMuscle('forearms')"
              (keydown.space)="$event.preventDefault(); selectMuscle('forearms')"
              [class]="muscleClass('forearms')"
            >
              <title>{{ muscleName('forearms') }}</title>
            </path>
            <!-- Hands -->
            <ellipse cx="48" cy="215" rx="6" ry="9" class="fill-zinc-300 dark:fill-zinc-700" />
            <ellipse cx="172" cy="215" rx="6" ry="9" class="fill-zinc-300 dark:fill-zinc-700" />

            <!-- Abs (6-pack segmented) -->
            <path
              d="M95,115 H108 V131 H95 Z M112,115 H125 V131 H112 Z
                 M95,134 H108 V150 H95 Z M112,134 H125 V150 H112 Z
                 M96,153 H108 V169 H97 Z M112,153 H124 V169 H123 Z
                 M98,172 H108 V192 L102,192 Z M112,172 H122 L118,192 H112 Z"
              role="button"
              tabindex="0"
              (click)="selectMuscle('abs')"
              (keydown.enter)="selectMuscle('abs')"
              (keydown.space)="$event.preventDefault(); selectMuscle('abs')"
              [class]="muscleClass('abs')"
            >
              <title>{{ muscleName('abs') }}</title>
            </path>

            <!-- Obliques -->
            <path
              d="M80,130 L92,126 L93,174 L81,182 C77,164 77,145 80,130 Z
                 M140,130 L128,126 L127,174 L139,182 C143,164 143,145 140,130 Z"
              role="button"
              tabindex="0"
              (click)="selectMuscle('obliques')"
              (keydown.enter)="selectMuscle('obliques')"
              (keydown.space)="$event.preventDefault(); selectMuscle('obliques')"
              [class]="muscleClass('obliques')"
            >
              <title>{{ muscleName('obliques') }}</title>
            </path>

            <!-- Pelvis Anchor -->
            <path d="M81,185 L108,196 L112,196 L139,185 L138,205 L110,214 L82,205 Z" class="fill-zinc-300 dark:fill-zinc-700" />

            <!-- Quads (Front Thighs) -->
            <path
              d="M78,206 L106,216 C106,245 102,272 95,289 L80,289 C73,265 72,233 78,206 Z
                 M142,206 L114,216 C114,245 118,272 125,289 L140,289 C147,265 148,233 142,206 Z"
              role="button"
              tabindex="0"
              (click)="selectMuscle('quads')"
              (keydown.enter)="selectMuscle('quads')"
              (keydown.space)="$event.preventDefault(); selectMuscle('quads')"
              [class]="muscleClass('quads')"
            >
              <title>{{ muscleName('quads') }}</title>
            </path>

            <!-- Knees -->
            <ellipse cx="87" cy="297" rx="8" ry="6" class="fill-zinc-300 dark:fill-zinc-700" />
            <ellipse cx="133" cy="297" rx="8" ry="6" class="fill-zinc-300 dark:fill-zinc-700" />

            <!-- Calves (Lower Leg) -->
            <path
              d="M78,307 C73,324 74,344 81,362 L94,362 C97,343 97,323 95,307 Z
                 M142,307 C147,324 146,344 139,362 L126,362 C123,343 123,323 125,307 Z"
              role="button"
              tabindex="0"
              (click)="selectMuscle('calves')"
              (keydown.enter)="selectMuscle('calves')"
              (keydown.space)="$event.preventDefault(); selectMuscle('calves')"
              [class]="muscleClass('calves')"
            >
              <title>{{ muscleName('calves') }}</title>
            </path>
            <!-- Feet -->
            <ellipse cx="86" cy="373" rx="10" ry="6" class="fill-zinc-300 dark:fill-zinc-700" />
            <ellipse cx="134" cy="373" rx="10" ry="6" class="fill-zinc-300 dark:fill-zinc-700" />
          </svg>
        </div>

        <!-- Posterior (Back) -->
        <div class="rounded-lg border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-800 dark:bg-zinc-950/60">
          <p class="mb-2 text-center text-xs font-semibold tracking-wide text-zinc-600 uppercase dark:text-zinc-400">
            {{ i18n.t().anatomyViewBack }}
          </p>
          <svg
            viewBox="0 0 220 390"
            class="mx-auto block w-full max-w-[205px] select-none"
            role="img"
            [attr.aria-label]="i18n.t().anatomyViewBack"
          >
            <!-- Head & Neck Silhouette -->
            <ellipse cx="110" cy="30" rx="17" ry="20" class="fill-zinc-300 dark:fill-zinc-700" />
            <rect x="102" y="48" width="16" height="10" rx="3" class="fill-zinc-300 dark:fill-zinc-700" />

            <!-- Trapezius Diamond -->
            <path
              d="M100,56 L120,56 L142,68 L110,108 L78,68 Z"
              role="button"
              tabindex="0"
              (click)="selectMuscle('traps')"
              (keydown.enter)="selectMuscle('traps')"
              (keydown.space)="$event.preventDefault(); selectMuscle('traps')"
              [class]="muscleClass('traps')"
            >
              <title>{{ muscleName('traps') }}</title>
            </path>

            <!-- Posterior Deltoids -->
            <path
              d="M77,68 C64,71 58,80 59,95 L74,94 L83,76 Z
                 M143,68 C156,71 162,80 161,95 L146,94 L137,76 Z"
              role="button"
              tabindex="0"
              (click)="selectMuscle('posterior_delts')"
              (keydown.enter)="selectMuscle('posterior_delts')"
              (keydown.space)="$event.preventDefault(); selectMuscle('posterior_delts')"
              [class]="muscleClass('posterior_delts')"
            >
              <title>{{ muscleName('posterior_delts') }}</title>
            </path>

            <!-- Mid-Back (Rhomboids / Mid-Traps) -->
            <path
              d="M84,82 L109,110 L109,138 L83,128 Z
                 M136,82 L111,110 L111,138 L137,128 Z"
              role="button"
              tabindex="0"
              (click)="selectMuscle('mid_back')"
              (keydown.enter)="selectMuscle('mid_back')"
              (keydown.space)="$event.preventDefault(); selectMuscle('mid_back')"
              [class]="muscleClass('mid_back')"
            >
              <title>{{ muscleName('mid_back') }}</title>
            </path>

            <!-- Lats (Back Wings) -->
            <path
              d="M74,97 L81,130 L93,166 L78,162 C70,141 68,118 74,97 Z
                 M146,97 L139,130 L127,166 L142,162 C150,141 152,118 146,97 Z"
              role="button"
              tabindex="0"
              (click)="selectMuscle('lats')"
              (keydown.enter)="selectMuscle('lats')"
              (keydown.space)="$event.preventDefault(); selectMuscle('lats')"
              [class]="muscleClass('lats')"
            >
              <title>{{ muscleName('lats') }}</title>
            </path>

            <!-- Lower Back (Erector Spinae) -->
            <path
              d="M95,141 H108 V182 L94,180 Z M112,141 H125 L126,180 L112,182 Z"
              role="button"
              tabindex="0"
              (click)="selectMuscle('lower_back')"
              (keydown.enter)="selectMuscle('lower_back')"
              (keydown.space)="$event.preventDefault(); selectMuscle('lower_back')"
              [class]="muscleClass('lower_back')"
            >
              <title>{{ muscleName('lower_back') }}</title>
            </path>

            <!-- Triceps -->
            <path
              d="M57,98 C50,114 52,134 59,145 L70,141 C70,126 70,110 71,98 Z
                 M163,98 C170,114 168,134 161,145 L150,141 C150,126 150,110 149,98 Z"
              role="button"
              tabindex="0"
              (click)="selectMuscle('triceps')"
              (keydown.enter)="selectMuscle('triceps')"
              (keydown.space)="$event.preventDefault(); selectMuscle('triceps')"
              [class]="muscleClass('triceps')"
            >
              <title>{{ muscleName('triceps') }}</title>
            </path>

            <!-- Forearms (Back) -->
            <path
              d="M56,147 C47,165 44,185 45,204 L55,205 C59,187 64,167 66,147 Z
                 M164,147 C173,165 176,185 175,204 L165,205 C161,187 156,167 154,147 Z"
              role="button"
              tabindex="0"
              (click)="selectMuscle('forearms')"
              (keydown.enter)="selectMuscle('forearms')"
              (keydown.space)="$event.preventDefault(); selectMuscle('forearms')"
              [class]="muscleClass('forearms')"
            >
              <title>{{ muscleName('forearms') }}</title>
            </path>
            <ellipse cx="48" cy="215" rx="6" ry="9" class="fill-zinc-300 dark:fill-zinc-700" />
            <ellipse cx="172" cy="215" rx="6" ry="9" class="fill-zinc-300 dark:fill-zinc-700" />

            <!-- Glutes -->
            <path
              d="M78,184 L108,186 L108,225 C92,228 77,219 75,203 Z
                 M142,184 L112,186 L112,225 C128,228 143,219 145,203 Z"
              role="button"
              tabindex="0"
              (click)="selectMuscle('glutes')"
              (keydown.enter)="selectMuscle('glutes')"
              (keydown.space)="$event.preventDefault(); selectMuscle('glutes')"
              [class]="muscleClass('glutes')"
            >
              <title>{{ muscleName('glutes') }}</title>
            </path>

            <!-- Hamstrings -->
            <path
              d="M77,225 L106,229 C105,256 101,277 95,292 L80,292 C73,270 73,246 77,225 Z
                 M143,225 L114,229 C115,256 119,277 125,292 L140,292 C147,270 147,246 143,225 Z"
              role="button"
              tabindex="0"
              (click)="selectMuscle('hamstrings')"
              (keydown.enter)="selectMuscle('hamstrings')"
              (keydown.space)="$event.preventDefault(); selectMuscle('hamstrings')"
              [class]="muscleClass('hamstrings')"
            >
              <title>{{ muscleName('hamstrings') }}</title>
            </path>

            <!-- Back of Knees -->
            <rect x="79" y="294" width="16" height="9" rx="3" class="fill-zinc-300 dark:fill-zinc-700" />
            <rect x="125" y="294" width="16" height="9" rx="3" class="fill-zinc-300 dark:fill-zinc-700" />

            <!-- Calves (Gastrocnemius Diamond) -->
            <path
              d="M77,306 C71,322 74,344 82,363 L93,363 C98,342 98,322 95,306 Z
                 M143,306 C149,322 146,344 138,363 L127,363 C122,342 122,322 125,306 Z"
              role="button"
              tabindex="0"
              (click)="selectMuscle('calves')"
              (keydown.enter)="selectMuscle('calves')"
              (keydown.space)="$event.preventDefault(); selectMuscle('calves')"
              [class]="muscleClass('calves')"
            >
              <title>{{ muscleName('calves') }}</title>
            </path>
            <!-- Heels -->
            <ellipse cx="87" cy="373" rx="9" ry="6" class="fill-zinc-300 dark:fill-zinc-700" />
            <ellipse cx="133" cy="373" rx="9" ry="6" class="fill-zinc-300 dark:fill-zinc-700" />
          </svg>
        </div>
      </div>
    </div>
  `,
})
export class MuscleAnatomyMapComponent {
  readonly i18n = inject(I18nService);

  readonly primaryMuscles = input<AnatomyMuscleId[]>([]);
  readonly secondaryMuscles = input<AnatomyMuscleId[]>([]);
  readonly selectedMuscle = input<AnatomyMuscleId | null>(null);
  readonly compact = input<boolean>(false);

  readonly muscleSelected = output<AnatomyMuscleId>();

  selectMuscle(id: AnatomyMuscleId): void {
    this.muscleSelected.emit(id);
  }

  muscleName(id: AnatomyMuscleId): string {
    const meta = ANATOMY_MUSCLES[id];
    return this.i18n.lang() === 'ar' ? meta.nameAr : meta.nameEn;
  }

  muscleClass(id: AnatomyMuscleId): string {
    const isSelected = this.selectedMuscle() === id;
    const isPrimary = this.primaryMuscles().includes(id);
    const isSecondary = this.secondaryMuscles().includes(id);

    const base = 'cursor-pointer transition-colors focus:outline-none stroke-[1.2] ';
    if (isSelected) {
      return `${base}fill-orange-600 stroke-zinc-950 dark:fill-orange-500 dark:stroke-white`;
    }
    if (isPrimary) {
      return `${base}fill-orange-600/90 stroke-orange-900/40 hover:fill-orange-500 dark:fill-orange-500/90 dark:stroke-orange-200/40`;
    }
    if (isSecondary) {
      return `${base}fill-amber-400 stroke-amber-700/40 hover:fill-amber-500 dark:fill-amber-400/85 dark:stroke-amber-100/40`;
    }
    return `${base}fill-zinc-200 stroke-zinc-400/60 hover:fill-orange-300 dark:fill-zinc-700 dark:stroke-zinc-600 dark:hover:fill-orange-700/70`;
  }
}
