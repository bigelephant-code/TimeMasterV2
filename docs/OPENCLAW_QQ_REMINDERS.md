# OpenClaw QQ Bot 远程提醒配置指南

> 状态：开发中，尚未随正式安装包发布。时间大师进程运行时，会在同一提醒调度路径中分别尝试 Windows 通知和已启用的 OpenClaw/QQ 提醒；远程失败不会跳过本地尝试，但两者都不是必达保证。

## 1. 准备 OpenClaw 与 QQ Bot

1. 安装并启动当前版本 OpenClaw，确认 `openclaw --version` 可用。
2. 安装腾讯官方 QQ Bot 插件：

   ```powershell
   openclaw plugins install @tencent-connect/openclaw-qqbot
   ```

3. 在 QQ 开放平台创建机器人，然后优先用交互式向导绑定，避免把 AppSecret 留在命令历史中：

   ```powershell
   openclaw channels add
   ```

4. 先从自己的 QQ 给机器人发送一条消息，再在私聊中发送 `/bot-me` 获取当前机器人的用户 OpenID。每个机器人拥有独立的 OpenID，不能跨机器人混用。

运行期间还必须满足两个前提：时间大师进程需要保持运行（可以缩到托盘）；从托盘菜单完全退出后，应用不会继续调度提醒。QQ 远程提醒还要求本机 OpenClaw Gateway 同时保持运行并可通过 loopback 访问。仅保留 QQ 客户端、机器人配置或时间大师的设置文件，都不能代替这两个正在运行的进程。

