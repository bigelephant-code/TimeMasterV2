# Roadmap

TimeMaster V2 is maintained as a local-first Windows application. The roadmap prioritizes source clarity, data safety, and reproducible releases over rapid feature expansion.

## Current: make 0.1.3 reproducible

- Preserve the verified 0.1.3 runtime and installer hashes.
- Keep product identity and `%APPDATA%\timemaster-v2\` compatibility stable.
- Validate required runtime files and JavaScript syntax in CI.
- Publish a tagged 0.1.3 release with checksums and known limitations.

## Next: restore modular source

- Split the Electron main process into storage, backup, reminders, export, IPC, and window modules.
- Restore the renderer to Vue single-file components without changing user-visible behavior.
- Add fixtures and migration tests for data model version 3.
- Test atomic writes, damaged-file preservation, and backup recovery.
- Test expense-ledger export and focus-session state transitions.

## Later: community-ready product work

- Add application data import/export and a documented backup format.
- Improve keyboard navigation, accessibility, and high-DPI behavior.
- Separate Chinese calendar support from translatable interface strings.
- Add automated Windows installer smoke tests and signed release artifacts.

Scope proposals and implementation pull requests are welcome. Please open an issue before large architectural changes so data compatibility and migration behavior can be reviewed first.
