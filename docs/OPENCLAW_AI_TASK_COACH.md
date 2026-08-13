# 时间大师 × OpenClaw AI 任务教练

本文说明当前未发布源码中的 AI 任务教练如何工作、会发送哪些数据，以及怎样为它准备 OpenClaw。本文描述的是当前实现，不把后续设想当成已经完成的功能。

## 当前能做什么

- 把“开通速卖通”这类模糊待办整理成摘要、立即可做的下一步、待确认问题、准备材料、行动步骤、HTTPS 入口、注意事项和完成后建议。
- 为当天未完成任务建议先后顺序和预计时长。
- 由时间大师本地排程器避开手工固定时间、午休和缓冲，生成可预览的时间草案。
- 用户确认后批量写入任务日期与起止时间；整批写入可撤销。
- 行动步骤可逐项勾选，勾选状态随本地数据保存。

当前不会：

- 把行动步骤自动创建成独立待办，也不会生成或执行依赖图。
- 自动应用 AI 排程。设置中的“新待办自动准备拆解”只生成拆解草案，不会改时间。
- 允许 OpenClaw 直接读取 `data.json`、修改待办、运行脚本、操作桌面或发送 QQ/微信消息。
- 把模型给出的链接标成“已核验”。当前 UI 一律按“建议链接”展示，重要信息仍需用户在官方页面确认。

## 架构与信任边界

```text
时间大师 Renderer
  └─ 只提交待办 ID、日期或用户操作
       ↓ trusted IPC（仅主窗口）
Electron Main Process
  ├─ 从本地数据构造最小快照
  ├─ 从 safeStorage 读取独立 Gateway Token
  ├─ POST loopback /v1/responses
  ├─ 校验唯一且匹配的 function_call
  ├─ 本地确定性排程
  └─ 用户确认后整批应用 / 冲突检查 / 整批撤销
       ↓
OpenClaw 专用 Gateway + timemaster-coach Agent
  └─ 用户自行配置的模型与可选 Web 检索服务
```

OpenClaw 只返回结构化建议。它没有时间大师写入工具；实际修改只能由主进程的固定代码路径完成。

## 实际发送的数据

### 单任务拆解

发送所选任务的：

- 本地任务 ID；
- 标题；
- 日期、开始时间、结束时间；
- 优先级和四象限；
- 重复规则；
- 备注，仅当用户明确开启“发送待办备注”时；
- 当前本地日期、时间和时区。

单任务拆解不会附带其他任务标题、费用、专注记录、目标或历史记录。

### 今日排程

候选集合由主进程固定选择：

- 指定日期尚未完成的任务；
- 未指定日期、且位于重要紧急或重要不紧急象限的任务。

每个候选发送与单任务相同的规划字段。工作时段、午休和缓冲保留在本地，由确定性排程器使用，不发送给模型。模型只负责返回候选任务的排序、预计分钟数和理由。

### 明确不发送

- Gateway Token、提醒 Hook token、QQ 目标或模型供应商密钥；
- 费用、金额、费用分类或 Excel 内容；
- 专注历史、目标、天气位置；
- 自动延期历史、完成历史；
- 应用数据目录、备份路径或整个 `data.json`。

“Gateway 在本机”不表示“模型在本机”。OpenClaw 仍可能把上述快照交给用户配置的远程模型或 Web 服务；其日志、保留与训练政策不由时间大师控制。

## 两种 Token 必须分离

| 用途 | 端点 | 凭据 |
| --- | --- | --- |
| QQ Bot 提醒 | `/hooks/agent` | OpenClaw `hooks.token` |
| AI 任务教练 | `/v1/responses` | Gateway token/password |

不得复用两种 Token。OpenClaw 的 Responses Bearer 是该 Gateway 的完整 operator 凭据，请把它视为高权限秘密：

- 时间大师侧副本只在主进程出现，并经 Electron `safeStorage` 加密后写入 `secrets.json`；
- Renderer 只能看到“已配置/未配置”，不能取回明文；
- Endpoint 只接受 `http://127.0.0.1`、`http://localhost` 或 `http://[::1]` 的精确 `/v1/responses` 路径；
- 请求禁止重定向，并有超时和响应体上限；
- 同一 Windows 用户下的恶意进程仍可能攻击本地凭据，因此更强隔离要依赖独立 OpenClaw Profile/Gateway。

