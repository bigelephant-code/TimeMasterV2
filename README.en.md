# TimeMaster V2

[![License: MIT](https://img.shields.io/github/license/bigelephant-code/TimeMasterV2)](LICENSE)
[![CI](https://github.com/bigelephant-code/TimeMasterV2/actions/workflows/validate.yml/badge.svg)](https://github.com/bigelephant-code/TimeMasterV2/actions/workflows/validate.yml)
[![CodeQL](https://github.com/bigelephant-code/TimeMasterV2/actions/workflows/codeql.yml/badge.svg)](https://github.com/bigelephant-code/TimeMasterV2/actions/workflows/codeql.yml)
[![GitHub Release](https://img.shields.io/github/v/release/bigelephant-code/TimeMasterV2?display_name=tag)](https://github.com/bigelephant-code/TimeMasterV2/releases)

[简体中文](README.md) | English

TimeMaster V2 is a local-first Windows productivity workspace that combines a calendar, task lists, an Eisenhower matrix, focus sessions, long-running goals, an expense ledger, and a desktop widget.

It is designed for people who want one account-free Windows workspace to answer five practical questions: what to do today, what matters most, how long work took, how goals are progressing, and what a project cost—without uploading personal task data by default.

<p align="center">
  <img src="docs/images/widget.png" width="420" alt="TimeMaster V2 desktop widget with fictional demo data">
</p>
<p align="center"><sub>The desktop widget brings dates, focus, goals, expenses, and the Eisenhower matrix into one glanceable view. Screenshot uses fictional demo data.</sub></p>

[![Download from GitHub Releases](https://img.shields.io/badge/Download-GitHub%20Releases-0969da?style=for-the-badge&logo=github)](https://github.com/bigelephant-code/TimeMasterV2/releases/latest)

> **Version and provenance:** `v0.1.3` preserves the original, unsigned owner-produced Windows installer. The current `main` branch is the editable, buildable `0.1.4-dev` **source-equivalent reconstruction** derived from that artifact; it is not the lost original Vue source tree and is not claimed to reproduce 0.1.3 byte for byte. See the [recovery notes](docs/RECOVERY.md).

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

## Screenshots

| Calendar | Tasks |
|---|---|
| ![TimeMaster calendar](docs/images/calendar.png) | ![TimeMaster task list](docs/images/todos.png) |
| Eisenhower matrix | Expense ledger |
| ![TimeMaster Eisenhower matrix](docs/images/matrix.png) | ![TimeMaster expense ledger](docs/images/expenses.png) |

All screenshots, including the desktop widget above, were captured in an isolated demo environment. Names, amounts, dates, and other content are fictional, sanitized examples; they do not represent real users or community adoption.

## Privacy, security, and support

- Tasks, focus records, goals, expenses, and settings stay in `%APPDATA%\timemaster-v2\` by default.
- The app has no account system, ads, subscriptions, analytics, or telemetry. Weather is the only intentionally network-backed feature in 0.1.3; when enabled, it sends a city-search string or rounded coordinates to Open-Meteo.
- The main and widget renderers use Electron's renderer sandbox and context isolation, disable Node integration, and reach native capabilities through an explicit preload/IPC allowlist.
- Read the [privacy notice](PRIVACY.md) for data flows and deletion, the [threat model](docs/THREAT_MODEL.md) for assumptions and residual risks, [support guidance](SUPPORT.md) for help, and [SECURITY.md](SECURITY.md) for private vulnerability reporting.
- The default branch is checked by Windows CI and CodeQL; Dependabot checks npm and GitHub Actions updates monthly. Automation does not replace human review or provide a security guarantee.

Local-first does not mean invulnerable: TimeMaster V2 does not encrypt its application data or exported workbooks, so malware or another process running with the same user privileges can still read them.

## Installer integrity

SHA-256 of the original `TimeMasterV2-Setup-0.1.3.exe`:

```text
8EEF4DB7BDF2F8BA4911C97E9189232DA9D7D362034822E51A6D03DB333DE9E4
```

This installer is **not Authenticode-signed**. Download it only from this repository's [GitHub Releases](https://github.com/bigelephant-code/TimeMasterV2/releases) and compare it with the checksum file attached to the Release before running it:

```powershell
Get-FileHash .\TimeMasterV2-Setup-0.1.3.exe -Algorithm SHA256
```

A matching hash establishes equality with the published artifact; it does not replace code signing or prove that software is harmless. See [docs/RECOVERY.md](docs/RECOVERY.md) for provenance and limitations.

## Run and verify from source

Requirements: Windows 10/11 and Node.js 22.12 or newer.

```powershell
git clone https://github.com/bigelephant-code/TimeMasterV2.git
Set-Location TimeMasterV2
npm ci
npm run check
npm start
```

`npm run check` verifies the immutable 0.1.3 reference runtime, runs IPC/security contract tests, builds the current `src/`, and checks the generated `out/`. It verifies repository integrity and key contracts; it does not assert a byte-for-byte reproduction of the original installer.

If npm did not download the pinned Electron runtime, run:

```powershell
npm run ensure:electron
```

Build a Windows x64 NSIS installer with:

```powershell
npm run dist
```

New artifacts are written to `release/`. Development builds must use a new development version and must not overwrite or impersonate the original `v0.1.3` artifact.

Verify the unpacked application, both renderers, the sandboxed preload, and IPC with:

```powershell
npm run dist:dir
npm run smoke:packaged
```

The smoke test uses explicitly isolated temporary `userData` and session directories; it does not read or modify the normal `%APPDATA%\timemaster-v2\` data.

## Source and version boundaries

```text
src/                       editable, buildable source-equivalent input for 0.1.4-dev
runtime/                   immutable golden reference extracted from the original 0.1.3 app.asar
legacy/litecal-0.1.0/      historical modular LiteCal 0.1.0 source, for migration reference only
tests/                     IPC and security contract tests
scripts/                   reference-hash, build, and artifact verification tools
docs/                      architecture, threat model, and recovery documentation
```

The original installer contained neither source maps nor the original Vue single-file components, so the lost project structure cannot be recovered exactly. The current `src/` is reviewable, editable, and buildable, while module boundaries and Vue template structure still need gradual refactoring. See [architecture](docs/ARCHITECTURE.md), [recovery notes](docs/RECOVERY.md), and the [roadmap](ROADMAP.md).

## Contributing

Real bug reports, feature proposals, and pull requests are welcome. Please read [CONTRIBUTING.md](CONTRIBUTING.md) first. Never attach real tasks, expenses, precise locations, tokens, or local absolute paths to public issues, logs, or screenshots.

TimeMaster V2 is released under the [MIT License](LICENSE). Direct runtime dependencies and their complete license texts are listed in [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
