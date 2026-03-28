# TimeAura 前端目录结构与文件命名建议

## 1. 文档目的

本文件用于把 TimeAura 当前的页面拆分方案进一步落到前端工程结构层，给 React / Vue 两种实现路径提供一版可直接开工的目录结构与命名建议。

适用对象：

- 前端开发
- 技术负责人
- AI 编码模型

---

## 2. 总体建议

无论采用 React 还是 Vue，建议遵循以下原则：

- 页面容器、业务组件、基础组件分层
- 页面状态与全局状态边界清晰
- 不把所有组件堆在一个 `components` 目录里
- 主题、弹层、toast、编辑器模式等跨页面能力独立成系统层
- 文件命名尽量稳定、可搜索、可推断，不依赖“杂糅缩写”

推荐分层：

- `app`
  - 应用入口、providers、路由、全局壳层
- `pages`
  - 页面级容器
- `features`
  - 业务域模块
- `components`
  - 跨业务复用组件
- `stores` 或 `state`
  - 状态管理
- `services`
  - 数据服务 / AI 通道服务 / mock 数据
- `types`
  - 类型定义
- `utils`
  - 纯工具函数
- `styles` 或 `theme`
  - design tokens、全局样式、主题变量

统一视觉与 UI 细节标准请以以下文档为准：

- `/Users/dandelion/Documents/iflytek/viber_coding/TimeAura/docs/TimeAura-Design-Language-and-UI-Conventions.md`

该文档比目录结构文档优先级更高；后续 AI 生成页面、重构组件或新增主题时，先遵循设计规约，再落工程目录。

---

## 3. React 目录结构建议

适用于：

- React + TypeScript
- Vite / Next 桌面壳
- Electron / Tauri 前端层

### 3.1 推荐目录树

```text
src/
├── app/
│   ├── App.tsx
│   ├── AppShell.tsx
│   ├── providers/
│   │   ├── ThemeProvider.tsx
│   │   ├── ModalProvider.tsx
│   │   └── ToastProvider.tsx
│   └── router/
│       └── routes.tsx
├── pages/
│   ├── workspace/
│   │   ├── WorkspacePage.tsx
│   │   └── WorkspacePage.module.css
│   ├── reports/
│   │   ├── ReportPage.tsx
│   │   └── ReportPage.module.css
│   └── channels/
│       ├── ChannelPage.tsx
│       └── ChannelPage.module.css
├── features/
│   ├── sidebar/
│   │   ├── Sidebar.tsx
│   │   ├── SidebarNav.tsx
│   │   ├── SidebarFooter.tsx
│   │   └── sidebar.types.ts
│   ├── quick-add/
│   │   ├── QuickAddCard.tsx
│   │   ├── useQuickAdd.ts
│   │   └── quickAdd.types.ts
│   ├── task-list/
│   │   ├── TaskList.tsx
│   │   ├── TaskRow.tsx
│   │   ├── TaskCheck.tsx
│   │   ├── TaskActions.tsx
│   │   └── taskList.types.ts
│   ├── filters/
│   │   ├── ToolbarRow.tsx
│   │   ├── SearchBox.tsx
│   │   ├── StatusFilter.tsx
│   │   ├── PriorityFilter.tsx
│   │   ├── TagFilter.tsx
│   │   └── SortSelect.tsx
│   ├── reminder/
│   │   ├── ReminderBanner.tsx
│   │   ├── ReminderExpandPanel.tsx
│   │   ├── ReminderHitRow.tsx
│   │   └── BatchRescheduleModal.tsx
│   ├── detail/
│   │   ├── DetailPane.tsx
│   │   ├── DetailHeader.tsx
│   │   ├── DetailOverview.tsx
│   │   ├── InspectorFieldRow.tsx
│   │   ├── EditorToolbar.tsx
│   │   ├── MarkdownEditorSurface.tsx
│   │   └── detail.types.ts
│   ├── tag-manager/
│   │   ├── TagManagerModal.tsx
│   │   ├── TagBindList.tsx
│   │   ├── TagLibraryList.tsx
│   │   └── tagManager.types.ts
│   ├── reports/
│   │   ├── ReportFiltersPanel.tsx
│   │   ├── ReportEditorPanel.tsx
│   │   ├── TemplateConfigModal.tsx
│   │   └── report.types.ts
│   └── channels/
│       ├── ChannelListPanel.tsx
│       ├── ChannelFormPanel.tsx
│       ├── AbilityMappingGrid.tsx
│       └── channel.types.ts
├── components/
│   ├── ui/
│   │   ├── Button.tsx
│   │   ├── IconButton.tsx
│   │   ├── Input.tsx
│   │   ├── Select.tsx
│   │   ├── DateTimeField.tsx
│   │   ├── Checkbox.tsx
│   │   ├── SegmentedControl.tsx
│   │   ├── Card.tsx
│   │   ├── Badge.tsx
│   │   └── EmptyState.tsx
│   └── layout/
│       ├── WindowBar.tsx
│       ├── PaneSplitter.tsx
│       ├── ModalHost.tsx
│       └── ToastHost.tsx
├── stores/
│   ├── appStore.ts
│   ├── taskStore.ts
│   ├── reportStore.ts
│   ├── channelStore.ts
│   └── tagStore.ts
├── services/
│   ├── taskService.ts
│   ├── reportService.ts
│   ├── channelService.ts
│   └── mock/
│       ├── tasks.mock.ts
│       ├── tags.mock.ts
│       ├── reports.mock.ts
│       └── channels.mock.ts
├── theme/
│   ├── tokens.ts
│   ├── light.ts
│   ├── dark.ts
│   └── global.css
├── types/
│   ├── record.ts
│   ├── tag.ts
│   ├── channel.ts
│   └── report.ts
└── utils/
    ├── dates.ts
    ├── markdown.ts
    ├── search.ts
    └── format.ts
```

