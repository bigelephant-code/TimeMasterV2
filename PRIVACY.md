# Privacy

Last updated: 2026-08-13

Applies to: the TimeMaster 0.1.11 formal Windows x64 release, the preserved TimeMaster V2 0.1.3 release artifact, and the optional OpenClaw reminder and AI task-coach integrations currently present only in unreleased source. Version-specific behavior is identified below.

TimeMaster is a local-first Windows application. It has no account system, advertising, analytics, telemetry, remote crash reporting, or automatic-update service. The project maintainer does not automatically receive your tasks, focus history, goals, expense categories or entries, settings, or exported workbooks. Ordinary records remain local-first. The unreleased OpenClaw reminder and AI task-coach integrations are off by default and send only the fields documented below after the user explicitly enables the corresponding feature.

Current released behavior refers to 0.1.11; the original 0.1.3 artifact remains documented as the recovery/reference release. A modified build, operating system, network intermediary, or third-party distribution may behave differently. This notice describes the finalized 0.1.11 behavior but does not assert that its installer has already been uploaded to GitHub Releases.

## Data stored on your computer

The application sets its user-data directory to:

```text
%APPDATA%\timemaster-v2\
```

That directory can contain:

- `data.json`: lists, tasks and their automatic-rollover/completion history, goals, per-ledger expense-category definitions (including disabled categories), expense entries, focus sessions, current focus state, and—only after the unreleased AI coach is used—bounded task-plan/day-plan drafts, checked step state, and exact schedule undo records;
- `settings.json`: appearance, window and widget settings, countdown settings, reminders, and related preferences; unreleased source also stores the non-secret AI-coach enablement, loopback endpoint, agent ID, data-sharing choices, working hours, lunch interval, and schedule buffer here;
- `secrets.json`: TimeMaster's separately encrypted copies of the OpenClaw reminder Hook token and AI-coach Gateway token when configured; Electron `safeStorage` protects each copy at rest, and neither is stored in ordinary settings or application data;
- `remote-reminder-outbox.json`: bounded remote-reminder delivery metadata such as event identifiers, task/occurrence references, attempt state, and retry timing; it contains neither the Hook token nor a copy of the reminder text;
- `data.backup.json`: a local recovery copy of the main data file;
- `data.pre-v4-<timestamp>[-n].json`: a non-overwriting full copy created before a pre-v4 data migration; it remains local and is not automatically rotated or deleted;
- files ending in `.broken-<timestamp>` when an unreadable JSON file is preserved instead of overwritten;
- Electron/Chromium storage, including the saved weather location and recent weather cache.

Writes to the primary JSON files use a temporary file followed by a rename. The ordinary recovery file is local and updated as the application saves. The one-time pre-v4 copy preserves the source data before migration, but neither kind is an off-device disaster-recovery backup.

Expense workbooks are written only after you choose a destination in the Windows save dialog. Those `.xlsx` files are outside the application data directory and may contain personal or commercially sensitive information.

Custom expense-category names are user-entered text and may reveal projects, suppliers, or cost structure. They are stored locally and may be included in exported workbooks.

### Automatic rollover history in 0.1.9

When an incomplete dated task is automatically moved forward, its original date is retained locally as an incomplete rollover record. That record stores the original and target dates, a snapshot of the task title and list ID, and the time when the rollover was recorded. It remains attached to the task so the original calendar date can show the missed occurrence. Deleting the task also deletes its attached rollover history; uninstalling alone does not erase either while `deleteAppDataOnUninstall` remains disabled.

### Recurring-task completion history in 0.1.10

When a recurring dated task is completed, the occurrence being completed is retained locally before the active task advances to its next date. The record stores the completed date, completion time, and snapshots of the title and list ID. Monthly calendar summaries read these records together with ordinary completed tasks. Deleting the recurring task also deletes its attached completion history.

### Expense category retention in 0.1.4

Each expense entry stores a stable category ID. Renaming a category changes the label shown for past and future entries, but does not change entry amounts, dates, notes, record IDs, or category IDs.

“Disable” is not deletion. It removes the category from new-entry choices while retaining the category definition and currently retained linked entries for history, totals, recovery, and Excel export. Restoring the category makes it available for new entries again. The 0.1.4 interface has no hard-delete operation for a category: deleting linked expense entries removes those entries, but the disabled category definition remains until the application data itself is removed as described below. Expense-entry retention is also subject to the built-in limit documented below.

## Network activity

Core calendar, task, focus, goal, local reminder, and expense functions do not require an account or cloud service. Weather is the only feature in formal releases 0.1.3 through 0.1.11 that intentionally calls an Internet service. The current unreleased source also contains optional OpenClaw QQ Bot reminders and an AI task coach, both off by default.

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

### Optional OpenClaw QQ Bot reminders (unreleased source)

