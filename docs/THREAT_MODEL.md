# Threat model

Last reviewed: 2026-08-13

Target: the TimeMaster 0.1.11 formal release, the preserved TimeMaster V2 0.1.3 release artifact, and the opt-in OpenClaw QQ Bot reminder and AI task-coach paths currently present only in unreleased source on Windows x64

This is a practical threat model for maintainers and reviewers. It describes the current design and residual risks; it is not a security certification.

## Security goals

- Keep tasks, goals, focus records, expenses, settings, and backups on the user's computer unless the user explicitly exports them.
- Restrict renderer access to native capabilities to the preload API and registered IPC handlers.
- Limit intentional runtime network access to the documented Open-Meteo weather feature and the explicitly enabled, loopback-only OpenClaw reminder/AI-coach bridges.
- Keep the Windows reminder attempt independent so an OpenClaw or QQ failure cannot cause TimeMaster to skip the local path; operating-system settings may still suppress presentation.
- Keep TimeMaster's Hook-token copy out of ordinary settings, business data, persisted/broadcast renderer state, logs, screenshots, and ordinary unencrypted backups. Treat OpenClaw's separately required `hooks.token` value—normally plaintext in its configuration or supplied by its local environment—as an independent secret boundary protected by Windows ACLs.
- Keep the separate AI-coach Gateway Token in the main process and `safeStorage`, never in renderer state; treat it as a full OpenClaw operator credential and recommend a separate Gateway trust boundary.
- Preserve usable data through ordinary writes, malformed JSON, upgrades, and uninstall/reinstall cycles.
- Make release provenance and the risk of an unsigned installer visible to users.

## Assets

- `%APPDATA%\timemaster-v2\data.json`, `settings.json`, `data.backup.json`, non-rotating `data.pre-v4-*` migration copies, and preserved `.broken-*` files;
- per-ledger expense-category names and disabled category definitions, which may reveal suppliers, projects, or cost structure;
- Chromium local storage containing saved weather coordinates/label and cached forecast data;
- exported expense workbooks in user-selected locations;
- reminder text shown in native notifications;
- the OpenClaw QQ destination and optional account ID, which may identify a person, group, channel, or bot account;
- TimeMaster's OpenClaw Hook-token copy encrypted with Electron `safeStorage` in `secrets.json`;
- OpenClaw's separately required `hooks.token` copy, commonly plaintext in `~/.openclaw/openclaw.json` or carried by the local environment/service configuration that starts the Gateway;
- bounded remote-delivery state in `remote-reminder-outbox.json`, including event identifiers, task/occurrence references, attempt state, and retry timing; it does not copy the Hook token, QQ target, or reminder text;
- AI task/day drafts, generated links, checked-step state, and exact batch undo records retained in `data.json` after use;
- TimeMaster's separately encrypted OpenClaw Gateway-token copy and the OpenClaw-side full-operator credential used by `/v1/responses`;
- application integrity, GitHub release integrity, and the maintainer's release credentials.

Some of these records can reveal schedules, habits, business costs, or approximate location and should be treated as sensitive even though the application has no account system.

## Architecture and trust boundaries

```text
Untrusted local input / stored JSON
                 │
                 ▼
Vue renderer ── preload allowlist ── Electron main process ── local files / Windows APIs
     │                                      │
     ├── HTTPS: Open-Meteo                    └── loopback `/hooks/agent` ── OpenClaw ── model provider / QQ Bot
     │                                      └── loopback `/v1/responses` ── OpenClaw ── model / optional web research
     └── Chromium geolocation ── Windows/location providers
```

The main and widget renderers use context isolation, do not enable Node integration, keep web security enabled, and run in Electron's renderer sandbox. A separate visual transition overlay is also sandboxed and has no preload bridge. The sandbox reduces renderer privileges but does not make renderer content or IPC handlers automatically safe.

The preload exposes a finite API rather than raw `ipcRenderer`. Main-process handlers validate important window ownership and input constraints, but every new IPC method expands the trusted interface and requires review.

The main window's Content Security Policy does not permit Open-Meteo. The widget's policy permits connections to only the two documented Open-Meteo origins in addition to local development allowances. The OpenClaw request originates in the Electron main process and is restricted to a local loopback `/hooks/agent` URL; it is not a renderer CSP exception. CSP and loopback restrictions are defense in depth and do not make unsafe renderer, main-process, or OpenClaw code harmless.

The AI coach follows the same main-process-only network boundary but uses the distinct `/v1/responses` contract and credential. Shared Gateway bearer authentication restores OpenClaw's full operator scope set; an `x-openclaw-scopes` header cannot narrow it. The application therefore validates an exact loopback URL, denies redirects, bounds time/body/schema, and exposes only sanitized plans to the renderer. A hostile same-user process can still steal either local credential, so a separate Gateway/Profile remains the meaningful high-assurance boundary.