### 3.2 React 文件命名建议

#### 组件文件

- 组件使用 `PascalCase`
- 示例：
  - `TaskRow.tsx`
  - `ReminderBanner.tsx`
  - `SegmentedControl.tsx`

#### hook 文件

- Hook 使用 `useXxx.ts`
- 示例：
  - `useQuickAdd.ts`
  - `useTheme.ts`
  - `usePaneResize.ts`

#### store 文件

- 使用 `camelCase + Store`
- 示例：
  - `taskStore.ts`
  - `reportStore.ts`

#### 类型文件

- 建议按业务域命名，不要出现 `types.ts` 大杂烩
- 示例：
  - `record.ts`
  - `tag.ts`
  - `channel.ts`

#### 样式文件

- 如果用 CSS Modules：
  - `TaskRow.module.css`
  - `WorkspacePage.module.css`
- 如果用全局 token + 组件类名：
  - 把 token 放在 `theme/`
  - 页面级样式放在 `pages/*/*.css`

---

## 4. Vue 目录结构建议

适用于：

- Vue 3 + TypeScript
- Vite
- Electron / Tauri 前端层

### 4.1 推荐目录树

```text
src/
├── app/
│   ├── App.vue
│   ├── AppShell.vue
│   ├── providers/
│   │   ├── theme.ts
│   │   ├── modal.ts
│   │   └── toast.ts
│   └── router/
│       └── index.ts
├── pages/
│   ├── workspace/
│   │   └── WorkspacePage.vue
│   ├── reports/
│   │   └── ReportPage.vue
│   └── channels/
│       └── ChannelPage.vue
├── features/
│   ├── sidebar/
│   │   ├── Sidebar.vue
│   │   ├── SidebarNav.vue
│   │   └── SidebarFooter.vue
│   ├── quick-add/
│   │   ├── QuickAddCard.vue
│   │   └── useQuickAdd.ts
│   ├── task-list/
│   │   ├── TaskList.vue
│   │   ├── TaskRow.vue
│   │   ├── TaskCheck.vue
│   │   └── TaskActions.vue
│   ├── filters/
│   │   ├── ToolbarRow.vue
│   │   ├── SearchBox.vue
│   │   ├── StatusFilter.vue
│   │   ├── PriorityFilter.vue
│   │   ├── TagFilter.vue
│   │   └── SortSelect.vue
│   ├── reminder/
│   │   ├── ReminderBanner.vue
│   │   ├── ReminderExpandPanel.vue
│   │   ├── ReminderHitRow.vue
│   │   └── BatchRescheduleModal.vue
│   ├── detail/
│   │   ├── DetailPane.vue
│   │   ├── DetailHeader.vue
│   │   ├── InspectorFieldRow.vue
│   │   ├── EditorToolbar.vue
│   │   └── MarkdownEditorSurface.vue
│   ├── tag-manager/
│   │   ├── TagManagerModal.vue
│   │   ├── TagBindList.vue
│   │   └── TagLibraryList.vue
│   ├── reports/
│   │   ├── ReportFiltersPanel.vue
│   │   ├── ReportEditorPanel.vue
│   │   └── TemplateConfigModal.vue
│   └── channels/
│       ├── ChannelListPanel.vue
│       ├── ChannelFormPanel.vue
│       └── AbilityMappingGrid.vue
├── components/
│   ├── ui/
│   │   ├── Button.vue
│   │   ├── IconButton.vue
│   │   ├── Input.vue
│   │   ├── Select.vue
│   │   ├── DateTimeField.vue
│   │   ├── Checkbox.vue
│   │   ├── SegmentedControl.vue
│   │   ├── Card.vue
│   │   └── EmptyState.vue
│   └── layout/
│       ├── WindowBar.vue
│       ├── PaneSplitter.vue
│       ├── ModalHost.vue
│       └── ToastHost.vue
├── stores/
│   ├── app.store.ts
│   ├── task.store.ts
│   ├── report.store.ts
│   ├── channel.store.ts
│   └── tag.store.ts
├── services/
│   ├── task.service.ts
│   ├── report.service.ts
│   ├── channel.service.ts
│   └── mock/
├── theme/
│   ├── tokens.css
│   ├── light.css
│   ├── dark.css
│   └── index.css
├── types/
│   ├── record.ts
│   ├── tag.ts
│   ├── channel.ts
│   └── report.ts
└── utils/
    ├── dates.ts
    ├── markdown.ts
    ├── search.ts
    └── format.ts
```

