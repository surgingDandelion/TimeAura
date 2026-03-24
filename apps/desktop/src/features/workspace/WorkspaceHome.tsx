import { useEffect, useState } from "react";

import type { ReminderSummary } from "@timeaura-core";

import { useAppServices } from "../../app/providers/AppServicesProvider";

interface WorkspaceSnapshot {
  theme: string;
  recordCount: number;
  templateCount: number;
  channelCount: number;
  reminder: ReminderSummary | null;
}

export function WorkspaceHome(): JSX.Element {
  const { services } = useAppServices();
  const [snapshot, setSnapshot] = useState<WorkspaceSnapshot | null>(null);

  useEffect(() => {
    let cancelled = false;

    void Promise.all([
      services.settingsService.getAppSettings(),
      services.recordService.listRecords({ status: "all", sortBy: "smart" }),
      services.templateService.listTemplates(),
      services.channelService.listChannels(),
      services.reminderService.getReminderSummary(new Date().toISOString()),
    ]).then(([settings, records, templates, channels, reminder]) => {
      if (cancelled) {
        return;
      }

      setSnapshot({
        theme: settings.theme,
        recordCount: records.total,
        templateCount: templates.length,
        channelCount: channels.length,
        reminder,
      });
    });

    return () => {
      cancelled = true;
    };
  }, [services]);

  return (
    <section className="workspace-card">
      <div className="workspace-eyebrow">Scaffold Preview</div>
      <h1 className="workspace-title">桌面壳层与服务容器已接线</h1>
      <p className="workspace-description">
        当前页面用于验证 `AppServicesProvider` 已成功把 TimeAura 的 mock / sqlite 装配入口接入 React 首屏。
      </p>

      <div className="workspace-grid">
        <StatCard label="主题模式" value={snapshot?.theme ?? "加载中"} />
        <StatCard label="记录数量" value={snapshot ? String(snapshot.recordCount) : "加载中"} />
        <StatCard label="模板数量" value={snapshot ? String(snapshot.templateCount) : "加载中"} />
        <StatCard label="AI 通道" value={snapshot ? String(snapshot.channelCount) : "加载中"} />
      </div>

      <div className="workspace-reminder">
        <div className="workspace-reminder-title">提醒摘要</div>
        <div className="workspace-reminder-body">
          {snapshot?.reminder
            ? `${snapshot.reminder.title}，命中 ${snapshot.reminder.hitCount} 项`
            : "当前没有提醒命中，或仍在初始化提醒服务。"}
        </div>
      </div>
    </section>
  );
}

function StatCard({ label, value }: { label: string; value: string }): JSX.Element {
  return (
    <div className="stat-card">
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value}</div>
    </div>
  );
}
