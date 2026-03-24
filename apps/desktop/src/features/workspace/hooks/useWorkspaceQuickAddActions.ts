import { useCallback, useState } from "react";
import type { RefObject } from "react";

import type { AppServices } from "@timeaura-core";

interface UseWorkspaceQuickAddActionsOptions {
  activeTagId: string;
  quickAddRef: RefObject<HTMLInputElement>;
  services: AppServices;
  onSelectCreatedRecord(recordId: string): void;
  syncWorkspace(afterMessage?: string): Promise<void>;
}

export function useWorkspaceQuickAddActions({
  activeTagId,
  quickAddRef,
  services,
  onSelectCreatedRecord,
  syncWorkspace,
}: UseWorkspaceQuickAddActionsOptions) {
  const [quickAdd, setQuickAdd] = useState("");

  const handleQuickAdd = useCallback(async (): Promise<void> => {
    const title = quickAdd.trim();

    if (!title) {
      return;
    }

    const created = await services.recordService.createRecord({
      title,
      tags: activeTagId !== "all" ? [activeTagId] : undefined,
      priority: "P3",
      status: "未开始",
      plannedAt: null,
    });

    setQuickAdd("");
    onSelectCreatedRecord(created.id);
    await syncWorkspace("已新增记录");
    quickAddRef.current?.focus();
  }, [activeTagId, onSelectCreatedRecord, quickAdd, quickAddRef, services.recordService, syncWorkspace]);

  return {
    quickAdd,
    setQuickAdd,
    handleQuickAdd,
  };
}
