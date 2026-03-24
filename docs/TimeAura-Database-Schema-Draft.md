# TimeAura 数据库表结构初稿

## 1. 文档目的

本文件用于给 TimeAura V1 提供一版可直接指导实现的本地数据库结构初稿，服务于：

- 本地记录管理
- 标签绑定
- 提醒计算
- AI 通道配置
- 报告模板与报告历史
- 设置持久化

当前定位：

- 数据库类型：`SQLite`
- 使用场景：桌面端本地单用户应用

---

## 2. 设计原则

- 数据结构优先满足 V1 当前业务闭环
- 避免为未来遥远能力过度设计
- 能支撑高频查询：
  - 列表筛选
  - 标签筛选
  - 时间提醒
  - 报告生成
- 兼顾后续扩展：
  - 回收站
  - 报告记录
  - AI 能力映射
  - 设置项扩展

---

## 3. 表清单

V1 建议至少包含以下表：

- `records`
- `tags`
- `record_tags`
- `ai_channels`
- `ai_ability_mappings`
- `report_templates`
- `report_histories`
- `settings`

可选扩展表：

- `notification_logs`
- `app_events`

---

## 4. records

## 4.1 作用

统一承载备忘录、待办、报告记录。

## 4.2 表结构建议

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | `TEXT PRIMARY KEY` | 记录 id，建议使用 uuid |
| `record_kind` | `TEXT NOT NULL` | 记录类型：`task` / `note` / `report` |
| `title` | `TEXT NOT NULL` | 标题 |
| `content_markdown` | `TEXT` | Markdown 正文 |
| `content_plain` | `TEXT` | 纯文本检索字段 |
| `status` | `TEXT NOT NULL` | `未开始 / 进行中 / 已完成 / 已归档` |
| `priority` | `TEXT NOT NULL` | `P1 / P2 / P3 / P4` |
| `due_at` | `TEXT` | 截止时间，ISO 字符串 |
| `planned_at` | `TEXT` | 计划时间，ISO 字符串 |
| `completed_at` | `TEXT` | 完成时间，ISO 字符串 |
| `created_at` | `TEXT NOT NULL` | 创建时间 |
| `updated_at` | `TEXT NOT NULL` | 更新时间 |
| `archived_at` | `TEXT` | 归档时间 |
| `deleted_at` | `TEXT` | 软删除时间 |
| `source_report_history_id` | `TEXT` | 若由 AI 报告保存而来，可回指报告历史 |
| `ai_summary` | `TEXT` | 可选 AI 摘要缓存 |
| `is_pinned` | `INTEGER NOT NULL DEFAULT 0` | 是否置顶，预留 |

## 4.3 说明

- `record_kind` 用于区分普通记录与报告记录
- `deleted_at` 用于回收站能力
- `content_plain` 用于简化模糊搜索

## 4.4 索引建议

- `idx_records_status`
- `idx_records_priority`
- `idx_records_due_at`
- `idx_records_planned_at`
- `idx_records_completed_at`
- `idx_records_updated_at`
- `idx_records_deleted_at`
- `idx_records_record_kind`

---

## 5. tags

## 5.1 作用

承载标签库定义。

## 5.2 表结构建议

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | `TEXT PRIMARY KEY` | 标签 id |
| `name` | `TEXT NOT NULL UNIQUE` | 标签名 |
| `color` | `TEXT NOT NULL` | 颜色值，如 `#5f8fdc` |
| `is_system` | `INTEGER NOT NULL DEFAULT 0` | 是否系统标签 |
| `sort_order` | `INTEGER NOT NULL DEFAULT 0` | 左侧展示顺序 |
| `created_at` | `TEXT NOT NULL` | 创建时间 |
| `updated_at` | `TEXT NOT NULL` | 更新时间 |

## 5.3 说明

- `未分类` 建议作为系统标签写入
- `name` 需要唯一，避免重复标签

---

## 6. record_tags

## 6.1 作用

承载记录与标签的多对多关系。

## 6.2 表结构建议

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `record_id` | `TEXT NOT NULL` | 记录 id |
| `tag_id` | `TEXT NOT NULL` | 标签 id |
| `created_at` | `TEXT NOT NULL` | 绑定时间 |

主键建议：

- `PRIMARY KEY (record_id, tag_id)`

索引建议：

- `idx_record_tags_tag_id`
- `idx_record_tags_record_id`

---

## 7. ai_channels

## 7.1 作用

承载 AI 通道配置元信息。

## 7.2 表结构建议

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | `TEXT PRIMARY KEY` | 通道 id |
| `name` | `TEXT NOT NULL` | 通道名称 |
| `provider_type` | `TEXT NOT NULL` | `openai_compatible / anthropic / azure_openai / local_gateway / aggregator` |
| `base_url` | `TEXT` | 接口地址 |
| `model` | `TEXT NOT NULL` | 默认模型名 |
| `temperature` | `REAL NOT NULL DEFAULT 0.3` | 温度 |
| `max_tokens` | `INTEGER` | 最大输出 |
| `timeout_ms` | `INTEGER NOT NULL DEFAULT 60000` | 超时 |
| `system_prompt` | `TEXT` | 系统提示词 |
| `default_language` | `TEXT NOT NULL DEFAULT 'zh-CN'` | 默认输出语言 |
| `enabled` | `INTEGER NOT NULL DEFAULT 1` | 是否启用 |
| `allow_fallback` | `INTEGER NOT NULL DEFAULT 1` | 是否允许自动回退 |
| `api_key_ref` | `TEXT` | 凭据引用 id，不直接存明文 key |
| `created_at` | `TEXT NOT NULL` | 创建时间 |
| `updated_at` | `TEXT NOT NULL` | 更新时间 |

