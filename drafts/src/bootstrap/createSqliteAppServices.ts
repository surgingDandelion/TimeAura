import type { AppContainer, AppRepositories, AppServices } from "./appContainer";

import type { AIProviderGateway, CredentialVault, NotificationDriver } from "../providers/index";
import type { SqliteDriverLoader, SqliteMigration } from "../repositories/sqlite/index";

import { nowWithOffset } from "../mock/index";
import {
  MemoryCredentialVault,
  NoopNotificationDriver,
  UnavailableAIProviderGateway,
} from "../providers/index";
import {
  DEFAULT_SQLITE_MIGRATIONS,
  SqliteChannelRepository,
  SqliteClient,
  SqliteRecordRepository,
  SqliteRecordTagRepository,
  SqliteReportHistoryRepository,
  SqliteReportTemplateRepository,
  SqliteSettingsRepository,
  SqliteTagRepository,
} from "../repositories/sqlite/index";
import {
  DefaultAIService,
  DefaultChannelService,
  DefaultNotificationService,
  DefaultRecordService,
  DefaultReminderService,
  DefaultReportService,
  DefaultSettingsService,
  DefaultTagService,
  DefaultTemplateService,
} from "../services/impl/index";

export interface CreateSqliteAppServicesOptions {
  databaseUrl?: string;
  migrations?: SqliteMigration[];
  aiGateway?: AIProviderGateway;
  credentialVault?: CredentialVault;
  notificationDriver?: NotificationDriver;
  loadDatabase?: SqliteDriverLoader;
  now?: () => string;
}

export async function createSqliteAppServices(
  options: CreateSqliteAppServicesOptions = {},
): Promise<AppContainer> {
  const now = options.now ?? (() => nowWithOffset());
  const client = await SqliteClient.connect({
    databaseUrl: options.databaseUrl ?? "sqlite:timeaura.db",
    migrations: options.migrations ?? DEFAULT_SQLITE_MIGRATIONS,
    loadDatabase: options.loadDatabase,
  });

  const repositories: AppRepositories = {
    channelRepository: new SqliteChannelRepository(client),
    recordRepository: new SqliteRecordRepository(client, now),
    recordTagRepository: new SqliteRecordTagRepository(client),
    reportHistoryRepository: new SqliteReportHistoryRepository(client),
    reportTemplateRepository: new SqliteReportTemplateRepository(client),
    settingsRepository: new SqliteSettingsRepository(client),
    tagRepository: new SqliteTagRepository(client),
  };

  const aiGateway = options.aiGateway ?? new UnavailableAIProviderGateway();
  const credentialVault = options.credentialVault ?? new MemoryCredentialVault();
  const notificationDriver = options.notificationDriver ?? new NoopNotificationDriver();
  const aiService = new DefaultAIService(
    repositories.recordRepository,
    repositories.channelRepository,
    aiGateway,
    credentialVault,
  );

  const services: AppServices = {
    aiService,
    channelService: new DefaultChannelService(
      repositories.channelRepository,
      aiGateway,
      credentialVault,
      now,
    ),
    notificationService: new DefaultNotificationService(notificationDriver),
    recordService: new DefaultRecordService(repositories.recordRepository, now),
    reminderService: new DefaultReminderService(repositories.recordRepository, now),
    reportService: new DefaultReportService(
      repositories.recordRepository,
      repositories.reportTemplateRepository,
      repositories.reportHistoryRepository,
      aiService,
      now,
    ),
    settingsService: new DefaultSettingsService(repositories.settingsRepository, now),
    tagService: new DefaultTagService(
      repositories.tagRepository,
      repositories.recordRepository,
      repositories.recordTagRepository,
      now,
    ),
    templateService: new DefaultTemplateService(repositories.reportTemplateRepository, now),
  };

  return {
    repositories,
    services,
    dispose: async () => {
      await client.close();
    },
  };
}
