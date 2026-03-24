import type { SettingsService } from "../settingsService";

import type { SettingsRepository } from "../../repositories/index";
import type { AppSettings, ThemeMode } from "../../types/index";

export class MockSettingsService implements SettingsService {
  constructor(private readonly settingsRepository: SettingsRepository, private readonly now: () => string) {}

  async getSetting<T = string>(key: string): Promise<T | null> {
    return this.settingsRepository.get<T>(key);
  }

  async setSetting<T = string>(key: string, value: T): Promise<void> {
    await this.settingsRepository.set(key, value, this.now());
  }

  async getAppSettings(): Promise<AppSettings> {
    const all = await this.settingsRepository.getAll();

    return {
      theme: (all.theme as ThemeMode | undefined) ?? "light",
      defaultView: (all.defaultView as AppSettings["defaultView"] | undefined) ?? "today",
      detailWidth: (all.detailWidth as number | undefined) ?? 540,
      reminderEnabled: (all.reminderEnabled as boolean | undefined) ?? true,
      completionQuickMode: (all.completionQuickMode as AppSettings["completionQuickMode"] | undefined) ?? "popover",
      doNotDisturbRange: (all.doNotDisturbRange as AppSettings["doNotDisturbRange"] | undefined) ?? {
        enabled: false,
        start: "22:00",
        end: "08:00",
      },
      defaultChannelId: (all.defaultChannelId as string | null | undefined) ?? null,
    };
  }

  async setTheme(theme: ThemeMode): Promise<void> {
    await this.setSetting("theme", theme);
  }
}
