# Xenics Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build Xenics, a cross-platform local-first developer documentation library that manages Git sources, safely renders supported Markdown/MDX, progressively indexes documentation, and provides a resilient tabbed reader and search workspace.

**Architecture:** Tauri 2 hosts a React/TypeScript/Vite frontend and a Rust application core. Rust owns system Git, filesystem access, task orchestration, document parsing/indexing, SQLite persistence, and native integration; React communicates through typed commands and ordered task events. Durable user data and disposable search data use separate SQLite databases, while managed repositories live under a configurable user library.

**Tech Stack:** Tauri 2, React, TypeScript, Vite, Tailwind CSS, shadcn/ui-style primitives, Rust, Tokio, system Git, `rusqlite`, SQLite FTS5, `notify`, `markdown-rs` evaluation prototype, React Testing Library, Vitest, WebdriverIO with `@wdio/tauri-service`, and Rust tests.

**Requirements:** The [product spec](../specs/2026-09-09-xenics-design.md) and [error-handling strategy](../specs/2026-09-09-xenics-error-handling-strategy.md) are adopted requirements. The user approved all seven plan-review corrections and adoption of the recovery strategy.

## Global Constraints

- Support macOS, Windows, and Linux.
- Desktop shell: Tauri 2.
- Frontend: React, TypeScript, Vite.
- Native application core: Rust.
- System Git must be installed and configured; do not add an embedded Git implementation or a Xenics credential store.
- Keep bookmarks, collections, settings, source metadata, session state, and task records in a durable user-data database.
- Keep FTS5 and derived search records in a separate disposable database that can be rebuilt without modifying user data.
- Use `rusqlite` through Rust-owned database access.
- Never execute repository JavaScript or arbitrary MDX.
- Treat every repository as untrusted input.
- Support exact terms and token prefixes; fuzzy matching, semantic search, and AI search are out of scope for v1.
- Support one installed branch/tag per source; simultaneous versions and commit-level browsing are out of scope.
- Managed remote paths use stable `library/vendor/package/` namespacing.
- Duplicate vendor/package paths across different Git hosts are rejected before writing.
- Referenced local folders are never deleted by Xenics reset.
- Full reset deletes Xenics-managed repositories, including those in a user-selected custom library location, after explicit confirmation.
- Long-running operations must remain cancellable, isolated, and observable through structured task events.
- Browser-only tests do not establish desktop compatibility; use WebdriverIO with `@wdio/tauri-service` for actual Tauri E2E.
- Do not claim task success from dispatch acceptance, absent processes, or partial progress.

---

## File and module map

The implementation should be organized around these boundaries:

```text
src/
  app/                 React application shell and route-level views
  components/          reusable UI components
  features/            catalog, reader, search, organization, tasks
  lib/                 typed Tauri command/event client
  styles/              design tokens and global styles
  test/                frontend test setup and fixtures

src-tauri/src/
  commands/            Tauri command adapters only
  core/                domain models and use cases
  git/                 system Git service and classifiers
  documents/           source discovery, parsing, safe rendering, indexing
  persistence/         user/search SQLite databases and migrations
  tasks/               task manager, cancellation, retries, recovery
  filesystem/          managed paths, watchers, reconciliation
  desktop/             editor, browser, terminal, explorer, notifications
  diagnostics/         structured errors and sanitized diagnostics
  lib.rs               Tauri bootstrap and command/event registration

tests/
  fixtures/             representative Markdown/MDX/repository fixtures
  e2e/                  WebdriverIO desktop scenarios

docs/superpowers/
  specs/                approved product and recovery requirements
  plans/                this implementation plan
```

Execute Task 1, then the mandatory Task 1A validation gate, then Tasks 2–16, including Task 6A after Task 6. Task numbers are retained for traceability. Later UI and integration work depends on its Rust contracts. Each feature task must extend and run the actual desktop smoke suite for its completed flow; Task 16 completes platform/release coverage rather than discovering initial cross-layer wiring.

## Task 1: Scaffold the Tauri workspace and verification harness

**Files:**
- Create: `package.json`, `vite.config.ts`, `tsconfig.json`, `index.html`
- Create: `src/main.tsx`, `src/app/App.tsx`, `src/styles/index.css`
- Create: `src-tauri/Cargo.toml`, `src-tauri/tauri.conf.json`, `src-tauri/src/lib.rs`
- Create: `vitest.config.ts`, `src/test/setup.ts`, `src/app/App.test.tsx`
- Create: `.github/workflows/ci.yml`

**Interfaces:**
- Produces a runnable Tauri application with `npm run dev`, `npm run test`, and Rust `cargo test` entry points.
- Produces `src/lib/tauri.ts` in the next task as the only frontend boundary to native commands.

- [ ] **Step 1: Scaffold and initialize the verification harness.**

Scaffold in a temporary directory using `npm create tauri-app@latest`, then copy the generated application files into this repository without overwriting existing docs or Git metadata. Install dependencies and configure Vitest, DOM matchers, and the test environment before running tests.

Configure scripts in `package.json`:

```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "test": "vitest",
    "test:ui": "vitest --ui",
    "tauri": "tauri"
  }
}
```

Add Tailwind CSS, testing libraries, and the selected shadcn/ui-style primitives without adding a second application runtime. Keep the generated Tauri command surface empty until the typed contract exists.

- [ ] **Step 2: Write the failing smoke test.**

```tsx
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { App } from './App'

describe('App', () => {
  it('renders the Xenics shell', () => {
    render(<App />)
    expect(screen.getByRole('application', { name: 'Xenics' })).toBeInTheDocument()
  })
})
```

- [ ] **Step 3: Verify a meaningful failing assertion.**

Run: `npm test -- --run src/app/App.test.tsx`

Expected: the test runner loads the generated App successfully, but the Xenics shell assertion fails. Missing packages, scripts, or configuration are harness defects to fix first.

- [ ] **Step 4: Implement the minimal shell.**

```tsx
export function App() {
  return <main role="application" aria-label="Xenics">Xenics</main>
}
```

- [ ] **Step 5: Run verification.**

Run: `npm test -- --run src/app/App.test.tsx && npm run build && cargo test --manifest-path src-tauri/Cargo.toml`

Expected: the smoke test passes, the frontend builds, and Rust has zero tests failing.

- [ ] **Step 5a: Establish actual desktop smoke coverage.**

Create `tests/e2e/wdio.conf.ts`, `tests/e2e/fixtures.ts`, and `tests/e2e/smoke.e2e.ts`. Configure `test:e2e` to build/launch a test-instrumented Tauri binary through `@wdio/tauri-service`, using an isolated user scope. Assert that the real window launches and displays Xenics. Add macOS, Windows, and Linux CI smoke jobs. Test-driver plugins must be gated by a test-only Cargo feature and absent from normal release builds.

Run: `npm run test:e2e`

Expected: the actual desktop shell launches and passes. Extend this suite with real command/reader/native wiring as each feature becomes available.

- [ ] **Step 6: Commit.**

```bash
git add package.json vite.config.ts tsconfig.json index.html src src-tauri vitest.config.ts tests/e2e .github/workflows/ci.yml
git commit -m "build: scaffold Xenics Tauri workspace"
```

## Task 1A: Validate the risky stack choices before production modules

**Files:** Create `prototypes/stack-validation/`, `tests/fixtures/acceptance/manifest.json`, and `docs/superpowers/reports/stack-validation.md`.

This gate runs before production database schemas, Git lifecycle/reset services, or parser/indexer implementation. Use throwaway adapters and temporary databases; do not depend on Tasks 3–8.

