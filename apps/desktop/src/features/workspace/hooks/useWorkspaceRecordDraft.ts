import { useCallback, useEffect, useMemo, useRef, useState } from "react";

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
  const [persistedDraft, setPersistedDraft] = useState<RecordDraft | null>(null);
  const [contentMode, setContentMode] = useState<ContentMode>("edit");
  const [saving, setSaving] = useState(false);
  const activeRecordIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!selectedRecord) {
      activeRecordIdRef.current = null;
      setDraft(null);
      setPersistedDraft(null);
      return;
    }

    const nextPersistedDraft = createDraftFromRecord(selectedRecord);
    const switchingRecord = activeRecordIdRef.current !== selectedRecord.id;
    activeRecordIdRef.current = selectedRecord.id;

    setPersistedDraft(nextPersistedDraft);
    setDraft((currentDraft) => {
      if (switchingRecord || !currentDraft || !persistedDraft || sameDraft(currentDraft, persistedDraft)) {
        return nextPersistedDraft;
      }

      return currentDraft;
    });
    if (switchingRecord) {
      setContentMode("edit");
    }
  }, [selectedRecord?.id, selectedRecord?.updatedAt]);

  const draftDirty = useMemo(() => {
    if (!draft || !persistedDraft) {
      return false;
    }

    return !sameDraft(draft, persistedDraft);
  }, [draft, persistedDraft]);

  const saveDraft = useCallback(async (options?: {
    silent?: boolean;
    draftOverride?: RecordDraft | null;
  }): Promise<void> => {
    const targetDraft = options?.draftOverride ?? draft;

    if (!selectedRecord || !targetDraft) {
      return;
    }

    setSaving(true);

    try {
      const normalizedDraft = {
        ...targetDraft,
        title: targetDraft.title.trim(),
      };

      await services.recordService.updateRecord(selectedRecord.id, {
        title: normalizedDraft.title,
        status: normalizedDraft.status,
        priority: normalizedDraft.priority,
        dueAt: fromInputValue(normalizedDraft.dueAt),
        plannedAt: fromInputValue(normalizedDraft.plannedAt),
        contentMarkdown: normalizedDraft.contentMarkdown,
        tags: normalizedDraft.tags,
        isPinned: normalizedDraft.isPinned,
      });

      setPersistedDraft(normalizedDraft);
      setDraft((currentDraft) => {
        if (!currentDraft || !sameDraft(currentDraft, targetDraft)) {
          return currentDraft;
        }

        return normalizedDraft;
      });
      await syncWorkspace(options?.silent ? undefined : "记录已保存");
    } finally {
      setSaving(false);
    }
  }, [draft, selectedRecord, services.recordService, syncWorkspace]);

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
      onMessage("内容已完成 AI 润色，正在自动保存");
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

  useEffect(() => {
    if (!selectedRecord || !draft || !draftDirty || saving) {
      return;
    }

    const draftSnapshot = draft;
    const timer = window.setTimeout(() => {
      void saveDraft({
        silent: true,
        draftOverride: draftSnapshot,
      });
    }, 450);

    return () => {
      window.clearTimeout(timer);
    };
  }, [draft, draftDirty, saveDraft, saving, selectedRecord]);

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

function createDraftFromRecord(record: RecordEntity): RecordDraft {
  return {
    title: record.title,
    status: record.status,
    priority: record.priority,
    dueAt: toInputValue(record.dueAt),
    plannedAt: toInputValue(record.plannedAt),
    contentMarkdown: record.contentMarkdown,
    tags: record.tags,
    isPinned: record.isPinned,
  };
}

function sameDraft(left: RecordDraft, right: RecordDraft): boolean {
  return (
    left.title === right.title &&
    left.status === right.status &&
    left.priority === right.priority &&
    left.dueAt === right.dueAt &&
    left.plannedAt === right.plannedAt &&
    left.contentMarkdown === right.contentMarkdown &&
    left.isPinned === right.isPinned &&
    sameTags(left.tags, right.tags)
  );
}
