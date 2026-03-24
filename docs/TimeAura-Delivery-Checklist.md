# TimeAura 交付清单

## 1. 文档目的

本清单用于把 TimeAura 当前阶段的产品定义、线框方案、HTML 原型和给模型的设计输入整理成一份统一交付说明，方便直接发给：

- UI 设计师
- 前端开发
- 产品协同方
- 多模态 / UI 设计模型

---

## 2. 项目基本信息

- 产品名称：TimeAura
- Slogan：让每个重要时刻如约而至
- 当前阶段：V1 设计输入 + 高保真交互原型
- 目标平台：桌面端优先（macOS / Windows）
- 核心定位：AI 备忘录与待办统一工作台

---

## 3. 交付文件总览

### 3.1 PRD 文档

- 文件：`/Users/dandelion/Documents/iflytek/viber_coding/TimeAura/docs/TimeAura-PRD-v1.md`
- 作用：
  - 定义产品目标、信息架构、核心功能、交互规则
  - 明确提醒条、批量改期、AI 通道、周报月报、标签管理等核心逻辑
  - 包含交互状态规范与 design tokens 设计输入规范
- 重点阅读章节：
  - 产品定位与版本范围
  - 信息架构
  - 核心功能需求
  - 页面级 UI 设计约束
  - `12.4 交互状态规范`
  - `12.4.7 Design Tokens 设计输入规范`

### 3.2 低保真线框文档

- 文件：`/Users/dandelion/Documents/iflytek/viber_coding/TimeAura/docs/TimeAura-LowFi-Wireframes-v1.md`
- 作用：
  - 定义页面骨架、主要布局、关键交互关系
  - 明确主工作台、提醒条、右侧详情区、AI 报告页、AI 通道配置页的结构
  - 提供与 PRD 一致的 design tokens 简述，便于高保真延续
- 重点阅读章节：
  - 主工作台线框
  - 主列表区
  - 提醒条与一键改期
  - 右侧详情区
  - AI 报告页
  - `10.4 Design Tokens 简述`

### 3.3 HTML 高保真交互原型

- 文件：`/Users/dandelion/Documents/iflytek/viber_coding/TimeAura/index.html`
- 作用：
  - 当前最接近真实产品的交互原型
  - 已覆盖浅色 / 暗色主题
  - 已实现主工作台、AI 报告、AI 通道配置、提醒条、批量改期、标签管理、详情展开收起、拖拽分栏等关键交互
- 可用于：
  - UI 设计细节参考
  - 前端实现对照
  - 向模型提供“现有风格基线”

### 3.4 UI 模型最终提示词

- 文件：`/Users/dandelion/Documents/iflytek/viber_coding/TimeAura/docs/TimeAura-UI-Model-Final-Prompt.md`
- 作用：
  - 作为专门喂给 UI 设计模型的最终提示词
  - 已整合 PRD、线框、原型的核心约束
  - 适合直接复制使用

---

## 4. 建议给不同对象的发包方式

### 4.1 发给 UI 设计师

建议打包以下内容：

- `docs/TimeAura-PRD-v1.md`
- `docs/TimeAura-LowFi-Wireframes-v1.md`
- `index.html`
- `docs/TimeAura-Delivery-Checklist.md`

建议说明：

- 先看 PRD 理解产品逻辑
- 再看低保真线框理解布局结构
- 最后看 HTML 原型理解当前风格方向与交互状态
- 若需要继续扩展高保真规范，以 PRD 中的 design tokens 为准

### 4.2 发给前端开发

建议打包以下内容：

- `docs/TimeAura-PRD-v1.md`
- `index.html`
- `docs/TimeAura-Delivery-Checklist.md`

建议说明：

- PRD 负责功能与交互规则
- `index.html` 负责现阶段样式、层级、状态、控件语言参考
- 低保真线框可作为结构补充材料按需查看

### 4.3 发给 UI 设计模型

建议打包以下内容：

- `docs/TimeAura-UI-Model-Final-Prompt.md`
- `docs/TimeAura-PRD-v1.md`
- `docs/TimeAura-LowFi-Wireframes-v1.md`
- `index.html`