- [ ] **Step 1: Declare the acceptance corpus and environment.** Record fixture provenance/revision, page counts, indexed byte sizes, OS/runtime, CPU/RAM, and representative supported-source samples. Include Markdown, MDX, prose, code-heavy pages, links/assets, and API references. Define expected top results for at least 30 queries covering identifiers, phrases, short prefixes, and filters before measuring. Use a representative library-scale corpus rather than only tiny unit fixtures.
- [ ] **Step 2: Prototype parsing and display.** Evaluate `markdown-rs` using a minimal safe model and real Tauri reader view. Verify headings, links/assets, readable component fallbacks, malformed content, and agreement between visible text and indexed locations. Record preserved/omitted constructs and a parser go/no-go decision; a failure requires a documented alternative evaluation before Task 7.
- [ ] **Step 3: Prototype FTS5 search.** Use a temporary SQLite index and minimal normalization/ranking. All declared exact-identifier expectations must pass; at least 90% of the curated relevance queries must include an expected page in the top three. Measure at least 200 requests after warm-up: warm query-to-results p95, including snippets and ranking, must be at most 100 ms on the declared representative corpus/machine, both idle and during bounded indexing. Report cold-cache latency, p50/p95, index size, and rebuild time separately. Do not shrink the corpus after a failure. Record FTS5 go/no-go; if tuning fails, evaluate Tantivy before production search schema work.
- [ ] **Step 4: Prototype background cancellation.** In the desktop harness, run real Git activity against disposable local fixtures and bounded parse/index work while reading and navigating. Cancel during active work and verify worker/process completion before Canceled, no subsequent mutation, and a responsive reader. Run on all three supported platforms and record results.
- [ ] **Step 5: Review and record the gate outcome.** Save executable prototype commands and measured evidence in the report. Resolve failed choices before Task 2 onward; do not label unrun checks passed. Tasks 7–8 repeat relevant checks as production regression coverage, not initial selection gates.

Verification rule: each named test filter must execute the intended tests (zero matching tests is not a pass). Verify behavioral side effects rather than self-reported flags: test cancellation against actual process/file activity, unsafe rendering with executable payload fixtures, and save failures against confirmed database state.

## Task 2: Define typed commands, events, domain IDs, and structured errors

**Files:**
- Create: `src/lib/contracts.ts`, `src/lib/tauri.ts`, `src/lib/task-events.ts`
- Create: `src-tauri/src/core/ids.rs`, `src-tauri/src/core/models.rs`
- Create: `src-tauri/src/diagnostics/error.rs`, `src-tauri/src/diagnostics/mod.rs`
- Create: `src-tauri/src/commands/mod.rs`
- Test: `src/lib/contracts.test.ts`, `src-tauri/src/core/models.rs`, `src-tauri/src/diagnostics/error.rs`

**Interfaces:**
- `SourceId`, `TechnologyId`, `TaskId`, and `DocumentId` are opaque serialized identifiers.
- `RepositoryCapability = Readable | PartiallyReadable | FilesOnly | WebsiteOnly`.
- `TaskState = Queued | Running | WaitingToRetry | NeedsAction | Canceling | Canceled | Succeeded | SucceededWithWarnings | Failed | Interrupted`.
- `XenicsError` contains `code`, `sourceId`, `documentId`, `taskId`, `phase`, `retryClass`, `message`, `actions`, and `diagnosticId`.
- `TaskEvent` contains `taskId`, monotonic `sequence`, phase, progress, state, and an optional sanitized error.

- [ ] **Step 1: Write failing contract tests.**

```ts
import { describe, expect, it } from 'vitest'
import { parseTaskEvent } from './contracts'

describe('task contracts', () => {
  it('rejects an event that moves a terminal task back to running', () => {
    expect(() => parseTaskEvent({ taskId: 'task-1', sequence: 2, state: 'Running' }, 'Succeeded')).toThrow()
  })
})
```

```rust
#[test]
fn retry_class_is_not_inferred_from_display_text() {
    let error = XenicsError::new(ErrorCode::GitAuthentication, RetryClass::NeedsAction);
    assert_eq!(error.retry_class, RetryClass::NeedsAction);
}
```

- [ ] **Step 2: Run tests to verify they fail.**

Run: `npm test -- --run src/lib/contracts.test.ts && cargo test --manifest-path src-tauri/Cargo.toml diagnostics`

Expected: FAIL because the schemas and error types are not implemented.

- [ ] **Step 3: Implement the shared contracts.**

Use discriminated unions in TypeScript and `serde` enums in Rust. Keep command adapters dependent on these types, not on frontend display strings or raw subprocess output.

- [ ] **Step 4: Add ordered event validation.**

Accept events only when their sequence is newer than the last accepted event and reject non-terminal transitions after `Succeeded`, `SucceededWithWarnings`, `Failed`, `Canceled`, or `Interrupted`.

- [ ] **Step 5: Run tests and type-check.**

Run: `npm test -- --run src/lib/contracts.test.ts && npm run build && cargo test --manifest-path src-tauri/Cargo.toml`

Expected: PASS with zero type errors and zero Rust test failures.

- [ ] **Step 6: Commit.**

```bash
git add src/lib src-tauri/src/core src-tauri/src/diagnostics src-tauri/src/commands
git commit -m "feat: define Xenics domain and task contracts"
```

## Task 3: Build durable user-data and disposable search databases

**Files:**
- Create: `src-tauri/src/persistence/user_db.rs`, `src-tauri/src/persistence/search_db.rs`
- Create: `src-tauri/src/persistence/migrations.rs`, `src-tauri/src/persistence/mod.rs`
- Create: `src-tauri/migrations/user/0001_initial.sql`, `src-tauri/migrations/search/0001_fts.sql`
- Create: `src-tauri/src/persistence/repository.rs`
- Test: `src-tauri/src/persistence/tests.rs`

**Interfaces:**
- `UserDb::open(path) -> Result<UserDb, XenicsError>`
- `SearchDb::open(path) -> Result<SearchDb, XenicsError>`
- `SearchDb::rebuild(source_id) -> Result<RebuildReport, XenicsError>`
- User DB stores sources, technologies, metadata overrides, bookmarks, collections, tags, tabs, reading positions, settings, and task records.
- Search DB stores derived documents, headings, tokens, snippets, and FTS5 records only.

- [ ] **Step 1: Write failing persistence tests.**

```rust
#[test]
fn rebuilding_search_does_not_delete_user_bookmarks() {
    let fixture = TestDatabases::new();
    fixture.user.insert_bookmark("source-1", "main", "docs/start.md").unwrap();
    fixture.search.rebuild("source-1").unwrap();
    assert_eq!(fixture.user.bookmark_count(), 1);
}
```

```rust
#[test]
fn fts5_is_available_in_the_packaged_sqlite_build() {
    let db = SearchDb::open_in_memory().unwrap();
    assert!(db.fts5_available());
}
```

- [ ] **Step 2: Run tests to verify they fail.**

Run: `cargo test --manifest-path src-tauri/Cargo.toml persistence`

Expected: FAIL because database wrappers and migrations do not exist.

- [ ] **Step 3: Implement separate database initialization.**

Use a bundled SQLite build with FTS5 enabled. Enable WAL mode for both databases, serialize writes per database, keep transactions short, and reject configured database paths on network filesystems. Do not place search-derived rows in the durable user database.

- [ ] **Step 4: Add migrations and repositories.**

Create tables for source metadata, capability, selected ref, clone mode, local path, task state, and user organization. Create FTS5 tables with explicit tokenization and indexed columns for title, headings, prose, code, metadata, and API names.

