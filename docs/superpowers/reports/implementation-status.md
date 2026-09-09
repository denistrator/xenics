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
- Queueable repository downloads now use cancellable task operations; native task listing, cancellation, and retry commands are registered.
- Native task events are emitted on `task://<task-id>` with monotonic sequences and are forwarded through the Tauri event bridge.
- React now hydrates the task panel from native snapshots, subscribes only to active tasks, cleans up listeners, and ignores stale or terminal-reopening events.
- Local macOS validation: 25 frontend tests, 43 Rust tests, and 5/5 desktop E2E specs pass.

## Still in progress

- Queued downloads now wrap clone/index work in cancellable operations; detailed progress phases and richer notification-panel presentation remain to be connected.
- Source updates, removals, local-folder sources, unsupported-repository explorer opening, and bulk review remain to be completed.
- Reader tabs/session persistence remain to be connected. Reader links now stay in the active tab with history updates, and tabs can load parsed documents through the native `read_document` command with explicit loading/error states.
- Search UI is not yet backed by the native search command and still needs the full filter/coverage semantics. The native search boundary now has explicit blank-query handling, quoted user terms and phrases, safe operator handling, and punctuation-heavy prefix support such as `std::vec*`.
- Native recursive file watching now reports supported document changes and filters Git/dependency/build folders; background indexing and polling reconciliation still need to consume those changes.
- Windows/Linux validation and installed-package verification remain pending.

## Safety note

Failed indexing does not automatically delete a partial clone. Cleanup must go
through an explicit, ownership-aware maintenance/reset flow so a failed task
cannot remove a user-owned directory accidentally.