Hook authentication spans two independent local secret stores. TimeMaster protects only its saved copy with Electron `safeStorage`. OpenClaw must also read the same value as `hooks.token`; the current field does not support SecretRef, so this is normally plaintext in `~/.openclaw/openclaw.json` or provided through environment substitution to the Gateway process. Windows ACLs must restrict the OpenClaw directory and any service/scheduled-task/environment configuration that carries the value to the required user/service identity. Neither location belongs in Git, screenshots, logs, support bundles, or ordinary unencrypted backups. Compromise of either location requires coordinated token rotation on both sides.

## Principal threats and current controls

| Threat | Current controls | Residual risk |
|---|---|---|
| Tampered or impersonated installer | Official release hashes and documented recovery provenance | Both the formal 0.1.11 Windows x64 installer and preserved 0.1.3 installer are not Authenticode-signed; a hash is useful only when obtained through a trusted channel |
| Local malware or another user reading records | Windows user-profile directory boundaries | Application data and exported workbooks are not encrypted by TimeMaster; a process running as the user can read or change them |
| Renderer compromise reaching native APIs | Renderer sandbox, context isolation, Node integration disabled, preload allowlist, explicit IPC handlers, CSP | A renderer exploit may still reach capabilities exposed by a vulnerable or overly permissive IPC path |
| Malformed or corrupted data | Temporary-file-and-rename writes, `data.backup.json`, non-overwriting pre-v4 migration copies, malformed-file preservation, model normalization | Backups and primary data live on the same disk; migration copies are not automatically rotated and can increase local sensitive-data retention; none protects against disk loss or ransomware |
| Location disclosure | Location requested only by the widget after the user selects system location; coordinates rounded to two decimals; manual search alternative | Coordinates, source IP, request time, and search text can still identify or approximate a user; OS/browser location providers are outside this repository's control |
| Accidental disclosure through support | Public-report guidance and private vulnerability reporting | Users may still attach databases, screenshots, logs, or workbooks containing real information |
| Spreadsheet disclosure or unsafe handling | Explicit save dialog; application-generated workbook structure; XML escaping | Exported workbooks contain user data, persist outside the app directory, and may be copied or opened by other software |
| Dependency or build compromise | Lockfile, CI checks, source-visible dependencies, release hashes | npm registry, transitive dependencies, CI credentials, and maintainer accounts remain supply-chain trust points |
| Unexpected persistence | Visible tray and auto-launch controls; separate V2 identity and data directory | Users can mistake a hidden tray process for a closed application; enabled auto-launch intentionally persists across sign-in |
| Hook-token disclosure | TimeMaster encrypts its copy with `safeStorage` and excludes it from ordinary settings/data and delivery state; OpenClaw configuration/environment is a separate ACL-protected secret boundary | OpenClaw commonly requires a plaintext configuration/environment value, and `safeStorage` does not protect that copy; malware or a process running as the same Windows user may read either boundary |
| Wrong QQ recipient or bot account | Explicit target type/identifier and optional account selection; loopback-only OpenClaw endpoint; remote channel disabled by default | A mistyped target, stale account mapping, or compromised OpenClaw configuration can disclose reminder content to the wrong person, group, or channel |
| Reminder-content prompt injection | Only bounded reminder fields are included; note inclusion is opt-in; OpenClaw should use a dedicated restricted reminder agent | A malicious task title or note can still influence a model or downstream tool if the user's OpenClaw agent is too permissive |
| Duplicate, delayed, or missing remote reminder | Stable event identifiers, bounded outbox/retry metadata, and an independent Windows notification | Process crashes and ambiguous network results can still cause duplicates or delays; Windows/QQ settings and platform policies can suppress presentation independently |
| False delivery assurance | UI and logs distinguish “OpenClaw accepted” from QQ delivery | `/hooks/agent` 200 is only admission, not a QQ receipt; TimeMaster cannot prove that a model ran or a QQ recipient saw the message |
| Gateway operator-token disclosure | AI token remains in main-process `safeStorage`, is excluded from renderer/settings/business data, and the endpoint is loopback-only | The bearer still grants full operator authority to that Gateway; same-user malware or a compromised main process can read/use it, and request headers cannot reduce its scope |
| AI prompt injection or unsafe research result | Minimal bounded fields, notes opt-in, dedicated-agent guidance, fixed structured function call, strict normalization, and HTTPS-only explicit link opening | Task text and fetched pages are untrusted; a permissive/misconfigured OpenClaw agent or model can still return misleading steps, URLs, or claims |
| AI silently overwriting a schedule | Draft-first UI, local deterministic slotting, whole-batch source/signature checks, no partial writes, and exact undo checks | A user can still accept a poor but valid plan; AI duration estimates can be wrong, and later manual edits intentionally make old undo records unusable |

## Weather data flow

There are two explicit outbound flows:

1. A submitted city string goes to `https://geocoding-api.open-meteo.com/v1/search`.
2. Rounded latitude/longitude goes to `https://api.open-meteo.com/v1/forecast`.

The application does not add task, goal, focus, or expense data to these requests. Once coordinates have been saved locally, the widget can refresh the forecast at startup and on a timer. Ordinary HTTPS metadata remains visible to the service and relevant network infrastructure. See [PRIVACY.md](../PRIVACY.md) for the user-facing description.

## Optional OpenClaw reminder data flow (unreleased source)

