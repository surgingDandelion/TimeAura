import { useCallback } from "react";

import type { AppServices } from "@timeaura-core";

import type { WorkspaceCommandResult } from "../contracts";
import { createDefaultWorkspaceTestSeams, type WorkspaceTestSeams } from "../testSeams";

interface UseWorkspaceRecordActionsOptions {
  batchTargetIds: string[];
  selectedId: string | null;
  selectedIds: string[];
  services: AppServices;
  clearSelection(): void;
  setSelectedId(recordId: string | null): void;
  setSelectedIds(updater: (current: string[]) => string[]): void;
  syncWorkspace(afterMessage?: string): Promise<void>;
  seams?: WorkspaceTestSeams;
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
  seams = createDefaultWorkspaceTestSeams(),
}: UseWorkspaceRecordActionsOptions) {
  const handleComplete = useCallback(async (recordId: string): Promise<WorkspaceCommandResult<{ recordId: string }>> => {
    await services.recordService.completeRecord(recordId);
    await syncWorkspace("已完成该任务");
    return {
      status: "success",
      message: "已完成该任务",
      data: { recordId },
    };
  }, [services.recordService, syncWorkspace]);

  const handleDelete = useCallback(async (recordId: string): Promise<WorkspaceCommandResult<{ recordId: string }>> => {
    const confirmed = await seams.confirm.confirm("确认将这条记录移入回收站吗？");

    if (!confirmed) {
      return {
        status: "cancelled",
      };
    }

    await services.recordService.deleteRecord(recordId);

    if (selectedId === recordId) {
      setSelectedId(null);
    }

    setSelectedIds((current) => current.filter((id) => id !== recordId));
    await syncWorkspace("记录已移入回收站");
    return {
      status: "success",
      message: "记录已移入回收站",
      data: { recordId },
    };
  }, [selectedId, seams.confirm, services.recordService, setSelectedId, setSelectedIds, syncWorkspace]);

  const handleArchive = useCallback(async (recordId: string): Promise<WorkspaceCommandResult<{ recordId: string }>> => {
    await services.recordService.archiveRecord(recordId);
    await syncWorkspace("记录已归档");
    return {
      status: "success",
      message: "记录已归档",
      data: { recordId },
    };
  }, [services.recordService, syncWorkspace]);

  const handleReschedule = useCallback(async (preset: "plus_1_hour" | "tomorrow_09" | "today_18"): Promise<WorkspaceCommandResult<{ count: number }>> => {
    if (batchTargetIds.length === 0) {
      return {
        status: "noop",
      };
    }

    await services.recordService.batchReschedule(batchTargetIds, { preset });
    clearSelection();
    await syncWorkspace(selectedIds.length > 0 ? "已完成批量改期" : "已完成一键改期");
    return {
      status: "success",
      message: selectedIds.length > 0 ? "已完成批量改期" : "已完成一键改期",
      data: { count: batchTargetIds.length },
    };
  }, [batchTargetIds, clearSelection, selectedIds.length, services.recordService, syncWorkspace]);

  return {
    handleComplete,
    handleDelete,
    handleArchive,
    handleReschedule,
  };
}
