export interface WorkspaceConfirmSeam {
  confirm(message: string): boolean | Promise<boolean>;
}

export interface WorkspaceDownloadJsonSeam {
  downloadJson(fileName: string, payload: unknown): void;
}

export interface WorkspaceClockSeam {
  now(): Date;
  nowIso(): string;
  fileTimestamp(): string;
}

export interface WorkspaceTestSeams {
  confirm: WorkspaceConfirmSeam;
  download: WorkspaceDownloadJsonSeam;
  clock: WorkspaceClockSeam;
}

export function createDefaultWorkspaceTestSeams(): WorkspaceTestSeams {
  return {
    confirm: {
      confirm(message) {
        return globalThis.confirm?.(message) ?? true;
      },
    },
    download: {
      downloadJson(fileName, payload) {
        const blob = new Blob([JSON.stringify(payload, null, 2)], {
          type: "application/json;charset=utf-8",
        });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");

        link.href = url;
        link.download = fileName;
        link.click();
        URL.revokeObjectURL(url);
      },
    },
    clock: {
      now() {
        return new Date();
      },
      nowIso() {
        return new Date().toISOString();
      },
      fileTimestamp() {
        return formatWorkspaceFileTimestamp(new Date());
      },
    },
  };
}

export function formatWorkspaceFileTimestamp(value: Date): string {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  const hours = String(value.getHours()).padStart(2, "0");
  const minutes = String(value.getMinutes()).padStart(2, "0");
  const seconds = String(value.getSeconds()).padStart(2, "0");

  return `${year}${month}${day}-${hours}${minutes}${seconds}`;
}