- [ ] **Step 5: Verify isolation and migration behavior.**

Run: `cargo test --manifest-path src-tauri/Cargo.toml persistence`

Expected: PASS, including migration reruns, FTS5 availability, WAL configuration, search rebuild isolation, and failed-open recovery without replacing user data.

- [ ] **Step 6: Commit.**

```bash
git add src-tauri/src/persistence src-tauri/migrations
git commit -m "feat: add isolated Xenics SQLite stores"
```

## Task 4: Implement managed paths, storage settings, and reset safety

**Files:**
- Create: `src-tauri/src/filesystem/paths.rs`, `src-tauri/src/filesystem/reset.rs`, `src-tauri/src/filesystem/mod.rs`
- Create: `src-tauri/src/core/storage.rs`
- Test: `src-tauri/src/filesystem/tests.rs`

**Interfaces:**
- `ManagedPath::for_remote(library_root, vendor, package) -> Result<PathBuf, XenicsError>`
- `validate_managed_path(path) -> Result<(), XenicsError>`
- `StorageService::move_library(source, destination) -> Result<MoveReport, XenicsError>`
- `ResetService::preview() -> ResetPreview`
- `ResetService::execute(confirmation_token) -> Result<ResetReport, XenicsError>`

- [ ] **Step 1: Write failing path and reset tests.**

```rust
#[test]
fn duplicate_vendor_package_path_is_rejected_before_writing() {
    let root = tempdir().unwrap();
    let existing = root.path().join("library/acme/docs");
    fs::create_dir_all(&existing).unwrap();
    let error = ManagedPath::for_remote(root.path(), "acme", "docs").unwrap_err();
    assert_eq!(error.code, ErrorCode::ManagedPathCollision);
}
```

```rust
#[test]
fn reset_never_deletes_referenced_external_folder() {
    let external = tempdir().unwrap();
    let report = ResetService::for_test(external.path()).execute(test_confirmation()).unwrap();
    assert!(external.path().exists());
    assert!(!report.deleted_paths.iter().any(|p| p == external.path()));
}
```

- [ ] **Step 2: Run tests to verify they fail.**

Run: `cargo test --manifest-path src-tauri/Cargo.toml filesystem`

Expected: FAIL because managed path and reset services do not exist.

- [ ] **Step 3: Implement stable managed paths.**

Use `library/vendor/package/` for managed remotes. Sanitize path components, reject traversal, reject duplicate paths across hosts, and never derive physical paths from editable display metadata. Keep referenced local folders outside managed deletion scope.

- [ ] **Step 4: Implement library moves and reset preview/execution.**

Validate destination, prevent overwriting unrelated files, transfer and verify before switching configuration, report partial failures, and require a confirmation token generated from the exact preview. Reset deletes durable user data, disposable caches, managed repositories, and custom managed-library contents, but not the installed application or external folders.

- [ ] **Step 5: Run tests.**

Run: `cargo test --manifest-path src-tauri/Cargo.toml filesystem`

Expected: PASS with coverage for collision, traversal, missing library, partial move, partial reset, custom library deletion, and external-folder protection.

- [ ] **Step 6: Commit.**

```bash
git add src-tauri/src/filesystem src-tauri/src/core/storage.rs
git commit -m "feat: add safe managed storage and reset"
```

## Task 5: Create the controlled system Git service

**Files:**
- Create: `src-tauri/src/git/service.rs`, `src-tauri/src/git/classifier.rs`, `src-tauri/src/git/progress.rs`, `src-tauri/src/git/mod.rs`
- Create: `src-tauri/src/core/source_use_cases.rs`
- Test: `src-tauri/src/git/tests.rs`

**Interfaces:**
- `GitService::check_prerequisites(source) -> Result<GitPrerequisites, XenicsError>`
- `GitService::clone(request, cancellation) -> Result<GitResult, XenicsError>`
- `GitService::fetch(request, cancellation) -> Result<GitResult, XenicsError>`
- `GitService::fast_forward(request, cancellation) -> Result<GitResult, XenicsError>`
- `GitService::checkout_ref(request, cancellation) -> Result<GitResult, XenicsError>`
- `GitService::status(request) -> Result<WorkingTreeStatus, XenicsError>`
- `GitService::open_remote(source) -> Result<RemoteIdentity, XenicsError>`

- [ ] **Step 1: Write failing command-construction and classification tests.**

```rust
#[test]
fn git_arguments_do_not_use_shell_interpolation() {
    let command = GitCommand::clone("https://example.test/docs", "/tmp/xenics/docs");
    assert_eq!(command.program, "git");
    assert_eq!(command.args, vec!["clone", "https://example.test/docs", "/tmp/xenics/docs"]);
    assert!(!command.shell_string().contains("&&"));
}
```

```rust
#[test]
fn authentication_output_is_sanitized_and_requires_action() {
    let error = classify_git_failure(128, "fatal: Authentication failed for 'https://token@example.test/docs'");
    assert_eq!(error.code, ErrorCode::GitAuthentication);
    assert_eq!(error.retry_class, RetryClass::NeedsAction);
    assert!(!error.message.contains("token@"));
}
```

- [ ] **Step 2: Run tests to verify they fail.**

Run: `cargo test --manifest-path src-tauri/Cargo.toml git`

Expected: FAIL because the controlled Git service and classifier do not exist.

- [ ] **Step 3: Implement the service.**

Spawn `git` with explicit argument vectors and a controlled environment. Inherit configured system credential helpers and SSH configuration without storing credentials. Capture stdout/stderr only through a sanitizer, classify exit outcomes, support phase-aware timeouts, emit progress, and keep the subprocess handle for cancellation.

- [ ] **Step 4: Add repository policies.**

Block updates for dirty or diverged trees, pinned tags, invalid refs, missing Git, missing paths, and path collisions. Do not stash, reset, merge, or bypass host verification. Allow fast-forward updates only for opted-in referenced local Git folders.

- [ ] **Step 5: Run tests with fixture Git repositories.**

Run: `cargo test --manifest-path src-tauri/Cargo.toml git`

Expected: PASS for HTTPS/SSH/local-source validation, missing Git, auth classification, dirty/diverged state, pinned tags, cancellation, timeouts, path safety, and sanitized diagnostics.

- [ ] **Step 6: Commit.**

```bash
git add src-tauri/src/git src-tauri/src/core/source_use_cases.rs
git commit -m "feat: add controlled system Git service"
```

## Task 6: Build the task manager, retries, cancellation, and recovery records

**Files:**
- Create: `src-tauri/src/tasks/manager.rs`, `src-tauri/src/tasks/retry.rs`, `src-tauri/src/tasks/recovery.rs`, `src-tauri/src/tasks/mod.rs`
- Modify: `src-tauri/src/persistence/repository.rs`
- Test: `src-tauri/src/tasks/tests.rs`

**Interfaces:**
- `TaskManager::submit(operation) -> TaskId`
- `TaskManager::cancel(task_id) -> Result<(), XenicsError>`
- `TaskManager::retry(task_id) -> Result<TaskId, XenicsError>`
- `TaskManager::snapshot() -> Vec<TaskSnapshot>`
- `TaskManager::reconcile_after_restart() -> Vec<TaskSnapshot>`

- [ ] **Step 1: Write failing state-machine tests.**

```rust
#[test]
fn cancellation_waits_for_git_process_exit_before_becoming_canceled() {
    let harness = TaskHarness::with_blocked_git();
    let task = harness.submit_clone();
    harness.cancel(task).unwrap();
    assert_eq!(harness.state(task), TaskState::Canceling);
    harness.release_git();
    assert_eq!(harness.wait(task), TaskState::Canceled);
}
```

