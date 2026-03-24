import { useEffect, useMemo, useState } from "react";

import type { AppServices, ReminderHit, ReminderSummary } from "@timeaura-core";

import { fromInputValue, resolvePresetDate, toInputValue } from "../utils";

interface UseWorkspaceReminderActionsOptions {
  reminder: ReminderSummary | null;
  reminderHits: ReminderHit[];
  services: AppServices;
  syncWorkspace(afterMessage?: string): Promise<void>;
  onMessage(message: string): void;
}

export function useWorkspaceReminderActions({
  reminder,
  reminderHits,
  services,
  syncWorkspace,
  onMessage,
}: UseWorkspaceReminderActionsOptions) {
  const [reminderExpanded, setReminderExpanded] = useState(false);
  const [reminderSelectedIds, setReminderSelectedIds] = useState<string[]>([]);
  const [reminderSelectedOnly, setReminderSelectedOnly] = useState(false);
  const [customReminderTimeOpen, setCustomReminderTimeOpen] = useState(false);
  const [customReminderDueAt, setCustomReminderDueAt] = useState("");

  const activeReminderHits = useMemo(
    () => (reminder ? reminderHits.filter((hit) => hit.reminderKind === reminder.kind) : []),
    [reminder, reminderHits],
  );
  const activeReminderTargetIds = useMemo(
    () => activeReminderHits.map((hit) => hit.id),
    [activeReminderHits],
  );
  const visibleReminderSelectedCount = useMemo(
    () => activeReminderTargetIds.filter((id) => reminderSelectedIds.includes(id)).length,
    [activeReminderTargetIds, reminderSelectedIds],
  );

  useEffect(() => {
    setReminderSelectedIds((current) => current.filter((id) => activeReminderTargetIds.includes(id)));
  }, [activeReminderTargetIds]);

  useEffect(() => {
    if (reminderSelectedIds.length > 0) {
      return;
    }

    setReminderSelectedOnly(false);
  }, [reminderSelectedIds]);

  const customReminderValidation = useMemo(() => {
    const errors: string[] = [];
    const targetIds = getReminderActionTargetIds();

    if (targetIds.length === 0) {
      errors.push("当前没有可改期的提醒命中任务。");
    }

    if (!customReminderDueAt) {
      errors.push("请选择新的截止时间。");
      return errors;
    }

    const date = new Date(customReminderDueAt);

    if (Number.isNaN(date.getTime())) {
      errors.push("时间格式无效，请重新选择。");
      return errors;
    }

    if (date.getTime() <= Date.now()) {
      errors.push("新的截止时间需晚于当前时间。");
    }

    return errors;
  }, [activeReminderTargetIds, customReminderDueAt, reminderSelectedIds, reminderSelectedOnly]);

  function getReminderActionTargetIds(): string[] {
    if (reminderSelectedOnly && reminderSelectedIds.length > 0) {
      return reminderSelectedIds;
    }

    return activeReminderTargetIds;
  }

  async function handleReminderReschedule(preset: "plus_1_hour" | "tomorrow_09" | "today_18"): Promise<void> {
    const targetIds = getReminderActionTargetIds();

    if (targetIds.length === 0) {
      return;
    }

    await services.recordService.batchReschedule(targetIds, { preset });
    setReminderSelectedIds([]);
    setReminderSelectedOnly(false);
    await syncWorkspace(reminderSelectedOnly ? "已完成仅改选中改期" : "已完成提醒命中改期");
  }

  async function handleSnoozeReminder(minutes: number): Promise<void> {
    const targetIds = getReminderActionTargetIds();

    if (targetIds.length === 0) {
      return;
    }

    await services.reminderService.snoozeReminder(targetIds, minutes);
    setReminderSelectedIds([]);
    setReminderSelectedOnly(false);
    await syncWorkspace(`已延后提醒 ${minutes} 分钟`);
  }

  function openCustomReminderReschedule(): void {
    const nextDefault = activeReminderHits[0]?.dueAt ?? resolvePresetDate("tomorrow_09");

    setCustomReminderDueAt(toInputValue(nextDefault));
    setCustomReminderTimeOpen(true);
  }

  function applyCustomReminderPreset(
    preset: "plus_1_hour" | "today_18" | "tomorrow_09" | "friday_18" | "next_monday_09",
  ): void {
    setCustomReminderDueAt(toInputValue(resolvePresetDate(preset)));
  }

  async function submitCustomReminderReschedule(): Promise<void> {
    const targetIds = getReminderActionTargetIds();
    const customAt = fromInputValue(customReminderDueAt);

    if (customReminderValidation.length > 0 || targetIds.length === 0 || !customAt) {
      onMessage(customReminderValidation[0] ?? "请先选择命中任务，并设置新的时间");
      return;
    }

    await services.recordService.batchReschedule(targetIds, {
      preset: "custom",
      customAt,
    });
    setCustomReminderTimeOpen(false);
    setReminderSelectedIds([]);
    setReminderSelectedOnly(false);
    await syncWorkspace("已完成自定义改期");
  }

  function toggleReminderSelection(recordId: string): void {
    setReminderSelectedIds((current) =>
      current.includes(recordId) ? current.filter((id) => id !== recordId) : [...current, recordId],
    );
  }

  function toggleSelectAllReminderHits(): void {
    if (visibleReminderSelectedCount === activeReminderTargetIds.length && activeReminderTargetIds.length > 0) {
      setReminderSelectedIds([]);
      setReminderSelectedOnly(false);
      return;
    }

    setReminderSelectedIds(activeReminderTargetIds);
  }

  return {
    reminderExpanded,
    setReminderExpanded,
    reminderSelectedIds,
    reminderSelectedOnly,
    setReminderSelectedOnly,
    customReminderTimeOpen,
    setCustomReminderTimeOpen,
    customReminderDueAt,
    setCustomReminderDueAt,
    activeReminderHits,
    activeReminderTargetIds,
    visibleReminderSelectedCount,
    customReminderValidation,
    handleReminderReschedule,
    handleSnoozeReminder,
    openCustomReminderReschedule,
    applyCustomReminderPreset,
    submitCustomReminderReschedule,
    toggleReminderSelection,
    toggleSelectAllReminderHits,
  };
}
