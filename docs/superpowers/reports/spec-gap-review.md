# Xenics specification gap review

Updated: 2026-09-10

This review compares the approved design and error-handling specifications with
the implementation currently on `main`. It intentionally does not change the
Linux or Windows desktop-launch harness.

## Milestone tracker

| Task | Status | Verification |
| --- | --- | --- |
| Review implementation against the approved specifications | ✅ Done | Code, tests, dependencies, and acceptance scenarios reviewed |
| Record confirmed gaps and implementation order | ✅ Done | This report added and status report updated |
| Replace the line-oriented parser with a safe shared Markdown/MDX model | ✅ Done | `markdown-rs`, AST-backed blocks, safe MDX warnings, image metadata, Rust/React tests |
| Populate complete search fields and exact block locations | ✅ Done | All FTS fields are populated; per-block match locations drive exact navigation; 67 Rust tests pass |
| Add local assets and syntax highlighting | ✅ Done | Safe relative assets with offline fallback; `highlight.js` highlighting; 75 frontend tests pass |
| Connect native notifications to task outcomes | ✅ Done | Tauri notification plugin, permission flow, focus/setting policy, terminal deduplication; 77 frontend tests pass |
| Add measured virtualization/lazy loading | ⬜ Pending | Pending performance baseline and UI tests |
| Expand desktop acceptance coverage | ⬜ Pending | Linux/Windows launcher strategy remains separate |

## Confirmed functional gaps

### 1. Document parsing and rendering fidelity

The Rust parser now uses a safe `markdown-rs` AST-backed model and handles
headings, paragraphs, lists, block quotes, fenced code, links, images, and MDX
warnings. It does not yet provide the full reader model for tables, emphasis,
downloadable assets, richer links, or curated component mappings.

The reader has no local image or asset block model. Repository content is shown
as escaped text, so untrusted markup is not executed, but the required local
asset experience is not implemented yet.

### 2. Code presentation

Code blocks currently provide language labels, line numbers, copying,
downloading, wrapping, and editor actions. They do not perform syntax
highlighting, which is an explicit reader requirement.

### 3. Search-field completeness and exact locations

The FTS schema already has title, headings, prose, code, metadata, and API-name
columns, but the indexer currently writes the title and combined reader text
only; code, metadata, and API-name fields remain empty. Heading records are not
stored as a complete heading field, and document locations currently point to a
single first location rather than the exact matching block.

This means the search architecture exists, but the required ranking and
identifier-aware exact navigation are not yet fully backed by indexed data.

### 4. Native notification delivery

The native notification module currently exposes policy logic and tests only.
Task completion/failure is surfaced in the in-app panel, but there is no native
notification dispatch connected to task outcomes when the app is unfocused.

### 5. Performance-oriented UI behavior

The current frontend does not include virtualization for large catalog grids,
search-result lists, or activity history. The specification calls for
virtualization and lazy loading as the catalog and indexed corpus grow.

### 6. Desktop acceptance coverage

The macOS suite and release bundles pass. Linux and Windows release bundles
also build, but their smoke launches cannot currently connect to the embedded
WebDriver server. In addition, the checked-in E2E scenarios cover the shell and
selected catalog/settings surfaces; the full acceptance matrix (local folders,
repository lifecycle, recovery injections, exact search behavior, reset, deep
links, and cross-platform native actions) is not yet represented end to end.

## Intentionally not gaps

- Semantic/AI search, cloud sync, export/import, revision history, multiple
  installed versions, arbitrary MDX execution, and closed-app background
  updates remain explicitly deferred v1 capabilities.
- Files-only repositories are intentionally manageable and open through the
  system explorer rather than rendered in Xenics.
- The direct embedded WebDriver connection is an intentional workaround for the
  published Tauri WebDriver service/plugin focus-hook incompatibility.

## Recommended implementation order

1. Replace the line-oriented parser with a shared safe document model and add
   Markdown/MDX compatibility fixtures, including assets and component
   fallbacks.
2. Populate all search fields and per-block locations from that model, then
   validate punctuation-bearing identifiers, ranking, and exact navigation.
3. Add safe local-asset rendering and syntax highlighting.
4. Connect native notifications to deduplicated task outcomes.
5. Add virtualization/lazy loading after measuring representative catalog,
   results, and activity sizes.
6. Expand desktop acceptance scenarios and design a separate cross-platform
   launcher strategy for Linux and Windows.
