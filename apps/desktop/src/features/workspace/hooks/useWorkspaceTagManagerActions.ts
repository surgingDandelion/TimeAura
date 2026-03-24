import { useCallback, useMemo, useState } from "react";

import type { AppServices, TagEntity } from "@timeaura-core";

import type { RecordDraft, TagEditorDraft } from "../types";

interface UseWorkspaceTagManagerActionsOptions {
  activeTagId: string;
  draft: RecordDraft | null;
  services: AppServices;
  tags: TagEntity[];
  onDraftChange(nextDraft: RecordDraft): void;
  onMessage(message: string): void;
  onTagFilterChange(tagId: string): void;
  syncWorkspace(afterMessage?: string): Promise<void>;
}

export function useWorkspaceTagManagerActions({
  activeTagId,
  draft,
  services,
  tags,
  onDraftChange,
  onMessage,
  onTagFilterChange,
  syncWorkspace,
}: UseWorkspaceTagManagerActionsOptions) {
  const [tagManagerOpen, setTagManagerOpen] = useState(false);
  const [tagEditor, setTagEditor] = useState<TagEditorDraft>({
    id: null,
    name: "",
    color: "#5f89ff",
  });

  const editingTag = useMemo(
    () => (tagEditor.id ? tags.find((tag) => tag.id === tagEditor.id) ?? null : null),
    [tagEditor.id, tags],
  );

  const resetTagEditor = useCallback(() => {
    setTagEditor({
      id: null,
      name: "",
      color: "#5f89ff",
    });
  }, []);

  const openTagManager = useCallback(() => {
    setTagManagerOpen(true);
    resetTagEditor();
  }, [resetTagEditor]);

  const startEditTag = useCallback((tag: TagEntity): void => {
    setTagEditor({
      id: tag.id,
      name: tag.name,
      color: tag.color,
    });
  }, []);

  const handleCreateOrUpdateTag = useCallback(async (): Promise<void> => {
    const name = tagEditor.name.trim();

    if (!name) {
      onMessage("标签名称不能为空");
      return;
    }

    if (tagEditor.id) {
      await services.tagService.updateTag(tagEditor.id, {
        name,
        color: tagEditor.color,
      });
      await syncWorkspace("标签已更新");
      return;
    }

    const created = await services.tagService.createTag({
      name,
      color: tagEditor.color,
    });

    if (draft) {
      onDraftChange({
        ...draft,
        tags: [...draft.tags.filter((item) => item !== "tag_uncategorized"), created.id],
      });
    }

    setTagEditor({
      id: created.id,
      name: created.name,
      color: created.color,
    });
    await syncWorkspace("已创建新标签");
  }, [draft, onDraftChange, onMessage, services.tagService, syncWorkspace, tagEditor]);

  const handleDeleteTag = useCallback(async (tag: TagEntity): Promise<void> => {
    const confirmed = globalThis.confirm?.(`确认删除标签“${tag.name}”吗？`) ?? true;

    if (!confirmed) {
      return;
    }

    await services.tagService.deleteTag(tag.id);

    if (activeTagId === tag.id) {
      onTagFilterChange("all");
    }

    if (draft?.tags.includes(tag.id)) {
      onDraftChange({
        ...draft,
        tags: draft.tags.filter((item) => item !== tag.id),
      });
    }

    resetTagEditor();
    await syncWorkspace("标签已删除");
  }, [activeTagId, draft, onDraftChange, onTagFilterChange, resetTagEditor, services.tagService, syncWorkspace]);

  return {
    tagManagerOpen,
    setTagManagerOpen,
    tagEditor,
    setTagEditor,
    editingTag,
    resetTagEditor,
    openTagManager,
    startEditTag,
    handleCreateOrUpdateTag,
    handleDeleteTag,
  };
}
