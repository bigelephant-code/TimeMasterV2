# 参与贡献

感谢你帮助改进时间大师 V2。项目仍处于早期阶段，最有价值的贡献是范围清晰、可复现、保护数据兼容性的 Issue、测试和 Pull Request。

## 开始之前

1. 搜索现有 [Issues](https://github.com/bigelephant-code/TimeMasterV2/issues)，避免重复。
2. 较大功能、数据格式、IPC、权限或发布流程变更，请先开 Issue 讨论设计、迁移和回滚方案。
3. 不要提交真实用户数据、日志、费用工作簿、账号、令牌、精确位置或本机绝对路径。
4. 阅读 [架构说明](docs/ARCHITECTURE.md)、[恢复记录](docs/RECOVERY.md)、[隐私说明](PRIVACY.md) 和 [威胁模型](docs/THREAT_MODEL.md)。

## 先理解三个源码边界

- `src/` 是当前 0.1.4-dev 的唯一可编辑构建输入。新功能、修复和安全加固应在这里完成。
- `runtime/` 是从原始 0.1.3 `app.asar` 提取并按哈希锁定的黄金参考。不要在这里开发功能；除纠正有证据的归档错误外，不应修改。
- `legacy/litecal-0.1.0/` 是历史 LiteCal 0.1.0 模块化源码，仅用于理解和迁移边界，不参与当前根构建。

当前 `src/` 是从项目所有者制作的 0.1.3 产物重建的 source-equivalent 实现，不是丢失的原始源码。贡献者不应把重构结果描述为“恢复了原始 Vue 文件”，也不应声称当前构建与 0.1.3 安装包逐字节一致。

## 本地验证

要求：Windows 10/11、Node.js 22.12 或更高版本。

```powershell
npm ci
npm run check
npm run dist:dir
npm run smoke:packaged
npm start
```

`npm run check` 会：

- 核对 `runtime/` 的 0.1.3 黄金参考哈希；
- 执行 preload/IPC 与窗口安全契约测试；
- 从 `src/` 构建 `out/`；
- 检查主进程、preload、renderer 入口与生产 CSP。

打包相关改动还应运行：

```powershell
npm run dist:dir
```

`npm run smoke:packaged` 会在显式隔离的数据目录中验证可解包应用的主窗口、小组件、sandboxed preload 和 IPC。它仍不能代替真实 Windows 环境中的安装、升级、托盘、通知和卸载测试。

提交前至少确认：

- `npm run check` 通过；
- `git diff --check` 无空白错误；
- 主窗口和桌面小组件能打开；
- 修改涉及的用户路径已用**虚构测试数据**验证；
- 数据模型或持久化变更包含迁移、备份和损坏恢复测试；
- UI 变更附脱敏截图，所有名称、金额、日期、位置和路径均为虚构内容；
- 没有提交 `release/`、真实 `%APPDATA%\timemaster-v2\` 内容或其他生成/个人文件。

## 安全与隐私审查

以下变更必须在 PR 中单独说明威胁、数据流和验证方式：

- preload API、IPC channel、窗口所有权或外部导航；
- `webPreferences`、CSP、权限、定位或新的联网域名；
- 数据目录、格式迁移、备份/恢复、导入/导出或卸载行为；
- 依赖、构建、安装包、签名、CI 权限或发布凭据。

不要在公开 Issue 中披露漏洞利用细节。安全问题请按 [SECURITY.md](SECURITY.md) 使用 GitHub 私密报告渠道。

## Pull Request 要求

- 每个 PR 聚焦一个可审查的问题。
- 标题说明用户或维护者可感知的结果。
- 描述修改原因、兼容性/隐私影响、风险和实际执行的验证命令。
- 如果行为仍未在打包应用中验证，要明确写出，不要用推测代替结果。
- 不要为了制造活跃度提交空洞、重复或虚构的 Issue/PR；维护记录必须对应真实工作。

提交代码即表示你同意按仓库的 [MIT License](LICENSE) 提供贡献，并确认你有权提交相关内容。
