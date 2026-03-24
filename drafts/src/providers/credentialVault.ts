export interface CredentialVault {
  getSecret(ref: string): Promise<string | null>;
  setSecret(ref: string, value: string): Promise<void>;
  removeSecret(ref: string): Promise<void>;
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
