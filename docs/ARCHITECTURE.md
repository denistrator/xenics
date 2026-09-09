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
  └── desktop integrations
```

## Storage separation

Durable user data includes source metadata, settings, bookmarks, collections, tags, reading state, session state, and task history. Search records and other derived index data are disposable and rebuildable without changing user data.

Managed remote repositories use stable `library/vendor/package/` paths. Referenced local folders are never owned or deleted by Xenics.

Library relocation is an explicit move followed by destination verification. Full reset is preview-based: Xenics presents the exact disposable and managed paths, requires a confirmation token tied to that preview, and excludes referenced external folders from deletion.

## Trust boundaries

Repositories are untrusted input. Git arguments are passed without shell interpolation. Documentation rendering uses a safe Markdown/MDX subset with no arbitrary JavaScript or MDX execution. Tauri capabilities and filesystem scopes remain least-privilege.

All Git operations go through the Rust-owned system-Git boundary. It preserves the host credential helpers and SSH configuration, classifies authentication failures as actionable, sanitizes diagnostics, and validates refs before invoking Git.

## Long-running work

Downloads, updates, indexing, and reconciliation run as isolated tasks with ordered events, visible progress, cancellation, retry classification, and recovery states. A task is not considered canceled until its worker and any child process have actually stopped.

The task manager keeps operation identity, phase, attempt count, state, and structured failure data together. Automatic retry is limited to transient remote availability failures; authentication and other actionable failures remain manual.

Task records are upserted in the durable user database so an interrupted operation can be identified and reconciled after restart. Git subprocess cancellation kills and waits for the child before reporting the task as canceled.

Scheduled availability checks run only while the app is open. The update-check service injects a clock for deterministic cadence tests, deduplicates overlapping checks per source, performs one overdue interval check after restart, and leaves availability unknown when a check fails while retaining the last successful timestamp.

## Evolution rule

Update this overview when a task introduces a new service boundary, persistence rule, platform adapter, task state, or security constraint. The product specifications remain authoritative for user-visible behavior.
