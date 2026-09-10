# Xenics architecture overview

Xenics is local-first. The React frontend renders the workspace and requests operations through typed Tauri commands. Rust owns privileged filesystem, Git, persistence, parsing, indexing, task, and desktop integration work.

```text
React UI
  │ typed commands/events
  ▼
Tauri command adapters
  ▼
Rust domain services
  ├── Git and repository lifecycle
  ├── document discovery, safe rendering, and indexing
  ├── durable user database
  ├── disposable FTS5 search database
  ├── cancellable task manager
  ├── managed paths and filesystem reconciliation
  └── desktop integrations and notification policy
```

The current native command surface includes `list_sources`, `download_source`,
`start_download_source`, `read_document`, `search_documents`, `get_tasks`,
`cancel_task`, and `retry_task`. The catalog download path queues work through
the Rust-owned task manager and does not report success when the native bridge
is unavailable.

The frontend keeps feature boundaries explicit: catalog, reader, search, organization, and task/recovery surfaces expose small model and hook modules rather than sharing ad-hoc state. Task rows use structured error codes and retry classification, so recovery actions never depend on matching human-readable error text.

Search queries cross a narrow Rust-owned boundary. Blank queries return no results without touching SQLite; non-empty terms are quoted before reaching FTS5, quoted groups remain contiguous phrases, and a trailing `*` is treated as an intentional token-prefix query. This prevents user input from injecting FTS operators while preserving identifier searches such as `std::vec*`.

Source monitoring uses a native recursive watcher for Markdown and MDX files. Git internals, dependency folders, and build outputs are filtered at the event boundary; reconciliation remains the authoritative fallback after missed events or restarts.

Changed files can be consumed incrementally: supported paths are re-parsed and upserted, deleted paths are removed from the derived index, and cancellation or root mismatches stop the operation safely. Full reconciliation remains available after missed events.

The catalog treats the hardcoded technology list as presentation metadata and hydrates installation status from the durable native source catalog. A successful download updates the local view immediately while the database remains authoritative on the next launch. Category, capability, and installation filters are local presentation state and never alter source ownership or persistence.

Catalog update and removal actions are thin UI adapters over native commands. Bulk update operates only on currently installed catalog IDs; destructive managed-file deletion remains an explicit native operation with canonical-root containment checks.

The global update action opens a review before queueing work. The review identifies every installed source known to the catalog, labels website-only sources as skipped, and leaves final eligibility enforcement to the native update policy.

The local-source dialog requires a display name and folder path, then delegates canonicalization and Git-remote detection to `add_local_source`. The returned source is presented in the same card grid, but remains outside managed-library deletion scope.

Card primary actions remain capability-specific: readable sources open the reader, Files-only sources invoke `open_source_folder`, and Website-only sources invoke `open_source_website`. The native commands resolve persisted source metadata and apply the same URL/path validation as all other desktop actions.

The reader accepts only the parsed native document model. React renders text nodes and structured blocks, maps parser warnings to visible warning blocks, resolves internal links into the active tab history, and exposes per-tab back/forward navigation with stale forward-history truncation. Code blocks render line numbers and a user-controlled wrapping mode; they never evaluate repository HTML or MDX as executable markup.

Global search is command-backed through a deferred React query boundary. The palette presents loading and native error states, while the Rust service remains responsible for FTS normalization, ranking, and input safety.

Search records store source-relative document paths with normalized `/` separators. This keeps result navigation independent of the machine’s absolute library location and lets the reader enforce one consistent containment boundary.

The derived search database stores one parser-derived location per document and returns it with each hit. Frontend result targets preserve that location so later reader views can focus the corresponding source area without exposing absolute paths.

The application owns search-result navigation: selecting a result creates a reader tab from the typed target rather than coupling the palette directly to document loading. This keeps search replacement and reader recovery independently testable.

Xenics deep links are parsed and validated in Rust through `parse_deep_link`; the serialized target preserves the selected branch/tag, document path, and optional anchor for the reader/session layer.

Bookmarks are user data, not search-derived data. Rust persists them in the durable user database with idempotent source/ref/path saves, while bookmark commands validate paths and anchors before writing.

Collections and tags use the same durable database boundary. Names are trimmed, control characters are rejected, and stable normalized IDs make repeated create requests idempotent.

Bookmark organization uses separate many-to-many join tables for collections and tags. Assignment commands validate both the bookmark and target record, and repeated assignments are idempotent; removing an assignment does not delete either user-owned record.

The organization route hydrates these records through typed feature hooks and keeps native persistence out of presentational panels. When the native bridge is unavailable, the route remains renderable with empty state rather than failing application startup.

