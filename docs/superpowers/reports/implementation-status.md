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
- Local macOS validation: 36 frontend tests, 59 Rust tests, E2E typecheck, production build, packaged-build verification, and 5/5 desktop E2E specs pass.

## Implemented locally

- Queued downloads now wrap clone/index work in cancellable operations and the notification panel presents active progress with cancel/retry actions.
- Catalog management now exposes native-backed update/remove actions, local-source registration, capability-specific actions, and a review step for Update all.
- Capability-specific primary actions are now wired: installed Files-only sources open through the native system-folder command, and Website-only sources use the validated native browser command.
- Per-source updates now queue cancellable native tasks, using the same Git, indexing, ordered-event, and recovery infrastructure as downloads.
- Catalog cards now expose accessible source-details dialogs, and bulk documentation downloads intentionally exclude Files-only and Website-only sources unless explicitly selected.
- The catalog now reconciles installed status from the native source database and updates the local card state after queued downloads complete; browser-only rendering retains its fixture behavior.
- Reader tabs/session persistence are connected. Reader links stay in the active tab with history updates, tabs load parsed documents through the native `read_document` command, and per-tab back/forward controls are available.
- Search palette is backed by the native search command with deferred requests and explicit loading/error states. Native search returns source-relative paths and parser-derived line/column locations for reader navigation.
- Search index paths now use source-relative POSIX separators, matching the safe reader command contract and allowing exact result navigation without exposing local filesystem paths.
- Search palette selections now open a reader tab through the application boundary, preserving source, path, match index, and native line/column location metadata.
- Native deep-link parsing is now URL-based, validates encoded traversal and hostile authorities, and is exposed through the typed `parse_deep_link` command.
- Durable bookmarks support idempotent saves, anchor persistence, listing, and validated `save_bookmark`/`list_bookmarks` commands. Collections, tags, and session restoration are implemented.
- Durable collections and tags now support validated, idempotent creation/listing and bookmark assignment through native commands. The organization panels now expose creation and per-bookmark assignment actions, with browser-mode in-memory fallback.
- Organization hooks and a dedicated route now hydrate native bookmarks, collection/tag records, and bookmark assignments into the existing panels; browser-only mode remains an empty local fallback.
- Reader session state now has a durable native contract and the reader persists/restores validated tab targets and the active tab when running inside Tauri; browser-mode fixtures remain isolated from native storage.
- Reader tabs now expose explicit per-tab back/forward controls, preserve navigable history, and discard stale forward entries when a new internal link is opened.
- Reader code blocks now expose line numbers and an accessible line-wrapping toggle alongside copy/download actions.
- Reader workspaces now expose bounded zoom controls and pass zoom state explicitly into document presentation.
- Reader pages now route external links through the validated browser command and expose a copy-deep-link action for the active source/ref/path.
- Reader pages now expose source-folder and source-URL actions for the active tab through the existing native opener boundary.
- Recovery presentation now has reusable `InlineError` and `RecoveryActions` primitives, and task failures use the same structured retry-action surface.
- The app shell now exposes a toggleable notification panel fed by the ordered task feed, with an active-task loader, recent phases, and cancel/retry actions while detailed recovery remains in the task panel.
- Native settings persistence supports allowlisted get/update commands with validation for unknown keys, control characters, and oversized values. The UI is connected, including the ownership-aware full reset flow.
- React settings now hydrate from the native settings store and persist individual changes, while retaining local behavior and an inline warning when the native bridge cannot save.
- Latest macOS release verification passed: 5/5 desktop E2E specs, with only the known non-failing WebDriver/Tauri invoke-timeout warnings.
- Native recursive file watching reports supported document changes and filters Git/dependency/build folders; the indexer now consumes changed and deleted documents incrementally with cancellation and source-root containment checks.
- Installed Git sources now expose native update and removal operations. Updates fetch, fast-forward, and re-index the selected source; removals clear derived search records first. Managed library folders may be deleted only through an explicit flag and containment check, while external/local folders remain user-owned.
- Native custom-source registration now accepts a validated local folder, detects an optional Git remote, persists the source outside managed-library deletion scope, and defaults unknown local folders to Files-only capability.
- Native external URL and folder actions now validate their target before delegating to the Tauri opener plugin, keeping browser and system-explorer launches outside shell interpolation.
- Full reset is now preview-first and confirmation-bound. It clears durable user records and the derived search index, deletes only canonical managed folders inside the library, preserves external/local-folder sources, and is exposed from Settings with a destructive confirmation dialog.
- Global Update all now opens a review dialog before queueing installed sources, clearly labels website-only sources as skipped, and keeps native policy enforcement authoritative.
- Catalog filtering is now functional for category, capability, and installation state; organization bookmark cards now have an explicit open action instead of a no-op handler.
- Final local acceptance verification passed: E2E typecheck, packaged-build verifier, and all five macOS WebDriver specs. The suite still emits known non-failing Tauri invoke-timeout and mock-store cleanup warnings while the app remains healthy.
- Cross-platform desktop acceptance is now configured in `.github/workflows/desktop-acceptance.yml` for macOS, Ubuntu, and Windows, including real smoke runs and normal release-bundle builds. Those hosted jobs and clean-user installer/deep-link/signing checks remain pending until the workflow executes with the required runner and distribution credentials.

## Safety note

Failed indexing does not automatically delete a partial clone. Cleanup must go
through an explicit, ownership-aware maintenance/reset flow so a failed task
cannot remove a user-owned directory accidentally.
