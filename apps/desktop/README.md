# TimeAura Desktop Scaffold

该目录是 TimeAura 的真实桌面工程落位目录草稿，面向：

- `Tauri 2`
- `React 18`
- `TypeScript`
- `Vite`

当前版本重点是先把以下几件事连起来：

- `AppServicesProvider`
- `mock / sqlite` 双模式装配入口
- `AIProviderGateway` 注入
- `NotificationDriver` 注入
- 与 `drafts/src` 的核心领域骨架对接

初始化后的建议步骤：

1. 进入目录执行 `pnpm install`
2. 执行 `pnpm tauri:dev`
3. 若需要真实 SQLite 模式，设置：
   - `VITE_TIMEAURA_DATA_MODE=sqlite`
   - `VITE_TIMEAURA_DB_URL=sqlite:timeaura.db`
