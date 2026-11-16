import {DOCUMENT, isPlatformBrowser} from '@angular/common';
import {Injectable, PLATFORM_ID, inject, signal} from '@angular/core';
import {ThemeMode} from './models';

const STORAGE_THEME_KEY = 'ironledger_theme';

@Injectable({providedIn: 'root'})
export class ThemeService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly document = inject(DOCUMENT);

  readonly theme = signal<ThemeMode>('light');

  constructor() {
    if (isPlatformBrowser(this.platformId)) {
      try {
        const saved = localStorage.getItem(STORAGE_THEME_KEY);
        if (saved === 'dark' || saved === 'light') {
          this.setTheme(saved);
        } else {
          this.applyDomTheme('light');
        }
      } catch {
        this.applyDomTheme('light');
      }
    }
  }

  setTheme(mode: ThemeMode): void {
    this.theme.set(mode);
    if (isPlatformBrowser(this.platformId)) {
      try {
        localStorage.setItem(STORAGE_THEME_KEY, mode);
      } catch {
        // Ignore storage errors
      }
      this.applyDomTheme(mode);
    }
  }

  toggleTheme(): ThemeMode {
    const next: ThemeMode = this.theme() === 'light' ? 'dark' : 'light';
    this.setTheme(next);
    return next;
  }

  private applyDomTheme(mode: ThemeMode): void {
    const root = this.document.documentElement;
    if (mode === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }
}
