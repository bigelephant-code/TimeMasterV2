# 架构说明

## 版本与源码边界

时间大师当前存在三个必须明确区分的层次：

```text
src/                       0.1.11 当前可编辑、可构建输入
        │ electron-vite build
        ▼
out/                       生成的主进程、preload 与 renderer 产物

runtime/                   原始 0.1.3 app.asar 的不可变黄金参考
legacy/litecal-0.1.0/      历史 LiteCal 0.1.0 模块化源码，仅供迁移参考
```

`src/` 是从项目所有者制作的 0.1.3 产物重建的 source-equivalent 实现，不是丢失的原始源码。`runtime/` 不参与当前构建，只用于哈希、接口和行为核对。`legacy/` 也不参与根构建；其中的 Vue SFC 和模块可帮助后续恢复清晰边界，但不能直接视为历史 TimeMaster V2 0.1.3 的实现。

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
        ├── 默认关闭的 OpenClaw 提醒队列
        │   └── loopback OpenClaw → 用户配置的模型 / QQ Bot
        ├── 默认关闭的 AI 任务教练
        │   └── loopback OpenClaw Responses → 结构化草案 → 本地排程/事务应用
        └── 费用台账 Excel 导出
```

主窗口和小组件的 `webPreferences` 显式启用 renderer sandbox 与 `contextIsolation`、关闭 `nodeIntegration` 并保持 `webSecurity`。renderer 不获得原始 `ipcRenderer`；任何文件、窗口或系统能力必须先加入 `src/preload/index.js` 的有限 API，再由主进程注册相应处理器。主进程的受信处理包装器校验 IPC 事件是否来自当前应用窗口。

应用窗口拒绝新窗口，并阻止导航到非应用页面。生产构建会收紧 CSP，删除只为本地开发保留的 WebSocket 来源。仍需注意：上下文隔离和 CSP 是纵深防御，不等于 renderer 或本机环境不可被攻破；完整假设与剩余风险见 [威胁模型](THREAT_MODEL.md)。

## 数据模型与持久化

应用显式把 Electron `userData` 指向 `%APPDATA%\timemaster-v2\`。主要数据采用 JSON；写入时使用临时文件再替换，并保留恢复副本和无法解析的 `.broken-*` 文件。0.1.3 正式版使用数据模型 v3；0.1.4—0.1.11 Windows x64 正式版使用 v4。0.1.9 在 v4 待办中增加兼容的可选 `rolloverHistory` 数组；0.1.10 增加可选 `completionHistory` 数组，二者均不改变旧数据的版本门禁。0.1.11 安装包未经过 Authenticode 签名；本架构说明不表示该安装包已经上传到 GitHub Release。

主要实体包括：

- `lists`：待办清单；
- `todos`：待办、起止时间、重复、提醒、耗时，以及自动顺延和重复待办周期完成时附着在待办上的只读历史；
- `goals`：目标、周期累计或费用台账配置；v4 的费用台账在这里保存独立的 `expenseCategories` 类别目录；
- `expenses`：费用明细，其中 `cat` 引用所属台账中不可变的稳定类别 ID；
- `focus`：专注计时状态与完成记录；
- `aiTaskCoach`：可选任务拆解、步骤勾选状态、今日排程草案及批次撤销记录；它是 v4 的向后兼容可选扩展，不改变版本门禁；
- `settings`：主题、窗口、小组件、天气和时间节点设置。

开发中的 OpenClaw 远程提醒不改变上述主业务数据的本地优先模型。非敏感开关、loopback Gateway 地址、QQ 目标和可选账号 ID 作为设置保存；时间大师侧 Hook token 副本由 Electron `safeStorage` 加密后单独写入 `secrets.json`，不进入 `settings.json` 或 `data.json`。OpenClaw 侧仍需在其配置或运行环境中持有同一 token，并作为独立的 ACL 保护边界。`remote-reminder-outbox.json` 只保留有界的事件标识、待办/发生项引用、尝试状态与重试时间等投递元数据，不保存 Hook token、QQ 目标或提醒正文。

AI 任务教练使用独立的 `/v1/responses` Gateway Token，不能复用提醒 Hook token。非敏感配置进入 `settings.json`，时间大师侧 Token 副本与 Hook token 分键写入 `secrets.json` 并由 `safeStorage` 加密。AI 草案与精确撤销数据跟待办一起保存在 `data.json`，从而避免“任务时间已写而撤销记录仍在另一个文件”的跨文件不一致。主进程只向专用 Agent 发送当前请求的最小快照；Agent 不获得数据文件路径或任意读写工具。

`data.backup.json` 与主数据通常位于同一磁盘，它是便利恢复副本，不是异地或版本化灾备。v3→v4 迁移会在规范化前另写一份不覆盖、不会自动轮换的 `data.pre-v4-<timestamp>[-n].json`；它便于失败恢复，也会延长本地敏感数据的保留时间。变更数据格式前必须使用复制后的脱敏 fixture 测试迁移，不能把唯一一份真实用户数据作为开发样本。

费用类别在 v4 中使用稳定 ID 关联流水。重命名只改变显示名称；停用通过 `archivedAt` 逻辑归档，不会删除类别定义或改写既有费用。v3→v4 迁移会物化原有七个固定类别并保留 `catNames` 自定义名称，不改写费用金额、日期、备注或类别 ID。若旧数据包含目录外的类别 ID，迁移会把它保留为已归档的遗留分类，使金额继续进入历史汇总和导出，而不是被静默忽略。

类别新增、重命名、停用和恢复分别通过受信的 `expenseCategory:add`、`expenseCategory:rename`、`expenseCategory:archive` 和 `expenseCategory:restore` IPC 操作完成。主进程校验台账归属、名称、类别状态和固定分组；renderer 不能整包替换类别目录，也不能修改稳定 ID。新记账只能选择使用中的类别，历史、汇总和导出则同时解析使用中、已停用及遗留类别。

Excel 对账以稳定类别 ID 而不是可变显示名称作为汇总键，并按实际类别数量动态计算分类行、公式范围、合并区域和工作表尺寸。这样类别改名不会改变历史金额归属，已停用或迁移保留的类别也不会从笔数和金额核对中消失。

## 外部服务

0.1.3—0.1.11 正式版中，只有天气模块有意访问外部服务；费用分类管理、延期/完成历史和界面改版不增加联网目的地：

- `https://api.open-meteo.com`
- `https://geocoding-api.open-meteo.com`

