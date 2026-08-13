# Threat model

Last reviewed: 2026-08-13

Target: the TimeMaster 0.1.11 formal release and the preserved TimeMaster V2 0.1.3 release artifact on Windows x64

This is a practical threat model for maintainers and reviewers. It describes the current design and residual risks; it is not a security certification.

## Security goals

- Keep tasks, goals, focus records, expenses, settings, and backups on the user's computer unless the user explicitly exports them.
- Restrict renderer access to native capabilities to the preload API and registered IPC handlers.
- Limit intentional runtime network access to the documented Open-Meteo weather feature.
- Preserve usable data through ordinary writes, malformed JSON, upgrades, and uninstall/reinstall cycles.
- Make release provenance and the risk of an unsigned installer visible to users.

## Assets

- `%APPDATA%\timemaster-v2\data.json`, `settings.json`, `data.backup.json`, non-rotating `data.pre-v4-*` migration copies, and preserved `.broken-*` files;
- per-ledger expense-category names and disabled category definitions, which may reveal suppliers, projects, or cost structure;
- Chromium local storage containing saved weather coordinates/label and cached forecast data;
- exported expense workbooks in user-selected locations;
- reminder text shown in native notifications;
- application integrity, GitHub release integrity, and the maintainer's release credentials.

Some of these records can reveal schedules, habits, business costs, or approximate location and should be treated as sensitive even though the application has no account system.

## Architecture and trust boundaries

```text
Untrusted local input / stored JSON
                 │
                 ▼
Vue renderer ── preload allowlist ── Electron main process ── local files / Windows APIs
     │                                      │
     ├──────── HTTPS: Open-Meteo ───────────┘
     └──────── Chromium geolocation ── Windows/location providers
```

The main and widget renderers use context isolation, do not enable Node integration, keep web security enabled, and run in Electron's renderer sandbox. A separate visual transition overlay is also sandboxed and has no preload bridge. The sandbox reduces renderer privileges but does not make renderer content or IPC handlers automatically safe.

The preload exposes a finite API rather than raw `ipcRenderer`. Main-process handlers validate important window ownership and input constraints, but every new IPC method expands the trusted interface and requires review.

The main window's Content Security Policy does not permit Open-Meteo. The widget's policy permits connections to only the two documented Open-Meteo origins in addition to local development allowances. CSP is defense in depth and does not make unsafe renderer code harmless.

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

## Weather data flow

There are two explicit outbound flows:

1. A submitted city string goes to `https://geocoding-api.open-meteo.com/v1/search`.
2. Rounded latitude/longitude goes to `https://api.open-meteo.com/v1/forecast`.

The application does not add task, goal, focus, or expense data to these requests. Once coordinates have been saved locally, the widget can refresh the forecast at startup and on a timer. Ordinary HTTPS metadata remains visible to the service and relevant network infrastructure. See [PRIVACY.md](../PRIVACY.md) for the user-facing description.

## Data-loss considerations

The ordinary recovery file and the automatically created `data.pre-v4-*` source snapshot are convenience copies, not a disaster-recovery system. The migration snapshot is deliberately not overwritten or automatically deleted. Before testing migrations, storage changes, or modified builds, copy the entire `%APPDATA%\timemaster-v2\` directory while the application is fully exited. Never test against the only copy of real user data.

In 0.1.5, deleting an expense-category button is implemented as an audit-preserving archive, not erasure. The category definition remains until the application data is removed; linked entries remain visible while retained, but the ledger automatically keeps only the newest 20,000 expense rows. Previously exported workbooks must be deleted separately. Renaming changes the label displayed for linked historical entries but does not rewrite their amounts, dates, notes, or IDs. The v3→v4 migration therefore requires explicit tests that preserve these relationships and keep legacy amounts visible.

The 0.1.11 formal Windows x64 installer is unsigned. This threat model describes its finalized behavior and risk boundary but does not claim that a GitHub Release asset has already been uploaded.

Uninstall is configured with `deleteAppDataOnUninstall: false`. This reduces accidental loss but means uninstalling is not a privacy erase. Complete deletion requires removing the exact V2 user-data directory after exit. LiteCal V1 uses a different directory and must not be merged or deleted as part of V2 cleanup.

## Out of scope

This project cannot defend against:

- an already-compromised Windows account or administrator;
- malicious replacement of both an artifact and all hash/documentation channels a user trusts;
- observation or retention performed independently by Windows, Open-Meteo, DNS, proxies, endpoint-security products, or other third parties;
- disclosure after a user exports, uploads, or shares a workbook, screenshot, database, or support report;
- guarantees for modified, unofficial, or development builds.

## Security review checklist

Changes should receive security-focused review when they touch:

- preload exports, IPC channels, window ownership checks, navigation, or external URL handling;
- `webPreferences`, CSP, permissions, geolocation, or network destinations;
- data paths, migrations, backup/recovery, uninstall behavior, or V1/V2 identity;
- `expenseCategory:*` IPC validation, stable category IDs, disabled-category retention, or category-to-entry compatibility;
- spreadsheet generation or any future import/parser feature;
- dependencies, packaging, signing, CI workflows, or release credentials.

Relevant verification includes an IPC-contract test, a secret scan, dependency review, CSP inspection, migration tests using copied fixtures, a packaged-app smoke test, and published artifact hashes.

## Reporting a vulnerability

Use GitHub's private vulnerability reporting / Security Advisory flow when it is available. Do not publish exploit details, real user data, tokens, precise locations, or commercially sensitive workbooks in a public Issue. If the private route is unavailable, open a minimal public Issue asking the maintainer to establish a private channel. Full guidance is in [SECURITY.md](../SECURITY.md).
