import type { AppSettings, ThemeMode } from "../types/index";

export interface SettingsService {
  getSetting<T = string>(key: string): Promise<T | null>;
  setSetting<T = string>(key: string, value: T): Promise<void>;
  getAppSettings(): Promise<AppSettings>;
  setTheme(theme: ThemeMode): Promise<void>;
}
