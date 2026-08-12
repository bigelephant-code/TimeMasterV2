# 时间大师 V2（TimeMaster V2）

[English](README.en.md) | 简体中文

一个面向 Windows 的本地优先时间管理工具，把日历、待办、艾森豪威尔四象限、专注计时、主任务和费用台账放进同一个桌面工作台。

项目由最初的“轻日历 LiteCal”演进而来。当前可运行版本为 **0.1.3**；仓库保留了 LiteCal 0.1.0 的模块化源码，也保存了从最终安装包校验恢复的 0.1.3 可读运行源码，确保已经完成的功能不再只存在于安装包中。

## 核心能力

| 模块 | 说明 |
|---|---|
| 日历 | 月、周、日视图；公历、农历、节气、传统节日和法定节假日 |
| 待办 | 多清单、开始/结束时间、优先级、重复、提醒、拖拽和耗时统计 |
| 四象限 | 与待办共用数据，可在重要/紧急四个象限之间整理任务 |
| 专注办公 | 自定义倒计时、暂停/继续、完成记录和每日汇总 |
| 主任务 | 目标进度、周期累计与历史记录 |
| 费用台账 | 按日期记账、历史明细、补录识别和 Excel 对账导出 |
| 桌面小组件 | 日期、农历、天气、时间节点、专注、主任务和今日四象限 |
| 本地数据 | JSON 原子写入、损坏文件留档、自动备份与恢复 |

## 隐私与联网边界

- 待办、专注记录、主任务、费用台账和设置均保存在本机 `%APPDATA%\timemaster-v2\`。
- 没有账号体系、广告、会员、埋点或遥测上报。
- 天气功能会按用户选择的位置访问 Open-Meteo 的预报与地理编码接口；关闭或不配置天气时，核心功能可以离线使用。
- 渲染进程启用了 `contextIsolation`，Node 能力只通过显式 IPC 白名单开放。

## 快速开始

要求：Windows 10/11、Node.js 20 或更高版本。

```powershell
npm ci
npm run check
npm start
```

`npm start` 和打包命令会先检查 Electron 运行时；如果 `npm ci` 没有自动下载，脚本会补充安装固定版本。

国内网络安装 Electron 较慢时，可以临时使用镜像：

```powershell
$env:ELECTRON_MIRROR='https://registry.npmmirror.com/-/binary/electron/'
npm run ensure:electron
```

## 构建安装包

```powershell
npm run dist
```

产物写入 `release/`。默认生成可选择安装目录的 Windows x64 NSIS 安装包，卸载或版本升级不会主动删除用户数据。

## 源码结构

```text
runtime/                   TimeMaster V2 0.1.3 当前可运行源码快照
├── main/                  Electron 主进程、存储、提醒、导出与窗口管理
├── preload/               contextBridge IPC 白名单
└── renderer/              主窗口和桌面小组件的可读 JS/CSS/HTML
src/                       LiteCal 0.1.0 历史模块化源码
scripts/                   图标生成与运行时完整性检查
docs/                      架构、恢复过程和维护资料
```

`runtime/` 来自最终 0.1.3 安装包中的 `app.asar`，文件未压缩混淆，能够直接审查、运行和重新打包。恢复过程、安装包哈希及当前限制见 [docs/RECOVERY.md](docs/RECOVERY.md)。后续维护方向是把该快照逐步重新拆分为 Vue 单文件组件和独立主进程模块，并为数据迁移补充自动化测试。

## 数据兼容

TimeMaster V2 使用独立身份，避免覆盖 LiteCal V1 数据：

| 项目 | LiteCal V1 | TimeMaster V2 |
|---|---|---|
| 包名 | `litecal` | `timemaster-v2` |
| App ID | `com.litecal.desktop` | `com.timemaster.v2` |
| 数据目录 | `%APPDATA%\litecal\` | `%APPDATA%\timemaster-v2\` |

请勿为“统一命名”而合并这些标识，否则两条产品线会争用安装和用户数据目录。

## 参与贡献

欢迎提交问题、功能建议和 Pull Request。开始前请阅读 [CONTRIBUTING.md](CONTRIBUTING.md)、[ROADMAP.md](ROADMAP.md) 与 [SECURITY.md](SECURITY.md)。

## 开源许可

本项目以 [MIT License](LICENSE) 发布。内嵌的第三方开源组件说明见 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)。
