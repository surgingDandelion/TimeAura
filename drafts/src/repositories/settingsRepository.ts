export interface SettingsRepository {
  get<T = string>(key: string): Promise<T | null>;
  set<T = string>(key: string, value: T, updatedAt: string): Promise<void>;
  getAll(): Promise<Record<string, unknown>>;
}
