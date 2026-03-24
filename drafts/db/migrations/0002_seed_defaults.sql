INSERT OR IGNORE INTO tags (
  id,
  name,
  color,
  is_system,
  sort_order,
  created_at,
  updated_at
) VALUES (
  'tag_uncategorized',
  '未分类',
  '#97a6b8',
  1,
  9999,
  '2026-03-24T09:00:00+08:00',
  '2026-03-24T09:00:00+08:00'
);

INSERT OR IGNORE INTO report_templates (
  id,
  template_type,
  name,
  tone,
  sections_json,
  prompt_prefix,
  is_builtin,
  created_at,
  updated_at
) VALUES
(
  'tpl_weekly_default',
  'weekly',
  '标准周报模板',
  '专业、简洁、可汇报',
  '["本周期完成事项","本周期推进中事项","风险与阻塞","下一阶段计划"]',
  '请基于输入记录生成一份条理清晰的周报。',
  1,
  '2026-03-24T09:00:00+08:00',
  '2026-03-24T09:00:00+08:00'
),
(
  'tpl_monthly_default',
  'monthly',
  '标准月报模板',
  '复盘感、结构化、适合月度汇报',
  '["本周期关键成果","数据与里程碑","复盘与问题","下一阶段重点"]',
  '请基于输入记录生成一份结构清晰的月报。',
  1,
  '2026-03-24T09:00:00+08:00',
  '2026-03-24T09:00:00+08:00'
);

INSERT OR IGNORE INTO settings (key, value, updated_at) VALUES
('theme', 'light', '2026-03-24T09:00:00+08:00'),
('default_view', 'today', '2026-03-24T09:00:00+08:00'),
('detail_width', '540', '2026-03-24T09:00:00+08:00'),
('reminder_enabled', 'true', '2026-03-24T09:00:00+08:00'),
('completion_quick_mode', 'popover', '2026-03-24T09:00:00+08:00'),
('do_not_disturb_range', '{"enabled":false,"start":"22:00","end":"08:00"}', '2026-03-24T09:00:00+08:00');
