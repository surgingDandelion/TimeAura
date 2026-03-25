export interface CredentialVault {
  getSecret(ref: string): Promise<string | null>;
  setSecret(ref: string, value: string): Promise<void>;
  removeSecret(ref: string): Promise<void>;
  dispose?(): Promise<void>;
}

export class MemoryCredentialVault implements CredentialVault {
  private readonly secrets = new Map<string, string>();

  async getSecret(ref: string): Promise<string | null> {
    return this.secrets.get(ref) ?? null;
  }

  async setSecret(ref: string, value: string): Promise<void> {
    this.secrets.set(ref, value);
  }

  async removeSecret(ref: string): Promise<void> {
    this.secrets.delete(ref);
  }
}

export interface StrongholdCredentialVaultOptions {
  snapshotPath?: string;
  password: string;
  clientName?: string;
}

export class StrongholdCredentialVault implements CredentialVault {
  private readonly snapshotPath: string;
  private readonly clientName: string;
  private strongholdPromise: Promise<StrongholdRuntime> | null = null;

  constructor(private readonly options: StrongholdCredentialVaultOptions) {
    this.snapshotPath = options.snapshotPath ?? "timeaura.stronghold";
    this.clientName = options.clientName ?? "timeaura";
  }

  async getSecret(ref: string): Promise<string | null> {
    try {
      const runtime = await this.getRuntime();
      const value = await runtime.store.get(ref);

      if (!value) {
        return null;
      }

      return new TextDecoder().decode(value instanceof Uint8Array ? value : Uint8Array.from(value));
    } catch (error) {
      throw wrapStrongholdError(error, "读取 Stronghold 凭证失败");
    }
  }

  async setSecret(ref: string, value: string): Promise<void> {
    try {
      const runtime = await this.getRuntime();
      await runtime.store.insert(ref, Array.from(new TextEncoder().encode(value)));
      await runtime.stronghold.save();
    } catch (error) {
      throw wrapStrongholdError(error, "写入 Stronghold 凭证失败");
    }
  }

  async removeSecret(ref: string): Promise<void> {
    try {
      const runtime = await this.getRuntime();
      await runtime.store.remove(ref);
      await runtime.stronghold.save();
    } catch (error) {
      throw wrapStrongholdError(error, "删除 Stronghold 凭证失败");
    }
  }

  async dispose(): Promise<void> {
    if (!this.strongholdPromise) {
      return;
    }

    const runtimePromise = this.strongholdPromise;
    this.strongholdPromise = null;

    try {
      const runtime = await runtimePromise;
      await runtime.stronghold.unload();
    } catch (error) {
      throw wrapStrongholdError(error, "释放 Stronghold 失败");
    }
  }

  private async getRuntime(): Promise<StrongholdRuntime> {
    if (!this.strongholdPromise) {
      this.strongholdPromise = createStrongholdRuntime({
        snapshotPath: this.snapshotPath,
        password: this.options.password,
        clientName: this.clientName,
      }).catch((error) => {
        this.strongholdPromise = null;
        throw error;
      });
    }

    return this.strongholdPromise;
  }
}

interface StrongholdRuntime {
  stronghold: {
    save(): Promise<void>;
    unload(): Promise<void>;
  };
  store: {
    get(key: string): Promise<number[] | Uint8Array | null>;
    insert(key: string, value: number[]): Promise<void>;
    remove(key: string): Promise<number[] | Uint8Array | null>;
  };
}

async function createStrongholdRuntime(
  options: Required<StrongholdCredentialVaultOptions>,
): Promise<StrongholdRuntime> {
  const strongholdModule = await import("@tauri-apps/plugin-stronghold");
  const stronghold = await strongholdModule.Stronghold.load(options.snapshotPath, options.password);
  let client;

  try {
    client = await stronghold.loadClient(options.clientName);
  } catch {
    client = await stronghold.createClient(options.clientName);
  }

  return {
    stronghold,
    store: client.getStore(),
  };
}

function wrapStrongholdError(error: unknown, fallback: string): Error {
  if (error instanceof Error) {
    return new Error(`${fallback}：${error.message}`);
  }

  return new Error(fallback);
}
