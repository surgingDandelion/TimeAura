import type { MockRuntime } from "../mock/index";
import type {
  ChannelRepository,
  RecordRepository,
  RecordTagRepository,
  ReportHistoryRepository,
  ReportTemplateRepository,
  SettingsRepository,
  TagRepository,
} from "../repositories/index";
import type {
  AIService,
  ChannelService,
  NotificationService,
  RecordService,
  ReminderService,
  ReportService,
  SettingsService,
  TagService,
  TemplateService,
} from "../services/index";

export interface AppRepositories {
  channelRepository: ChannelRepository;
  recordRepository: RecordRepository;
  recordTagRepository: RecordTagRepository;
  reportHistoryRepository: ReportHistoryRepository;
  reportTemplateRepository: ReportTemplateRepository;
  settingsRepository: SettingsRepository;
  tagRepository: TagRepository;
}

export interface AppServices {
  aiService: AIService;
  channelService: ChannelService;
  notificationService: NotificationService;
  recordService: RecordService;
  reminderService: ReminderService;
  reportService: ReportService;
  settingsService: SettingsService;
  tagService: TagService;
  templateService: TemplateService;
}

export interface AppContainer {
  repositories: AppRepositories;
  services: AppServices;
  runtime?: MockRuntime;
  dispose?: () => Promise<void>;
}