### 4.2 Vue 文件命名建议

#### 组件文件

- Vue 单文件组件统一使用 `PascalCase.vue`
- 示例：
  - `TaskRow.vue`
  - `DetailPane.vue`
  - `ChannelFormPanel.vue`

#### composable 文件

- 使用 `useXxx.ts`
- 示例：
  - `useQuickAdd.ts`
  - `useTheme.ts`
  - `useReminderSelection.ts`

#### store 文件

- 推荐 `xxx.store.ts`
- 示例：
  - `task.store.ts`
  - `app.store.ts`

#### service 文件

- 推荐 `xxx.service.ts`
- 示例：
  - `report.service.ts`
  - `channel.service.ts`

---

## 5. 目录分层规则

### 5.1 `pages`

放页面级容器，只负责：

- 组合页面结构
- 连接 store / service
- 管理页面级弹层开关

不要在 `pages` 里放大量细碎基础控件。

### 5.2 `features`

放业务域模块，适合：

- 任务列表
- 提醒条
- 详情区
- 标签管理
- AI 报告
- AI 通道配置

原则：

- 一个 feature 目录只负责一块明确业务域
- feature 内可以同时放组件、hooks/composables、类型

### 5.3 `components/ui`

放真正可复用的通用组件，适合：

- Button
- Select
- Checkbox
- SegmentedControl
- EmptyState

不要把带明确业务语义的组件扔进这里，例如 `TaskRow` 或 `ReminderBanner`。

### 5.4 `stores`

建议按业务域拆 store，不要只做一个大 store。

推荐至少拆成：

- `app`
- `task`
- `tag`
- `report`
- `channel`

---

## 6. 命名约定建议

### 6.1 页面与容器

- 页面使用 `XxxPage`
- 容器区块使用 `XxxPane` / `XxxPanel`

示例：

- `WorkspacePage`
- `DetailPane`
- `ChannelFormPanel`

### 6.2 弹层与浮层

- 弹层统一使用 `XxxModal`
- 小浮层 / 下拉面板用 `XxxPopover` 或 `XxxPanel`

示例：

- `TagManagerModal`
- `BatchRescheduleModal`
- `TemplateConfigModal`

### 6.3 列表项与字段行

- 列表项统一 `XxxRow`
- 字段行统一 `XxxFieldRow` 或 `InspectorFieldRow`

示例：

