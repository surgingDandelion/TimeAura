# TimeAura 桌面图标导出规范

## 1. 文档目的

本文件用于规范 TimeAura 桌面端图标的来源、尺寸、导出路径和 Tauri 对接方式，避免后续反复手工替换。

当前指定主方案：

- `B2 / App Icon Ready`

主图形母版：

- `/Users/dandelion/Documents/iflytek/viber_coding/TimeAura/apps/desktop/src-tauri/icons/icon-source.svg`

---

## 2. 设计基线

- 图标结构基于 `T + A` 三角形主图形
- 圆环贴合三角结构外接关系
- 橙色点用于表达“时间闭环”的动态起点
- 默认正式图标使用浅色底母版
- 暗色版用于启动页、宣传图或主题展示，不直接替代桌面系统主图标

---

## 3. 标准导出尺寸

建议保留以下 PNG 资产：

- `16 x 16`
- `32 x 32`
- `64 x 64`
- `128 x 128`
- `256 x 256`
- `512 x 512`
- `1024 x 1024`

当前输出目录：

- `/Users/dandelion/Documents/iflytek/viber_coding/TimeAura/apps/desktop/src-tauri/icons`

当前文件命名：

- `icon.png`
- `icon-16.png`
- `icon-32.png`
- `icon-64.png`
- `icon-128.png`
- `icon-256.png`
- `icon-512.png`
- `icon-1024.png`

---

## 4. macOS iconset 规范

用于生成 `icns` 的标准 iconset 目录：

- `/Users/dandelion/Documents/iflytek/viber_coding/TimeAura/apps/desktop/src-tauri/icons/icon.iconset`

应包含：

- `icon_16x16.png`
- `icon_16x16@2x.png`
- `icon_32x32.png`
- `icon_32x32@2x.png`
- `icon_128x128.png`
- `icon_128x128@2x.png`
- `icon_256x256.png`
- `icon_256x256@2x.png`
- `icon_512x512.png`
- `icon_512x512@2x.png`

说明：

- 当前工程已经生成 iconset 目录
- `iconutil` 在本机环境下未稳定产出 `icon.icns`，因此现阶段先以 PNG 资产和 iconset 为主
- 后续如果切换图形工具链或系统环境，可继续尝试生成 `icon.icns`

---

## 5. Tauri 对接规则

Tauri 配置文件：

- `/Users/dandelion/Documents/iflytek/viber_coding/TimeAura/apps/desktop/src-tauri/tauri.conf.json`

当前策略：

- 开发态窗口图标由 `src-tauri/icons/icon.png` 提供
- bundler 图标路径统一指向当前导出的 PNG 资源
- 后续若 `icon.icns` 稳定产出，可加入 bundle icon 列表

---

## 6. 导出流程

### 6.1 推荐入口

在桌面端目录执行：

```bash
npm run icons:export
```

### 6.2 实际脚本

- `/Users/dandelion/Documents/iflytek/viber_coding/TimeAura/apps/desktop/scripts/export-b2-icons.sh`

脚本会自动完成：

1. 使用 `qlmanage` 从 `icon-source.svg` 渲染 `1024 png`
2. 生成多尺寸 PNG
3. 生成 `icon.iconset`
4. 尝试生成 `icon.icns`

---

## 7. 启动动画规范

启动动画对应的几何资产和动效逻辑已落在：

- `/Users/dandelion/Documents/iflytek/viber_coding/TimeAura/apps/desktop/src/app/components/BootstrapScreen.tsx`
- `/Users/dandelion/Documents/iflytek/viber_coding/TimeAura/apps/desktop/src/styles/global.css`

动效规则：

- 橙色点沿完整圆环顺时针绕行一周
- 结束后回到起始点
- 动效时长建议：
  - 启动态：`2.4s ~ 2.8s`
  - hover：`1.6s ~ 1.9s`
- 缓动建议：
  - `cubic-bezier(0.22, 0.7, 0.22, 1)`

---

## 8. 后续补齐建议

若需要正式进入打包发布，建议继续补齐：

- `icon.icns`
- `icon.ico`
- Windows 安装器图标
- DMG / installer banner 图

但在当前桌面开发阶段，PNG + 启动态图标链已经足够支撑开发与本地体验。
