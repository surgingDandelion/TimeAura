import { useCallback, useEffect, useMemo, useState } from "react";

import type { AppServices, RecordEntity, ReminderHit, ReminderSummary, TagEntity } from "@timeaura-core";

import type { WorkspaceSort, WorkspaceStatusFilter } from "../types";

interface UseWorkspaceDataOptions {
  activeTagId: string;
  activeView: "today" | "plan" | "all" | "done";
  services: AppServices;
}

export function useWorkspaceData({
  activeTagId,
  activeView,
  services,
}: UseWorkspaceDataOptions) {
  const [records, setRecords] = useState<RecordEntity[]>([]);
  const [tags, setTags] = useState<TagEntity[]>([]);
  const [keyword, setKeyword] = useState("");
  const [status, setStatus] = useState<WorkspaceStatusFilter>("todo");
  const [sortBy, setSortBy] = useState<WorkspaceSort>("smart");
  const [reminder, setReminder] = useState<ReminderSummary | null>(null);
  const [reminderHits, setReminderHits] = useState<ReminderHit[]>([]);
  const [loading, setLoading] = useState(false);

  const loadWorkspace = useCallback(async () => {
    setLoading(true);

    try {
      const [recordResult, tagResult, reminderResult, reminderHitsResult] = await Promise.all([
        services.recordService.listRecords({
          view: activeView,
          keyword: keyword.trim() || undefined,
          status: activeView === "done" ? "done" : status,
          tagId: activeTagId,
          sortBy,
        }),
        services.tagService.listTags(),
        services.reminderService.getReminderSummary(new Date().toISOString()),
        services.reminderService.listReminderHits(new Date().toISOString()),
      ]);

      setRecords(recordResult.items);
      setTags(tagResult);
      setReminder(reminderResult);
      setReminderHits(reminderHitsResult);
    } finally {
      setLoading(false);
    }
  }, [activeTagId, activeView, keyword, services.recordService, services.reminderService, services.tagService, sortBy, status]);

  useEffect(() => {
    void loadWorkspace();
  }, [loadWorkspace]);

  const currentTagName = useMemo(
    () => (activeTagId === "all" ? "全部标签" : tags.find((tag) => tag.id === activeTagId)?.name ?? "当前标签"),
    [activeTagId, tags],
  );

  return {
    records,
    setRecords,
    tags,
    setTags,
    keyword,
    setKeyword,
    status,
    setStatus,
    sortBy,
    setSortBy,
    reminder,
    reminderHits,
    loading,
    currentTagName,
    loadWorkspace,
  };
}