```rust
#[test]
fn only_transient_network_failures_receive_two_automatic_retries() {
    let plan = RetryPlan::for_error(ErrorCode::RemoteUnavailable);
    assert_eq!(plan.delays_seconds(), vec![2, 10]);
    assert!(RetryPlan::for_error(ErrorCode::GitAuthentication).is_manual_only());
}
```

- [ ] **Step 2: Run tests to verify they fail.**

Run: `cargo test --manifest-path src-tauri/Cargo.toml tasks`

Expected: FAIL because the task state machine and retry policy do not exist.

- [ ] **Step 3: Implement bounded task execution.**

Use Tokio for async subprocess I/O, bounded workers for hashing/parsing/blocking database calls, per-source mutation locks, fixed safe concurrency, cooperative cancellation checks, and a task-owned temporary clone destination. Persist operation identity, phase, attempts, state, and outcome.

- [ ] **Step 4: Implement recovery.**

After restart, mark unfinished operations Interrupted and reconcile actual Git/filesystem state. Cache indexing may restart automatically; repository mutations and destructive operations require explicit retry after inspection. A retry rechecks actual state and repeats only the failed phase.

- [ ] **Step 5: Run tests.**

Run: `cargo test --manifest-path src-tauri/Cargo.toml tasks`

Expected: PASS for state transitions, retry eligibility, cancellation, per-source serialization, task isolation, restart reconciliation, partial cleanup, and late-event rejection.

- [ ] **Step 6: Commit.**

```bash
git add src-tauri/src/tasks src-tauri/src/persistence/repository.rs
git commit -m "feat: add resilient task orchestration"
```

## Task 6A: Implement scheduled update checks

**Files:** Create `src-tauri/src/core/update_checks.rs` and its tests; modify persistence, task orchestration, and application bootstrap. Connect the settings UI in Task 15.

**Interfaces:** `UpdateCheckService::on_startup()`, `apply_schedule(schedule)`, `check_due(now)`, and per-source availability/last-successful-check snapshots. Inject a clock for deterministic tests.

- [ ] **Step 1: Add failing tests** for on-launch, daily, weekly, disabled, restart/due-time persistence, changing settings, and overlapping manual/scheduled checks.
- [ ] **Step 2: Implement scheduling** only while Xenics is open. Persist last attempt, last successful check, and next due time. Perform one overdue check on launch for interval schedules; do not replay every missed interval. Deduplicate concurrent checks per source and use the bounded task queue.
- [ ] **Step 3: Implement availability refresh** through the controlled Git service without changing checked-out content. Respect source/ref eligibility and local-folder policy. Failures show unknown availability with last successful check retained; checks do not automatically apply updates.
- [ ] **Step 4: Verify** with `cargo test --manifest-path src-tauri/Cargo.toml update_checks`, plus a desktop scenario proving a due check updates the card and disabled scheduling produces no automatic check. Cover offline failures and repeated-error deduplication.
- [ ] **Step 5: Commit** the completed scheduling service and coverage.

## Task 7: Implement document discovery, safe Markdown/MDX parsing, and capability profiles

**Files:**
- Create: `src-tauri/src/documents/discovery.rs`, `src-tauri/src/documents/model.rs`, `src-tauri/src/documents/parser.rs`, `src-tauri/src/documents/capabilities.rs`, `src-tauri/src/documents/mod.rs`
- Create: `tests/fixtures/docs/`, `tests/fixtures/mdx/`, `tests/fixtures/assets/`
- Test: `src-tauri/src/documents/tests.rs`

**Interfaces:**
- `DocumentDiscovery::preview(source_path) -> DiscoveryPreview`
- `DocumentParser::parse(path, bytes) -> Result<ParsedDocument, DocumentError>`
- `CapabilityProfile::validate(profile, fixture) -> CapabilityReport`
- `ParsedDocument` produces safe reader blocks, headings, internal/external links, assets, source locations, and search records from one model.

- [ ] **Step 1: Add the acceptance fixtures and failing parser tests.**

```rust
#[test]
fn unsupported_mdx_component_retains_readable_text_without_executing_code() {
    let document = parse_fixture("mdx/unsupported-component.mdx").unwrap();
    assert!(document.reader_text().contains("Installation steps"));
    assert!(document.warnings.iter().any(|w| w.code == WarningCode::UnsupportedComponent));
    assert!(!document.executed_javascript);
}
```

```rust
#[test]
fn rendered_links_and_search_records_share_source_locations() {
    let document = parse_fixture("docs/links.md").unwrap();
    assert_eq!(document.reader_link("use-state"), document.search_heading("useState").source_location);
}
```

- [ ] **Step 2: Run tests to verify they fail.**

Run: `cargo test --manifest-path src-tauri/Cargo.toml documents`

Expected: FAIL because the parser, document model, and capability profile do not exist.

- [ ] **Step 3: Run the parser compatibility prototype.**

Implement the smallest parser adapter around `markdown-rs`, then run it against representative Markdown/MDX pages containing headings, links, local assets, code blocks, tables, common JSX components, malformed syntax, and unsafe HTML. Record which constructs are preserved, omitted, or warned.

- [ ] **Step 4: Implement safe parsing and generic discovery.**

Parse syntax trees; apply Xenics-owned allowed-element rules and curated component mappings; never evaluate repository MDX. Detect documentation roots and start pages for custom sources. Preserve safe readable content for unsupported constructs and report omissions. Keep arbitrary HTML/scripts/embeds non-executable.

- [ ] **Step 5: Implement curated and generic capabilities.**

Curated profiles define content roots, start page, navigation, published-URL-to-local mapping, required assets, and rendering rules. Generic sources use a folder tree and detected Markdown/MDX content. Mark sources Readable, Partially readable, Files only, or Website only based on validated capability rather than clone success alone.

- [ ] **Step 6: Run tests and inspect fixture output.**

Run: `cargo test --manifest-path src-tauri/Cargo.toml documents`

Expected: PASS for headings, links, assets, safe MDX fallback, malformed documents, capability validation, and reader/search source-location agreement.

- [ ] **Step 7: Commit.**

```bash
git add src-tauri/src/documents tests/fixtures
git commit -m "feat: add safe document discovery and parsing"
```

## Task 8: Implement indexing, FTS5 search, file watching, and reconciliation

**Files:**
- Create: `src-tauri/src/documents/indexer.rs`, `src-tauri/src/documents/search.rs`
- Create: `src-tauri/src/filesystem/watcher.rs`, `src-tauri/src/filesystem/reconcile.rs`
- Modify: `src-tauri/src/persistence/search_db.rs`, `src-tauri/src/tasks/manager.rs`
- Test: `src-tauri/src/documents/search_tests.rs`, `src-tauri/src/filesystem/watcher_tests.rs`

**Interfaces:**
- `Indexer::index_source(source_id, cancellation) -> Result<IndexReport, XenicsError>`
- `Indexer::retry_failed_documents(source_id, cancellation) -> Result<IndexReport, XenicsError>`
- `SearchService::query(request) -> Result<SearchResponse, XenicsError>`
- `Reconciler::scan_source(source_id) -> Result<ReconcileReport, XenicsError>`
- `Watcher::start(source_id) -> Result<WatcherHandle, XenicsError>`

- [ ] **Step 1: Write failing search and reconciliation tests.**

```rust
#[test]
fn identifier_queries_preserve_punctuation_and_rank_exact_titles_first() {
    let db = SearchFixture::new();
    db.insert("API", "std::vector", "Use std::vector here", "cpp");
    db.insert("Guide", "Vectors", "The body mentions std::vector", "cpp");
    let results = db.query("std::vector").unwrap();
    assert_eq!(results[0].title, "API");
}
```

