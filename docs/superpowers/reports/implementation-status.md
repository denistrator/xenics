# Xenics implementation status

Updated: 2026-09-10

## Verified foundation

- Tauri/React/Rust application shell and desktop WebdriverIO harness are working.
- Catalog entries carry source URL and selected branch/tag metadata.
- Native commands are registered for source listing, download/index, document reading, search, and task snapshots.
- Source metadata is stored in the durable user database; FTS5 remains a separate derived database.
- Git refs are validated before argument construction, shallow mode is explicit, and subprocess output is drained concurrently.
- Reader document paths reject absolute paths and traversal using either slash style.
- Task state transitions can be persisted for recovery without forcing unit tests to use a database.
- Local macOS validation: 22 frontend tests, 36 Rust tests, and 5/5 desktop E2E specs pass.

## Still in progress

- Downloads are currently synchronous command calls; task-backed progress/events and cancellation must wrap the full clone/index operation.
- Source updates, removals, local-folder sources, unsupported-repository explorer opening, and bulk review remain to be completed.
- Reader tabs/session persistence and command-backed document navigation remain to be connected.
- Search UI is not yet backed by the native search command and still needs the full exact/prefix/filter semantics.
- File watching and polling reconciliation need a live background implementation.
- Windows/Linux validation and installed-package verification remain pending.

## Safety note

Failed indexing does not automatically delete a partial clone. Cleanup must go
through an explicit, ownership-aware maintenance/reset flow so a failed task
cannot remove a user-owned directory accidentally.
