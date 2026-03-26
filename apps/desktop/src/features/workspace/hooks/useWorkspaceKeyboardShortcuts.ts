import { useEffect } from "react";

import type { RecordEntity } from "@timeaura-core";

import type { WorkspaceShortcutItem } from "../types";
import { isEditableElement } from "../utils";

export const WORKSPACE_SHORTCUT_ITEMS: WorkspaceShortcutItem[] = [
  {
    id: "quick-add",
    keys: "⌘/Ctrl + N",
    description: "打开快速新增弹层，并聚焦单行输入框。",
  },
  {
    id: "search",
    keys: "⌘/Ctrl + F",
    description: "聚焦列表搜索框，用于模糊检索标题和内容。",
  },
  {
    id: "save",
    keys: "⌘/Ctrl + S",
    description: "立即同步当前详情改动。",
  },
  {
    id: "help",
    keys: "⌘/Ctrl + /",
    description: "打开快捷键帮助面板，查看当前工作台支持的操作。",
  },
  {
    id: "navigate",
    keys: "↑ / ↓",
    description: "在非输入状态下切换当前列表记录，并同步更新右侧详情。",
  },
  {
    id: "select",
    keys: "Space",
    description: "对当前高亮记录执行多选勾选或取消勾选。",
  },
  {
    id: "close",
    keys: "Esc",
    description: "按优先级关闭改期弹层、标签管理、快捷键帮助或右侧详情。",
  },
];

interface UseWorkspaceKeyboardShortcutsOptions {
  records: RecordEntity[];
  selectedId: string | null;
  selectedRecord: RecordEntity | null;
  draftDirty: boolean;
  saving: boolean;
  customReminderTimeOpen: boolean;
  tagManagerOpen: boolean;
  shortcutHelpOpen: boolean;
  onFocusQuickAdd(): void;
  onFocusSearch(): void;
  onSave(): void;
  onCloseCustomReminder(): void;
  onCloseTagManager(): void;
  onCloseShortcutHelp(): void;
  onCloseInspector(): void;
  onSelectRecord(recordId: string | null): void;
  onToggleSelection(recordId: string): void;
  onOpenShortcutHelp(): void;
}

export function useWorkspaceKeyboardShortcuts({
  records,
  selectedId,
  selectedRecord,
  draftDirty,
  saving,
  customReminderTimeOpen,
  tagManagerOpen,
  shortcutHelpOpen,
  onFocusQuickAdd,
  onFocusSearch,
  onSave,
  onCloseCustomReminder,
  onCloseTagManager,
  onCloseShortcutHelp,
  onCloseInspector,
  onSelectRecord,
  onToggleSelection,
  onOpenShortcutHelp,
}: UseWorkspaceKeyboardShortcutsOptions): void {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const commandPressed = event.metaKey || event.ctrlKey;

      if (commandPressed && event.key.toLowerCase() === "n") {
        event.preventDefault();
        onFocusQuickAdd();
        return;
      }

      if (commandPressed && event.key.toLowerCase() === "f") {
        event.preventDefault();
        onFocusSearch();
        return;
      }

      if (commandPressed && event.key.toLowerCase() === "s" && selectedRecord && draftDirty && !saving) {
        event.preventDefault();
        onSave();
        return;
      }

      if (commandPressed && event.key === "/") {
        event.preventDefault();
        onOpenShortcutHelp();
        return;
      }

      if (event.key === "Escape") {
        if (customReminderTimeOpen) {
          event.preventDefault();
          onCloseCustomReminder();
          return;
        }

        if (tagManagerOpen) {
          event.preventDefault();
          onCloseTagManager();
          return;
        }

        if (shortcutHelpOpen) {
          event.preventDefault();
          onCloseShortcutHelp();
          return;
        }

        if (selectedId) {
          event.preventDefault();
          onCloseInspector();
        }
        return;
      }

      if (customReminderTimeOpen || tagManagerOpen || shortcutHelpOpen || isEditableElement(target)) {
        return;
      }

      if (event.key === "ArrowDown" || event.key === "ArrowUp") {
        event.preventDefault();

        if (records.length === 0) {
          return;
        }

        const currentIndex = selectedId ? records.findIndex((record) => record.id === selectedId) : -1;

        if (event.key === "ArrowDown") {
          const nextIndex = currentIndex < records.length - 1 ? currentIndex + 1 : 0;
          onSelectRecord(records[nextIndex]?.id ?? null);
          return;
        }

        const nextIndex = currentIndex <= 0 ? records.length - 1 : currentIndex - 1;
        onSelectRecord(records[nextIndex]?.id ?? null);
        return;
      }

      if (event.key === " " && selectedId) {
        event.preventDefault();
        onToggleSelection(selectedId);
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [
    customReminderTimeOpen,
    draftDirty,
    onCloseCustomReminder,
    onCloseInspector,
    onCloseShortcutHelp,
    onCloseTagManager,
    onFocusQuickAdd,
    onFocusSearch,
    onOpenShortcutHelp,
    onSave,
    onSelectRecord,
    onToggleSelection,
    records,
    saving,
    selectedId,
    selectedRecord,
    shortcutHelpOpen,
    tagManagerOpen,
  ]);
}
