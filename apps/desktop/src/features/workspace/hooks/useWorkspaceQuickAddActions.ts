import { useCallback, useEffect, useState } from "react";
import type { RefObject } from "react";

import type { AppServices, TagEntity } from "@timeaura-core";

import type { WorkspaceCommandResult } from "../contracts";

interface UseWorkspaceQuickAddActionsOptions {
  activeTagId: string;
  tags: TagEntity[];
  quickAddRef: RefObject<HTMLInputElement>;
  services: AppServices;
  onSelectCreatedRecord(recordId: string): void;
  syncWorkspace(afterMessage?: string): Promise<void>;
}

export function useWorkspaceQuickAddActions({
  activeTagId,
  tags,
  quickAddRef,
  services,
  onSelectCreatedRecord,
  syncWorkspace,
}: UseWorkspaceQuickAddActionsOptions) {
  const [quickAdd, setQuickAdd] = useState("");
  const [quickAddTagId, setQuickAddTagId] = useState("");

  useEffect(() => {
    setQuickAddTagId((current) => resolveQuickAddTagId(current, activeTagId, tags));
  }, [activeTagId, tags]);

  const handleQuickAdd = useCallback(async (): Promise<WorkspaceCommandResult<{ recordId: string }>> => {
    const title = quickAdd.trim();

    if (!title) {
      return {
        status: "noop",
      };
    }

    const created = await services.recordService.createRecord({
      title,
      tags: quickAddTagId ? [quickAddTagId] : undefined,
      priority: "P3",
      status: "未开始",
      plannedAt: null,
    });

    setQuickAdd("");
    onSelectCreatedRecord(created.id);
    await syncWorkspace("已新增记录");
    quickAddRef.current?.focus();
    return {
      status: "success",
      message: "已新增记录",
      data: { recordId: created.id },
    };
  }, [onSelectCreatedRecord, quickAdd, quickAddRef, quickAddTagId, services.recordService, syncWorkspace]);

  return {
    quickAdd,
    quickAddTagId,
    setQuickAdd,
    setQuickAddTagId,
    handleQuickAdd,
  };
}

function resolveQuickAddTagId(currentTagId: string, activeTagId: string, tags: TagEntity[]): string {
  if (currentTagId && tags.some((tag) => tag.id === currentTagId)) {
    return currentTagId;
  }

  if (activeTagId !== "all" && tags.some((tag) => tag.id === activeTagId)) {
    return activeTagId;
  }

  return (
    tags.find((tag) => !tag.isSystem && tag.id !== "tag_uncategorized")?.id ??
    tags.find((tag) => !tag.isSystem)?.id ??
    tags[0]?.id ??
    ""
  );
}
