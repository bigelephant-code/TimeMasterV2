## Summary

<!-- Explain the user-visible change and why it is needed. Link related issues with "Closes #..." when appropriate. -->

## Scope

- Change:
- Out of scope:

## Privacy and security

- [ ] I did not commit real `data.json`, backups, financial records, task/calendar content, location data, credentials, secrets, tokens, or identifying logs/screenshots.
- [ ] New or changed IPC channels validate their sender and expose only the minimum required capability.
- [ ] The change does not add network access, telemetry, permissions, or third-party data sharing; or I documented and justified each addition below.
- [ ] Saved-data compatibility, migration, rollback, and failure behavior are documented below; or no saved-data format changes are made.

Privacy/security notes:

## Validation

- [ ] `npm ci --ignore-scripts`
- [ ] `npm run check`
- [ ] Main window behavior was tested on Windows.
- [ ] Desktop widget behavior was tested when affected.
- [ ] Failure, empty-data, and restart behavior were tested when affected.
- [ ] Screenshots use fictional demo data and contain no personal information.

Test evidence:

## UI and accessibility

<!-- Remove this section if the change has no UI impact. -->

- [ ] Keyboard navigation and visible focus remain usable.
- [ ] Text remains legible at common Windows scaling settings.
- [ ] Before/after screenshots or a short recording are attached when useful.

## Release and documentation impact

- [ ] User-facing behavior is documented.
- [ ] Dependency or license notices are updated when needed.
- [ ] Release notes or upgrade instructions are included when needed.
- [ ] No release/documentation update is required.
