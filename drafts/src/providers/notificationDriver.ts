import type { AppNotificationInput } from "../services/index";

export interface NotificationDriver {
  notify(input: AppNotificationInput): Promise<void>;
  cancel(id: string): Promise<void>;
}

export class NoopNotificationDriver implements NotificationDriver {
  async notify(_input: AppNotificationInput): Promise<void> {
    return Promise.resolve();
  }

  async cancel(_id: string): Promise<void> {
    return Promise.resolve();
  }
}
