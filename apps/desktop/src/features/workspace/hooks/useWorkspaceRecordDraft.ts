import { useEffect, useMemo, useState } from "react";

import type { AppServices, RecordEntity } from "@timeaura-core";

import type { ContentMode, RecordDraft } from "../types";
import { fromInputValue, sameTags, toInputValue } from "../utils";

interface UseWorkspaceRecordDraftOptions {
  selectedRecord: RecordEntity | null;
  services: AppServices;
  syncWorkspace(afterMessage?: string): Promise<void>;
  onMessage(message: string): void;
}

export function useWorkspaceRecordDraft({
  selectedRecord,
  services,
  syncWorkspace,
  onMessage,
}: UseWorkspaceRecordDraftOptions) {
  const [draft, setDraft] = useState<RecordDraft | null>(null);
  const [contentMode, setContentMode] = useState<ContentMode>("edit");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!selectedRecord) {
      setDraft(null);
      return;
    }

    setDraft({
      title: selectedRecord.title,
      status: selectedRecord.status,
      priority: selectedRecord.priority,
      dueAt: toInputValue(selectedRecord.dueAt),
      plannedAt: toInputValue(selectedRecord.plannedAt),
      contentMarkdown: selectedRecord.contentMarkdown,
      tags: selectedRecord.tags,
      isPinned: selectedRecord.isPinned,
    });
    setContentMode("edit");
  }, [selectedRecord]);

  const draftDirty = useMemo(() => {
    if (!selectedRecord || !draft) {
      return false;
    }

    return (
      draft.title !== selectedRecord.title ||
      draft.status !== selectedRecord.status ||
      draft.priority !== selectedRecord.priority ||
      draft.dueAt !== toInputValue(selectedRecord.dueAt) ||
      draft.plannedAt !== toInputValue(selectedRecord.plannedAt) ||
      draft.contentMarkdown !== selectedRecord.contentMarkdown ||
      draft.isPinned !== selectedRecord.isPinned ||
      !sameTags(draft.tags, selectedRecord.tags)
    );
  }, [draft, selectedRecord]);

  async function saveDraft(): Promise<void> {
    if (!selectedRecord || !draft) {
      return;
    }

    setSaving(true);

    try {
      await services.recordService.updateRecord(selectedRecord.id, {
        title: draft.title.trim(),
        status: draft.status,
        priority: draft.priority,
        dueAt: fromInputValue(draft.dueAt),
        plannedAt: fromInputValue(draft.plannedAt),
        contentMarkdown: draft.contentMarkdown,
        tags: draft.tags,
        isPinned: draft.isPinned,
      });

      await syncWorkspace("记录已保存");
    } finally {
      setSaving(false);
    }
  }

  async function generateSummary(): Promise<void> {
    if (!selectedRecord) {
      return;
    }

    setSaving(true);

    try {
      const result = await services.aiService.generateSummary({ recordId: selectedRecord.id });
      await services.recordService.updateRecord(selectedRecord.id, {
        aiSummary: result.content,
      });
      await syncWorkspace("AI 摘要已写入");
    } finally {
      setSaving(false);
    }
  }

  async function polishMarkdown(): Promise<void> {
    if (!selectedRecord || !draft) {
      return;
    }

    setSaving(true);

    try {
      const result = await services.aiService.polishMarkdown({
        recordId: selectedRecord.id,
        markdown: draft.contentMarkdown,
      });
      setDraft({
        ...draft,
        contentMarkdown: result.content,
      });
      setContentMode("preview");
      onMessage("内容已完成 AI 润色，可预览后再保存");
    } finally {
      setSaving(false);
    }
  }

  function toggleTag(tagValue: string): void {
    if (!draft) {
      return;
    }

    const hasTag = draft.tags.includes(tagValue);
    const nextTags = hasTag
      ? draft.tags.filter((item) => item !== tagValue)
      : [...draft.tags.filter((item) => item !== "tag_uncategorized"), tagValue];

    setDraft({
      ...draft,
      tags: nextTags.length > 0 ? nextTags : ["tag_uncategorized"],
    });
  }

  return {
    draft,
    setDraft,
    contentMode,
    setContentMode,
    saving,
    draftDirty,
    saveDraft,
    generateSummary,
    polishMarkdown,
    toggleTag,
  };
}