城市搜索文本发送到地理编码接口；保存的经纬度取整后发送到天气预报接口。核心任务、专注、目标和费用数据不会加入这些请求。网络元数据以及 Open-Meteo、Windows/Chromium 定位链路的处理边界见 [PRIVACY.md](../PRIVACY.md)。

当前未发布源码另包含默认关闭的 OpenClaw QQ Bot 远程提醒。用户输入 token 时明文会短暂存在于 renderer 的密码框中，但保存后立即清空且永不回填；后续链路由 Electron 主进程读取加密值并调用本机 loopback 上的 `/hooks/agent`，renderer 不直接发起该网络请求。每次提醒的处理顺序为：

1. 时间大师进程运行时，本地调度器独立尝试 Windows 通知；
2. 若用户已开启远程提醒，则把标题、日期/时间和用户明确选择的备注组成有界载荷；
3. 主进程使用 Bearer Hook token 和稳定事件标识投递至本机 OpenClaw；
4. OpenClaw 根据用户配置选择模型、QQ Bot 目标类型（私聊、群或频道）和可选账号后继续外部投递。

`/hooks/agent` 返回 200 只表示 OpenClaw 已受理，不是 QQ 送达回执。QQ 主动消息还可能受目标类型、所选账号、最近用户交互窗口、限流和平台政策限制。因此状态只能表述“OpenClaw 已受理”，不能宣称“QQ 已送达”；Windows 通知是独立尝试的本地兜底，但其可见展示仍受 Windows 通知设置影响。

当前未发布源码还包含默认关闭的 AI 任务教练。renderer 只能通过主窗口专属 IPC 请求单任务拆解或今日排程；主进程从加密存储读取 Gateway Token，并以非流式 `POST /v1/responses` 调用 `timemaster-coach`。请求固定要求白名单 function call，返回后执行 JSON/schema/长度/HTTPS 链接校验。模型负责拆解、预计时长和优先顺序；本地确定性排程器负责避开手工时间、午休和缓冲，并排除运行中或重复任务。应用前以 `updatedAt` 和排程签名全量复核：任一冲突都会使整个批次零修改。撤销也只在当前字段仍与该批次写入值完全一致时执行，AI 主动调度不会写入自动延期历史。

Responses 的共享 Gateway bearer 在 OpenClaw 安全模型中等同完整 operator 凭据，不能通过请求头降权。时间大师因此只允许 loopback HTTP、禁止重定向、限制超时和响应体，并把密钥留在主进程；更强隔离需要用户使用独立 Gateway/Profile 和无文件、运行时、消息、自动化、UI、节点权限的专用 Agent。详见 [AI 任务教练配置指南](OPENCLAW_AI_TASK_COACH.md)。

## 产品身份与兼容性

时间大师与 LiteCal V1 使用不同 npm 名称、App ID 和用户数据目录；为兼容历史数据，当前版本继续使用原有内部 V2 标识：

| 项目 | LiteCal V1 | 时间大师（内部 V2 标识） |
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
6. v3→v4 费用类别迁移、稳定 ID、停用/恢复、固定货款分组和遗留金额保留通过独立边界测试。
7. AI Responses 的 loopback/鉴权/结构校验、确定性排程、冲突零写与精确撤销通过独立边界测试。

这些检查不能证明 UI 的所有路径或数据迁移都正确，也不声称从当前源码生成的二进制与原始 0.1.3 逐字节一致。后续优先补齐数据迁移、损坏恢复、费用导出、专注状态和打包应用烟雾测试。
