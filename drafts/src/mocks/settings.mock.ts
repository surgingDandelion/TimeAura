import type { AppSettings } from "../types/index";

export const appSettingsMock: AppSettings = {
  theme: "light",
  defaultView: "today",
  detailWidth: 540,
  reminderEnabled: true,
  completionQuickMode: "popover",
  doNotDisturbRange: {
    enabled: false,
    start: "22:00",
    end: "08:00",
  },
  defaultChannelId: "channel_default",
};
