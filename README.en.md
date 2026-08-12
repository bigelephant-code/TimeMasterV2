# TimeMaster V2

[简体中文](README.md) | English

TimeMaster V2 is a local-first Windows productivity workspace that combines a calendar, task lists, an Eisenhower matrix, focus sessions, long-running goals, an expense ledger, and a desktop widget.

The project started as LiteCal and evolved into TimeMaster V2. The current runnable version is **0.1.3**. This repository preserves both the original modular LiteCal 0.1.0 source and the readable 0.1.3 runtime recovered and verified from the final installer, so the current product no longer exists only as a binary artifact.

## Features

| Area | Capabilities |
|---|---|
| Calendar | Month, week, and day views; Gregorian and Chinese lunar calendars, solar terms, festivals, and holidays |
| Tasks | Multiple lists, priorities, start/end times, recurrence, reminders, drag and drop, and duration tracking |
| Eisenhower matrix | Organize the same task data across important/urgent quadrants |
| Focus | Configurable sessions, pause/resume, completion history, and daily totals |
| Main tasks | Target progress, recurring accumulation, and historical entries |
| Expense ledger | Date-based entries, corrections, history, and Excel reconciliation export |
| Desktop widget | Date, lunar calendar, weather, milestones, focus state, main tasks, and today's matrix |
| Local data | Atomic JSON writes, damaged-file preservation, automatic backups, and recovery |

## Privacy and networking

- Tasks, focus records, goals, expenses, and settings stay in `%APPDATA%\timemaster-v2\`.
- The app has no account system, ads, subscriptions, analytics, or telemetry.
- Weather is the only network-backed feature. When enabled, it calls the Open-Meteo forecast and geocoding APIs for the location selected by the user.
- The renderer uses Electron context isolation and reaches native capabilities only through an explicit IPC allowlist.

## Run locally

Requirements: Windows 10/11 and Node.js 20 or newer.

```powershell
npm ci
npm run check
npm start
```

If npm did not download the pinned Electron runtime, the start and packaging commands repair it through `npm run ensure:electron`.

## Package

```powershell
npm run dist
```

Artifacts are written to `release/`. The Windows x64 NSIS installer allows users to choose an install directory and does not delete application data during uninstall or upgrade.

## Source layout and recovery status

```text
runtime/                   verified, runnable TimeMaster V2 0.1.3 source snapshot
src/                       historical modular LiteCal 0.1.0 source
scripts/                   integrity checks and build helpers
docs/                      architecture and recovery notes
```

The final 0.1.3 installer did not contain source maps or the original Vue single-file components. Its bundled JavaScript and CSS are readable and not obfuscated. The exact recovery method, artifact hashes, limitations, and maintenance rules are documented in [docs/RECOVERY.md](docs/RECOVERY.md).

The next engineering milestone is to restore clear Vue and Electron module boundaries while keeping runtime behavior and local data compatibility covered by tests. See [ROADMAP.md](ROADMAP.md).

## Contributing and security

Issues and pull requests are welcome. Please read [CONTRIBUTING.md](CONTRIBUTING.md), [ROADMAP.md](ROADMAP.md), and [SECURITY.md](SECURITY.md) first.

TimeMaster V2 is released under the [MIT License](LICENSE). Bundled dependency notices are listed in [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