- `TaskRow`
- `ReminderHitRow`
- `InspectorFieldRow`

### 6.4 事件命名

- React 推荐：
  - `onSelectTask`
  - `onToggleTheme`
  - `onOpenTagManager`
- Vue 推荐：
  - `select-task`
  - `toggle-theme`
  - `open-tag-manager`

### 6.5 状态字段命名

- 布尔值：
  - `isDark`
  - `isExpanded`
  - `isDragging`
  - `isSubmitting`
- 集合：
  - `selectedTaskIds`
  - `selectedReminderIds`
- 当前项：
  - `activeView`
  - `activeTemplateId`
  - `activeChannelId`

---

## 7. 推荐页面与模块映射关系

### 7.1 主工作台

| 页面 | 业务模块 |
| --- | --- |
| `WorkspacePage` | `sidebar`, `quick-add`, `filters`, `task-list`, `reminder`, `detail`, `tag-manager` |

### 7.2 AI 报告页

| 页面 | 业务模块 |
| --- | --- |
| `ReportPage` | `reports`, `channels` |

### 7.3 AI 通道页

| 页面 | 业务模块 |
| --- | --- |
| `ChannelPage` | `channels` |

---

## 8. 推荐状态管理边界

### 8.1 `appStore`

负责：

- 当前主题
- 当前页面
- 全局 modal / toast
- 右侧详情开关

### 8.2 `taskStore`

负责：

- 任务列表
- 当前选中任务
- 多选任务
- 搜索 / 筛选 / 排序
- 快速新增草稿

### 8.3 `tagStore`

负责：

- 标签列表
- 标签颜色
- 标签增删改

### 8.4 `reportStore`

负责：

- 报告草稿
- 当前模板
- 当前报告条件
- 历史报告

### 8.5 `channelStore`

负责：

- 通道列表
- 能力映射
- 默认通道

---

## 9. 建议样式组织方式

### 9.1 推荐做法

- design tokens 放在 `theme/`
- 组件样式就近放置
- 复杂页面允许页面级样式文件
- 不要把所有颜色、圆角、阴影散落在业务组件里

### 9.2 Token 文件建议

React 可用：

- `theme/tokens.ts`
- `theme/light.ts`
- `theme/dark.ts`

Vue / 纯 CSS 变量可用：

- `theme/tokens.css`
- `theme/light.css`
- `theme/dark.css`

建议语义维度：

- colors
- text
- radius
- shadow
- spacing
- motion

补充实现约束：

- `Select` 在浅色与暗色主题下都不要混用浏览器原生箭头和自定义背景箭头
- 如果使用自定义箭头，优先采用统一的背景层或独立装饰层实现，避免 `background` 与 `background-image` 混写后在暗色模式出现箭头重复、平铺或错位
- `Date / DateTime` 的系统指示器也要单独校验浅色与暗色表现

---

## 10. 推荐路由命名

如果采用页面路由，建议保持简洁：

- `/`
  - 主工作台
- `/reports`
  - AI 报告页
- `/channels`
  - AI 通道配置页

如果保留桌面应用单页切换，也建议内部 route key 采用：

- `workspace`
- `reports`
- `channels`

---

## 11. 推荐开发顺序

### 第一步

- AppShell
- Sidebar
- ThemeProvider / theme store
- 基础 UI 组件

### 第二步

- WorkspacePage
- QuickAddCard
- ToolbarRow
- TaskList / TaskRow

### 第三步

- DetailPane
- MarkdownEditorSurface
- PaneSplitter

### 第四步

- ReminderBanner
- ReminderExpandPanel
- BatchRescheduleModal
- TagManagerModal

### 第五步

- ReportPage
- ChannelPage
- TemplateConfigModal

---

## 12. 简版结论

如果你要快速开工：

- React 方案优先按 `pages + features + components + stores + services + theme` 来拆
- Vue 方案优先按 `pages + features + components + stores + services + theme` 来拆
- 组件命名统一 `PascalCase`
- 业务域模块不要混进通用组件目录
- store、service、types 都按业务域拆，不要做全局大杂烩

对 TimeAura 这种桌面工具型应用来说，最关键的不是“文件少”，而是：

- 页面结构清楚
- 业务边界清楚
- 状态归属清楚
- 视觉 token 集中管理
