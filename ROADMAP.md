# Roadmap

时间大师是一款本地优先 Windows 应用。路线图优先考虑源码可维护性、数据安全和诚实的发布来源，而不是快速堆叠功能。项目仍处于早期阶段，不声称已有广泛社区采用。

## 已完成：建立可信基线

- [x] 保存原始 0.1.3 安装包 SHA-256、内含 ASAR 哈希和 Authenticode 未签名状态。
- [x] 将从 0.1.3 `app.asar` 提取的 10 个文件作为不可变 `runtime/` 黄金参考，并加入逐文件哈希验证。
- [x] 用 `v0.1.3` 固定原始所有者产物和历史运行时边界。
- [x] 将 source-equivalent 重建放入 `src/`，接入 `electron-vite`，使当前开发线可审查、可编辑、可构建。
- [x] 把 LiteCal 0.1.0 历史模块化源码移入 `legacy/litecal-0.1.0/`，避免与当前构建混淆。
- [x] 添加 IPC 契约、窗口安全选项、黄金参考及生产构建验证。
- [x] 添加使用隔离数据目录的 Windows 完整目录包 smoke test，验证主窗口、小组件、sandboxed preload 和 IPC。
- [x] 添加隐私说明、威胁模型、支持指南、第三方许可证和脱敏演示截图。
- [x] 明确 0.1.3 安装包未签名及 Windows SmartScreen 风险。
- [x] 启用 Windows CI、CodeQL、Dependabot 和 GitHub 私密漏洞报告，并保护默认分支。
- [x] 将 Windows x64 `0.1.4` 于 2026-08-12 定版为正式版本，并明确其 Authenticode 未签名状态；版本定版不等同于 GitHub Release 附件已经上传。

## 已完成：0.1.4 正式版范围

- [x] 将费用类别升级为每台账独立目录，支持新增、改名、停用、恢复及 v3→v4 兼容迁移，并让 Excel 对账范围跟随实际类别数量。

## 当前：0.1.x 可维护性

- [x] 增加默认关闭的 OpenClaw AI 任务教练首期：单任务拆解、步骤勾选、今日排程草案、整批冲突检查与精确撤销。
- [x] 将 AI 排序/时长建议与本地确定性时间槽分离，保持费用、专注、目标和历史数据不进入 AI 请求。
- [ ] 在独立 OpenClaw Profile/Gateway 与受限 `timemaster-coach` Agent 上完成真实模型、Web 检索证据和长时间运行验收。
- [x] 支持把用户选中的 AI 行动步骤提升为独立待办，并为创建/撤销增加同等级冲突保护。
- [ ] 将 Electron 主进程拆分为存储、备份、提醒、导出、IPC 和窗口模块。
- [ ] 把编译后的 renderer 逐步恢复为 Vue 单文件组件和 composable，同时保持可观察行为。
- [ ] 补齐完整数据模型迁移与损坏恢复的脱敏 fixture；v3→v4 费用类别迁移已有独立边界测试。
- [ ] 测试原子写入、损坏文件留档、备份恢复和卸载后数据保留。
- [ ] 测试费用台账导出和专注状态转换。

适合创建真实 GitHub Issue 的候选：

- `refactor: split main-process storage and backup services`
- `test: add data-model-v3 migration fixtures`
- `test: cover focus-session state transitions`
- `test: verify expense workbook export`
- `refactor: restore renderer shell as Vue SFCs`

## 后续：社区可用性与发布安全

- [ ] 添加应用内数据导入/导出和版本化备份格式文档。
- [ ] 改善键盘导航、可访问性和高 DPI 行为。
- [ ] 将中国日历能力与可翻译界面字符串分离。
- [ ] 持续审阅 Dependabot 更新、CodeQL 结果与 Windows CI 失败，并在修复或发布说明中记录重要结论。
- [ ] 为未来发布配置代码签名；在此之前持续明确未签名状态。
- [ ] 在有真实用户反馈后，用可核验的 Issue、修复和发布记录维护兼容性承诺。

大型架构或数据格式变更请先开 Issue，以便先审查兼容性、迁移和回滚方案。不要为了制造活跃度创建重复、虚构或无具体范围的问题。