```rust
#[test]
fn missed_watcher_events_are_recovered_by_reconciliation() {
    let fixture = WatcherFixture::with_file("docs/start.md", "old");
    fixture.change_without_event("docs/start.md", "new");
    let report = fixture.reconcile().unwrap();
    assert_eq!(report.changed_files, vec!["docs/start.md"]);
}
```

- [ ] **Step 2: Run tests to verify they fail.**

Run: `cargo test --manifest-path src-tauri/Cargo.toml documents::search && cargo test --manifest-path src-tauri/Cargo.toml filesystem::watcher`

Expected: FAIL because indexing, FTS5 ranking, and watcher reconciliation do not exist.

- [ ] **Step 3: Implement progressive indexing.**

Index one file or bounded batch at a time, emit coverage progress, keep failed files isolated, invalidate old source records before current records are exposed, and never hold the user-data write lock during indexing. Store document source locations so result navigation and highlighting derive from the same parsed model.

- [ ] **Step 4: Implement search semantics.**

Use explicit identifier-aware normalization, exact-token and token-prefix matching, quoted contiguous phrases, title/API-name ranking above heading, body, and code matches, page-level grouping, snippets, match counts, repository/category/document-type filters, and incomplete-coverage state. Do not return “No results” when the request failed or relevant sources are still indexing.

- [ ] **Step 5: Implement watcher and polling fallback.**

Use `notify` with debounce, ignore Git internals and unrelated build/dependency folders, reconcile after Git operations and restart, and use bounded polling when native watching is unavailable or unreliable.

- [ ] **Step 6: Run acceptance and performance prototypes.**

Run: `cargo test --manifest-path src-tauri/Cargo.toml documents::search && cargo test --manifest-path src-tauri/Cargo.toml filesystem::watcher`

Run the search acceptance fixture over representative prose, long code blocks, and API references. Record corpus size, indexed bytes, hardware, p50/p95 latency, index size, rebuild time, warm/cold cache behavior, and concurrent-indexing behavior. Keep FTS5 only if the declared roughly 100 ms ready-search target and relevance checks pass; otherwise create a separate evidence-based Tantivy evaluation before changing the engine.

- [ ] **Step 7: Commit.**

```bash
git add src-tauri/src/documents src-tauri/src/filesystem src-tauri/src/persistence/search_db.rs src-tauri/src/tasks
git commit -m "feat: add progressive local search and reconciliation"
```

## Task 9: Establish the React design system and application shell

**Files:**
- Create: `src/styles/tokens.css`, `src/styles/theme.css`, `src/components/ui/`, `src/components/layout/AppShell.tsx`
- Create: `src/features/catalog/CatalogPage.tsx`, `src/features/catalog/catalog-model.ts`
- Modify: `src/app/App.tsx`, `src/styles/index.css`
- Test: `src/components/layout/AppShell.test.tsx`, `src/features/catalog/CatalogPage.test.tsx`

**Interfaces:**
- `AppShell` renders navigation, main workspace, notification entry point, theme controls, and keyboard-focus boundaries.
- `CatalogPage` consumes catalog snapshots and task snapshots through typed hooks; it does not invoke Tauri commands directly.
- Design tokens expose light, dark, and system themes and Compact/Comfortable density modes.

- [ ] **Step 1: Write failing shell tests.**

```tsx
it('renders the catalog as the primary workspace and exposes keyboard search', () => {
  render(<AppShell />)
  expect(screen.getByRole('main', { name: 'Repository catalog' })).toBeInTheDocument()
  expect(screen.getByRole('button', { name: /search/i })).toBeInTheDocument()
})
```

- [ ] **Step 2: Run tests to verify they fail.**

Run: `npm test -- --run src/components/layout/AppShell.test.tsx src/features/catalog/CatalogPage.test.tsx`

Expected: FAIL because the application shell and design tokens are not implemented.

- [ ] **Step 3: Implement the shell and tokens.**

Create the rich visual card-grid catalog direction selected during planning, stable focus rings, semantic landmarks, keyboard navigation, system/light/dark themes, Compact/Comfortable density, and a short first-launch welcome modal followed by the catalog.

- [ ] **Step 4: Run frontend verification.**

Run: `npm test -- --run src/components/layout/AppShell.test.tsx src/features/catalog/CatalogPage.test.tsx && npm run build`

Expected: PASS with a production frontend build.

- [ ] **Step 5: Commit.**

```bash
git add src/app src/components src/features/catalog src/styles
git commit -m "feat: add Xenics application shell and design system"
```

## Task 10: Implement source catalog, rich cards, metadata, and bulk workflows

**Files:**
- Create: `src/features/catalog/RepositoryCard.tsx`, `src/features/catalog/TechnologyCard.tsx`, `src/features/catalog/catalog-hooks.ts`
- Create: `src/features/catalog/SourceDetails.tsx`, `src/features/catalog/DownloadReview.tsx`, `src/features/catalog/UpdateReview.tsx`
- Create: `src/features/catalog/catalog-selection.ts`, `src/features/catalog/catalog-actions.ts`
- Modify: `src/lib/tauri.ts`, `src-tauri/src/commands/catalog.rs`, `src-tauri/src/core/source_use_cases.rs`
- Test: `src/features/catalog/*.test.tsx`, `src/features/catalog/catalog-selection.test.ts`

**Interfaces:**
- `listCatalog() -> CatalogSnapshot`
- `addRemoteSource(input) -> SourceId`
- `addLocalFolder(path) -> SourceId`
- `previewSource(sourceId) -> DiscoveryPreview`
- `startDownload(request) -> TaskId`
- `startUpdate(request) -> TaskId`
- `hideSources(sourceIds)`, `removeSources(sourceIds, deleteFiles)`, `updateMetadata(sourceId, patch)`

- [ ] **Step 1: Write failing interaction tests.**

```tsx
it('opens source details from card body but uses checkbox for range selection', async () => {
  render(<RepositoryCard source={reactSource} />)
  await user.click(screen.getByRole('checkbox', { name: /react/i }))
  expect(onSelectionChange).toHaveBeenCalledWith(['react'])
  await user.click(screen.getByRole('button', { name: /react details/i }))
  expect(onOpenDetails).toHaveBeenCalledWith('react')
})
```

```ts
it('selects a Shift range without selecting unavailable website-only entries', () => {
  expect(selectRange(items, 1, 4)).toEqual(['react', 'typescript', 'vue'])
})
```

- [ ] **Step 2: Run tests to verify they fail.**

Run: `npm test -- --run src/features/catalog`

Expected: FAIL because catalog components, selection logic, and commands do not exist.

- [ ] **Step 3: Implement catalog behavior.**

Seed the hardcoded technology catalog, including the historical technology candidates from the design spec. Model curated profiles, custom remote sources, local folders, and website-only entries separately. Use one primary built-in/custom category plus tags, user metadata overrides, reset-to-default, pinned/hidden repositories, rich status metadata, and expandable technology groups.

- [ ] **Step 4: Implement add/download/update review flows.**

Support HTTPS, SSH, local-folder picker, and drag-and-drop. For remotes show ref, clone mode, estimate, capability, and destination. Download selected docs defaults only to selected uninstalled Readable/Partially readable sources. Files only sources require explicit selection and are never automatically preselected; Update all includes installed Git-remotable sources with changes and requires local-folder update opt-in. Bulk review shows skipped website-only entries and exact capabilities.

- [ ] **Step 5: Implement primary card actions.**

