# Reader Entry Point Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make an installed readable source open its locally discovered start page from the catalog, while never presenting an uninstalled source as readable.

**Architecture:** The native layer owns start-page discovery because only it knows the validated installed source root. The catalog receives authoritative installed state once native source hydration completes and delegates the readable primary action through `App`, which resolves the start page and creates a reader target. The reader continues to use its existing safe `read_document` command.

**Tech Stack:** Tauri 2, Rust, React 19, TypeScript, Vitest, WebdriverIO.

## Global Constraints

- Never construct a reader path from an unvalidated source path in React.
- Only `Readable` and `Partially readable` sources with a locally discovered Markdown/MDX start page may open the reader.
- Files-only sources continue to open in the system file explorer; Website-only sources continue to open the validated website URL.
- Native source metadata is authoritative after `list_sources` returns successfully; browser-mode fixtures remain unchanged.
- Keep the implementation narrow: no curated-profile or Markdown-rendering expansion in this sub-plan.
- Update this checklist, the specification-gap report, and implementation-status report as each task is verified.

---

### Task 1: Resolve a safe start page from the native source root

**Files:**

- Modify: `src-tauri/src/commands/mod.rs`
- Modify: `src-tauri/src/commands/tests.rs` or the existing command test module
- Modify: `src-tauri/src/lib.rs`

**Produces:** `get_source_start_page(source_id: String) -> Result<ReaderStartPage, String>`, where `ReaderStartPage` serializes `sourceId`, `refName`, `path`, and `title`.

- [x] Write native tests for a readable source with `README.md`, a readable source with `index.mdx`, a source with no Markdown start page, a Files-only source, and traversal-resistant relative path output.
- [x] Run the focused Rust command tests and confirm the new assertions fail before implementation.
- [x] Add the serialized `ReaderStartPage` response and command registration.
- [x] Resolve the installed root from `UserDb`, reject non-readable capabilities, use `DocumentDiscovery::preview`, and convert the discovered canonical path to a source-relative POSIX path.
- [x] Run focused Rust tests, then the full Rust suite and formatting check.
- [x] Mark Task 1 complete below and commit with `feat: resolve reader start pages`.

### Task 2: Make catalog status and reader action authoritative

**Files:**

- Modify: `src/features/catalog/CatalogPage.tsx`
- Modify: `src/features/catalog/CatalogPage.test.tsx`
- Modify: `src/features/catalog/RepositoryCard.tsx` only if a clearer callback name is needed

**Consumes:** An `onOpenReader(repository: Repository)` callback supplied by the application.

**Produces:** A readable installed card invokes `onOpenReader`; native hydration demotes fixture-only Ready status to Not installed when `list_sources` returns no matching record.

- [x] Write frontend tests proving the readable primary action delegates to `onOpenReader`, Files-only actions retain folder behavior, and hydrated native state supersedes built-in fixture status.
- [x] Run focused Vitest tests and confirm they fail before implementation.
- [x] Add a focused catalog callback for readable source entry and a successful native-hydration flag that makes native installation state authoritative without changing browser fixtures.
- [x] Run focused tests and the full frontend suite.
- [x] Mark Task 2 complete below and commit with `fix: connect catalog reader entry`.

### Task 3: Open the reader through the application boundary and validate the desktop path

**Files:**

- Modify: `src/app/App.tsx`
- Modify: `src/app/App.test.tsx`
- Modify: `tests/e2e/search-reader.e2e.ts` or create `tests/e2e/reader-entry.e2e.ts`
- Modify: `docs/superpowers/reports/spec-gap-review.md`
- Modify: `docs/superpowers/reports/implementation-status.md`
- Modify: `docs/superpowers/reports/release-acceptance-checklist.md`

**Consumes:** `get_source_start_page` and `CatalogPage.onOpenReader`.

**Produces:** App state changes to a `SearchReaderTarget` only after native start-page resolution succeeds; command errors remain local to the catalog action rather than creating an invalid reader tab.

- [x] Write an app-level test that mocks the start-page response and verifies that the reader workspace receives the returned target after a readable catalog action.
- [x] Run the focused test and confirm it fails before implementation.
- [x] Invoke `get_source_start_page`, convert its response to the existing `SearchReaderTarget` shape, and keep the reader hidden when the command fails.
- [x] Keep start-page failures local to the catalog action with an accessible error message.
- [x] Document why the existing offline native desktop harness does not seed a real installed repository: the Rust command test validates discovery and containment at the native boundary, while the app integration test validates the catalog-to-reader state transition.
- [x] Run frontend tests, Rust tests, build, E2E typecheck, native macOS E2E, packaged verification, production audit, formatting, and diff checks.
- [x] Mark Task 3 complete below and commit with `feat: open reader from catalog`.

## Completion checklist

- [x] An installed Readable or Partially readable catalog card opens its local start page in `ReaderWorkspace`.
- [x] An uninstalled card presents Download docs rather than Read documentation after native hydration.
- [x] Files-only and Website-only primary behavior is unchanged.
- [x] No source-relative path traversal or untrusted client-provided reader path is introduced.
- [x] All verification listed in Task 3 passes.
