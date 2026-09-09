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
- Catalog cards now expose accessible source-details dialogs, and bulk documentation downloads intentionally exclude Files-only and Website-only sources unless explicitly selected.
- Reader tabs/session persistence remain to be connected. Reader links now stay in the active tab with history updates, and tabs can load parsed documents through the native `read_document` command with explicit loading/error states.
- Search palette is now backed by the native search command with deferred requests and explicit loading/error states. Full filter/coverage semantics and exact source locations remain. The native search boundary has blank-query handling, quoted user terms and phrases, safe operator handling, and punctuation-heavy prefix support such as `std::vec*`.
- Native deep-link parsing is now URL-based, validates encoded traversal and hostile authorities, and is exposed through the typed `parse_deep_link` command.
- Durable bookmarks now support idempotent saves, anchor persistence, listing, and validated `save_bookmark`/`list_bookmarks` commands. Collections, tags, and session restoration remain.
- Durable collections and tags now support validated, idempotent creation and listing through native commands. Assignment and session restoration remain.
- Reader session state now has a durable native contract and the reader persists/restores validated tab targets and the active tab when running inside Tauri; browser-mode fixtures remain isolated from native storage.
- Recovery presentation now has reusable `InlineError` and `RecoveryActions` primitives, and task failures use the same structured retry-action surface.
- The app shell now exposes a toggleable notification panel fed by the ordered task feed, with recent phases and state summaries while detailed recovery remains in the task panel.
- Native settings persistence now supports allowlisted get/update commands with validation for unknown keys, control characters, and oversized values. The UI integration and native folder/editor/terminal actions remain.
- React settings now hydrate from the native settings store and persist individual changes, while retaining local behavior and an inline warning when the native bridge cannot save.
- Latest macOS release verification passed: 5/5 desktop E2E specs, with only the known non-failing WebDriver/Tauri invoke-timeout warnings.
- Native recursive file watching now reports supported document changes and filters Git/dependency/build folders; background indexing and polling reconciliation still need to consume those changes.
- Installed Git sources now expose native update and removal operations. Updates fetch, fast-forward, and re-index the selected source; removals clear derived search records first. Managed library folders may be deleted only through an explicit flag and containment check, while external/local folders remain user-owned.
- Windows/Linux validation and installed-package verification remain pending.

## Safety note

Failed indexing does not automatically delete a partial clone. Cleanup must go
through an explicit, ownership-aware maintenance/reset flow so a failed task
cannot remove a user-owned directory accidentally.