Readable/Partially readable cards use Download docs and Read after installation. Files only cards use Download repository and Open folder. Website-only cards use Open website. Card body opens source details; checkbox selection never opens the source.

- [ ] **Step 6: Run tests.**

Run: `npm test -- --run src/features/catalog && npm run build && cargo test --manifest-path src-tauri/Cargo.toml commands::catalog`

Expected: PASS for cards, groups, metadata, Shift selection, capability-specific actions, collision warnings, review lists, bulk actions, and build/type checks. Add an explicit assertion that Files only and website-only sources are not preselected for documentation download.

- [ ] **Step 7: Commit.**

```bash
git add src/features/catalog src/lib/tauri.ts src-tauri/src/commands/catalog.rs src-tauri/src/core/source_use_cases.rs
git commit -m "feat: add repository catalog and bulk workflows"
```

## Task 11: Implement the tabbed documentation reader and safe content presentation

**Files:**
- Create: `src/features/reader/ReaderWorkspace.tsx`, `src/features/reader/DocumentTab.tsx`, `src/features/reader/ReaderSidebar.tsx`
- Create: `src/features/reader/DocumentView.tsx`, `src/features/reader/CodeBlock.tsx`, `src/features/reader/ReaderErrors.tsx`
- Create: `src/features/reader/tab-state.ts`, `src/features/reader/reader-hooks.ts`
- Modify: `src/lib/tauri.ts`, `src-tauri/src/commands/reader.rs`, `src-tauri/src/documents/model.rs`
- Test: `src/features/reader/*.test.tsx`

**Interfaces:**
- `openDocument(sourceId, refName, path) -> DocumentViewModel`
- `openTab(target)`, `closeTab(tabId)`, `reopenClosedTab()`, `duplicateTab(tabId)`, `pinTab(tabId)`, `reorderTabs(order)`
- `getSourceNavigation(sourceId) -> NavigationItem[]` returns cross-document curated navigation or a generic folder tree. No heading-outline panel is introduced.
- `openSource(sourceId)` opens the configured start page on first use and the last-read page on subsequent visits; missing restored pages show search/source-home recovery.

- [ ] **Step 1: Write failing reader tests.**

```tsx
it('opens an internal link in the current tab without creating another tab', async () => {
  render(<ReaderWorkspace initialTabs={[reactTab]} />)
  await user.click(screen.getByRole('link', { name: 'useEffect' }))
  expect(screen.getAllByRole('tab')).toHaveLength(1)
  expect(screen.getByRole('tab', { name: /useEffect/i })).toHaveAttribute('aria-selected', 'true')
})
```

```tsx
it('renders unsupported MDX as a safe warning block', () => {
  render(<DocumentView document={documentWithUnsupportedComponent} />)
  expect(screen.getByText(/unsupported component/i)).toBeInTheDocument()
  expect(document.querySelector('script')).toBeNull()
})
```

- [ ] **Step 2: Run tests to verify they fail.**

Run: `npm test -- --run src/features/reader`

Expected: FAIL because the reader workspace and safe content components do not exist.

Add separate tests that persist tabs, unmount/restart with the same isolated user database, and verify restored order, active tab, and targets. Test first source opening at its configured start page, subsequent opening at the last-read page, and recovery when that page no longer exists.

- [ ] **Step 3: Implement tabs and navigation.**

Implement persistent reorderable tabs, pin, duplicate, close variants, reopen closed tabs, back/forward per-tab history, automatic session restoration, selected ref display, breadcrumbs, source metadata, and a collapsible left navigation sidebar using curated navigation or generic folder trees.

- [ ] **Step 4: Implement safe document rendering.**

Render only the safe parsed document model. Resolve internal links locally, use modifiers for new-tab opening, route external links to the system browser, show offline placeholders for unsupported embeds, render local assets, and provide source-home/search recovery for missing pages.

- [ ] **Step 5: Implement code controls and page actions.**

Provide syntax highlighting, language label, line numbers, copy, download, wrapping toggle, open-in-editor, copy deep link, open source file/folder, open terminal, and open source URL.

- [ ] **Step 6: Run tests.**

Run: `npm test -- --run src/features/reader && npm run build && cargo test --manifest-path src-tauri/Cargo.toml commands::reader`

Expected: PASS for tabs, links, recovery, unsupported content, code controls, keyboard access, and production build.

- [ ] **Step 7: Commit.**

```bash
git add src/features/reader src/lib/tauri.ts src-tauri/src/commands/reader.rs src-tauri/src/documents/model.rs
git commit -m "feat: add safe tabbed documentation reader"
```

## Task 12: Implement global search UI and exact-match navigation

**Files:**
- Create: `src/features/search/SearchPalette.tsx`, `src/features/search/SearchPage.tsx`, `src/features/search/SearchResult.tsx`
- Create: `src/features/search/search-state.ts`, `src/features/search/search-hooks.ts`
- Modify: `src/features/reader/ReaderWorkspace.tsx`, `src/lib/tauri.ts`, `src-tauri/src/commands/search.rs`
- Test: `src/features/search/*.test.tsx`

**Interfaces:**
- `querySearch(request) -> SearchResponse`
- `SearchResponse` includes coverage, filters, page-level results, excerpts, match counts, source locations, and error state.
- `openSearchResult(result) -> ReaderTarget` opens the exact source location and match navigation state.

- [ ] **Step 1: Write failing search UI tests.**

```tsx
it('distinguishes incomplete indexing from completed zero results', () => {
  render(<SearchPage response={{ results: [], coverage: { complete: false, indexed: 3, total: 5 } }} />)
  expect(screen.getByText(/2 still indexing/i)).toBeInTheDocument()
  expect(screen.queryByText(/no results/i)).not.toBeInTheDocument()
})
```

```tsx
it('opens a result at the exact match with next and previous controls', async () => {
  render(<SearchResult result={useStateResult} />)
  await user.click(screen.getByRole('link', { name: /useState/i }))
  expect(onOpenReaderTarget).toHaveBeenCalledWith(expect.objectContaining({ matchIndex: 0 }))
})
```

- [ ] **Step 2: Run tests to verify they fail.**

Run: `npm test -- --run src/features/search`

Expected: FAIL because palette, results, coverage, and target navigation do not exist.

- [ ] **Step 3: Implement the command-palette and full results page.**

Support exact terms, prefixes, quoted phrases, repository/category/document-type filters, keyboard navigation, preserved query/filter state, page grouping, snippets, match counts, and incomplete-index coverage. Keep catalog discovery separate from content search.

- [ ] **Step 4: Connect exact-match reader navigation.**

Use parsed source locations to navigate to the exact heading/text/code match, highlight it, and expose next/previous match controls. Preserve query and filters through failures.

- [ ] **Step 5: Run tests.**

Run: `npm test -- --run src/features/search && npm run build && cargo test --manifest-path src-tauri/Cargo.toml commands::search`

Expected: PASS for search UI, filters, incomplete coverage, exact matching, highlighted navigation, and failure states.

- [ ] **Step 6: Commit.**

```bash
git add src/features/search src/features/reader/ReaderWorkspace.tsx src/lib/tauri.ts src-tauri/src/commands/search.rs
git commit -m "feat: add global exact-match documentation search"
```

## Task 13: Implement bookmarks, collections, tags, session history, and deep links

