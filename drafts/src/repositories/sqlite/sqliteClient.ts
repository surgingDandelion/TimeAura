export interface SqliteExecuteResult {
  rowsAffected: number;
  lastInsertId?: number | null;
}

export interface SqliteDatabaseDriver {
  execute(query: string, bindValues?: unknown[]): Promise<SqliteExecuteResult>;
  select<T = Record<string, unknown>>(query: string, bindValues?: unknown[]): Promise<T[]>;
  close(): Promise<unknown>;
}

export interface SqliteMigration {
  version: string;
  description: string;
  sql: string;
}

export type SqliteDriverLoader = (databaseUrl: string) => Promise<SqliteDatabaseDriver>;

export interface ConnectSqliteClientOptions {
  databaseUrl: string;
  migrations?: SqliteMigration[];
  loadDatabase?: SqliteDriverLoader;
}

export class SqliteClient {
  constructor(private readonly database: SqliteDatabaseDriver) {}

  static async connect(options: ConnectSqliteClientOptions): Promise<SqliteClient> {
    const loadDatabase = options.loadDatabase ?? loadTauriSqliteDatabase;
    const database = await loadDatabase(options.databaseUrl);
    const client = new SqliteClient(database);

    try {
      if (options.migrations?.length) {
        await client.migrate(options.migrations);
      }

      return client;
    } catch (error) {
      try {
        await database.close();
      } catch (closeError) {
        throw new Error(`SQLite 初始化失败：${toErrorMessage(error)}；关闭连接失败：${toErrorMessage(closeError)}`);
      }

      throw normalizeError(error, "SQLite 初始化失败");
    }
  }

  async execute(query: string, bindValues: unknown[] = []): Promise<SqliteExecuteResult> {
    return this.database.execute(query, bindValues);
  }

  async select<T = Record<string, unknown>>(query: string, bindValues: unknown[] = []): Promise<T[]> {
    return this.database.select<T>(query, bindValues);
  }

  async transaction<T>(run: (client: SqliteClient) => Promise<T>): Promise<T> {
    await this.execute("BEGIN");

    try {
      const result = await run(this);
      await this.execute("COMMIT");
      return result;
    } catch (error) {
      try {
        await this.execute("ROLLBACK");
      } catch (rollbackError) {
        throw new Error(`SQLite 事务失败：${toErrorMessage(error)}；回滚失败：${toErrorMessage(rollbackError)}`);
      }

      throw normalizeError(error, "SQLite 事务失败");
    }
  }

  async migrate(migrations: SqliteMigration[]): Promise<void> {
    await this.execute(`
      CREATE TABLE IF NOT EXISTS __timeaura_migrations (
        version TEXT PRIMARY KEY,
        description TEXT NOT NULL,
        applied_at TEXT NOT NULL
      )
    `);

    for (const migration of migrations) {
      const applied = await this.select<{ version: string }>(
        "SELECT version FROM __timeaura_migrations WHERE version = ?",
        [migration.version],
      );

      if (applied.length > 0) {
        continue;
      }

      await this.transaction(async (tx) => {
        for (const statement of splitSqlStatements(migration.sql)) {
          await tx.execute(statement);
        }
        await tx.execute(
          "INSERT INTO __timeaura_migrations (version, description, applied_at) VALUES (?, ?, ?)",
          [migration.version, migration.description, new Date().toISOString()],
        );
      });
    }
  }

  async close(): Promise<void> {
    await this.database.close();
  }
}

async function loadTauriSqliteDatabase(databaseUrl: string): Promise<SqliteDatabaseDriver> {
  const plugin = await import("@tauri-apps/plugin-sql");
  const Database = (plugin as unknown as { default: { load: SqliteDriverLoader } }).default;
  return Database.load(databaseUrl);
}

function splitSqlStatements(sql: string): string[] {
  const statements: string[] = [];
  let buffer = "";
  let inSingleQuote = false;
  let inDoubleQuote = false;

  for (const char of sql) {
    if (char === "'" && !inDoubleQuote) {
      inSingleQuote = !inSingleQuote;
    } else if (char === "\"" && !inSingleQuote) {
      inDoubleQuote = !inDoubleQuote;
    }

    if (char === ";" && !inSingleQuote && !inDoubleQuote) {
      const statement = buffer.trim();
      if (statement) {
        statements.push(statement);
      }
      buffer = "";
      continue;
    }

    buffer += char;
  }

  const tail = buffer.trim();
  if (tail) {
    statements.push(tail);
  }

  return statements;
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
