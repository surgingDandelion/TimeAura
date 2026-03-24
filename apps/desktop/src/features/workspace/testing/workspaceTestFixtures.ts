import type { WorkspaceTestSeams } from "../testSeams";

export interface RecordedWorkspaceDownload {
  fileName: string;
  payload: unknown;
}

export interface WorkspaceTestFixtureState {
  confirmMessages: string[];
  downloadEvents: RecordedWorkspaceDownload[];
}

export interface WorkspaceTestFixtureOptions {
  confirmResult?: boolean;
  now?: Date;
}

export interface WorkspaceTestFixtureBundle {
  seams: WorkspaceTestSeams;
  state: WorkspaceTestFixtureState;
}

export function createWorkspaceTestFixtureBundle(
  options: WorkspaceTestFixtureOptions = {},
): WorkspaceTestFixtureBundle {
  const confirmMessages: string[] = [];
  const downloadEvents: RecordedWorkspaceDownload[] = [];
  const fixedNow = options.now ?? new Date("2026-01-01T09:30:00.000Z");

  return {
    seams: {
      confirm: {
        confirm(message) {
          confirmMessages.push(message);
          return options.confirmResult ?? true;
        },
      },
      download: {
        downloadJson(fileName, payload) {
          downloadEvents.push({
            fileName,
            payload,
          });
        },
      },
      clock: {
        now() {
          return new Date(fixedNow);
        },
        nowIso() {
          return new Date(fixedNow).toISOString();
        },
        fileTimestamp() {
          return "20260101-093000";
        },
      },
    },
    state: {
      confirmMessages,
      downloadEvents,
    },
  };
}