官方参考：[QQ Bot 配置与目标格式](https://docs.openclaw.ai/channels/qqbot)。

## 2. 创建受限的提醒代理与 Hook

在修改 `~/.openclaw/openclaw.json` 前先备份原文件，并先执行：

```powershell
openclaw agents list --bindings
```

检查并记录现有 `main`、其他 agent entries，以及每一个 channel/account binding；同时从配置 schema 和现有配置盘点所有默认/环境入口的 owner，例如 heartbeat、systemAgent/Custodian、Talk 等（具体名称以本机版本为准）。输出可能包含账号或目标标识，只能留在受控位置，不要贴到公开 Issue 或截图中。

若基线输出显示早前使用的是“隐式 `main`”（配置里尚无对应的显式 fleet entry），添加第二个 agent 前必须先使用当前 OpenClaw CLI 的 agent 向导保留并物化现有 `main`。不要直接在 JSON 中只加 reminder snippet；这可能将隐式单 agent 模式切换成仅有提醒 agent 的显式 fleet，并丢失原有默认路由。向导选项和命令以本机 `openclaw agents --help` 为准；物化后立即重新执行 `openclaw agents list --bindings`，确认 `main` 及原有 bindings 仍完整。

在完成备份、bindings 基线和必要的 `main` 物化后，优先用交互式 CLI 创建专用 agent：

```powershell
openclaw agents add timemaster-reminders
```

按向导完成后，先用 `openclaw agents list --bindings` 确认 CLI 已物化独立 `timemaster-reminders` entry，且既有 `main`、其他 entries 和 bindings 未改变；再核对所有默认/环境入口 owner 仍指向原 agent。然后只对 CLI 刚生成的 `timemaster-reminders` entry 合并工具、sandbox 和上下文限制。

下面的内容只是需要**合并**进现有配置的片段，不是完整 `openclaw.json`，不得用它整段覆盖现有 `agents` 或 `bindings`。添加 `timemaster-reminders` 作为第二个 agent 会使 OpenClaw 进入显式 agent fleet；必须保留原有 `main`、其他 agent entries 和全部 channel/account bindings，并确认当前 schema 的显式所有权标记（目前为 `agents.ownership: "explicit"`）已由 CLI 正确写入，否则现有机器人或消息路由可能被静默改写。不同版本可能使用不同的 agent 集合结构，应以本机 `openclaw config schema` 输出为准，按 ID 追加或合并，不能把示例结构原样替换到不匹配的版本中。下面是时间大师所需的最小安全边界：

```json5
{
  gateway: {
    bind: "loopback",
    port: 18789,
  },
  hooks: {
    enabled: true,
    token: "REPLACE_WITH_A_DEDICATED_RANDOM_HOOK_TOKEN",
    path: "/hooks",
    allowRequestSessionKey: false,
    allowedAgentIds: ["timemaster-reminders"],
  },
  agents: {
    entries: {
      "timemaster-reminders": {
        name: "TimeMaster Reminder Relay",
        skills: [],
        contextInjection: "never",
        sandbox: {
          mode: "all",
          scope: "agent",
          workspaceAccess: "none",
        },
        tools: {
          profile: "minimal",
          allow: ["session_status"],
          deny: [
            "read", "write", "edit", "apply_patch", "exec", "process",
            "browser", "canvas", "nodes", "cron", "gateway", "image",
            "sessions_list", "sessions_history", "sessions_send", "sessions_spawn"
          ],
        },
      },
    },
  },
}
```

Hook Token 必须与 `gateway.auth.token`/Gateway 密码不同。可以在 PowerShell 中生成随机值：

```powershell
$tokenBytes = New-Object byte[] 32
$tokenRng = [Security.Cryptography.RandomNumberGenerator]::Create()
$tokenRng.GetBytes($tokenBytes)
$hookToken = [Convert]::ToBase64String($tokenBytes)
$tokenRng.Dispose()
$hookToken
```

同一个 Hook Token 必须分别提供给两个独立的风险边界：

1. **OpenClaw 侧**必须保存或读取 `hooks.token`，否则 Gateway 无法验证时间大师的请求。当前该字段不支持 SecretRef；通常会以明文存在于 `~/.openclaw/openclaw.json`，或者由启动 Gateway 的本机环境替换后供 OpenClaw 读取。使用环境替换时，必须确认服务、计划任务或实际启动 Gateway 的进程确实能读取该变量；环境配置本身仍是需要保护的秘密载体。
2. **时间大师侧**保存的是同一 token 的一个副本。用户输入时，明文会短暂存在于设置页密码框中；保存后密码框立即清空且不再回显，时间大师的副本由 Electron 主进程通过 Windows `safeStorage` 加密写入 `secrets.json`。

`safeStorage` 只保护时间大师保存的副本，**不会加密或保护 OpenClaw 配置/环境中的副本**。应使用 Windows ACL 将 `~/.openclaw/`、`openclaw.json` 以及承载该环境变量的服务或任务配置限制给实际运行 OpenClaw 的用户/服务身份；不要为了方便而授予其他本机用户读取权限。两个副本都不得提交到 Git、粘贴到 Issue、写入日志、放进截图或普通未加密备份；确需备份时应使用受控的加密秘密备份并限制访问。任一边界疑似泄露时，都应同时轮换 OpenClaw 与时间大师中配置的 token。

官方参考：[Hooks 请求字段与安全约束](https://docs.openclaw.ai/gateway/configuration-reference)、[Agent 隔离与工具策略](https://docs.openclaw.ai/gateway/config-agents)。

## 3. 重启并检查 OpenClaw

配置完成后重启 Gateway，再依次执行：

```powershell
openclaw doctor
openclaw security audit --deep
openclaw health
openclaw gateway status --require-rpc
openclaw channels status --probe
```

再次执行以下命令，并把结果与修改前逐项对照：

```powershell
openclaw agents list --bindings
```

除新增 `timemaster-reminders` 和 CLI 生成的显式所有权标记外，原有 `main`、其他 agent entries、所有 channel/account bindings，以及 heartbeat、systemAgent/Custodian、Talk 等默认/环境入口 owner 都必须保持不变；同时确认显式 fleet 所有权标记存在且为当前 schema 认可的值。若任何既有 entry、binding 或 ambient owner 消失、改绑或改变优先级，应先从备份恢复并修正合并方式，不要继续测试提醒。

新 agent 可能不会自动继承 `main` 的模型凭据。先对它单独检查模型与提供商连接：

```powershell
openclaw models status --agent timemaster-reminders --check
```

若命令报告缺少凭据、提供商未登录或模型不可用，应按当前 OpenClaw 版本和所选 provider 的官方流程为 `timemaster-reminders` 登录或配置凭据；不要复制 `main` 的密钥到文档、命令历史、Issue 或截图。修复后重新执行同一条 `models status` 命令，直到静态检查成功。不要在运行中的 Gateway 旁直接追加 `--probe`：该直接探测需要独占 state-dir，可能与 Gateway 锁冲突；下面的最小 `openclaw agent` 调用负责实际模型验证。

然后检查该 agent 实际使用的隔离后端：

```powershell
openclaw sandbox explain --agent timemaster-reminders
```

核对输出确实落在预期的 agent 级隔离环境，且没有意外获得宿主工作区或高权限工具；如果输出显示 sandbox 被禁用、回退到不符合预期的后端，或与配置片段不一致，应先停止并修正配置。

最后发送一次最小模型探测；这一步会真实调用该 agent 配置的模型，可能产生少量提供商用量：

```powershell
openclaw agent --agent timemaster-reminders --message "只回复 REMINDER_AGENT_OK" --json
```

确认 JSON 结果来自 `timemaster-reminders`，执行成功且回复内容为 `REMINDER_AGENT_OK`。不要仅凭默认 `main` agent 可用就跳过这一步；专用提醒 agent 必须能用自己的有效凭据完成最小调用后，才能继续连接时间大师。

全部检查必须满足：Gateway 只绑定 loopback、QQ Bot 账号可用、Hook Token 与 Gateway 认证凭据不复用、`allowedAgentIds` 只允许 `timemaster-reminders`、专用 agent 的模型探测和隔离检查通过，并且修改前后的既有 agent/binding 对照无差异。

## 4. 在时间大师中填写

进入“设置 → 提醒 → QQ Bot 主提醒”，填写：

- Gateway 地址：`http://127.0.0.1:18789/hooks/agent`
- Hook Token：第 2 步生成、并已提供给 OpenClaw `hooks.token` 的同一个独立 Token；这里保存的是时间大师侧副本
- QQ 目标：
  - 私聊：`qqbot:c2c:OPENID`
  - 群聊：`qqbot:group:GROUP_OPENID`
  - QQ 频道：`qqbot:channel:CHANNEL_ID`
- QQ `accountId`：仅在 OpenClaw 配置多个 QQ Bot 时填写，必须与产生该 OpenID 的机器人匹配
- 发送待办备注：默认关闭；只有明确开启后备注才会进入远程载荷

先点“保存配置”，再点“检查连接”。连接检查只验证 loopback Hook 与 Token，会故意发送缺少 `message` 的空请求，不会启动 AI 或发送 QQ。然后点“发送测试提醒”，并在 QQ 中人工确认是否收到。

## 5. 提醒与状态语义

- 只有时间大师进程正在运行时，提醒调度器才工作；主窗口隐藏到托盘不影响调度，从托盘完全退出后不再触发 Windows 通知或加入远程队列。
- QQ 提醒除时间大师正在运行外，还要求本机 OpenClaw Gateway 在提醒或有效重试时段内可用。
- 待办存在开始时间时，提醒以开始时间为准；只有没有开始时间时才退回结束时间。
- 选择“提前 10 分钟”后，运行中的调度器会在开始前 10 分钟分别尝试 Windows 通知并把远程事件加入队列；其中一条路径失败不会让另一条路径主动停止。
- Windows 通知只是同一运行中调度路径里的独立本地尝试。Windows 通知权限、专注助手/勿扰模式、应用通知开关或系统状态仍可能抑制、延迟或隐藏通知，因此“已尝试本地通知”不等于用户必然看到。
- 电脑休眠或进程暂时挂起时不能按时调度；恢复运行后只会在该提醒仍处于有效补发窗口时追赶，超过窗口的旧提醒不会无限补发。
- HTTP 200 只能显示“OpenClaw 已受理”，不能当成“QQ 已送达”。
- 只有连接尚未建立的错误，以及 409、429、502、503，会在有效窗口内有限重试。408、其他未明确归类的 5xx、响应丢失或超时后无法确认服务端是否已受理时，统一视为结果不确定，不盲目重发，避免生成重复 QQ 消息。
- QQ 可能因 Gateway 未运行、机器人账号不匹配、用户最近未互动、主动消息规则或限流而拒绝投递。只要时间大师仍在运行且提醒仍在有效窗口，本地 Windows 路径会独立尝试，但仍受上述 Windows 系统设置约束。

## 5.1 投递模式：agent 与 direct

`remoteReminder.mode` 决定提醒怎么送到 QQ，默认 `agent`。

| | `agent`（默认） | `direct`（直投桥） |
| --- | --- | --- |
| 路径 | `POST /hooks/agent` → 提醒代理 → 模型复述 → QQ | Gateway WebSocket `send` 方法 → QQ |
| 提醒原文 | 由模型复述，无法从架构上保证逐字不变 | 逐字原样送出 |
| 凭据 | OpenClaw Hook Token | **该 Gateway 的 operator Token** |
| `accepted` 的含义 | 代理已受理这个任务 | 通道已接受这条消息 |
| 模型不可用时 | 代理运行失败，提醒静默丢失 | 不受影响，不经过模型 |

选择 `direct` 的理由是确定性：`agent` 路径依赖模型生成一次回复，模型超时、额度不足或输出被截断都会让提醒消失，而 Hook 早已返回 200，时间大师只会记录“已受理”。

代价必须明确：`send` 需要 `operator.write`，也就是该 Gateway 的 operator 凭据，权限**高于** Hook Token。持有它的主体等同于该 Gateway 的操作者。因此：

- 只在仅监听 loopback 的 Gateway 上使用直投；
- 该 Token 与 AI 教练的 Gateway Token 仍必须是不同凭据；
- 时间大师侧同样经 `safeStorage` 加密保存，renderer 无法读回明文；
- 直投只会调用 `send` 一个方法，握手时只申请 `operator.write`。

切换模式会改变 `routeKey`，队列中尚未投递的旧事件因此作废，不会用新模式重发旧提醒。

当前状态：主进程与传输层已实现并测试，设置界面尚未提供切换开关。要启用直投，需要在 `settings.json` 中把 `remoteReminder.mode` 改为 `"direct"`，并在设置页的 Token 输入框改填该 Gateway 的 operator Token 后保存。

## 6. 本地文件

相关文件位于 `%APPDATA%\timemaster-v2\`：

- `settings.json`：开关、loopback 地址、QQ 目标与可选账号 ID；
- `secrets.json`：经 `safeStorage` 加密的时间大师侧 Hook Token 副本；OpenClaw 侧副本另存于其配置或运行环境，不在此文件中；
- `remote-reminder-outbox.json`：事件/发生项引用、尝试状态和重试时间，不包含 Hook Token、QQ 目标或提醒正文。

卸载不会自动删除这些文件。彻底清理前先从托盘退出时间大师，再只删除准确的 `%APPDATA%\timemaster-v2\` 目录；这不会撤回已经交给 OpenClaw、模型提供商、QQ 或收件人的内容。
