export type ThemeMode = "light" | "dark";

export interface SettingEntry<T = unknown> {
  key: string;
  value: T;
  updatedAt: string;
}

export interface DoNotDisturbRange {
  enabled: boolean;
  start: string;
  end: string;
}

export interface AppSettings {
  theme: ThemeMode;
  defaultView: "today" | "plan" | "all" | "done";
  detailWidth: number;
  reminderEnabled: boolean;
  completionQuickMode: "popover" | "direct";
  doNotDisturbRange: DoNotDisturbRange;
  defaultChannelId: string | null;
}