相关安全语义见 [OpenResponses HTTP API](https://docs.openclaw.ai/gateway/openresponses-http-api) 和 [Gateway Security](https://docs.openclaw.ai/gateway/security)。

## 推荐的 OpenClaw 布局

建议不要让 AI 教练与 QQ 提醒共用 Gateway：

| 用途 | Profile | 示例端口 | Agent |
| --- | --- | --- | --- |
| QQ 提醒 | 现有/default | `18789` | 现有提醒 Agent |
| AI 教练 | `timemaster-ai` | `18829` | `timemaster-coach` |

独立 Profile 能隔离配置、状态目录、凭据和 Agent。若暂时共用 Gateway，至少必须使用独立 Agent，并在变更前后核对 QQ bindings；共享 Gateway Token 仍不是窄权限令牌。

### 1. 先只读盘点

```powershell
openclaw gateway status --deep
openclaw agents list --bindings
openclaw config file
```

备份现有 OpenClaw 配置和状态目录。不要把备份或任何 Token 提交到 Git。

### 2. 创建独立 Profile 与 Agent

CLI 选项会随 OpenClaw 版本演进，先查看本机帮助和配置 schema：

```powershell
openclaw --help
openclaw --profile timemaster-ai config schema
```

然后按本机版本的向导创建 Profile/Gateway，并新增 Agent：

```powershell
openclaw --profile timemaster-ai onboard
openclaw --profile timemaster-ai agents add timemaster-coach
```

若要把专用 Gateway 作为服务运行，可按当前 CLI 帮助选择独立端口，例如 `18829`。不要覆盖现有 QQ Gateway 的服务、端口或 bindings。

### 3. 启用 Responses 端点

`/v1/responses` 默认关闭。把下面的关键字段小范围合并到专用 Profile，并以本机 `config schema` 为准：

```json5
{
  gateway: {
    bind: "loopback",
    http: {
      endpoints: {
        responses: { enabled: true }
      }
    }
  }
}
```

官方说明见 [OpenResponses HTTP API](https://docs.openclaw.ai/gateway/openresponses-http-api)。

### 4. 收紧专用 Agent

`timemaster-coach` 只需要模型推理；若要帮助核对官方入口，可额外允许 `web_search` / `web_fetch`。不要给它：

- 文件系统或工作区访问；
- Shell、PowerShell、Runtime 或 Elevated；
- 消息、QQ Channel、自动化、节点或桌面 UI；
- 创建/控制其他 Agent 或会话的能力；
- 与现有 QQ Agent 相同的 binding。

OpenClaw 工具策略和 Sandbox 配置应以当前版本的 [Agent Configuration](https://docs.openclaw.ai/gateway/config-agents) 与 [Sandbox and Tool Policy](https://docs.openclaw.ai/gateway/sandbox-vs-tool-policy-vs-elevated) 为准。配置了 Sandbox 不等于它已经生效，必须用本机诊断命令验证。

### 5. 验证 OpenClaw

```powershell
openclaw --profile timemaster-ai config validate
openclaw --profile timemaster-ai doctor
openclaw --profile timemaster-ai security audit --deep
openclaw --profile timemaster-ai gateway status --deep
openclaw --profile timemaster-ai agents list --bindings
openclaw --profile timemaster-ai sandbox explain --agent timemaster-coach
```

验收时确认：

- 只监听 loopback；
- Agent ID 是 `timemaster-coach`；
- Agent 没有 QQ/消息 binding；
- 文件、Runtime、消息、自动化、节点与 UI 工具不可用；
- `/v1/responses` 已启用；
- Gateway Token 与 Hook token 不同。

## 在时间大师中配置

1. 打开“设置 → AI 任务教练”。
2. 填写专用 Gateway 的精确地址，例如 `http://127.0.0.1:18829/v1/responses`。
3. 填写 `timemaster-coach` 和独立 Gateway Token。
4. 保持“发送待办备注”关闭，除非确实需要。
5. 设置本地工作时间、午休和任务缓冲。
6. 保存后点击“检查连接”。连接检查调用带认证的 `/v1/models`，不会生成任务方案。

默认 UI 地址是 `http://127.0.0.1:18789/v1/responses`；使用独立 Gateway 时应改为它的实际端口。

## 使用流程

### 拆解一项任务

1. 新建或找到一条待办。
2. 点击任务右侧的 AI 行动轨道按钮，或在编辑器中勾选“保存后让 AI 拆解”。
3. 在右侧抽屉查看下一步、问题、材料、步骤、建议链接、注意事项和后续建议。
4. 点击行动步骤可记录完成状态。

生成拆解不会改变原任务日期或时间。

### 安排今天

1. 在“全部待办”顶部点击“AI 安排今天”。
2. AI 返回顺序与预计时长后，本地排程器生成时间草案。
3. 抽屉同时展示固定时间、AI 建议和未排入事项。
4. 点击“应用安排”后，主进程先复核所有引用任务；任何一项有变化就整批拒绝，零部分写入。
5. 应用成功后可点击“撤销本次安排”。如果任一已写时间后来被用户修改，撤销也会整批拒绝，避免覆盖新内容。

AI 排程只写 `date`、`startTime`、`endTime`、兼容 `time`、提醒去重键和 `updatedAt`，不会写自动延期历史。

## 结构化响应合同

当前实现只接受一个匹配的客户端函数调用：

- 单任务：`submit_timemaster_task_plan`；
- 今日排程：`submit_timemaster_day_plan`。

请求固定使用 `stream: false` 和指定 `tool_choice`。主进程拒绝：

- 未知函数、没有函数调用或多个函数调用；
- 非 JSON 参数；
- 超长文本、列表或响应体；
- 无效任务 ID、时间、预计时长；
- 非 HTTPS 或带用户名/密码的链接；
- 与生成快照不一致的过期排程；
- 会覆盖已固定、运行中、重复或已完成任务的排程。

模型普通文本不会触发写入。

## 已知限制与故障处理

- OpenClaw 未运行、Token 错误、Agent 不存在、端点未启用、超时或结构校验失败时，只显示错误；实际待办不变。
- 模型可能给出错误步骤、错误时长或看似合理但并非官方的链接。HTTPS 校验只能限制协议和凭据，不能证明事实正确。
- 今日容量不足时，任务会进入“暂未排入”，不会静默挪到明天。
- 运行中与重复任务不会被 AI 自动排时间。
- 排程器只向前推进，不回填前面的空档。若第一项较长放不进上午的空隙，该空隙不会让给后面较短的任务，以免打乱 AI 给出的先后顺序。
- 当前不支持逐项编辑排程草案、把步骤提升为独立待办、任务依赖或跨天自动规划。
- 当前 Responses 调用是一次性非流式请求；没有实时 token 进度。

常见问题：

| 现象 | 常见原因 | 处理 |
| --- | --- | --- |
| `401` / `403` | Token 错误、误用了 Hook token，或上游模型供应商拒绝（余额不足、Key 失效） | 先看错误信息里 OpenClaw 透出的上游原因；属于 Gateway 认证才核对专用 Profile 并轮换 AI Gateway Token，不要打印 Token |
| `404` / `405` | Responses 未启用、路径或端口错误 | 核对精确 `/v1/responses` 与专用端口 |
| 找不到 Agent | Agent ID 或 Profile 错误 | 运行 `agents list --bindings` |
| 超时/拒绝连接 | Gateway 未运行或端口错误 | 检查 `gateway status --deep` |
| 草案无法应用 | 生成后任务被编辑 | 重新生成，不要绕过冲突检查 |
| 撤销被拒绝 | 应用后时间又被修改 | 保留新修改；需要时手工调整 |

## 验收清单

- [ ] AI 教练使用独立 Profile、端口、Agent 和 Gateway Token。
- [ ] AI Gateway Token 与 QQ Hook token 不同。
- [ ] Gateway 只监听 loopback，Responses 已启用。
- [ ] Agent 无文件、Runtime、消息、自动化、节点、UI 或 QQ binding。
- [ ] Renderer 无法读回 Token。
- [ ] 备注默认不发送；费用、专注、目标和历史不进入请求。
- [ ] 只接受固定结构化函数，异常响应零写入。
- [ ] 今日计划先预览、后确认，冲突时整批零写入。
- [ ] 撤销只还原本批次排程字段，冲突时整批拒绝。
- [ ] 现有 QQ 提醒回归测试仍通过。

## 官方参考

- [OpenResponses HTTP API](https://docs.openclaw.ai/gateway/openresponses-http-api)
- [Gateway Security](https://docs.openclaw.ai/gateway/security)
- [Agent Configuration](https://docs.openclaw.ai/gateway/config-agents)
- [Sandbox and Tool Policy](https://docs.openclaw.ai/gateway/sandbox-vs-tool-policy-vs-elevated)
- [Agents CLI](https://docs.openclaw.ai/cli/agents)
- [Agent CLI](https://docs.openclaw.ai/cli/agent)