**Files:**
- Create: `src/features/organization/BookmarksPanel.tsx`, `src/features/organization/CollectionsPanel.tsx`, `src/features/organization/TagPicker.tsx`
- Create: `src/features/organization/organization-hooks.ts`, `src/features/organization/organization-model.ts`
- Create: `src-tauri/src/commands/organization.rs`, `src-tauri/src/commands/deep_links.rs`
- Modify: `src/features/reader/ReaderWorkspace.tsx`, `src-tauri/src/persistence/repository.rs`
- Test: `src/features/organization/*.test.tsx`, `src-tauri/src/commands/deep_links.rs`

**Interfaces:**
- `saveBookmark(target) -> BookmarkId` must return confirmed persistence or a structured save error.
- `createCollection(name)`, `assignBookmark(bookmarkId, collectionId)`, `createTag(name)`, `listRecentDocuments()`
- `parseXenicsUrl(url) -> Result<ReaderTarget, XenicsError>`

- [ ] **Step 1: Write failing organization tests.**

```tsx
it('saves immediately and offers an optional collection picker', async () => {
  render(<BookmarkButton target={reactTarget} />)
  await user.click(screen.getByRole('button', { name: /bookmark/i }))
  expect(onBookmarkSaved).toHaveBeenCalled()
  expect(screen.getByRole('dialog', { name: /choose collection/i })).toBeInTheDocument()
})
```

```rust
#[test]
fn deep_link_preserves_branch_tag_and_path() {
    let target = parse_xenics_url("xenics://docs/react?ref=main&path=learn/start.md").unwrap();
    assert_eq!(target.ref_name, "main");
    assert_eq!(target.path, "learn/start.md");
}
```

- [ ] **Step 2: Run tests to verify they fail.**

Run: `npm test -- --run src/features/organization && cargo test --manifest-path src-tauri/Cargo.toml deep_links`

Expected: FAIL because organization persistence and deep-link parsing do not exist.

- [ ] **Step 3: Implement local organization.**

Use flat collections, built-in plus freeform tags with autocomplete, immediate confirmed saves, last-used collection shortcuts, recent documents with reading positions, session restoration, unavailable bookmark states after uninstall, and branch/tag names without commit snapshots.

- [ ] **Step 4: Implement deep links.**

Register `xenics://`, validate source/ref/path/anchor, preserve invalid targets as visible errors, and offer search/source-home recovery. Do not silently switch versions.

- [ ] **Step 5: Run tests.**

Run: `npm test -- --run src/features/organization && cargo test --manifest-path src-tauri/Cargo.toml deep_links`

Expected: PASS for immediate saves, unavailable bookmarks, collections/tags, recent positions, restart state, and deep-link recovery.

- [ ] **Step 6: Commit.**

```bash
git add src/features/organization src/features/reader/ReaderWorkspace.tsx src-tauri/src/commands/organization.rs src-tauri/src/commands/deep_links.rs src-tauri/src/persistence/repository.rs
git commit -m "feat: add local organization and Xenics deep links"
```

## Task 14: Implement task panel, native notifications, diagnostics, and recovery UX

**Files:**
- Create: `src/features/tasks/TaskPanel.tsx`, `src/features/tasks/TaskRow.tsx`, `src/features/tasks/task-hooks.ts`
- Create: `src/components/feedback/InlineError.tsx`, `src/components/feedback/RecoveryActions.tsx`, `src/components/feedback/OfflineEmbed.tsx`
- Create: `src-tauri/src/commands/tasks.rs`, `src-tauri/src/desktop/notifications.rs`, `src-tauri/src/diagnostics/sanitizer.rs`
- Modify: `src/lib/task-events.ts`, `src-tauri/src/tasks/manager.rs`, `src-tauri/src/commands/mod.rs`
- Test: `src/features/tasks/*.test.tsx`, `src-tauri/src/diagnostics/sanitizer.rs`

**Interfaces:**
- `listTasks() -> TaskSnapshot[]`
- `cancelTask(taskId)`, `retryTask(taskId)`, `copyDiagnostics(taskId) -> SanitizedDiagnostics`
- Frontend error mapping uses `ErrorCode`, phase, retry classification, and explicit recovery actions; never parses raw display text.

- [ ] **Step 1: Write failing recovery UX tests.**

```tsx
it('keeps a failed indexing task actionable without disabling reading', () => {
  render(<TaskPanel tasks={[indexingFailedTask]} />)
  expect(screen.getByRole('button', { name: /retry indexing/i })).toBeInTheDocument()
  expect(screen.getByText(/you can still browse/i)).toBeInTheDocument()
})
```

```rust
#[test]
fn diagnostics_redact_credentials_private_urls_and_document_content() {
    let diagnostics = sanitize("https://token@example.test/private/docs", "secret document body");
    assert!(!diagnostics.contains("token@"));
    assert!(!diagnostics.contains("secret document body"));
}
```

- [ ] **Step 2: Run tests to verify they fail.**

Run: `npm test -- --run src/features/tasks && cargo test --manifest-path src-tauri/Cargo.toml diagnostics`

Expected: FAIL because task UI, diagnostics sanitizer, and recovery mapping do not exist.

- [ ] **Step 3: Implement persistent task UX.**

Show active tasks, progress/indeterminate state, cancel/retry controls, recent activity, phase, elapsed time, and expandable sanitized details. Keep focus, tabs, queries, and selections stable across failures. Show one bulk summary with View issues and eligible Retry actions.

- [ ] **Step 4: Implement surface-specific recovery.**

Use inline errors for fields, component replacement for missing documents/images, source-card actions for source failures, task-panel history for operations, one deduplicated app banner for shared storage failures, dialogs only for destructive confirmation, and startup recovery for essential database failures.

- [ ] **Step 5: Implement native notifications.**

Use native completion/error notifications when Xenics is not focused, subject to user settings. Keep progress in-app. Denied notification permission is not an application error.

- [ ] **Step 6: Run tests.**

Run: `npm test -- --run src/features/tasks && npm run build && cargo test --manifest-path src-tauri/Cargo.toml tasks && cargo test --manifest-path src-tauri/Cargo.toml diagnostics`

Expected: PASS for task isolation, error actions, retry/cancel states, sanitization, focus stability, notification policy, and build.

- [ ] **Step 7: Commit.**

```bash
git add src/features/tasks src/components/feedback src/lib/task-events.ts src-tauri/src/commands src-tauri/src/desktop/notifications.rs src-tauri/src/diagnostics src-tauri/src/tasks
git commit -m "feat: add task recovery and notification UX"
```

## Task 15: Add desktop integrations, security hardening, settings, and accessibility

**Files:**
- Create: `src-tauri/src/desktop/external_actions.rs`, `src-tauri/src/desktop/mod.rs`
- Create: `src/features/settings/SettingsPage.tsx`, `src/features/settings/settings-hooks.ts`
- Modify: `src-tauri/capabilities/default.json`, `src-tauri/tauri.conf.json`, `src/styles/theme.css`
- Test: `src/features/settings/SettingsPage.test.tsx`, `src-tauri/src/desktop/external_actions.rs`

**Interfaces:**
- `openFolder(path)`, `openTerminal(path)`, `openEditor(path)`, `openBrowser(url)`, `copyText(text)`
- `getSettings()`, `updateSettings(patch)` for theme, density, update schedule, editor command, local-folder update opt-in, and notification preferences.

- [ ] **Step 1: Write failing security and settings tests.**

```rust
#[test]
fn external_browser_action_accepts_only_valid_http_urls() {
    assert!(open_browser_request("https://example.test/docs").is_ok());
    assert!(open_browser_request("javascript:alert(1)").is_err());
}
```

```tsx
it('offers system, light, and dark theme choices and remembers density', async () => {
  render(<SettingsPage />)
  expect(screen.getByRole('radio', { name: /system/i })).toBeInTheDocument()
  await user.click(screen.getByRole('radio', { name: /comfortable/i }))
  expect(onSettingsChange).toHaveBeenCalledWith({ density: 'comfortable' })
})
```

