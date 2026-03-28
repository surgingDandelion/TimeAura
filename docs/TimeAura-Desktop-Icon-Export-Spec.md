# TimeAura 桌面图标导出规范

## 1. 文档目的

本文件用于规范 TimeAura 桌面端图标的来源、尺寸、导出路径和 Tauri 对接方式，避免后续反复手工替换。

当前指定主方案：

- `B2 / App Icon Ready`

主图形母版：

- 规范源：
  - `/Users/dandelion/Documents/iflytek/viber_coding/TimeAura/docs/logo-options/b2-suite/timeaura-b2-symbol.svg`
- 导出同步副本：
  - `/Users/dandelion/Documents/iflytek/viber_coding/TimeAura/apps/desktop/src-tauri/icons/icon-source.svg`

---

## 2. 设计基线

- 图标结构基于 `T + A` 三角形主图形
- 圆环贴合三角结构外接关系
- 橙色点用于表达“时间闭环”的动态起点
- macOS Dock / 应用切换器默认使用 `B2 symbol` 版，不再额外叠加外层浅灰底板
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

- `icon.icns`
- `icon.ico`
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
- 脚本会同步生成 `icon.ico`
- `icon.icns` 通过 `iconutil` 自动生成；若后续某些系统工具链拒绝产出，则保留 PNG + ICO + iconset 作为降级结果

---

## 5. Tauri 对接规则

Tauri 配置文件：

- `/Users/dandelion/Documents/iflytek/viber_coding/TimeAura/apps/desktop/src-tauri/tauri.conf.json`

当前策略：

- 开发态窗口图标由 `src-tauri/icons/icon.png` 提供
- bundler 图标路径已接入 `icon.icns`、`icon.ico` 与当前导出的 PNG 资源

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
   - 脚本会先将 `timeaura-b2-symbol.svg` 同步到 `src-tauri/icons/icon-source.svg`
2. 生成多尺寸 PNG
3. 生成 `icon.iconset`
4. 生成 `icon.ico`
5. 生成 `icon.icns`（若系统工具链支持）

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

- Windows 安装器图标
- DMG / installer banner 图

当前桌面开发阶段已经具备 `PNG + ICO + ICNS + 启动态图标链`，可支撑本地开发与后续打包接入。
