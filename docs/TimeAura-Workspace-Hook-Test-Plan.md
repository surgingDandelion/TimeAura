# TimeAura Workspace Hook Test Plan

## 1. 目标

本文件用于把 `workspace` 分层后的 hooks 真正接入测试流程，优先覆盖：

- 命令结果是否正确返回
- 副作用是否可替换、可观察
- 页面编排层是否正确把状态与命令拼装给组件

当前桌面端已经接入最小测试链路：

- `Vitest`
- `jsdom`
- `@testing-library/react`
- `apps/desktop/package.json` 中的 `test / test:watch` 脚本
- 第一批 workspace 命令型 hook 单测

本计划继续承担两件事：

- 说明后续 hook 测试优先级
- 约束这套 `seams + fixtures + command result` 的扩展方式

## 2. 当前测试基础

- 当前 `apps/desktop/package.json` 已包含 `test` 与 `test:watch` 脚本
- 当前 `npm run test` 采用逐文件顺序执行 `Vitest`，用于规避当前本地 Node 25 环境下的 worker 内存溢出问题
- 当前 `apps/desktop/vite.config.ts` 已包含最小 `Vitest` 配置
- 当前已经落地的首批测试文件：
  - `/Users/dandelion/Documents/iflytek/viber_coding/TimeAura/apps/desktop/src/features/workspace/hooks/__tests__/useWorkspaceNotificationDebugActions.test.ts`
  - `/Users/dandelion/Documents/iflytek/viber_coding/TimeAura/apps/desktop/src/features/workspace/hooks/__tests__/useWorkspaceQuickAddActions.test.ts`
  - `/Users/dandelion/Documents/iflytek/viber_coding/TimeAura/apps/desktop/src/features/workspace/hooks/__tests__/useWorkspaceRecordActions.test.ts`
  - `/Users/dandelion/Documents/iflytek/viber_coding/TimeAura/apps/desktop/src/features/workspace/hooks/__tests__/useWorkspaceTagManagerActions.test.ts`
  - `/Users/dandelion/Documents/iflytek/viber_coding/TimeAura/apps/desktop/src/features/workspace/hooks/__tests__/useWorkspaceViewModel.test.tsx`
- 当前已经具备的可测前提：
  - `workspace contracts`
  - `workspace test seams`
  - `workspace service test doubles`
  - `WorkspaceCommandResult`

相关文件：

- `/Users/dandelion/Documents/iflytek/viber_coding/TimeAura/apps/desktop/src/features/workspace/contracts.ts`
- `/Users/dandelion/Documents/iflytek/viber_coding/TimeAura/apps/desktop/src/features/workspace/testSeams.ts`
- `/Users/dandelion/Documents/iflytek/viber_coding/TimeAura/apps/desktop/src/features/workspace/testing/workspaceTestFixtures.ts`
- `/Users/dandelion/Documents/iflytek/viber_coding/TimeAura/apps/desktop/src/features/workspace/testing/workspaceServiceTestDoubles.ts`
- `/Users/dandelion/Documents/iflytek/viber_coding/TimeAura/docs/TimeAura-Workspace-Hook-Test-Scaffold.md`

## 3. 推荐测试优先级

### P0: 命令型 hooks

这些 hooks 最适合先做单测，因为输入输出清晰，且已经有 seams。

- `useWorkspaceNotificationDebugActions`
- `useWorkspaceRecordActions`
- `useWorkspaceQuickAddActions`
- `useWorkspaceTagManagerActions`

核心断言：

- 返回值是否为 `success / cancelled / noop`
- `message` 是否符合预期
- `data` 是否返回正确的 `recordId / tagId / count`
- `confirm` 是否被调用
- `download` 是否被调用
- `clock` 是否影响导出文件名与时间字段

### P1: 状态编排 hooks

- `useWorkspaceSelection`
- `useWorkspaceReminderActions`
- `useWorkspaceRecordDraft`
- `useWorkspaceData`

核心断言：

- 输入状态变化后，派生状态是否正确
- 聚焦 / 高亮 / 清空逻辑是否符合预期
- 选择态与提醒命中态是否同步收敛

