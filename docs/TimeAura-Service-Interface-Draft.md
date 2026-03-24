# TimeAura 接口层设计草案

## 1. 文档目的

本文件用于定义 TimeAura V1 的前端与本地能力之间的接口层边界，帮助后续实现：

- 页面组件与业务逻辑解耦
- store 与数据访问分离
- AI 调用与 provider 适配分离
- 数据库操作与 UI 状态分离

这里的“接口层”主要指应用内部 service / repository / provider 设计，不是公网 HTTP API 设计。

---

## 2. 分层目标

推荐采用以下分层：

- `UI Layer`
  - 页面
  - 组件
  - 弹层
- `State Layer`
  - store
  - selector
- `Service Layer`
  - 业务用例
  - 调用编排
- `Repository Layer`
  - SQLite 访问
- `Provider Layer`
  - AI provider
  - 系统通知
  - 安全存储

---

## 3. 推荐接口层清单

建议至少包含以下模块：

- `recordService`
- `tagService`
- `reminderService`
- `reportService`
- `templateService`
- `channelService`
- `abilityMappingService`
- `aiService`
- `settingsService`
- `notificationService`

---

## 4. recordService

## 4.1 职责

- 创建记录
- 更新记录
- 删除 / 归档记录
- 完成记录
- 批量改期
- 查询主列表数据

## 4.2 建议接口

```ts
createRecord(input: CreateRecordInput): Promise<RecordEntity>
updateRecord(id: string, patch: UpdateRecordPatch): Promise<RecordEntity>
completeRecord(id: string, completedAt?: string): Promise<RecordEntity>
archiveRecord(id: string): Promise<void>
deleteRecord(id: string): Promise<void>
batchReschedule(ids: string[], strategy: RescheduleStrategy): Promise<RecordEntity[]>
listRecords(query: RecordListQuery): Promise<RecordEntity[]>
getRecordById(id: string): Promise<RecordEntity | null>
```

## 4.3 说明

- `listRecords` 应统一承接搜索、筛选、排序
- `batchReschedule` 不应散落在页面里自己算

---

## 5. tagService

## 5.1 职责

- 标签库 CRUD
- 记录标签绑定 / 解绑
- 删除标签后的回落逻辑

## 5.2 建议接口

```ts
listTags(): Promise<TagEntity[]>
createTag(input: CreateTagInput): Promise<TagEntity>
updateTag(id: string, patch: UpdateTagPatch): Promise<TagEntity>
deleteTag(id: string): Promise<void>
setRecordTags(recordId: string, tagIds: string[]): Promise<void>
toggleRecordTag(recordId: string, tagId: string): Promise<void>
listTagsWithCounts(query?: TagCountQuery): Promise<TagCountItem[]>
```

## 5.3 说明

- `deleteTag` 内部要自动处理记录回落到 `未分类`

---

## 6. reminderService

## 6.1 职责

- 计算即将到期、逾期、积压命中项
- 生成提醒摘要
- 为批量改期提供命中数据

## 6.2 建议接口

```ts
getReminderSummary(now: string): Promise<ReminderSummary>
listReminderHits(now: string): Promise<RecordEntity[]>
getRescheduleCandidates(now: string): Promise<RecordEntity[]>
```

## 6.3 说明

- 提醒规则必须集中放这里
- 不要让 UI 层自己拼规则

---

## 7. reportService

## 7.1 职责

- 根据条件收集记录
- 调用 AI 生成报告
- 保存报告历史
- 保存报告为 Record

## 7.2 建议接口

```ts
generateReport(input: GenerateReportInput): Promise<ReportDraftResult>
saveReportHistory(input: SaveReportHistoryInput): Promise<ReportHistoryEntity>
saveReportAsRecord(historyId: string): Promise<RecordEntity>
listReportHistories(): Promise<ReportHistoryEntity[]>
getReportHistoryById(id: string): Promise<ReportHistoryEntity | null>
```

## 7.3 说明

- `generateReport` 是编排层接口，不应直接暴露 provider 细节给页面

---

## 8. templateService

## 8.1 职责

- 管理周报 / 月报 / 自定义模板

## 8.2 建议接口

```ts
listTemplates(type?: ReportTemplateType): Promise<ReportTemplateEntity[]>
createTemplate(input: CreateTemplateInput): Promise<ReportTemplateEntity>
updateTemplate(id: string, patch: UpdateTemplatePatch): Promise<ReportTemplateEntity>
deleteTemplate(id: string): Promise<void>
getTemplateById(id: string): Promise<ReportTemplateEntity | null>
```

---

## 9. channelService

## 9.1 职责

- 通道配置 CRUD
- 测试连接
- 启用 / 停用

## 9.2 建议接口

```ts
listChannels(): Promise<AIChannelEntity[]>
createChannel(input: CreateChannelInput): Promise<AIChannelEntity>
updateChannel(id: string, patch: UpdateChannelPatch): Promise<AIChannelEntity>
deleteChannel(id: string): Promise<void>
toggleChannel(id: string, enabled: boolean): Promise<AIChannelEntity>
testChannel(id: string): Promise<ChannelTestResult>
```

