# TimeAura Workspace Hook Test Scaffold

## 1. 文档目的

这份文档补在 `workspace test seams` 之后，目标不是再描述测试价值，而是给后续开发一个“最小可开工骨架”：

- 确定第一个测试文件放在哪里
- 确定第一个 hook 测试怎么写
- 让 `testSeams + workspaceTestFixtures` 真正进入可执行的单测路径

当前工程已经完成最小测试接入：

- `Vitest`
- `jsdom`
- `@testing-library/react`

因此本文件现在既可以作为脚手架说明，也可以作为后续扩展 workspace hook tests 的参考模板。

相关基础文件：

- `/Users/dandelion/Documents/iflytek/viber_coding/TimeAura/apps/desktop/src/features/workspace/testSeams.ts`
- `/Users/dandelion/Documents/iflytek/viber_coding/TimeAura/apps/desktop/src/features/workspace/testing/workspaceTestFixtures.ts`
- `/Users/dandelion/Documents/iflytek/viber_coding/TimeAura/docs/TimeAura-Workspace-Hook-Test-Plan.md`

## 2. 推荐的首批测试文件

建议先只建立 3 个测试文件，避免测试目录一开始就铺太大：

```text
apps/desktop/src/features/workspace/hooks/__tests__/
  useWorkspaceNotificationDebugActions.test.ts
  useWorkspaceQuickAddActions.test.ts
  useWorkspaceRecordActions.test.ts
```

原因：

- 这三类 hook 都有明确命令结果
- 它们都已经接入 `WorkspaceCommandResult`
- 它们的副作用都可以通过 seams 或回调进行观察

## 3. 当前最小 runner 形态

当前测试入口已经具备以下结构：

- `apps/desktop/package.json`
  - `test`
  - `test:watch`
- `apps/desktop/vite.config.ts`
  - `test.environment = "jsdom"`
  - `test.include = ["src/**/*.test.ts"]`
- `apps/desktop/src/test/setup.ts`
  - 统一执行 `cleanup`

## 4. 第一份 hook 单测骨架

下面这份示例建议作为第一批真实测试的起点，目标 hook 为：

- `useWorkspaceNotificationDebugActions`

测试关注点：

- 空调试数据时返回 `noop`
- 存在数据时调用下载 seam，并返回 `success`
- 清空时能正确区分 `cancelled / success`

```ts
import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { useWorkspaceNotificationDebugActions } from "../useWorkspaceNotificationDebugActions";
import { createWorkspaceTestFixtureBundle } from "../../testing/workspaceTestFixtures";

describe("useWorkspaceNotificationDebugActions", () => {
  it("returns noop when there is no notification debug entry to export", () => {
    const { seams, state } = createWorkspaceTestFixtureBundle();
    const onMessage = vi.fn();

    const { result } = renderHook(() =>
      useWorkspaceNotificationDebugActions({
        notificationDebugEntries: [],
        onMessage,
        seams,
      }),
    );

    const commandResult = result.current.handleExportNotificationDebug();

    expect(commandResult.status).toBe("noop");
    expect(state.downloadEvents).toHaveLength(0);
    expect(onMessage).not.toHaveBeenCalled();
  });

  it("exports notification debug payload through seams", () => {
    const { seams, state } = createWorkspaceTestFixtureBundle();
    const onMessage = vi.fn();

    const { result } = renderHook(() =>
      useWorkspaceNotificationDebugActions({
        notificationDebugEntries: [
          {
            id: "debug-1",
            at: "2026-01-01T09:30:00.000Z",
            source: "scheduler",
            level: "info",
            title: "提醒已触发",
            detail: "任务 A 已进入提醒窗口",
          },
        ],
        onMessage,
        seams,
      }),
    );

    const commandResult = result.current.handleExportNotificationDebug();

    expect(commandResult.status).toBe("success");
    expect(commandResult.data?.count).toBe(1);
    expect(state.downloadEvents[0]?.fileName).toBe(
      "timeaura-notification-debug-20260101-093000.json",
    );
    expect(onMessage).toHaveBeenCalledWith("通知调试记录已导出");
  });

  it("returns cancelled when clear action is rejected by confirm seam", async () => {
    const { seams, state } = createWorkspaceTestFixtureBundle({ confirmResult: false });
    const onMessage = vi.fn();
    const onClearNotificationDebug = vi.fn();

    const { result } = renderHook(() =>
      useWorkspaceNotificationDebugActions({
        notificationDebugEntries: [
          {
            id: "debug-1",
            at: "2026-01-01T09:30:00.000Z",
            source: "scheduler",
            level: "warning",
            title: "提醒推送失败",
            detail: "系统已进入兜底重试",
          },
        ],
        onClearNotificationDebug,
        onMessage,
        seams,
      }),
    );

    let commandResult:
      | Awaited<ReturnType<typeof result.current.handleClearNotificationDebugPanel>>
      | undefined;

    await act(async () => {
      commandResult = await result.current.handleClearNotificationDebugPanel();
    });

    expect(commandResult?.status).toBe("cancelled");
    expect(state.confirmMessages).toEqual(["确认清空当前通知调试记录吗？"]);
    expect(onClearNotificationDebug).not.toHaveBeenCalled();
    expect(onMessage).not.toHaveBeenCalled();
  });
});
```

## 5. 第二批测试如何复用 fixtures

`createWorkspaceTestFixtureBundle()` 的定位是“副作用观察器”，推荐这样使用：

- 要测确认弹窗：断言 `state.confirmMessages`
- 要测导出：断言 `state.downloadEvents`
- 要测时间：给 `now` 传固定值，稳定文件名和时间戳

推荐原则：

- command hook 不直接断言浏览器 API
- 优先断言 seam 记录结果
- 让测试聚焦业务结果，而不是实现细节

## 6. Quick Add 测试骨架建议

第二个建议落地的测试是：

- `useWorkspaceQuickAddActions`

最小覆盖：

1. `quickAdd = ""` 时返回 `noop`
2. 有效标题时返回 `success`
3. 创建成功后调用 `onSelectCreatedRecord`
4. 创建后调用 `syncWorkspace("已新增记录")`

如需避免真实 service 依赖，建议为 `recordService.createRecord` 提供最小 mock：

```ts
const services = {
  recordService: {
    createRecord: vi.fn().mockResolvedValue({
      id: "record_new",
      title: "补充周报素材",
    }),
  },
} as any;
```

后续若继续扩测，可以再把这类 service mock 整理进独立的 `workspaceServiceTestDoubles.ts`。

## 7. 落地顺序

建议下一次真正接测试时按这个顺序推进：

1. 接入 `Vitest + jsdom`
2. 复制本文件第 4 节代码，落第一份命令型 hook 测试
3. 把 `Quick Add / Record Actions` 各补 2 到 3 条核心用例
4. 最后再测 `useWorkspaceViewModel` 这种组合层 smoke test

这样可以保证这套 seams 先服务于“最容易出价值”的命令型 hooks，而不是一上来就陷入大而全测试编排。
