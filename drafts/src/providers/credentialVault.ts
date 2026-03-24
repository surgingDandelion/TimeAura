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
    const runtime = await this.getRuntime();
    const value = await runtime.store.get(ref);

    if (!value) {
      return null;
    }

    return new TextDecoder().decode(value);
  }

  async setSecret(ref: string, value: string): Promise<void> {
    const runtime = await this.getRuntime();
    await runtime.store.insert(ref, new TextEncoder().encode(value));
    await runtime.stronghold.save();
  }

  async removeSecret(ref: string): Promise<void> {
    const runtime = await this.getRuntime();
    await runtime.store.remove(ref);
    await runtime.stronghold.save();
  }

  async dispose(): Promise<void> {
    const runtime = await this.getRuntime();
    await runtime.stronghold.unload();
    this.strongholdPromise = null;
  }

  private async getRuntime(): Promise<StrongholdRuntime> {
    if (!this.strongholdPromise) {
      this.strongholdPromise = createStrongholdRuntime({
        snapshotPath: this.snapshotPath,
        password: this.options.password,
        clientName: this.clientName,
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
    get(key: string): Promise<Uint8Array | null>;
    insert(key: string, value: Uint8Array): Promise<void>;
    remove(key: string): Promise<Uint8Array | null>;
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
