import { appSettingsMock, abilityMappingsMock, channelsMock, recordsMock, reportHistoriesMock, reportTemplatesMock, tagsMock } from "../mocks/index";

import type { AbilityMappingEntity, AIChannelEntity, AppSettings, RecordEntity, ReportHistoryEntity, ReportTemplateEntity, TagEntity } from "../types/index";

import { cloneValue, nowWithOffset } from "./helpers";

export interface RecordTagLink {
  recordId: string;
  tagId: string;
  createdAt: string;
}

export interface NotificationLogEntry {
  id: string;
  title: string;
  body: string;
  actions?: Array<{ key: string; label: string }>;
  extra?: Record<string, unknown>;
  createdAt: string;
  cancelledAt?: string | null;
}

export interface MockRuntimeSeed {
  records?: RecordEntity[];
  tags?: TagEntity[];
  channels?: AIChannelEntity[];
  abilityMappings?: AbilityMappingEntity[];
  reportTemplates?: ReportTemplateEntity[];
  reportHistories?: ReportHistoryEntity[];
  settings?: Partial<AppSettings>;
}

export interface MockRuntime {
  records: RecordEntity[];
  tags: TagEntity[];
  recordTags: RecordTagLink[];
  channels: AIChannelEntity[];
  abilityMappings: AbilityMappingEntity[];
  reportTemplates: ReportTemplateEntity[];
  reportHistories: ReportHistoryEntity[];
  settings: Record<string, unknown>;
  notifications: NotificationLogEntry[];
  now(): string;
}

export function createMockRuntime(seed: MockRuntimeSeed = {}): MockRuntime {
  const records = cloneValue(seed.records ?? recordsMock);
  const tags = cloneValue(seed.tags ?? tagsMock);
  const channels = cloneValue(seed.channels ?? channelsMock);
  const abilityMappings = cloneValue(seed.abilityMappings ?? abilityMappingsMock);
  const reportTemplates = cloneValue(seed.reportTemplates ?? reportTemplatesMock);
  const reportHistories = cloneValue(seed.reportHistories ?? reportHistoriesMock);
  const settingsSource: AppSettings = {
    ...cloneValue(appSettingsMock),
    ...(seed.settings ?? {}),
  };

  return {
    records,
    tags,
    recordTags: records.flatMap((record) =>
      record.tags.map((tagId) => ({
        recordId: record.id,
        tagId,
        createdAt: record.createdAt,
      })),
    ),
    channels,
    abilityMappings,
    reportTemplates,
    reportHistories,
    settings: {
      theme: settingsSource.theme,
      defaultView: settingsSource.defaultView,
      detailWidth: settingsSource.detailWidth,
      reminderEnabled: settingsSource.reminderEnabled,
      completionQuickMode: settingsSource.completionQuickMode,
      doNotDisturbRange: settingsSource.doNotDisturbRange,
      defaultChannelId: settingsSource.defaultChannelId,
    },
    notifications: [],
    now: () => nowWithOffset(),
  };
}