When the user enables remote reminders, TimeMaster treats QQ Bot as an optional primary remote channel. While the TimeMaster process is running, its scheduler independently attempts the corresponding Windows notification and remote reminder; hiding the window to the tray can keep the process running, but fully exiting TimeMaster stops both scheduling paths. Remote QQ processing additionally requires the local OpenClaw Gateway to be running and reachable during the reminder or valid retry period. A remote failure does not cause TimeMaster to skip the local attempt, but it does not make either path guaranteed delivery.

TimeMaster accepts only a local loopback OpenClaw `/hooks/agent` endpoint. At reminder time it can send:

- the reminder title;
- its date and start/time value;
- the reminder note only when the user explicitly enables note inclusion;
- the configured QQ target type and identifier, an optional QQ account identifier, and delivery-control metadata such as a stable event identifier.

The application sends this request to the OpenClaw process on the same computer. OpenClaw may then send the content to a model provider selected by the user and to the configured QQ Bot destination. Those onward connections, provider retention, QQ account handling, and message delivery are controlled by the user's OpenClaw/QQ configuration and the relevant third-party policies, not by TimeMaster or this repository.

The same Hook token crosses two separate local storage boundaries. TimeMaster encrypts **its copy** at rest with Electron `safeStorage` in `secrets.json`, separate from `settings.json` and `data.json`. Plaintext necessarily exists transiently in the password field while the user types it; after saving, that field is cleared, and TimeMaster does not return or prefill the saved copy in the renderer.

OpenClaw must independently store or read `hooks.token` so its Gateway can authenticate requests. The current field does not support SecretRef; it is therefore commonly plaintext in `~/.openclaw/openclaw.json`, or supplied through local environment substitution visible to the process that starts the Gateway. Electron `safeStorage` does not encrypt or protect this OpenClaw-side copy. The OpenClaw configuration directory and any service, scheduled-task, or environment configuration carrying the value should have Windows ACLs restricted to the user/service identity that runs OpenClaw. Neither copy should be placed in Git, screenshots, public issues, logs, or ordinary unencrypted backups; any necessary secret backup should be encrypted and access-controlled. Suspected disclosure requires rotating the value in both OpenClaw and TimeMaster. The configured destination and optional account ID are operational metadata and may identify a person, group, channel, or bot account.

An HTTP 200 response from `/hooks/agent` means only that OpenClaw accepted the request for processing. It does not prove that a model completed, that QQ accepted the message, or that a recipient received it. QQ proactive-message rules can restrict delivery according to destination type, bot/account selection, recent user interaction, platform policy, or rate limits.

The Windows notification is an independent local fallback attempt, not a delivery guarantee. Windows notification permissions, per-application notification settings, Focus Assist/Do Not Disturb, or other operating-system state can suppress, delay, or hide its presentation. A sleeping computer or suspended process cannot schedule at the intended instant; after resume, TimeMaster catches up only while the reminder remains inside its bounded grace/delivery window and does not replay stale reminders indefinitely.

### Optional OpenClaw AI task coach (unreleased source)

When the user enables the AI task coach, TimeMaster accepts only a local loopback OpenClaw `/v1/responses` endpoint. A single-task decomposition request can contain the selected task's local identifier, title, date, start/end time, priority, quadrant, and recurrence rule. A day-planning request can contain incomplete tasks already assigned to that date plus undated important tasks (quadrants 1 or 2), with the same bounded planning fields. Task notes are excluded unless the user separately enables note sharing. Requests also contain the applicable local date/time and timezone. Configured working hours, lunch interval, and buffer remain local and are applied by TimeMaster's deterministic scheduler after the model returns ordering and duration estimates.

TimeMaster does not send expense entries or category names, focus sessions, goals, weather location, exported workbooks, the application-data directory, or the whole `data.json` file to the AI coach. Single-task requests do not include unrelated task titles. Day planning necessarily includes the titles and planning fields of the tasks being considered for that day's draft.

OpenClaw may pass those fields to the model provider selected by the user and, when the dedicated agent is permitted to research official entry points, to configured web-search/fetch providers. Their logging, retention, training, jurisdiction, and deletion behavior are controlled by the user's OpenClaw configuration and the corresponding third-party policies, not by TimeMaster or this repository. AI results may be incomplete, stale, or wrong. TimeMaster therefore treats URLs as suggestions, permits only an explicit user click to open a validated HTTPS URL, and does not execute instructions or scripts returned by the model.

The model does not directly read or write TimeMaster files. It must return a bounded structured proposal. TimeMaster validates the proposal and uses a local deterministic scheduler to avoid fixed occupied intervals. A day plan changes task schedules only after the user presses the apply action. Before applying, the main process rechecks every referenced task and rejects the entire batch if any task changed; no partial application occurs. Undo restores only the exact fields written by that batch and is rejected without partial changes if the user edited one of those schedules afterward. AI scheduling does not create automatic-rollover history.

