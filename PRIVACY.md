# Privacy

Last updated: 2026-08-13

Applies to: the TimeMaster 0.1.9 formal Windows x64 release and the preserved TimeMaster V2 0.1.3 release artifact. Version-specific behavior is identified below.

TimeMaster is a local-first Windows application. It has no account system, advertising, analytics, telemetry, remote crash reporting, or automatic-update service. The project maintainer does not automatically receive your tasks, focus history, goals, expense categories or entries, settings, or exported workbooks. Expense-category, rollover-history, and interface changes add no new network destination or third-party data sharing.

Current released behavior refers to 0.1.9; the original 0.1.3 artifact remains documented as the recovery/reference release. A modified build, operating system, network intermediary, or third-party distribution may behave differently. This notice describes the finalized 0.1.9 behavior but does not assert that its installer has already been uploaded to GitHub Releases.

## Data stored on your computer

The application sets its user-data directory to:

```text
%APPDATA%\timemaster-v2\
```

That directory can contain:

- `data.json`: lists, tasks and their automatic-rollover history, goals, per-ledger expense-category definitions (including disabled categories), expense entries, focus sessions, and current focus state;
- `settings.json`: appearance, window and widget settings, countdown settings, reminders, and related preferences;
- `data.backup.json`: a local recovery copy of the main data file;
- `data.pre-v4-<timestamp>[-n].json`: a non-overwriting full copy created before a pre-v4 data migration; it remains local and is not automatically rotated or deleted;
- files ending in `.broken-<timestamp>` when an unreadable JSON file is preserved instead of overwritten;
- Electron/Chromium storage, including the saved weather location and recent weather cache.

Writes to the primary JSON files use a temporary file followed by a rename. The ordinary recovery file is local and updated as the application saves. The one-time pre-v4 copy preserves the source data before migration, but neither kind is an off-device disaster-recovery backup.

Expense workbooks are written only after you choose a destination in the Windows save dialog. Those `.xlsx` files are outside the application data directory and may contain personal or commercially sensitive information.

Custom expense-category names are user-entered text and may reveal projects, suppliers, or cost structure. They are stored locally and may be included in exported workbooks.

### Automatic rollover history in 0.1.9

When an incomplete dated task is automatically moved forward, its original date is retained locally as an incomplete rollover record. That record stores the original and target dates, a snapshot of the task title and list ID, and the time when the rollover was recorded. It remains attached to the task so the original calendar date can show the missed occurrence. Deleting the task also deletes its attached rollover history; uninstalling alone does not erase either while `deleteAppDataOnUninstall` remains disabled.

### Expense category retention in 0.1.4

Each expense entry stores a stable category ID. Renaming a category changes the label shown for past and future entries, but does not change entry amounts, dates, notes, record IDs, or category IDs.

“Disable” is not deletion. It removes the category from new-entry choices while retaining the category definition and currently retained linked entries for history, totals, recovery, and Excel export. Restoring the category makes it available for new entries again. The 0.1.4 interface has no hard-delete operation for a category: deleting linked expense entries removes those entries, but the disabled category definition remains until the application data itself is removed as described below. Expense-entry retention is also subject to the built-in limit documented below.

## Network activity

Core calendar, task, focus, goal, reminder, and expense functions do not require an account or cloud service. Weather is the only feature in both the 0.1.3 and 0.1.9 releases that intentionally calls an Internet service.

### City search

When you submit a city search, the entered search text is sent to:

```text
https://geocoding-api.open-meteo.com/v1/search
```

The request also specifies a result count, Chinese response language, and JSON format. Selecting a result saves its label and latitude/longitude locally.

### Forecast requests

When a weather location has been selected, its latitude and longitude are sent to:

```text
https://api.open-meteo.com/v1/forecast
```

The request asks for current temperature, apparent temperature, weather code, the day's high and low, automatic timezone handling, and a one-day forecast. Application code rounds latitude and longitude to two decimal places before storing or sending them. As with any Internet request, Open-Meteo and network intermediaries can also observe ordinary connection metadata such as the source IP address and request time.

The widget caches recent weather results locally. While a saved location exists and the widget is running, it may refresh the forecast at startup and periodically in the background.

### Windows and browser location

Choosing “use system location” invokes Chromium's `navigator.geolocation` interface. TimeMaster asks for this permission only from the widget window; other application windows are denied geolocation permission by the application's permission handler. The coordinates returned to application code are rounded to two decimal places before local storage and the Open-Meteo forecast request.

Windows, Chromium, hardware, and network providers may participate in determining the device location before the result reaches the application. Their processing is controlled by the relevant Windows privacy settings and provider policies, not by this project. You can use manual city search instead of system location.

## What is not sent by the application

Neither the 0.1.3 release code nor the 0.1.4 release code sends task titles, task notes, reminders, focus sessions, goals, expense-category names, expense entries, settings, or exported workbooks to Open-Meteo or to the project maintainer. They do not contain a login, synchronization service, analytics SDK, advertising SDK, or remote crash collector.

This statement does not prevent Windows, security software, DNS providers, proxies, or other software on the computer or network from recording their own activity.

## Retention, backup, and deletion

Local records generally remain until you edit them in the application or remove the application data yourself, subject to these built-in history limits:

- expense entries keep the most recent 20,000 rows by accounting date and registration time;
- completed focus sessions keep the most recent 2,000 rows;
- each goal keeps the most recent 100 progress-history rows and 11 completed period summaries.

When a limit is exceeded, the application automatically removes the oldest rows in that collection. These limits mean the local ledger is not an indefinite audit archive; export or separately back up records that must be retained longer. Migration copies named `data.pre-v4-*` are not automatically rotated or deleted. Uninstalling TimeMaster does **not** delete `%APPDATA%\timemaster-v2\`; this is deliberate so an uninstall or upgrade does not silently erase user data.

To remove all application-held data:

1. Exit TimeMaster from its tray menu so it cannot write the files again.
2. Preserve a copy first if you may need the records later.
3. Uninstall the application if desired.
4. In File Explorer, open `%APPDATA%` and delete only the `timemaster-v2` directory.
5. Separately delete any exported `.xlsx` files from the locations you selected.

There is no “erase all data” button in 0.1.3 or 0.1.4. Removing the directory also removes ordinary backups and `data.pre-v4-*` migration copies, and is irreversible unless you made another copy. The application cannot delete records retained independently by Open-Meteo, Windows, network providers, GitHub, or other third parties.

## GitHub interactions

If you open an Issue, Discussion, pull request, or security report, the information you submit is processed by GitHub under GitHub's terms and privacy practices. Do not attach real task databases, expense workbooks, access tokens, precise locations, or other sensitive data to a public report. Use the private vulnerability-reporting route described in [SECURITY.md](SECURITY.md) for security-sensitive material.

## Release integrity

The formal 0.1.4 Windows x64 installer and the recovered 0.1.3 installer are not Authenticode-signed. Windows therefore cannot verify a publisher identity for them and may show a SmartScreen warning. Obtain an installer through a trusted official channel and compare the SHA-256 published alongside that exact artifact before running it. A matching hash confirms file equality with the referenced artifact; it does not replace code signing or guarantee that a program is harmless. This notice does not claim that a 0.1.4 installer has already been uploaded to GitHub Releases.

## Questions

For a privacy question that contains no sensitive information, open a GitHub Issue using the repository templates. For a suspected vulnerability or a report containing sensitive details, follow [SECURITY.md](SECURITY.md).
