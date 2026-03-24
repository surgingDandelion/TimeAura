import { useCallback } from "react";

import type { AppServices } from "@timeaura-core";

interface UseWorkspaceRecordActionsOptions {
  batchTargetIds: string[];
  selectedId: string | null;
  selectedIds: string[];
  services: AppServices;
  clearSelection(): void;
  setSelectedId(recordId: string | null): void;
  setSelectedIds(updater: (current: string[]) => string[]): void;
  syncWorkspace(afterMessage?: string): Promise<void>;
}

export function useWorkspaceRecordActions({
  batchTargetIds,
  selectedId,
  selectedIds,
  services,
  clearSelection,
  setSelectedId,
  setSelectedIds,
  syncWorkspace,
}: UseWorkspaceRecordActionsOptions) {
  const handleComplete = useCallback(async (recordId: string): Promise<void> => {
    await services.recordService.completeRecord(recordId);
    await syncWorkspace("已完成该任务");
  }, [services.recordService, syncWorkspace]);

  const handleDelete = useCallback(async (recordId: string): Promise<void> => {
    const confirmed = globalThis.confirm?.("确认删除这条记录吗？") ?? true;

    if (!confirmed) {
      return;
    }

    await services.recordService.deleteRecord(recordId);

    if (selectedId === recordId) {
      setSelectedId(null);
    }

    setSelectedIds((current) => current.filter((id) => id !== recordId));
    await syncWorkspace("记录已删除");
  }, [selectedId, services.recordService, setSelectedId, setSelectedIds, syncWorkspace]);

  const handleArchive = useCallback(async (recordId: string): Promise<void> => {
    await services.recordService.archiveRecord(recordId);
    await syncWorkspace("记录已归档");
  }, [services.recordService, syncWorkspace]);

  const handleReschedule = useCallback(async (preset: "plus_1_hour" | "tomorrow_09" | "today_18"): Promise<void> => {
    if (batchTargetIds.length === 0) {
      return;
    }

    await services.recordService.batchReschedule(batchTargetIds, { preset });
    clearSelection();
    await syncWorkspace(selectedIds.length > 0 ? "已完成批量改期" : "已完成一键改期");
  }, [batchTargetIds, clearSelection, selectedIds.length, services.recordService, syncWorkspace]);

  return {
    handleComplete,
    handleDelete,
    handleArchive,
    handleReschedule,
  };
}