推荐输入顺序：

1. 先输入 `docs/TimeAura-UI-Model-Final-Prompt.md`
2. 再附加 `docs/TimeAura-PRD-v1.md`
3. 再附加 `docs/TimeAura-LowFi-Wireframes-v1.md`
4. 如模型支持文件参考，再附加 `index.html`

---

## 5. 文件之间的职责分工

| 文件 | 主要回答什么问题 |
| --- | --- |
| `TimeAura-PRD-v1.md` | 这个产品要做什么，规则是什么，边界是什么 |
| `TimeAura-LowFi-Wireframes-v1.md` | 页面骨架怎么搭，区块之间怎么组织 |
| `index.html` | 当前高保真效果与交互状态长什么样 |
| `TimeAura-UI-Model-Final-Prompt.md` | 如果交给模型，应该如何稳定地产出 |
| `TimeAura-Delivery-Checklist.md` | 如果交给人或模型，应该发哪些材料、按什么顺序看 |

---

## 6. 当前原型已覆盖的关键能力

### 6.1 主工作台

- 左侧简洁导航
- 标签与系统视图统一
- 单行快速新增
- 搜索 / 筛选 / 排序
- 单行高密度列表
- 右侧详情默认收起，点击后展开
- 中间与右侧支持拖拽分栏

### 6.2 详情区

- inspector 化属性面板
- 状态 / 优先级 / 时间字段行
- Markdown 编辑 / 分栏 / 预览
- 标签管理入口位于详情区
- AI 摘要 / 润色 / 管理标签使用统一次级操作语言

### 6.3 提醒与批量改期

- 列表上方提醒条
- 命中任务展开
- 支持选择部分任务
- 一键改期与自定义时间

### 6.4 AI 能力

- AI 报告页
- 周报 / 月报 / 自定义
- 模板切换
- 模板配置入口
- AI 通道选择
- AI 通道配置页
- 支持 Anthropic 协议

### 6.5 视觉与主题

- 浅色主题
- 暗色主题
- design tokens 已文档化
- 交互状态规范已文档化

---

## 7. 当前视觉与交互基线

### 7.1 视觉方向

- 接近 mac 原生专业工具
- 克制、冷静、轻专业
- 非后台系统风
- 非赛博科技风
- 非营销海报风

### 7.2 核心视觉语义

- 主蓝：低饱和时间蓝
- 提醒：暖橙
- 风险：柔和红
- 完成：自然绿
- 主背景：浅冷灰蓝
- 暗色背景：冷静深蓝灰

### 7.3 不允许偏离的点

- 不要紫色主视觉
- 不要把主列表做成卡片流
- 不要所有按钮都做强阴影
- 不要 hover 与 selected 区分不清
- 不要把右侧详情做成普通后台表单

---

## 8. 如果要继续推进，建议的下一步顺序

### 路线 A：走设计

1. 基于 `TimeAura-UI-Model-Final-Prompt.md` 让模型先出一版完整高保真
2. 用 `index.html` 对照修正交互状态与控件语言
3. 回写 PRD 或组件规范

### 路线 B：走开发

1. 先拆主工作台结构
2. 再拆详情 inspector
3. 再接提醒条与批量改期
4. 最后接 AI 报告与 AI 通道配置

### 路线 C：走产品协同

1. 先发本交付清单
2. 再发 PRD
3. 再发线框
4. 最后发 HTML 原型与 UI 模型提示词

---

## 9. 给接收方的一段简版说明

你收到的是 TimeAura 当前阶段的完整设计输入包：

- PRD 负责定义产品目标、功能、规则和状态规范
- 低保真线框负责定义页面结构与主要区块关系
- HTML 原型负责展示当前最接近实装的交互与视觉基线
- UI 模型最终提示词负责把这些内容转译成更稳定的模型输入

如果你是设计师，请优先看 PRD 和线框，再看 HTML 原型。
如果你是前端，请优先看 HTML 原型和 PRD。
如果你是模型，请优先使用 `TimeAura-UI-Model-Final-Prompt.md`，并把 PRD、线框、原型作为上下文参考。
