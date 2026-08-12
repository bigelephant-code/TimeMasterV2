# 架构说明

## 版本与源码边界

TimeMaster V2 当前存在三个必须明确区分的层次：

```text
src/                       0.1.4-dev 当前可编辑、可构建输入
        │ electron-vite build
        ▼
out/                       生成的主进程、preload 与 renderer 产物

runtime/                   原始 0.1.3 app.asar 的不可变黄金参考
legacy/litecal-0.1.0/      历史 LiteCal 0.1.0 模块化源码，仅供迁移参考
```

`src/` 是从项目所有者制作的 0.1.3 产物重建的 source-equivalent 实现，不是丢失的原始源码。`runtime/` 不参与当前构建，只用于哈希、接口和行为核对。`legacy/` 也不参与根构建；其中的 Vue SFC 和模块可帮助后续恢复清晰边界，但不能直接视为 TimeMaster V2 0.1.3 的实现。

## 运行时进程边界

```text
Renderer（主窗口 / 小组件）
        │ contextBridge 明确白名单
        ▼
Preload
        │ ipcRenderer.invoke / 受控事件订阅
        ▼
Main process
        ├── 本地 JSON 数据仓库与备份
        ├── 窗口、托盘和原生通知
        ├── 专注与提醒调度
        └── 费用台账 Excel 导出
```

主窗口和小组件的 `webPreferences` 显式启用 renderer sandbox 与 `contextIsolation`、关闭 `nodeIntegration` 并保持 `webSecurity`。renderer 不获得原始 `ipcRenderer`；任何文件、窗口或系统能力必须先加入 `src/preload/index.js` 的有限 API，再由主进程注册相应处理器。主进程的受信处理包装器校验 IPC 事件是否来自当前应用窗口。

应用窗口拒绝新窗口，并阻止导航到非应用页面。生产构建会收紧 CSP，删除只为本地开发保留的 WebSocket 来源。仍需注意：上下文隔离和 CSP 是纵深防御，不等于 renderer 或本机环境不可被攻破；完整假设与剩余风险见 [威胁模型](THREAT_MODEL.md)。

## 数据模型与持久化

应用显式把 Electron `userData` 指向 `%APPDATA%\timemaster-v2\`。主要数据采用 JSON；写入时使用临时文件再替换，并保留恢复副本和无法解析的 `.broken-*` 文件。当前数据模型版本为 3。

主要实体包括：

- `lists`：待办清单；
- `todos`：待办、起止时间、重复、提醒和耗时；
- `goals`：目标、周期累计或费用台账配置；
- `expenses`：费用明细；
- `focus`：专注计时状态与完成记录；
- `settings`：主题、窗口、小组件、天气和时间节点设置。

`data.backup.json` 与主数据通常位于同一磁盘，它是便利恢复副本，不是异地或版本化灾备。变更数据格式前必须使用复制后的脱敏 fixture 测试迁移，不能把唯一一份真实用户数据作为开发样本。

## 外部服务

0.1.3 中只有天气模块有意访问外部服务：

- `https://api.open-meteo.com`
- `https://geocoding-api.open-meteo.com`

城市搜索文本发送到地理编码接口；保存的经纬度取整后发送到天气预报接口。核心任务、专注、目标和费用数据不会加入这些请求。网络元数据以及 Open-Meteo、Windows/Chromium 定位链路的处理边界见 [PRIVACY.md](../PRIVACY.md)。

## 产品身份与兼容性

TimeMaster V2 与 LiteCal V1 使用不同 npm 名称、App ID 和用户数据目录：

| 项目 | LiteCal V1 | TimeMaster V2 |
|---|---|---|
| npm 名称 | `litecal` | `timemaster-v2` |
| App ID | `com.litecal.desktop` | `com.timemaster.v2` |
| 数据目录 | `%APPDATA%\litecal\` | `%APPDATA%\timemaster-v2\` |

这项隔离避免安装冲突和用户数据互相覆盖，属于数据安全边界，不应为“统一命名”而合并。

## 构建与验证边界

```powershell
npm ci
npm run check
```

验证链包括：

1. `runtime/` 与 `docs/runtime-0.1.3.sha256` 完全匹配；
2. preload 暴露的 IPC 调用与主进程受信处理器保持契约一致；
3. 窗口安全选项和应用身份满足静态契约；
4. `electron-vite` 从 `src/` 生成 `out/`；
5. 构建产物包含预期入口并使用收紧后的生产 CSP。

这些检查不能证明 UI 的所有路径或数据迁移都正确，也不声称从当前源码生成的二进制与原始 0.1.3 逐字节一致。后续优先补齐数据迁移、损坏恢复、费用导出、专注状态和打包应用烟雾测试。
