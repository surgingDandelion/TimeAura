import { useEffect, useMemo, useRef, useState } from "react";

import type { RecordEntity } from "@timeaura-core";

import type { WorkspaceFocusTarget, WorkspaceQuickAddTarget } from "../types";

interface UseWorkspaceSelectionOptions {
  records: RecordEntity[];
  focusTarget: WorkspaceFocusTarget | null;
  quickAddTarget: WorkspaceQuickAddTarget | null;
  onTagFilterChange(tagId: string): void;
  onResetListContext(): void;
  onQuickAddRequested(): void;
}

export function useWorkspaceSelection({
  records,
  focusTarget,
  quickAddTarget,
  onTagFilterChange,
  onResetListContext,
  onQuickAddRequested,
}: UseWorkspaceSelectionOptions) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [highlightedRecordId, setHighlightedRecordId] = useState<string | null>(null);
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [quickAddSpotlight, setQuickAddSpotlight] = useState(false);
  const handledFocusNonceRef = useRef<number | null>(null);
  const handledQuickAddNonceRef = useRef<number | null>(null);

  useEffect(() => {
    if (selectedId && !records.some((record) => record.id === selectedId)) {
      setSelectedId(null);
    }
  }, [records, selectedId]);

  useEffect(() => {
    setSelectedIds((current) => current.filter((id) => records.some((record) => record.id === id)));
  }, [records]);

  useEffect(() => {
    if (!focusTarget?.recordId || handledFocusNonceRef.current === focusTarget.nonce) {
      return;
    }

    handledFocusNonceRef.current = focusTarget.nonce;
    onResetListContext();
    onTagFilterChange("all");
    setSelectedId(focusTarget.recordId);
    setHighlightedRecordId(focusTarget.recordId);
  }, [focusTarget?.nonce, focusTarget?.recordId, onResetListContext, onTagFilterChange]);

  useEffect(() => {
    if (!highlightedRecordId) {
      return;
    }

    const timer = window.setTimeout(() => {
      setHighlightedRecordId((current) => (current === highlightedRecordId ? null : current));
    }, 2200);

    return () => window.clearTimeout(timer);
  }, [highlightedRecordId]);

  useEffect(() => {
    if (!quickAddTarget || handledQuickAddNonceRef.current === quickAddTarget.nonce) {
      return;
    }

    handledQuickAddNonceRef.current = quickAddTarget.nonce;
    onResetListContext();
    onTagFilterChange("all");
    setSelectedId(null);
    openQuickAdd();
  }, [onResetListContext, onTagFilterChange, quickAddTarget?.nonce]);

  useEffect(() => {
    if (!quickAddSpotlight) {
      return;
    }

    const timer = window.setTimeout(() => {
      setQuickAddSpotlight(false);
    }, 1400);

    return () => window.clearTimeout(timer);
  }, [quickAddSpotlight]);

  function openQuickAdd(): void {
    onQuickAddRequested();
    setQuickAddOpen(true);
    setQuickAddSpotlight(true);
  }

  function closeQuickAdd(): void {
    setQuickAddOpen(false);
    setQuickAddSpotlight(false);
  }

  function toggleSelection(recordId: string): void {
    setSelectedIds((current) =>
      current.includes(recordId) ? current.filter((id) => id !== recordId) : [...current, recordId],
    );
  }

  function toggleSelectAllVisible(): void {
    if (visibleSelectedCount === records.length && records.length > 0) {
      setSelectedIds([]);
      return;
    }

    setSelectedIds(records.map((record) => record.id));
  }

  function focusRecord(recordId: string): void {
    setSelectedId(recordId);
    setHighlightedRecordId(recordId);
  }

  function clearSelection(): void {
    setSelectedIds([]);
  }

  function closeInspector(): void {
    setSelectedId(null);
  }

  const selectedCount = selectedIds.length;
  const visibleSelectedCount = useMemo(
    () => records.filter((record) => selectedIds.includes(record.id)).length,
    [records, selectedIds],
  );

  return {
    selectedId,
    setSelectedId,
    selectedIds,
    setSelectedIds,
    selectedCount,
    highlightedRecordId,
    quickAddOpen,
    quickAddSpotlight,
    visibleSelectedCount,
    openQuickAdd,
    closeQuickAdd,
    toggleSelection,
    toggleSelectAllVisible,
    focusRecord,
    clearSelection,
    closeInspector,
  };
}