## 7.3 说明

- `api_key_ref` 只保存安全存储引用，不直接保存明文 key
- `provider_type` 需要明确支持 `anthropic`

---

## 8. ai_ability_mappings

## 8.1 作用

定义不同 AI 能力使用哪个通道。

## 8.2 表结构建议

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `ability_key` | `TEXT PRIMARY KEY` | 能力 key，如 `weekly_report` |
| `channel_id` | `TEXT NOT NULL` | 通道 id |
| `updated_at` | `TEXT NOT NULL` | 更新时间 |

## 8.3 建议能力 key

- `weekly_report`
- `monthly_report`
- `summary`
- `polish`

---

## 9. report_templates

## 9.1 作用

承载周报 / 月报 / 自定义模板定义。

## 9.2 表结构建议

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | `TEXT PRIMARY KEY` | 模板 id |
| `template_type` | `TEXT NOT NULL` | `weekly / monthly / custom` |
| `name` | `TEXT NOT NULL` | 模板名称 |
| `tone` | `TEXT` | 输出语气 |
| `sections_json` | `TEXT NOT NULL` | 章节结构 JSON |
| `prompt_prefix` | `TEXT` | 模板附加提示 |
| `is_builtin` | `INTEGER NOT NULL DEFAULT 0` | 是否内置模板 |
| `created_at` | `TEXT NOT NULL` | 创建时间 |
| `updated_at` | `TEXT NOT NULL` | 更新时间 |

---

## 10. report_histories

## 10.1 作用

记录 AI 报告生成历史与草稿。

## 10.2 表结构建议

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | `TEXT PRIMARY KEY` | 报告历史 id |
| `report_type` | `TEXT NOT NULL` | `weekly / monthly / custom` |
| `template_id` | `TEXT` | 模板 id |
| `channel_id` | `TEXT` | 使用通道 id |
| `title` | `TEXT NOT NULL` | 报告标题 |
| `time_range_start` | `TEXT` | 时间范围开始 |
| `time_range_end` | `TEXT` | 时间范围结束 |
| `tag_filter` | `TEXT` | 标签过滤条件 |
| `status_filter` | `TEXT` | 状态过滤条件 |
| `source_record_ids_json` | `TEXT` | 参与生成的记录 id 列表 |
| `content_markdown` | `TEXT NOT NULL` | 生成结果 Markdown |
| `saved_record_id` | `TEXT` | 如果保存为记录，关联 record id |
| `created_at` | `TEXT NOT NULL` | 创建时间 |
| `updated_at` | `TEXT NOT NULL` | 更新时间 |

---

## 11. settings

## 11.1 作用

保存用户级应用设置。

## 11.2 表结构建议

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `key` | `TEXT PRIMARY KEY` | 设置 key |
| `value` | `TEXT NOT NULL` | 设置值，JSON 或字符串 |
| `updated_at` | `TEXT NOT NULL` | 更新时间 |

## 11.3 建议 key

- `theme`
- `default_view`
- `detail_width`
- `completion_quick_mode`
- `reminder_enabled`
- `do_not_disturb_range`
- `default_channel_id`

---

## 12. 可选扩展表

## 12.1 notification_logs

作用：

- 防止同类提醒在短时间内重复发送

字段建议：

- `id`
- `record_id`
- `notification_type`
- `sent_at`

## 12.2 app_events

作用：

- 可选行为记录，用于后续分析

V1 可不做。

---

## 13. 关系说明

### 13.1 核心关系

- `records` 与 `tags`
  - 多对多，通过 `record_tags`
- `ai_channels` 与 `ai_ability_mappings`
  - 一对多
- `report_templates` 与 `report_histories`
  - 一对多
- `report_histories` 与 `records`
  - 通过 `saved_record_id` 建立可选关联

---

## 14. 数据约束建议

### 14.1 记录约束

- `status` 必须为受控枚举
- `priority` 必须为 `P1 / P2 / P3 / P4`
- `deleted_at` 不为空时，默认不出现在主列表

### 14.2 标签约束

- `未分类` 为系统标签
- 删除标签前必须由 service 层处理绑定关系回落

### 14.3 通道约束

- `enabled = 0` 的通道不可作为新请求默认通道
- 若能力映射绑定到禁用通道，调用前必须先走回退逻辑

---

## 15. 初始化数据建议

首次启动建议写入：

- 系统标签：
  - `未分类`
- 默认模板：
  - `标准周报模板`
  - `标准月报模板`
- 默认设置：
  - `theme = light`
  - `default_view = today`
  - `reminder_enabled = true`

---

## 16. 一句话结论

TimeAura V1 的数据库结构应以 `records + tags + ai_channels + report_templates + report_histories + settings` 为核心，采用 SQLite 落地，先保证记录管理、提醒逻辑、AI 配置和报告生成闭环成立，再逐步扩展通知日志与同步能力。
