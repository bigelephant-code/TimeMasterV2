# 更新记录

本项目遵循语义化版本编号。`main` 当前为 0.1.4-dev 开发线；未发布内容不应伪装成 0.1.3 二进制。

## [Unreleased] - 0.1.4-dev

### Added

- 添加从 `src/` 到 `out/` 的 `electron-vite` 构建链和构建产物验证。
- 添加 0.1.3 黄金参考哈希、preload/IPC 契约和窗口安全选项测试。
- 为主窗口和小组件启用 Electron renderer sandbox，并增加使用隔离数据目录的打包应用 smoke test。
- 修复恢复出的日历 bundle 中两处错误的后缀边界判断，并将开发环境最低版本与 Electron 43 对齐到 Node.js 22.12。
- 将 0.1.4-dev 开发和打包运行时升级到 Electron 43.3.0；恢复出的 renderer 仍如实保留其内嵌 Vue 3.5.40。
- 将任务时间规范化与旧 `time` 字段回退逻辑提取为可直接单测的主进程模块，并添加表驱动边界测试。
- 添加隐私说明、威胁模型、支持指南、第三方完整许可证和使用虚构数据的脱敏截图。

### Changed

- 将从项目所有者 0.1.3 产物重建的 source-equivalent 实现设为当前可编辑构建输入。
- 将不可变 0.1.3 运行时保留在 `runtime/`，把 LiteCal 0.1.0 历史源码移至 `legacy/litecal-0.1.0/`。
- 显式启用 renderer 上下文隔离、关闭 Node 集成、限制新窗口/外部导航并校验 IPC 来源。
- 在生产构建中移除仅开发环境需要的 WebSocket CSP 来源。

### Recovery note

- 当前 `src/` 不是丢失的原始源码。原始安装包没有 source map 或 Vue 单文件组件，当前构建也不宣称与 0.1.3 逐字节一致。

## [0.1.3] - 2026-08-03

- 发布项目所有者制作的最终 Windows 安装包 `TimeMasterV2-Setup-0.1.3.exe`。
- 增加自定义专注计时与每日专注记录。
- 增加目标、周期累计和费用台账三类主任务。
- 增加费用明细补录、按日期管理和 Excel 对账导出。
- 增加 Open-Meteo 天气、地理位置选择与缓存。
- 扩展桌面小组件、任务起止时间、预计用时和状态提示。
- 将应用身份独立为 `timemaster-v2` / `com.timemaster.v2`。
- 发布归档说明：该原始安装包未经过 Authenticode 签名；SHA-256 为 `8EEF4DB7BDF2F8BA4911C97E9189232DA9D7D362034822E51A6D03DB333DE9E4`。

## [0.1.0] - 2026-07-26

- 发布 LiteCal 初始模块化源码。
- 支持日历、待办、四象限、提醒、计时、长期目标和桌面小组件。
