# Support

TimeMaster V2 is a community-maintained, local-first open-source project. Support is best effort; there is no guaranteed response time, paid support commitment, warranty, or promise that every environment can be reproduced.

## Supported version and platform

- Current maintained release: `0.1.3`
- Primary platform: Windows x64
- Current data directory: `%APPDATA%\timemaster-v2\`

The historical LiteCal 0.1.0 source is retained as migration and architecture reference. It uses a different application identity and data directory. Do not merge the V1 and V2 directories while troubleshooting.

macOS, Linux, Windows on ARM, portable repackaging, modified builds, and third-party download sites are not currently supported release targets, although constructive portability contributions are welcome.

## Before asking for help

1. Confirm the TimeMaster V2 version and Windows version.
2. Exit the application from its tray menu, then restart it.
3. If the problem concerns data, copy the complete `%APPDATA%\timemaster-v2\` directory to a safe location before changing or deleting anything. The Settings dialog can open the active data directory.
4. Check existing Issues and the current [README](README.md), [ROADMAP](ROADMAP.md), and [privacy notes](PRIVACY.md).
5. If you downloaded an installer, use the official GitHub Release and compare its published SHA-256 hash. The 0.1.3 installer is unsigned and may trigger Windows SmartScreen.

## Where to report

- Bug reports and feature requests: [GitHub Issues](https://github.com/bigelephant-code/TimeMasterV2/issues/new/choose)
- Security-sensitive reports: follow [SECURITY.md](SECURITY.md) and use private vulnerability reporting when available
- Questions about data and networking: read [PRIVACY.md](PRIVACY.md) and the [threat model](docs/THREAT_MODEL.md) first

Do not put a real `data.json`, `settings.json`, expense workbook, access token, precise location, private screenshot, or exploit proof in a public Issue.

## A useful bug report

Please include:

- TimeMaster V2 version and Windows edition/version;
- whether the problem occurs in the installed release, `npm run dev`, or a modified build;
- a minimal sequence of actions that reproduces it;
- expected and actual behavior;
- whether restarting changes the result;
- sanitized logs or screenshots, if they are necessary;
- whether the same behavior occurs with a new, temporary test data directory.

Replace names, task text, amounts, locations, file paths, and other personal details with safe examples. If sanitizing the evidence would remove the security issue, use a private report instead.

## Common cases

### Weather does not load

Weather requires access to `api.open-meteo.com` and `geocoding-api.open-meteo.com`. Manual city search does not require Windows system location. “Use system location” additionally depends on Windows and Chromium location availability and permission. Weather failure does not prevent the local calendar, task, focus, goal, or expense features from operating.

### Data appears damaged or missing

Stop and copy the entire data directory before experimenting. TimeMaster V2 may preserve unreadable JSON as `.broken-<timestamp>` and may recover the main data from `data.backup.json`. Those files are not guaranteed historical backups and should not be repeatedly overwritten during diagnosis. Open an Issue with filenames and sanitized error text, not the file contents.

### Uninstall did not remove records

This is expected. The installer deliberately preserves `%APPDATA%\timemaster-v2\` during uninstall and upgrades. For permanent removal, exit the tray process, make any desired backup, and delete only that exact directory in File Explorer. Exported `.xlsx` files must be removed separately from the locations where you saved them.

### Windows warns about the installer

The recovered 0.1.3 installer is not Authenticode-signed, so Windows cannot verify a publisher identity and may display SmartScreen. Verify that the file came from the official repository release and compare its SHA-256 value. Do not bypass a warning for an installer from an unknown source.

## Scope limits

The expense ledger and generated workbook are personal productivity features, not accounting, tax, legal, or financial advice. Maintainers cannot recover data that exists only on a lost or failed disk, investigate unrelated Windows malware, or guarantee the behavior of unofficial installers and modified builds.

For contribution setup and pull-request expectations, see [CONTRIBUTING.md](CONTRIBUTING.md).