The AI coach uses an OpenClaw **Gateway token/password**, which is different from the reminder `hooks.token`. OpenClaw documents shared bearer authentication for `/v1/responses` as full operator access to that Gateway; request headers cannot reduce that shared-secret authority. TimeMaster keeps its saved copy in the main process and encrypts it with Electron `safeStorage`, never returns it to the renderer, and accepts only loopback HTTP. This does not reduce the authority of the OpenClaw-side credential or protect it from another process running with the same Windows-user privileges. A separate loopback Gateway and a dedicated agent without filesystem, runtime, messaging, automation, UI, or node tools are recommended. Do not place either token in Git, screenshots, logs, support bundles, or unencrypted backups.

## What is not sent by the application

Formal releases through 0.1.11 do not send task titles, task notes, reminders, focus sessions, goals, expense-category names, expense entries, settings, or exported workbooks to Open-Meteo or to the project maintainer. They do not contain a login, synchronization service, analytics SDK, advertising SDK, or remote crash collector.

In the unreleased source, enabling an OpenClaw feature creates only the corresponding exception described above. Reminder requests can contain the reminder title/date/time, an explicitly included note, and required destination/delivery metadata. AI-coach requests can contain the selected task or bounded day-planning set and planning context; notes remain opt-in. TimeMaster does not add unrelated focus history, goals, expenses, expense-category names, weather location, exported workbooks, or the whole local database to either payload.

This statement does not prevent Windows, security software, DNS providers, proxies, or other software on the computer or network from recording their own activity.

## Retention, backup, and deletion

Local records generally remain until you edit them in the application or remove the application data yourself, subject to these built-in history limits:

- expense entries keep the most recent 20,000 rows by accounting date and registration time;
- completed focus sessions keep the most recent 2,000 rows;
- each goal keeps the most recent 100 progress-history rows and 11 completed period summaries.
- the AI task coach keeps at most one normalized decomposition per retained task and day-plan records for the most recent 30 distinct planning dates; deleting a task removes its decomposition and any day plan that still references it.

When a limit is exceeded, the application automatically removes the oldest rows in that collection. These limits mean the local ledger is not an indefinite audit archive; export or separately back up records that must be retained longer. Migration copies named `data.pre-v4-*` are not automatically rotated or deleted. Uninstalling TimeMaster does **not** delete `%APPDATA%\timemaster-v2\`; this is deliberate so an uninstall or upgrade does not silently erase user data.

To remove all application-held data:

1. Exit TimeMaster from its tray menu so it cannot write the files again.
2. Preserve a copy first if you may need the records later.
3. Uninstall the application if desired.
4. In File Explorer, open `%APPDATA%` and delete only the `timemaster-v2` directory. This removes TimeMaster's encrypted Hook-token and Gateway-token copies in `secrets.json`, AI plan/undo data, and local remote-reminder state, but it does not remove or revoke either OpenClaw-side credential or delete data already retained by a model/search provider or QQ.
5. Separately delete any exported `.xlsx` files from the locations you selected.

There is no “erase all data” button in the documented formal releases. Removing the directory also removes ordinary backups, `data.pre-v4-*` migration copies, TimeMaster's encrypted local secret copies, AI drafts/undo data, and outbox metadata, and is irreversible unless you made another copy. Separately remove or rotate `hooks.token` and the Gateway token/password in OpenClaw's configuration/environment when retiring the integrations. Deleting TimeMaster data does not revoke credentials retained elsewhere or delete content already retained by OpenClaw, a configured model/search provider, QQ, a recipient, Windows, network providers, GitHub, or another third party; use those services' own controls where applicable.

## GitHub interactions

If you open an Issue, Discussion, pull request, or security report, the information you submit is processed by GitHub under GitHub's terms and privacy practices. Do not attach real task databases, expense workbooks, access tokens, precise locations, or other sensitive data to a public report. Use the private vulnerability-reporting route described in [SECURITY.md](SECURITY.md) for security-sensitive material.

## Release integrity

The formal 0.1.11 Windows x64 installer and the recovered 0.1.3 installer are not Authenticode-signed. Windows therefore cannot verify a publisher identity for them and may show a SmartScreen warning. Obtain an installer through a trusted official channel and compare the SHA-256 published alongside that exact artifact before running it. A matching hash confirms file equality with the referenced artifact; it does not replace code signing or guarantee that a program is harmless. This notice does not claim that a 0.1.11 installer has already been uploaded to GitHub Releases.

## Questions

For a privacy question that contains no sensitive information, open a GitHub Issue using the repository templates. For a suspected vulnerability or a report containing sensitive details, follow [SECURITY.md](SECURITY.md).
