# 时间大师（TimeMaster）

[![License: MIT](https://img.shields.io/github/license/bigelephant-code/TimeMasterV2)](LICENSE)
[![CI](https://github.com/bigelephant-code/TimeMasterV2/actions/workflows/validate.yml/badge.svg)](https://github.com/bigelephant-code/TimeMasterV2/actions/workflows/validate.yml)
[![CodeQL](https://github.com/bigelephant-code/TimeMasterV2/actions/workflows/codeql.yml/badge.svg)](https://github.com/bigelephant-code/TimeMasterV2/actions/workflows/codeql.yml)
[![GitHub Release](https://img.shields.io/github/v/release/bigelephant-code/TimeMasterV2?display_name=tag)](https://github.com/bigelephant-code/TimeMasterV2/releases)

[English](README.en.md) | 简体中文

时间大师是一个面向 Windows 的本地优先时间管理工具，把日历、待办、艾森豪威尔四象限、专注计时、主任务、费用台账和桌面小组件放在同一个工作台中。

它适合希望在一个无需账号、默认不上传个人任务数据的 Windows 工作区中，同时看清“今天做什么、先做什么、投入了多久、长期目标进度和项目支出”的用户。

<p align="center">
  <img src="docs/images/widget.png" width="420" alt="时间大师桌面小组件，使用虚构演示数据">
</p>
<p align="center"><sub>桌面小组件集中展示日期、专注、主任务、费用与四象限；截图使用虚构演示数据。</sub></p>

[![从 GitHub Releases 下载](https://img.shields.io/badge/下载-GitHub%20Releases-0969da?style=for-the-badge&logo=github)](https://github.com/bigelephant-code/TimeMasterV2/releases/latest)

> **版本与来源：** `v0.1.3` 保留项目所有者制作的原始、未签名 Windows 安装包。当前 `0.1.11` Windows x64 版本沿用从 0.1.3 产物重建的可编辑、可构建 **source-equivalent reconstruction**；它不是丢失的原始 Vue 源码，也不保证与 0.1.3 逐字节一致。安装包未经过 Authenticode 签名，实际下载内容与 SHA-256 以 [GitHub Releases](https://github.com/bigelephant-code/TimeMasterV2/releases) 附件为准。详见 [恢复记录](docs/RECOVERY.md)。

## 功能概览

| 模块 | 能力 |
|---|---|
| 日历 | 月、周、日视图；公历、农历、节气、传统节日和法定节假日 |
| 待办 | 多清单、起止时间、优先级、重复、提醒、拖拽和耗时统计 |
| AI 任务教练（开发中） | 经本机 OpenClaw 生成任务拆解、官方入口建议和今日排程草案；应用前预览，可撤销 |
| 四象限 | 与待办共用数据，在重要/紧急四个象限之间整理任务 |
| 专注时间 | 自定义倒计时、暂停/继续、完成记录和每日汇总 |
| 主任务 | 目标进度、周期累计和历史记录 |
| 费用台账 | 按日期记账、历史明细、补录识别和 Excel 对账导出 |
| 桌面小组件 | 日期、农历、天气、时间节点、专注、主任务和今日四象限 |
| 本地数据 | JSON 原子写入、损坏文件留档、自动备份与恢复 |

### 开发中（尚未发布）：AI 任务教练

所有 AI 能力默认关闭，需要用户在设置中逐项开启。

- **任务拆解**：把“开通速卖通”这类模糊待办拆成摘要、立即可做的下一步、待确认问题、准备材料、分步操作、建议入口、注意事项和完成后的配套建议。
- **新待办自动拆解**：开启后，任何方式新建的待办都会在后台生成拆解草案——日历页、全部待办页、详细编辑器和桌面小组件行为一致。不弹窗、不抢焦点、不改动待办时间。
- **AI 安排今天**：模型只判断顺序和预计时长，具体钟点由时间大师本地的确定性排程器计算，自动避开手工固定时间、午休与缓冲。草案先预览，点“应用安排”才批量写入，并可按同一批次精确撤销。
- **行动步骤提升为独立待办**：勾选拆解出的步骤，预览后一次确认创建。子待办继承原任务的清单、优先级与四象限，不带日期时间，便于随后统一排程。
- **冲突保护**：应用、撤销与创建都会先校验来源签名。任一相关待办在此期间被改动，整批拒绝、零部分写入；撤销只删除本批次创建且此后未被修改的待办。

数据边界：只发送当前请求所需的最小任务字段（标题、日期、起止时间、优先级、四象限、重复规则）。**费用、专注记录、目标、延期与完成历史、整个数据文件都不会进入请求**；备注默认不发送，需单独开启。“Gateway 在本机”不等于“模型在本机”——模型由用户自己的 OpenClaw 与供应商配置决定。

### 开发中（尚未发布）：QQ Bot 集成

- **提醒推送**：待办触发时优先发 QQ，并独立尝试 Windows 本地通知，两条路径互不影响。
- **原文直投**：提醒经 Gateway 直接送达，不经过模型复述，逐字送出。相比经代理转发，它不会因模型生成失败而静默丢失提醒。
- **拆解推送**：新建待办自动生成拆解后，把标题、下一步和带预估时长的步骤清单推送到 QQ。默认关闭。
- **双向问答**：在 QQ 里直接问“今天有什么待办”，由 Agent 通过 MCP 工具读取后作答。默认关闭。

投递语义：`/hooks/agent` 返回 200 只表示 OpenClaw 已受理，不代表 QQ 已送达；直投模式返回的是 QQ 平台的消息 ID，确定性更强。QQ 主动消息仍可能受目标类型、账号选择和平台交互时限限制。

### 设置说明

**QQ Bot 主提醒**

| 设置 | 说明 |
| --- | --- |
| 启用开关 | 关闭时完全不联网，Windows 通知不受影响 |
| Gateway 地址 | 仅接受本机 `127.0.0.1` / `localhost` / `[::1]` 的 `/hooks/agent` |
| 原文直投 | 开启走 Gateway `send` 直投；关闭走提醒代理转发 |
| Token | **随模式变化**：直投需要该 Gateway 的 operator Token，代理模式需要 Hook Token。界面标签会同步提示当前该填哪一个 |
| QQ 目标 | `qqbot:c2c:OPENID`、`qqbot:group:ID` 或 `qqbot:channel:ID` |
| QQ accountId | 多机器人时指定账号，可留空 |
| 发送待办备注 | 默认关闭 |

**AI 任务教练**

| 设置 | 说明 |
| --- | --- |
| 启用开关 | 关闭时不发起任何模型请求 |
| Gateway 地址 | 仅接受本机 `/v1/responses` 精确路径 |
| Gateway Token | 与 QQ 提醒的 Token 是**两套独立凭据**，不得复用 |
| 独立 Agent ID | 建议使用仅具资料检索能力的受限 Agent |
| 发送待办备注 | 默认关闭 |
| 新待办自动准备拆解 | 后台生成，不弹窗、不改时间 |
| 把拆解推送到 QQ | 仅推送新建时自动生成的拆解，需先启用 QQ 主提醒 |
| 允许 Agent 查询今天的待办 | 在本机开只读接口。只有 `GET`、只有今天、只返回标题与规划字段，无任何写入入口。地址内含随机串即凭据，可随时重新生成使旧地址失效 |
| 默认可安排时间 | 工作起止、午休起止、任务缓冲。AI 不会覆盖已设置的固定时间 |

凭据一律经 Electron `safeStorage` 加密后单独保存，不写入 `settings.json` 或 `data.json`，界面保存后不再回显。

配置步骤与安全边界见 [AI 任务教练配置指南](docs/OPENCLAW_AI_TASK_COACH.md) 与 [QQ Bot 远程提醒配置指南](docs/OPENCLAW_QQ_REMINDERS.md)。

### 0.1.11 正式版（2026-08-13）

- 桌面小组件“专注办公”更名为“专注时间”，待机界面重新组织为名称、本轮计划、今日累计和开始操作。
- 开始专注后卡片翻转为深色运行面，以醒目的大号红色字体显示倒计时；暂停、继续和取消操作集中排列。
- 原小时钟替换为清晰的倒计时秒表图标，包含圆形表盘、顶部按键和内部指针。

### 0.1.10 正式版（2026-08-13）

- 月历底部增加“本月延期”和“本月完成”汇总，点击任一指标即可展开该月详细记录。
- 重复待办进入下一周期前保留完成历史，延期和完成数字都可回溯到具体任务、日期、清单和时间。
- 桌面小组件开始专注后整张卡片翻转为醒目的大字号倒计时，取消即可翻回；费用分类按钮按名称长度自适应，不再让“货款”占满整行。

<p align="center"><img src="docs/images/calendar-month-completions.png" width="760" alt="时间大师月历底部的本月完成汇总与详细内容，使用虚构演示数据"></p>
<p align="center"><img src="docs/images/calendar-month-rollovers.png" width="760" alt="时间大师月历底部的本月延期汇总与详细内容，使用虚构演示数据"></p>
<p align="center"><img src="docs/images/widget-focus-active.png" width="360" alt="时间大师桌面小组件翻转后的高对比专注倒计时，使用虚构演示数据"></p>

### 0.1.9 正式版（2026-08-13）

- 未完成待办自动顺延时，原日期保留“未完成”历史记录，月历统计不再丢失当天执行结果。
- 点击原日期可查看只读顺延记录及目标日期；当前待办仍在新日期继续执行，不会重复生成可操作任务。

<p align="center"><img src="docs/images/calendar-rollover-history.png" width="760" alt="时间大师在原日期显示未完成顺延记录，使用虚构演示数据"></p>

### 0.1.8 正式版（2026-08-13）

- 月历日期格分别显示当天“未完成”和“已完成”数量，采用两行紧凑排版，窄窗口也不会超出边框。
- 软件对外名称统一为“时间大师”；内部应用标识和数据目录保持不变，可继续读取原有数据。

### 0.1.7 正式版（2026-08-13）

- 月历日期格不再重复显示待办标题，只显示精确待办数量和密度刻度。
- 完整标题、时间、清单和操作继续集中在右侧日期详情栏，任务很多时也不会挤压月历格。

### 0.1.6 正式版（2026-08-13）

- 修复桌面小组件费用快捷记账无法通过点击空白处取消的问题。
- 现在也可按 `Esc` 收起输入区；取消不会写入账目，并会清空未提交草稿。

### 0.1.5 正式版（2026-08-13）

- 全面重做主窗口、侧栏、日历、全部待办、四象限、设置及编辑弹窗的视觉层级，同时保留费用页的信息密度。
- “编辑费用分类”现在紧邻“记一笔”的实际分类按钮，明确支持新增、修改名称、删除和恢复。
- 删除分类只会从新记账按钮中移除该项；历史账目、汇总和 Excel 对账继续保留稳定归属。
- 打包应用视觉烟测扩展到九个界面与窗口状态。

### 0.1.4 正式版（2026-08-12）

> 以下能力属于 `0.1.4` Windows x64 正式版，不包含在原始 `0.1.3` 安装包中。0.1.4 安装包未签名，Windows 可能显示 SmartScreen 提示；本段描述版本内容，不代表安装包已经上传到 GitHub Release。

- 每本费用台账可以独立新增、重命名、停用和恢复期间费用类别；“货款”单列仍保持固定口径。
- 类别使用稳定编号关联流水。重命名或停用不会改写、移动或删除既有费用记录；停用类别仍保留在历史、汇总和 Excel 导出中。
- 从 0.1.3 升级时，现有类别和自定义名称会从数据模型 v3 迁移到 v4，费用金额、日期、备注和类别编号保持不变。
- Excel 对账按稳定类别编号和实际类别数量动态生成分类汇总与核对公式，类别改名不会改变历史金额归属。

<p align="center">
  <img src="docs/images/expense-categories.png" width="760" alt="0.1.5 费用分类按钮管理界面，使用虚构演示数据">
</p>
<p align="center"><sub>0.1.5 分类按钮管理实机验收图；来自隔离环境，内容均为虚构数据。</sub></p>

## 界面预览

| 日历 | 待办 |
|---|---|
| ![时间大师日历页面](docs/images/calendar.png) | ![时间大师待办页面](docs/images/todos.png) |
| 四象限 | 费用台账 |
| ![时间大师四象限页面](docs/images/matrix.png) | ![时间大师费用台账页面](docs/images/expenses.png) |

包括首屏小组件在内的所有截图均来自隔离演示环境；任务名称、金额、日期和其他内容均为虚构脱敏数据，不代表真实用户或真实采用情况。

## 隐私、安全与支持

- 待办、专注记录、主任务、费用台账和设置默认保存在本机 `%APPDATA%\timemaster-v2\`。
- 应用没有账号体系、广告、会员、分析或遥测上报。天气是 0.1.3—0.1.11 正式版中唯一有意联网的功能；当前未发布源码另增加了默认关闭的 OpenClaw QQ Bot 远程提醒与 AI 任务教练。普通待办、专注、目标和费用数据仍本地优先；只有用户主动开启对应功能时，文档列明的最小字段才会经本机 OpenClaw 处理。
- 主窗口和小组件启用 Electron renderer sandbox 与 `contextIsolation`、关闭 Node 集成，并通过显式 preload/IPC 白名单访问原生能力。
- 详细数据流、删除方式和联网边界见 [隐私说明](PRIVACY.md)；安全假设与剩余风险见 [威胁模型](docs/THREAT_MODEL.md)；使用帮助见 [支持说明](SUPPORT.md)；漏洞请按 [安全政策](SECURITY.md) 私下报告。
- 默认分支由 Windows CI 和 CodeQL 自动检查；Dependabot 每月检查 npm 与 GitHub Actions 更新。自动检查不能替代人工审查，也不构成安全保证。

这是一款本地优先软件，不代表数据天然安全：应用数据和导出的工作簿未由时间大师加密，本机恶意软件或具有同等用户权限的进程仍可能读取它们。

## 安装包完整性

`0.1.11` 的正式产物为 Windows x64 NSIS 安装包 `TimeMaster-Setup-0.1.11.exe`，**未经过 Authenticode 签名**。请只使用可信来源提供的实际安装包，并核对与该产物一同发布的 SHA-256；本 README 不以版本文字代替实际文件哈希，也不表示安装包已经上传到 GitHub Release。

原始 0.1.3 产物继续作为恢复来源和不可变参考保留。其文件名与 SHA-256 如下：

原始 `TimeMasterV2-Setup-0.1.3.exe` 的 SHA-256：

```text
8EEF4DB7BDF2F8BA4911C97E9189232DA9D7D362034822E51A6D03DB333DE9E4
```

0.1.3 安装包也 **未经过 Authenticode 签名**。只应从本仓库的 [GitHub Releases](https://github.com/bigelephant-code/TimeMasterV2/releases) 下载，并在运行前与 Release 中的校验文件核对：

```powershell
Get-FileHash .\TimeMasterV2-Setup-0.1.3.exe -Algorithm SHA256
```

哈希一致只能确认文件与发布产物相同，不能替代代码签名，也不能保证程序绝对安全。完整的产物来源和恢复限制见 [恢复记录](docs/RECOVERY.md)。

## 从源码运行与验证

要求：Windows 10/11、Node.js 22.12 或更高版本。

```powershell
git clone https://github.com/bigelephant-code/TimeMasterV2.git
Set-Location TimeMasterV2
npm ci
npm run check
npm start
```

`npm run check` 会验证不可变的 0.1.3 参考运行时、执行 IPC/安全契约测试、构建当前 `src/`，并检查生成的 `out/`。它验证工程完整性和关键契约，不表示构建与原始 0.1.3 安装包逐字节相同。

如果 npm 没有下载锁定版本的 Electron 运行时，可执行：

```powershell
npm run ensure:electron
```

构建 Windows x64 NSIS 安装包：

```powershell
npm run dist
```

新产物写入 `release/`。每个正式产物使用独立版本号和文件名，不应覆盖或冒充原始 `v0.1.3` 产物。

验证完整目录包的主窗口、小组件、sandboxed preload 和 IPC：

```powershell
npm run dist:dir
npm run smoke:packaged
```

smoke test 使用显式隔离的临时 `userData` 与 session 目录，不读取或修改正式 `%APPDATA%\timemaster-v2\`。

## 目录与版本边界

```text
src/                       0.1.11 的可编辑、可构建 source-equivalent 输入
runtime/                   从原始 0.1.3 app.asar 提取的不可变黄金参考
legacy/litecal-0.1.0/      历史 LiteCal 0.1.0 模块化源码，仅作迁移参考
tests/                     IPC 与安全契约测试
scripts/                   参考哈希、构建与产物验证工具
docs/                      架构、威胁模型和恢复资料
```

原始安装包没有携带 source map 或原始 Vue 单文件组件，因此无法逐字节恢复丢失的工程结构。当前 `src/` 可审查、编辑和构建，但部分模块边界及 Vue 模板结构仍需要渐进式重构。详见 [架构说明](docs/ARCHITECTURE.md)、[恢复记录](docs/RECOVERY.md) 和 [Roadmap](ROADMAP.md)。

## 参与贡献

欢迎提交真实问题、功能建议和 Pull Request。开始前请阅读 [贡献指南](CONTRIBUTING.md)。请勿在 Issue、日志或截图中上传真实任务、费用、精确位置、令牌或本机绝对路径。

项目以 [MIT License](LICENSE) 发布。直接运行时依赖及完整许可证文本见 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)。