### P2: 组合层

- `useWorkspaceViewModel`
- `useWorkspaceCommands`

核心断言：

- 返回的 component props 是否完整
- command callback 是否正确接到下层 hooks
- 关键动作是否不会打破页面编排结构

## 4. seams 使用规范

### 4.1 默认 seams

默认 seams 来自：

- `/Users/dandelion/Documents/iflytek/viber_coding/TimeAura/apps/desktop/src/features/workspace/testSeams.ts`

提供三类副作用替换：

- `confirm`
- `downloadJson`
- `clock`

### 4.2 测试 fixtures

推荐在测试中优先使用：

- `/Users/dandelion/Documents/iflytek/viber_coding/TimeAura/apps/desktop/src/features/workspace/testing/workspaceTestFixtures.ts`

该 helper 会返回：

- `seams`
- `state.confirmMessages`
- `state.downloadEvents`

这样在测试中可以直接断言：

- 是否弹出过确认
- 导出的文件名是否正确
- 导出的 payload 是否包含正确字段

## 5. 最小单测用例建议

### 5.1 useWorkspaceNotificationDebugActions

用例：

- 当 `notificationDebugFeed` 为空时，导出返回 `noop`
- 当存在调试记录时，导出返回 `success`
- 导出后 `downloadEvents[0].fileName` 应包含 `timeaura-notification-debug`
- 清空操作在 `confirm = false` 时返回 `cancelled`
- 清空操作在 `confirm = true` 时调用 `onClearNotificationDebug`

### 5.2 useWorkspaceQuickAddActions

用例：

- 输入为空字符串时返回 `noop`
- 输入有效标题时返回 `success`
- 返回值中 `data.recordId` 应为新建记录 id
- 新建后应调用 `onSelectCreatedRecord`

### 5.3 useWorkspaceRecordActions

用例：

- `handleDelete` 在取消确认时返回 `cancelled`
- `handleDelete` 成功后应清理选中态
- `handleReschedule` 在无目标时返回 `noop`
- `handleReschedule` 成功后应返回批量数量 `count`

### 5.4 useWorkspaceTagManagerActions

用例：

- 空标签名返回 `noop`
- 编辑已有标签返回 `success`
- 新建标签后返回 `data.tagId`
- 删除标签取消确认时返回 `cancelled`

## 6. 推荐的后续测试目录

当接入测试 runner 后，建议目录如下：

```text
apps/desktop/src/features/workspace/
  hooks/
    __tests__/
      useWorkspaceNotificationDebugActions.test.ts
      useWorkspaceQuickAddActions.test.ts
      useWorkspaceRecordActions.test.ts
      useWorkspaceTagManagerActions.test.ts
      useWorkspaceReminderActions.test.ts
      useWorkspaceSelection.test.ts
      useWorkspaceViewModel.test.ts
  testing/
    workspaceTestFixtures.ts
```

## 7. 推荐接入顺序

1. 补 `Vitest + jsdom`
2. 先落 `P0` 命令型 hooks 测试
3. 再补 `P1` 状态型 hooks 测试
4. 最后补 `P2` 组合层 smoke tests

## 8. 验收标准

- 所有命令型 hooks 都有至少 1 个 `success` 用例
- 所有带确认弹窗的 hooks 都有 `cancelled` 用例
- 所有导出类 hooks 都验证文件名与 payload
- `WorkspaceViewModel` 至少有 1 个 smoke test，验证关键 props 已装配完成

## 9. 当前已覆盖范围

- `useWorkspaceNotificationDebugActions`
  - 空数据导出
  - 导出 payload
  - 清空确认
  - runtime notification 并入 feed
- `useWorkspaceQuickAddActions`
  - 空输入 `noop`
  - 创建记录成功链路
- `useWorkspaceRecordActions`
  - 删除取消
  - 删除成功
  - 批量改期 `noop / success`
- `useWorkspaceTagManagerActions`
  - 空标签名
  - 新建标签
  - 更新标签
  - 删除标签
- `useWorkspaceViewModel`
  - list / inspector / tag manager / notification smoke
  - reminder 改期与延后提醒的集成动作链路
