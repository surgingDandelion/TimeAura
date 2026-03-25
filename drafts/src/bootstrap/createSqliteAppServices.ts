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
  const credentialVault: CredentialVault = options.credentialVault ?? new MemoryCredentialVault();
  const notificationDriver = options.notificationDriver ?? new NoopNotificationDriver();

  try {
    const reminderService = new DefaultReminderService(repositories.recordRepository, now);
    const aiService = new DefaultAIService(
      repositories.recordRepository,
      repositories.channelRepository,
      repositories.settingsRepository,
      aiGateway,
      credentialVault,
    );

    const services: AppServices = {
      aiService,
      channelService: new DefaultChannelService(
        repositories.channelRepository,
        repositories.settingsRepository,
        aiGateway,
        credentialVault,
        now,
      ),
      notificationService: new DefaultNotificationService(notificationDriver, reminderService),
      recordService: new DefaultRecordService(repositories.recordRepository, now),
      reminderService,
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
        await disposeSqliteResources(credentialVault, client);
      },
    };
  } catch (error) {
    try {
      await disposeSqliteResources(credentialVault, client);
    } catch (cleanupError) {
      throw new Error(`创建 SQLite 应用服务失败：${toErrorMessage(error)}；清理资源失败：${toErrorMessage(cleanupError)}`);
    }

    throw normalizeError(error, "创建 SQLite 应用服务失败");
  }
}

async function disposeSqliteResources(credentialVault: CredentialVault, client: SqliteClient): Promise<void> {
  const cleanupErrors: string[] = [];

  try {
    await credentialVault.dispose?.();
  } catch (error) {
    cleanupErrors.push(`凭证库释放失败：${toErrorMessage(error)}`);
  }

  try {
    await client.close();
  } catch (error) {
    cleanupErrors.push(`SQLite 连接关闭失败：${toErrorMessage(error)}`);
  }

  if (cleanupErrors.length > 0) {
    throw new Error(cleanupErrors.join("；"));
  }
}

function normalizeError(error: unknown, fallback: string): Error {
  if (error instanceof Error) {
    return error;
  }

  return new Error(`${fallback}：${toErrorMessage(error)}`);
}

function toErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}