## 9.3 说明

- `testChannel` 建议返回统一结果结构，不直接把 provider 原始报错扔给 UI

---

## 10. abilityMappingService

## 10.1 职责

- 管理能力到通道的映射关系

## 10.2 建议接口

```ts
listAbilityMappings(): Promise<AbilityMappingEntity[]>
setAbilityChannel(abilityKey: string, channelId: string): Promise<void>
getChannelForAbility(abilityKey: string): Promise<AIChannelEntity | null>
```

---

## 11. aiService

## 11.1 职责

- 统一封装 AI 能力调用
- 根据能力获取目标通道
- 实现重试与自动回退
- 返回标准化结果

## 11.2 建议接口

```ts
generateSummary(input: GenerateSummaryInput): Promise<AIResult>
polishMarkdown(input: PolishMarkdownInput): Promise<AIResult>
generateReportContent(input: GenerateReportAIInput): Promise<AIResult>
```

## 11.3 AIResult 建议

```ts
type AIResult = {
  content: string
  channelId: string
  providerType: string
  fallbackUsed: boolean
  latencyMs?: number
}
```

## 11.4 说明

- 页面不应该自己判断“先用哪个通道、失败后回退到谁”
- 这些逻辑应集中放在 `aiService`

---

## 12. settingsService

## 12.1 职责

- 读写主题
- 读写默认视图
- 读写提醒设置
- 读写 UI 偏好

## 12.2 建议接口

```ts
getSetting<T = string>(key: string): Promise<T | null>
setSetting<T = string>(key: string, value: T): Promise<void>
getAllSettings(): Promise<Record<string, unknown>>
```

---

## 13. notificationService

## 13.1 职责

- 系统通知封装
- 去重与节流
- 快捷动作回调

## 13.2 建议接口

```ts
notify(input: AppNotificationInput): Promise<void>
cancelNotification(id: string): Promise<void>
scheduleReminderNotifications(): Promise<void>
```

## 13.3 说明

- V1 可以先做应用内提醒主逻辑
- 系统通知作为渐进增强

---

## 14. Repository 层建议

建议按表拆 repository：

- `recordRepository`
- `tagRepository`
- `channelRepository`
- `templateRepository`
- `reportHistoryRepository`
- `settingsRepository`

每个 repository 只做：

- SQL 查询
- 数据映射

不要在 repository 里写复杂业务编排。

---

## 15. Provider 层建议

建议拆：

- `openAICompatibleProvider`
- `anthropicProvider`
- `azureOpenAIProvider`
- `localGatewayProvider`
- `secureStorageProvider`
- `systemNotificationProvider`

这些 provider 负责：

- 与外部协议交互
- 处理请求格式和响应格式转换

不要让 UI 或 store 直接调用 provider。

---

## 16. 页面到接口层的调用关系

## 16.1 Workspace Page

推荐调用：

- `recordService.listRecords`
- `recordService.createRecord`
- `recordService.updateRecord`
- `recordService.completeRecord`
- `recordService.batchReschedule`
- `tagService.listTagsWithCounts`
- `reminderService.getReminderSummary`

## 16.2 Detail Pane

推荐调用：

- `recordService.getRecordById`
- `recordService.updateRecord`
- `tagService.setRecordTags`
- `aiService.generateSummary`
- `aiService.polishMarkdown`

## 16.3 Report Page

推荐调用：

- `templateService.listTemplates`
- `channelService.listChannels`
- `reportService.generateReport`
- `reportService.saveReportHistory`
- `reportService.saveReportAsRecord`

## 16.4 Channel Page

推荐调用：

- `channelService.listChannels`
- `channelService.createChannel`
- `channelService.updateChannel`
- `channelService.testChannel`
- `abilityMappingService.listAbilityMappings`
- `abilityMappingService.setAbilityChannel`

---

## 17. 错误结构建议

统一错误结构：

```ts
type AppError = {
  code: string
  message: string
  details?: unknown
  retryable?: boolean
}
```

建议错误码示例：

- `CHANNEL_DISABLED`
- `CHANNEL_TIMEOUT`
- `CHANNEL_TEST_FAILED`
- `AI_FALLBACK_USED`
- `TAG_DELETE_BLOCKED`
- `RECORD_NOT_FOUND`
- `INVALID_RESCHEDULE_INPUT`

---

## 18. 接口层实现顺序建议

第一批：

- `recordService`
- `tagService`
- `settingsService`

第二批：

- `reminderService`
- `reportService`
- `templateService`

第三批：

- `channelService`
- `abilityMappingService`
- `aiService`
- `notificationService`

---

## 19. 一句话结论

TimeAura 的接口层应以 `service + repository + provider` 三层为核心：页面只调用 service，service 负责编排业务规则，repository 负责 SQLite 访问，provider 负责 AI 协议与系统能力接入，这样最适合当前桌面工具型产品的复杂状态与后续扩展。
