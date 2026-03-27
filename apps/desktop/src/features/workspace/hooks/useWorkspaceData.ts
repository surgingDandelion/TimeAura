import { useCallback, useEffect, useMemo, useState } from "react";

import type { AppServices, RecordEntity, ReminderHit, ReminderSummary, TagEntity } from "@timeaura-core";

import type { WorkspacePriorityFilter, WorkspaceSort, WorkspaceStatusFilter } from "../types";

interface UseWorkspaceDataOptions {
  activeTagId: string;
  activeView: "today" | "plan" | "all" | "done";
  dataVersion?: number;
  services: AppServices;
}

export function useWorkspaceData({
  activeTagId,
  activeView,
  dataVersion,
  services,
}: UseWorkspaceDataOptions) {
  const [records, setRecords] = useState<RecordEntity[]>([]);
  const [tags, setTags] = useState<TagEntity[]>([]);
  const [keyword, setKeyword] = useState("");
  const [status, setStatus] = useState<WorkspaceStatusFilter>("todo");
  const [priority, setPriority] = useState<WorkspacePriorityFilter>("all");
  const [sortBy, setSortBy] = useState<WorkspaceSort>("smart");
  const [reminder, setReminder] = useState<ReminderSummary | null>(null);
  const [reminderHits, setReminderHits] = useState<ReminderHit[]>([]);
  const [loading, setLoading] = useState(false);

  const loadWorkspace = useCallback(async () => {
    setLoading(true);

    try {
      const [recordResult, tagResult, reminderResult, reminderHitsResult] = await Promise.allSettled([
        services.recordService.listRecords({
          view: activeView,
          keyword: keyword.trim() || undefined,
          status: activeView === "done" ? "done" : status,
          priority,
          tagId: activeTagId,
          sortBy,
        }),
        services.tagService.listTags(),
        services.reminderService.getReminderSummary(new Date().toISOString()),
        services.reminderService.listReminderHits(new Date().toISOString()),
      ]);

      if (recordResult.status === "fulfilled") {
        setRecords(recordResult.value.items);
      } else {
        reportWorkspaceLoadIssue("records", recordResult.reason);
      }

      if (tagResult.status === "fulfilled") {
        setTags(tagResult.value.filter((tag) => tag.id !== "tag_uncategorized" && tag.name !== "未分类"));
      } else {
        reportWorkspaceLoadIssue("tags", tagResult.reason);
      }

      if (reminderResult.status === "fulfilled") {
        setReminder(reminderResult.value);
      } else {
        setReminder(null);
        reportWorkspaceLoadIssue("reminder-summary", reminderResult.reason);
      }

      if (reminderHitsResult.status === "fulfilled") {
        setReminderHits(reminderHitsResult.value);
      } else {
        setReminderHits([]);
        reportWorkspaceLoadIssue("reminder-hits", reminderHitsResult.reason);
      }
    } finally {
      setLoading(false);
    }
  }, [activeTagId, activeView, dataVersion, keyword, priority, services.recordService, services.reminderService, services.tagService, sortBy, status]);

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
    priority,
    setPriority,
    sortBy,
    setSortBy,
    reminder,
    reminderHits,
    loading,
    currentTagName,
    loadWorkspace,
  };
}

function reportWorkspaceLoadIssue(scope: string, reason: unknown): void {
  console.error(`[timeaura] workspace load issue (${scope})`, reason);
}
