import { useCallback, useEffect, useMemo, useState } from "react";

import type { RecordEntity } from "@timeaura-core";

import { useAppServices } from "../../app/providers/AppServicesProvider";

interface TrashPageProps {
  onTrashChanged?(): void | Promise<void>;
}

export function TrashPage({ onTrashChanged }: TrashPageProps): JSX.Element {
  const { services } = useAppServices();
  const [records, setRecords] = useState<RecordEntity[]>([]);
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const loadTrash = useCallback(async () => {
    setLoading(true);

    try {
      const result = await services.recordService.listRecords({
        view: "all",
        status: "all",
        includeDeleted: true,
        sortBy: "updated",
      });

      setRecords(
        result.items
          .filter((record) => Boolean(record.deletedAt))
          .sort((left, right) => Date.parse(right.deletedAt ?? "") - Date.parse(left.deletedAt ?? "")),
      );
    } catch (error) {
      setMessage(toErrorMessage(error, "回收站加载失败"));
    } finally {
      setLoading(false);
    }
  }, [services.recordService]);

  useEffect(() => {
    void loadTrash();
  }, [loadTrash]);

  const deletedCount = records.length;
  const hasRecords = deletedCount > 0;

  const stats = useMemo(
    () => ({
      reports: records.filter((record) => record.recordKind === "report").length,
      tasks: records.filter((record) => record.recordKind !== "report").length,
    }),
    [records],
  );

  async function handleRestore(recordId: string): Promise<void> {
    setBusyId(recordId);

    try {
      await services.recordService.restoreRecord(recordId);
      setMessage("记录已恢复到主工作台");
      await Promise.allSettled([loadTrash(), onTrashChanged?.()]);
    } catch (error) {
      setMessage(toErrorMessage(error, "恢复记录失败"));
    } finally {
      setBusyId(null);
    }
  }

  async function handleDestroy(recordId: string): Promise<void> {
    const confirmed = globalThis.confirm?.("确认彻底删除这条记录吗？删除后将无法恢复。") ?? true;

    if (!confirmed) {
      return;
    }

    setBusyId(recordId);

    try {
      await services.recordService.destroyRecord(recordId);
      setMessage("记录已彻底删除");
      await Promise.allSettled([loadTrash(), onTrashChanged?.()]);
    } catch (error) {
      setMessage(toErrorMessage(error, "彻底删除记录失败"));
    } finally {
      setBusyId(null);
    }
  }

  async function handleEmptyTrash(): Promise<void> {
    const confirmed = globalThis.confirm?.("确认清空回收站吗？所有已删除记录都会被彻底移除。") ?? true;

    if (!confirmed) {
      return;
    }

    setBusyId("empty");

    try {
      const removedCount = await services.recordService.emptyTrash();
      setMessage(removedCount > 0 ? `已清空回收站，共删除 ${removedCount} 条记录` : "回收站已经是空的");
      await Promise.allSettled([loadTrash(), onTrashChanged?.()]);
    } catch (error) {
      setMessage(toErrorMessage(error, "清空回收站失败"));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="trash-layout">
      <section className="panel trash-page-shell">
        <div className="trash-header">
          <div className="trash-header-copy">
            <h1 className="workspace-page-title">回收站</h1>
            <p className="workspace-page-subtitle">已删除的记录会先暂存在这里，你可以恢复它们，或彻底清理。</p>
          </div>

          <div className="trash-actions">
            <button className="button-mini" onClick={() => void loadTrash()} disabled={loading || busyId !== null}>
              刷新
            </button>
            <button className="button-ghost" onClick={() => void handleEmptyTrash()} disabled={!hasRecords || busyId !== null}>
              清空回收站
            </button>
          </div>
        </div>

        <div className="summary-pills trash-summary-pills">
          <div className="summary-pill">
            <strong>{deletedCount}</strong>
            <span>已删除记录</span>
          </div>
          <div className="summary-pill">
            <strong>{stats.tasks}</strong>
            <span>任务 / 备忘</span>
          </div>
          <div className="summary-pill">
            <strong>{stats.reports}</strong>
            <span>报告记录</span>
          </div>
        </div>

        {message ? <div className="inline-message">{message}</div> : null}

        <div className="card trash-list-card">
          {loading ? <div className="empty-state">正在加载回收站…</div> : null}

          {!loading && !hasRecords ? (
            <div className="empty-state">回收站里还没有内容，删除的记录会先来到这里。</div>
          ) : null}

          {!loading && hasRecords ? (
            <div className="trash-record-list">
              {records.map((record) => {
                const busy = busyId === record.id || busyId === "empty";

                return (
                  <div key={record.id} className="trash-record-row">
                    <div className="trash-record-main">
                      <div className="trash-record-title-row">
                        <div className="trash-record-title">{record.title}</div>
                        <span className="trash-record-kind">{record.recordKind === "report" ? "报告" : "记录"}</span>
                      </div>
                      <div className="trash-record-meta">
                        <span>{record.priority}</span>
                        <span>{record.status}</span>
                        <span>删除于 {formatDateTime(record.deletedAt)}</span>
                      </div>
                    </div>

                    <div className="trash-record-actions">
                      <button className="button-mini" disabled={busy} onClick={() => void handleRestore(record.id)}>
                        恢复
                      </button>
                      <button className="button-mini trash-button-danger" disabled={busy} onClick={() => void handleDestroy(record.id)}>
                        彻底删除
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
}

function formatDateTime(value: string | null): string {
  if (!value) {
    return "未知时间";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleString("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function toErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? `${fallback}：${error.message}` : fallback;
}