Organization actions are intentionally split at the hook boundary: creating a collection or tag and assigning a bookmark call validated native commands in desktop mode, while browser mode keeps an in-memory fallback. Bookmark cards expose assignment controls without nesting interactive elements, and native bookmark IDs remain separate from display-stable frontend IDs.

Recovery UI uses structured action objects rather than inspecting human-readable error strings. Inline errors can render only the actions supplied by the owning feature, keeping retry and destructive operations explicit.

The shell notification panel consumes task snapshots as a compact activity summary. Active tasks show an indeterminate loader and expose cancel/retry actions through the same task-feed callbacks; detailed diagnostics remain owned by the task panel.

Settings are persisted as allowlisted JSON keys in the durable user database. The native command boundary rejects unknown keys, control characters, and oversized string values before storage.

The settings screen hydrates once from that command boundary and persists small patches after each user change. Native failures do not discard the in-memory choice; the screen reports the degraded persistence state instead.

Reader session state is stored as a bounded JSON value in the durable user database. The reader validates restored tab shapes before applying them and persists tab order, tab history, pin state, and the active tab through native commands.

## Storage separation

Durable user data includes source metadata, settings, bookmarks, collections, tags, reading state, session state, and task history. Search records and other derived index data are disposable and rebuildable without changing user data.

Managed remote repositories use stable `library/vendor/package/` paths. Referenced local folders are never owned or deleted by Xenics.

Library relocation is an explicit move followed by destination verification. Full reset is preview-based: Xenics presents the exact disposable and managed paths, requires a confirmation token tied to that preview, clears both durable records and derived search data, and excludes referenced external folders from deletion.

## Trust boundaries

Repositories are untrusted input. Git arguments are passed without shell interpolation. Documentation rendering uses a safe Markdown/MDX subset with no arbitrary JavaScript or MDX execution. Tauri capabilities and filesystem scopes remain least-privilege.

All Git operations go through the Rust-owned system-Git boundary. It preserves the host credential helpers and SSH configuration, classifies authentication failures as actionable, sanitizes diagnostics, and validates refs before invoking Git.

## Long-running work

Downloads, updates, indexing, and reconciliation run as isolated tasks with ordered events, visible progress, cancellation, retry classification, and recovery states. A task is not considered canceled until its worker and any child process have actually stopped.

The task manager keeps operation identity, phase, attempt count, state, and structured failure data together. Automatic retry is limited to transient remote availability failures; authentication and other actionable failures remain manual.

Each task also emits ordered `TaskEvent` values on `task://<task-id>`. Sequence
numbers are assigned by the task manager, and the Tauri adapter forwards the
events without allowing the frontend to infer completion from dispatch alone.
The React task feed hydrates from native snapshots, subscribes to active tasks,
cleans up listeners on unmount, and rejects stale or terminal-reopening events.

Task records are upserted in the durable user database so an interrupted operation can be identified and reconciled after restart. Git subprocess cancellation kills and waits for the child before reporting the task as canceled.

Scheduled availability checks run only while the app is open. The update-check service injects a clock for deterministic cadence tests, deduplicates overlapping checks per source, performs one overdue interval check after restart, and leaves availability unknown when a check fails while retaining the last successful timestamp.

Task recovery is surface-specific: active and recent operations are shown in the task panel, retry/cancel actions remain available according to task state, inline errors handle local field/component failures, and offline placeholders preserve access to already-downloaded documentation. Diagnostics redact credentials, authorization headers, and document content before they can be copied or displayed.

Xenics deep links preserve source, branch/tag ref, document path, and optional anchor. They are parsed and traversal-checked at the Rust command boundary before a reader target is opened.

Native notifications are policy-gated: Xenics only requests completion/failure notifications when the app is unfocused and the user has enabled them. Progress remains in-app, and denied notification permission is not converted into a task failure. The current release verifier checks bundle configuration and the built `.app`; installer, signing, notarization, and clean-profile OS registration remain platform acceptance checks.

## Evolution rule

Update this overview when a task introduces a new service boundary, persistence rule, platform adapter, task state, or security constraint. The product specifications remain authoritative for user-visible behavior.
### Source lifecycle ownership

Source updates operate on the installed Git working copy, then rebuild its
derived search records. Removing a source always removes the catalog record
and derived search data together. Files are deleted only when the caller
explicitly requests it and the canonical path is inside Xenics' library root;
external or local-folder sources are detached without deleting user-owned
files.

Custom local sources are canonicalized once at registration and retain their
path as user-owned data. If the folder is a Git working copy, its configured
remote is recorded for optional update workflows; a non-Git folder remains
downloadable/openable but is not treated as a managed remote.

External links and unsupported-source folders use dedicated native opener
commands. URL scheme and folder existence checks run before delegation to the
Tauri opener plugin; no shell command is constructed from user input.
