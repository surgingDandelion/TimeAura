PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS records (
  id TEXT PRIMARY KEY,
  record_kind TEXT NOT NULL CHECK (record_kind IN ('task', 'note', 'report')),
  title TEXT NOT NULL,
  content_markdown TEXT DEFAULT '',
  content_plain TEXT DEFAULT '',
  status TEXT NOT NULL CHECK (status IN ('未开始', '进行中', '已完成', '已归档')),
  priority TEXT NOT NULL CHECK (priority IN ('P1', 'P2', 'P3', 'P4')),
  due_at TEXT,
  planned_at TEXT,
  completed_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  archived_at TEXT,
  deleted_at TEXT,
  source_report_history_id TEXT,
  ai_summary TEXT,
  is_pinned INTEGER NOT NULL DEFAULT 0 CHECK (is_pinned IN (0, 1))
);

CREATE TABLE IF NOT EXISTS tags (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  color TEXT NOT NULL,
  is_system INTEGER NOT NULL DEFAULT 0 CHECK (is_system IN (0, 1)),
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS record_tags (
  record_id TEXT NOT NULL,
  tag_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  PRIMARY KEY (record_id, tag_id),
  FOREIGN KEY (record_id) REFERENCES records(id) ON DELETE CASCADE,
  FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS ai_channels (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  provider_type TEXT NOT NULL CHECK (
    provider_type IN (
      'openai_compatible',
      'anthropic',
      'azure_openai',
      'local_gateway',
      'aggregator'
    )
  ),
  base_url TEXT,
  model TEXT NOT NULL,
  temperature REAL NOT NULL DEFAULT 0.3,
  max_tokens INTEGER,
  timeout_ms INTEGER NOT NULL DEFAULT 60000,
  system_prompt TEXT DEFAULT '',
  default_language TEXT NOT NULL DEFAULT 'zh-CN',
  enabled INTEGER NOT NULL DEFAULT 1 CHECK (enabled IN (0, 1)),
  allow_fallback INTEGER NOT NULL DEFAULT 1 CHECK (allow_fallback IN (0, 1)),
  api_key_ref TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS ai_ability_mappings (
  ability_key TEXT PRIMARY KEY CHECK (
    ability_key IN ('weekly_report', 'monthly_report', 'summary', 'polish')
  ),
  channel_id TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (channel_id) REFERENCES ai_channels(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS report_templates (
  id TEXT PRIMARY KEY,
  template_type TEXT NOT NULL CHECK (template_type IN ('weekly', 'monthly', 'custom')),
  name TEXT NOT NULL,
  tone TEXT DEFAULT '',
  sections_json TEXT NOT NULL,
  prompt_prefix TEXT DEFAULT '',
  is_builtin INTEGER NOT NULL DEFAULT 0 CHECK (is_builtin IN (0, 1)),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS report_histories (
  id TEXT PRIMARY KEY,
  report_type TEXT NOT NULL CHECK (report_type IN ('weekly', 'monthly', 'custom')),
  template_id TEXT,
  channel_id TEXT,
  title TEXT NOT NULL,
  time_range_start TEXT,
  time_range_end TEXT,
  tag_filter TEXT,
  status_filter TEXT,
  source_record_ids_json TEXT NOT NULL DEFAULT '[]',
  content_markdown TEXT NOT NULL,
  saved_record_id TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (template_id) REFERENCES report_templates(id) ON DELETE SET NULL,
  FOREIGN KEY (channel_id) REFERENCES ai_channels(id) ON DELETE SET NULL,
  FOREIGN KEY (saved_record_id) REFERENCES records(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_records_status ON records(status);
CREATE INDEX IF NOT EXISTS idx_records_priority ON records(priority);
CREATE INDEX IF NOT EXISTS idx_records_due_at ON records(due_at);
CREATE INDEX IF NOT EXISTS idx_records_planned_at ON records(planned_at);
CREATE INDEX IF NOT EXISTS idx_records_completed_at ON records(completed_at);
CREATE INDEX IF NOT EXISTS idx_records_updated_at ON records(updated_at);
CREATE INDEX IF NOT EXISTS idx_records_deleted_at ON records(deleted_at);
CREATE INDEX IF NOT EXISTS idx_records_record_kind ON records(record_kind);
CREATE INDEX IF NOT EXISTS idx_tags_sort_order ON tags(sort_order);
CREATE INDEX IF NOT EXISTS idx_record_tags_tag_id ON record_tags(tag_id);
CREATE INDEX IF NOT EXISTS idx_record_tags_record_id ON record_tags(record_id);
CREATE INDEX IF NOT EXISTS idx_ai_channels_enabled ON ai_channels(enabled);
CREATE INDEX IF NOT EXISTS idx_report_histories_created_at ON report_histories(created_at);
