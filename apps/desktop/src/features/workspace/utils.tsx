import type { ReminderHit } from "@timeaura-core";

import type { ReminderPreset } from "./types";

export function toInputValue(value: string | null): string {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

export function fromInputValue(value: string): string | null {
  if (!value) {
    return null;
  }

  return new Date(value).toISOString();
}

export function formatDateLabel(value: string | null): string {
  if (!value) {
    return "未设置时间";
  }

  const date = new Date(value);
  return `${date.getMonth() + 1}/${date.getDate()} ${String(date.getHours()).padStart(2, "0")}:${String(
    date.getMinutes(),
  ).padStart(2, "0")}`;
}

export function formatDateTime(value: string | null): string {
  if (!value) {
    return "未设置";
  }

  const date = new Date(value);
  return `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()} ${String(date.getHours()).padStart(2, "0")}:${String(
    date.getMinutes(),
  ).padStart(2, "0")}`;
}

export function formatReminderKind(kind: ReminderHit["reminderKind"]): string {
  switch (kind) {
    case "overdue":
      return "已逾期";

    case "due_2h":
      return "2 小时内到期";

    case "due_24h":
      return "24 小时内到期";

    case "overloaded":
      return "任务积压";

    default:
      return "提醒";
  }
}

export function sameTags(left: string[], right: string[]): boolean {
  if (left.length !== right.length) {
    return false;
  }

  const leftSorted = [...left].sort();
  const rightSorted = [...right].sort();
  return leftSorted.every((tag, index) => tag === rightSorted[index]);
}

export function resolvePresetDate(preset: ReminderPreset): string {
  const now = new Date();
  const target = new Date(now);

  if (preset === "plus_1_hour") {
    target.setHours(target.getHours() + 1, target.getMinutes(), 0, 0);
    return target.toISOString();
  }

  if (preset === "today_18") {
    target.setHours(18, 0, 0, 0);
    return target.toISOString();
  }

  if (preset === "friday_18") {
    const distance = ((5 - target.getDay()) % 7 + 7) % 7;
    target.setDate(target.getDate() + distance);
    target.setHours(18, 0, 0, 0);
    return target.toISOString();
  }

  if (preset === "next_monday_09") {
    const distance = target.getDay() === 1 ? 7 : ((8 - target.getDay()) % 7 + 7) % 7;
    target.setDate(target.getDate() + distance);
    target.setHours(9, 0, 0, 0);
    return target.toISOString();
  }

  if (preset === "tomorrow_09") {
    target.setDate(target.getDate() + 1);
    target.setHours(9, 0, 0, 0);
    return target.toISOString();
  }

  return target.toISOString();
}

export function isEditableElement(target: HTMLElement | null): boolean {
  if (!target) {
    return false;
  }

  const tagName = target.tagName;
  return tagName === "INPUT" || tagName === "TEXTAREA" || tagName === "SELECT" || target.isContentEditable;
}

export function renderMarkdownPreview(markdown: string): JSX.Element {
  const lines = markdown.split("\n");
  const elements: JSX.Element[] = [];
  let listBuffer: string[] = [];

  const flushList = (): void => {
    if (listBuffer.length === 0) {
      return;
    }

    elements.push(
      <ul key={`list-${elements.length}`} className="workspace-preview-list">
        {listBuffer.map((item, index) => (
          <li key={`${item}-${index}`}>{item}</li>
        ))}
      </ul>,
    );
    listBuffer = [];
  };

  lines.forEach((line, index) => {
    const trimmed = line.trim();

    if (!trimmed) {
      flushList();
      return;
    }

    if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
      listBuffer.push(trimmed.slice(2));
      return;
    }

    flushList();

    if (trimmed.startsWith("### ")) {
      elements.push(
        <h3 key={`h3-${index}`} className="workspace-preview-h3">
          {trimmed.slice(4)}
        </h3>,
      );
      return;
    }

    if (trimmed.startsWith("## ")) {
      elements.push(
        <h2 key={`h2-${index}`} className="workspace-preview-h2">
          {trimmed.slice(3)}
        </h2>,
      );
      return;
    }

    if (trimmed.startsWith("# ")) {
      elements.push(
        <h1 key={`h1-${index}`} className="workspace-preview-h1">
          {trimmed.slice(2)}
        </h1>,
      );
      return;
    }

    elements.push(
      <p key={`p-${index}`} className="workspace-preview-p">
        {trimmed}
      </p>,
    );
  });

  flushList();

  return elements.length > 0 ? <>{elements}</> : <span>还没有内容，先写一点 Markdown 再回来预览。</span>;
}
