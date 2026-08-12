# Security policy / 安全政策

## Supported versions

The released security baseline is `0.1.3`; active fixes are developed on the `0.1.4-dev` main branch. Historical LiteCal V1 source is retained for migration reference and is not an actively supported product line.

## Reporting a vulnerability

Use GitHub Private Vulnerability Reporting / Security Advisories whenever available. Do not publish exploit details, real application data, expense workbooks, access tokens, precise locations, or other sensitive material in a public Issue.

If the private entry point is unavailable, open a minimal public Issue that contains no sensitive details and asks the maintainer to establish a private channel. A useful report includes:

- affected TimeMaster and Windows versions;
- minimal reproduction steps using fictional data;
- expected security impact;
- a suggested fix, if known.

The project is maintained on a best-effort basis and cannot promise a response deadline. Reports affecting `%APPDATA%\timemaster-v2\`, preload/IPC, external navigation, weather/location requests, data migration, export, packaging, or update integrity receive security-focused review.

See [PRIVACY.md](PRIVACY.md) for data flows and [docs/THREAT_MODEL.md](docs/THREAT_MODEL.md) for trust boundaries and residual risks.

---

## 支持范围

已发布的安全基线为 `0.1.3`；当前修复在 `0.1.4-dev` 主分支开发。历史 LiteCal V1 源码仅作为迁移参考，不属于积极维护的产品线。

## 报告漏洞

请优先使用 GitHub Private Vulnerability Reporting / Security Advisory 私下报告漏洞。不要在公开 Issue 中粘贴利用代码、真实应用数据、费用工作簿、访问令牌、精确位置或其他敏感信息。

如果私密入口暂不可用，可以创建一个不含敏感细节的 Issue，请维护者建立私密沟通。建议报告包含：

- 受影响的 TimeMaster 和 Windows 版本；
- 使用虚构数据的最小复现步骤；
- 预期安全影响；
- 建议修复方向（如有）。

项目按尽力而为方式维护，无法承诺固定响应时限。涉及 `%APPDATA%\timemaster-v2\`、preload/IPC、外部导航、天气/定位请求、数据迁移、导出、打包或更新完整性的报告会按安全敏感变更审查。
