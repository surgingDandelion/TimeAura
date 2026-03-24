import type { AppContainer, AppRepositories, AppServices } from "./appContainer";
import type { MockRuntime } from "../mock/index";

import { createMockRuntime } from "../mock/index";
import {
  MockChannelRepository,
  MockRecordRepository,
  MockRecordTagRepository,
  MockReportHistoryRepository,
  MockReportTemplateRepository,
  MockSettingsRepository,
  MockTagRepository,
} from "../repositories/mock/index";
import {
  MockAIService,
  MockChannelService,
  MockNotificationService,
  MockRecordService,
  MockReminderService,
  MockReportService,
  MockSettingsService,
  MockTagService,
  MockTemplateService,
} from "../services/mock/index";

export interface MockAppRepositories extends AppRepositories {
  channelRepository: MockChannelRepository;
  recordRepository: MockRecordRepository;
  recordTagRepository: MockRecordTagRepository;
  reportHistoryRepository: MockReportHistoryRepository;
  reportTemplateRepository: MockReportTemplateRepository;
  settingsRepository: MockSettingsRepository;
  tagRepository: MockTagRepository;
}

export interface MockAppServices extends AppServices {
  aiService: MockAIService;
  channelService: MockChannelService;
  notificationService: MockNotificationService;
  recordService: MockRecordService;
  reminderService: MockReminderService;
  reportService: MockReportService;
  settingsService: MockSettingsService;
  tagService: MockTagService;
  templateService: MockTemplateService;
}

export interface MockAppContainer extends AppContainer {
  runtime: MockRuntime;
  repositories: MockAppRepositories;
  services: MockAppServices;
}

export function createMockAppServices(): MockAppContainer {
  const runtime = createMockRuntime();

  const repositories: MockAppRepositories = {
    channelRepository: new MockChannelRepository(runtime),
    recordRepository: new MockRecordRepository(runtime),
    recordTagRepository: new MockRecordTagRepository(runtime),
    reportHistoryRepository: new MockReportHistoryRepository(runtime),
    reportTemplateRepository: new MockReportTemplateRepository(runtime),
    settingsRepository: new MockSettingsRepository(runtime),
    tagRepository: new MockTagRepository(runtime),
  };

  const sharedAIService = new MockAIService(
    repositories.recordRepository,
    repositories.channelRepository,
    repositories.settingsRepository,
  );
  const recordService = new MockRecordService(repositories.recordRepository, runtime.now);
  const reminderService = new MockReminderService(repositories.recordRepository, runtime.now);

  const services: MockAppServices = {
    aiService: sharedAIService,
    channelService: new MockChannelService(
      repositories.channelRepository,
      repositories.settingsRepository,
      runtime.now,
    ),
    notificationService: new MockNotificationService(runtime, reminderService),
    recordService,
    reminderService,
    reportService: new MockReportService(
      repositories.recordRepository,
      repositories.reportTemplateRepository,
      repositories.reportHistoryRepository,
      sharedAIService,
      runtime.now,
    ),
    settingsService: new MockSettingsService(repositories.settingsRepository, runtime.now),
    tagService: new MockTagService(
      repositories.tagRepository,
      repositories.recordRepository,
      repositories.recordTagRepository,
      runtime.now,
    ),
    templateService: new MockTemplateService(repositories.reportTemplateRepository, runtime.now),
  };

  return {
    runtime,
    repositories,
    services,
  };
}