- [ ] **Step 2: Run tests to verify they fail.**

Run: `npm test -- --run src/features/settings && cargo test --manifest-path src-tauri/Cargo.toml desktop`

Expected: FAIL because desktop actions, settings, and Tauri capabilities are not implemented.

- [ ] **Step 3: Apply least-privilege capabilities.**

Scope filesystem access to the managed library and explicitly selected local folders. Allow only the commands required for Git, external actions, notifications, storage, and dialogs. Use a strict CSP, safe local content protocol, validated external URLs, and no repository script execution.

- [ ] **Step 4: Implement native actions and settings.**

Use platform-native folder explorer, terminal, configured/default editor, browser, clipboard, notifications, and file dialogs. Add settings for update schedule, theme, density, editor, notification behavior, managed library location, and local-folder update opt-in.

- [ ] **Step 5: Run accessibility and security checks.**

Run: `npm test -- --run src/features/settings && npm run build && cargo test --manifest-path src-tauri/Cargo.toml desktop`

Manually verify keyboard-only navigation, focus stability, screen-reader labels, non-color status communication, path traversal rejection, unsafe URL rejection, CSP behavior, and no shell interpolation.

- [ ] **Step 6: Commit.**

```bash
git add src-tauri/src/desktop src-tauri/capabilities src-tauri/tauri.conf.json src/features/settings src/styles/theme.css
git commit -m "feat: add secure desktop integrations and settings"
```

## Task 16: Complete desktop E2E, cross-platform acceptance, and release verification

**Files:**
- Modify: `tests/e2e/wdio.conf.ts`, `tests/e2e/fixtures.ts`
- Create: `tests/e2e/first-launch.e2e.ts`, `tests/e2e/repository-lifecycle.e2e.ts`, `tests/e2e/search-reader.e2e.ts`, `tests/e2e/recovery.e2e.ts`
- Create: `scripts/verify-packaged-build.mjs`
- Modify: `.github/workflows/ci.yml`, `package.json`

**Interfaces:**
- E2E fixtures provide fake system Git repositories, controlled filesystem roots, malformed documents, interrupted tasks, and isolated user scopes.
- WebdriverIO drives the actual Tauri binary through `@wdio/tauri-service`; Playwright remains optional for browser-only component checks.

- [ ] **Step 1: Write the desktop E2E scenarios.**

Cover first-launch welcome/catalog, supported download/index/read, unsupported download/open-folder, local Git/non-Git folders, custom source preview, bulk download/update review, pinned tags, dirty/diverged protection, search while indexing, tab restoration, invalid bookmarks, full reset, deep links, native actions, and notification/task recovery.

- [ ] **Step 2: Run the E2E suite before final hardening.**

Run: `npm run test:e2e`

Expected: previously delivered feature flows already pass; this task expands platform and failure coverage. No scenario is removed to make the suite green.

- [ ] **Step 3: Implement the smallest missing integration fixes.**

Fix only verified failures while preserving the established command/event contracts. Add platform-specific fixtures for macOS, Windows, and Linux path handling, system Git behavior, notifications, editor/terminal actions, and packaging prerequisites.

- [ ] **Step 3a: Implement packaged release verification.**

Implement the cross-platform `scripts/verify-packaged-build.mjs` and a `verify:packaged` package script. Build normal release bundles with `npm run tauri -- build` on each declared supported platform, without test-only driver features. Install the produced bundle in a clean VM/user profile and verify launching, bundled SQLite/FTS5 capability, local assets, Git discovery (including a missing-Git diagnostic), and OS deep-link registration. Check the release feature/build manifest excludes embedded test-driver plugins; run clean-install smoke checks without adding instrumentation to the release artifact. Record installer paths, OS/runtime matrix, build configuration, and results. Where OS interaction requires manual checking, provide a concrete checklist and retained results rather than claiming the automated script covers it. Configure signing/notarization for release distribution; absent credentials leave release validation explicitly incomplete.

- [ ] **Step 4: Run the complete verification matrix.**

Run:

```bash
npm test -- --run
npm run build
cargo test --manifest-path src-tauri/Cargo.toml
npm run test:e2e
npm run tauri -- build
npm run verify:packaged
git diff --check
```

Expected: all frontend tests, Rust tests, desktop E2E scenarios, normal release bundle builds, packaged clean-install checks, and whitespace checks pass on the declared platform matrix. Record any signing/native checks that cannot run; do not equate a frontend build with a verified release.

- [ ] **Step 5: Run the explicit acceptance checks from the error strategy.**

Verify disconnect during parallel downloads, post-download indexing failure, removed pages during update, malformed documents, failed bookmark writes, missing library drives, cancellation during mutation, auth/dirty/diverged/lock/pinned-tag cases, corrupted search cache, partial reset, and duplicate/late task events. Confirm the UI reports what failed, what remains usable, and the next valid action.

- [ ] **Step 6: Commit the verification harness and release configuration.**

```bash
git add tests/e2e scripts/verify-packaged-build.mjs .github/workflows/ci.yml package.json
git commit -m "test: add Xenics desktop acceptance coverage"
```

## Plan self-review

### Spec coverage

- Repository types, curated/custom/website-only capability: Tasks 4, 5, 7, and 10.
- Stable storage, custom library, collisions, reset, and external-folder protection: Task 4.
- System Git, auth helpers, dirty/diverged protection, refs, and cancellation: Tasks 5 and 6.
- On-launch/daily/weekly/disabled update checks and availability refresh: Task 6A.
- Early parser/search/cancellation decisions: Task 1A; incremental actual-desktop integration starts in Task 1.
- Shared safe Markdown/MDX pipeline: Task 7.
- Separate SQLite stores, FTS5, WAL, migrations, and rebuild isolation: Task 3.
- `notify`, reconciliation, polling fallback, progressive indexing, and search ranking: Task 8.
- Catalog cards, groups, metadata, bulk actions, Shift selection, and capabilities: Task 10.
- Tabbed reader, navigation, safe links/assets, code controls, and external actions: Tasks 11 and 15.
- Exact search, filters, coverage, and match navigation: Task 12.
- Bookmarks, collections, tags, history, branch/tag preservation, and deep links: Task 13.
- Task states, retries, cancellation, restart recovery, partial work, diagnostics, and notifications: Tasks 2, 6, and 14.
- Security, accessibility, settings, and native integrations: Task 15.
- Cross-platform desktop E2E and acceptance checks: Task 16.

### Placeholder and ambiguity scan

- No implementation step uses unresolved placeholders or an unbounded error-handling instruction.
- Parser selection is bounded to a compatibility prototype with explicit fixtures and an evidence-based fallback decision.
- FTS5 remains the default; Tantivy is evaluated only if declared relevance/latency checks fail.
- “Supported” is represented by Readable or Partially readable capability; Files only and Website only have distinct actions.
- Physical storage paths are stable and never follow editable display metadata.
- Full reset has an explicit preview/confirmation contract and excludes referenced external folders.

### Type and interface consistency

- `TaskId`, `SourceId`, `DocumentId`, `TaskState`, `RetryClass`, `XenicsError`, and `TaskEvent` are introduced before consumers.
- `SearchResponse` carries coverage and source locations consumed by both search UI and reader navigation.
- `ParsedDocument` is the single producer of reader content and search records.
- `StorageService`, `GitService`, `Indexer`, `SearchService`, `TaskManager`, and command adapters have stable names and return types across tasks.