The feature is off by default. If enabled, the main process sends the reminder title, date/time, an explicitly included note, the selected QQ target/account metadata, and delivery-control metadata to OpenClaw through the local loopback `/hooks/agent` endpoint. It does not include unrelated tasks, focus history, goals, expenses, expense-category names, weather location, or exported workbooks.

OpenClaw may pass reminder content to a user-configured model and QQ Bot. Those processes and remote services form a separate trust boundary. Maintainers must not treat a successful local HTTP response as end-to-end delivery: 200 means only that OpenClaw accepted the run. QQ proactive messages may be rejected or delayed because of destination type, bot/account selection, recent-interaction windows, rate limits, or platform policy. The corresponding Windows notification is triggered independently and remains the local fallback, although Windows notification settings can affect whether it is visibly presented.

## Optional OpenClaw AI task-coach data flow (unreleased source)

The feature is off by default. After explicit enablement, a main-window IPC can send the selected task or the bounded set of today's/undated-important tasks to a loopback `/v1/responses` endpoint. Notes remain opt-in. Expenses, goals, focus history, weather location, exported files, and the whole application database are excluded. OpenClaw may pass included fields to the configured model and optional web research providers.

The response must contain the expected function call and pass strict local normalization. The model cannot invoke a TimeMaster write tool. Local code converts AI ranking/duration estimates into non-overlapping time slots, shows a preview, and applies or undoes only after all referenced source and schedule signatures still match. Suggested links open only after a user click through a main-process HTTPS validator. These controls reduce accidental or injected mutation; they do not establish factual correctness, model-provider privacy, or safety of the external website.

## Data-loss considerations

The ordinary recovery file and the automatically created `data.pre-v4-*` source snapshot are convenience copies, not a disaster-recovery system. The migration snapshot is deliberately not overwritten or automatically deleted. Before testing migrations, storage changes, or modified builds, copy the entire `%APPDATA%\timemaster-v2\` directory while the application is fully exited. Never test against the only copy of real user data.

In 0.1.5, deleting an expense-category button is implemented as an audit-preserving archive, not erasure. The category definition remains until the application data is removed; linked entries remain visible while retained, but the ledger automatically keeps only the newest 20,000 expense rows. Previously exported workbooks must be deleted separately. Renaming changes the label displayed for linked historical entries but does not rewrite their amounts, dates, notes, or IDs. The v3→v4 migration therefore requires explicit tests that preserve these relationships and keep legacy amounts visible.

The 0.1.11 formal Windows x64 installer is unsigned. This threat model describes its finalized behavior and risk boundary but does not claim that a GitHub Release asset has already been uploaded.

Uninstall is configured with `deleteAppDataOnUninstall: false`. This reduces accidental loss but means uninstalling is not a privacy erase. Complete TimeMaster-side deletion requires removing the exact V2 user-data directory after exit, including `secrets.json`, AI plans/undo records, and `remote-reminder-outbox.json`. The OpenClaw-side `hooks.token` and Gateway token/password must be separately removed or rotated; deleting TimeMaster's copies does not revoke them or erase content retained by OpenClaw, a configured model/search provider, QQ, Windows, or a recipient. LiteCal V1 uses a different directory and must not be merged or deleted as part of V2 cleanup.

## Out of scope

This project cannot defend against:

- an already-compromised Windows account or administrator;
- malicious replacement of both an artifact and all hash/documentation channels a user trusts;
- observation or retention performed independently by Windows, Open-Meteo, OpenClaw, a configured model provider, QQ, DNS, proxies, endpoint-security products, or other third parties;
- end-to-end proof that an OpenClaw-accepted reminder was delivered to or read by a QQ recipient;
- disclosure after a user exports, uploads, or shares a workbook, screenshot, database, or support report;
- guarantees for modified, unofficial, or development builds.

## Security review checklist

Changes should receive security-focused review when they touch:

- preload exports, IPC channels, window ownership checks, navigation, or external URL handling;
- `webPreferences`, CSP, permissions, geolocation, or network destinations;
- OpenClaw loopback URL validation, Hook/Gateway-token storage boundaries and Windows ACLs, QQ target/account validation, reminder payload fields, Responses schemas, AI data minimization, external-link handling, batch apply/undo behavior, retry/idempotency behavior, or any claim about delivery/factual verification;
- data paths, migrations, backup/recovery, uninstall behavior, or V1/V2 identity;
- `expenseCategory:*` IPC validation, stable category IDs, disabled-category retention, or category-to-entry compatibility;
- spreadsheet generation or any future import/parser feature;
- dependencies, packaging, signing, CI workflows, or release credentials.

Relevant verification includes an IPC-contract test, a secret scan, dependency review, CSP inspection, migration tests using copied fixtures, a packaged-app smoke test, and published artifact hashes.

## Reporting a vulnerability

Use GitHub's private vulnerability reporting / Security Advisory flow when it is available. Do not publish exploit details, real user data, tokens, precise locations, or commercially sensitive workbooks in a public Issue. If the private route is unavailable, open a minimal public Issue asking the maintainer to establish a private channel. Full guidance is in [SECURITY.md](../SECURITY.md).
