# Xenics specification gap review

Updated: 2026-09-11

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
| Add measured virtualization/lazy loading | ✅ Done | Shared virtual list/grid primitives; 81 frontend tests, build, and E2E typecheck pass |
| Expand desktop acceptance coverage | ✅ Done | 6 WebDriver spec files and 9 macOS/native scenarios pass |
| Make the reader reachable from installed catalog sources | ✅ Done | Native start-page resolver, catalog/app integration tests, and full regression verification |
| Render standard Markdown tables and inline formatting | ✅ Done | Typed native spans/tables, semantic React rendering, safe link routing, parser and reader regression coverage |
| Design Linux/Windows launcher strategy | ⏸ Deferred | Existing hosted smoke limitation remains intentionally out of scope |

## Confirmed functional gaps

### 1. Document parsing and rendering fidelity

The Rust parser now uses a safe `markdown-rs` AST-backed model and handles
headings, paragraphs, lists, block quotes, fenced code, links, images, GFM
tables, inline emphasis, strong text, and inline code alongside MDX warnings.
The reader renders these through an allowlisted typed model rather than HTML.

Local image blocks are now represented safely, resolve only within the source
root, and fall back to an offline placeholder when an asset cannot be loaded.
Remaining work is limited to the broader Markdown/MDX fidelity matrix and
curated component mappings.

### 2. Code presentation

Code blocks provide language labels, line numbers, copying, downloading,
wrapping, editor actions, and bounded `highlight.js` syntax highlighting.

### 3. Search-field completeness and exact locations

All FTS fields are populated from the shared document model, including
punctuation-bearing API names, and disposable per-block locations drive exact
reader navigation. Remaining acceptance work is to broaden the end-to-end
scenario matrix.

### 4. Native notification delivery

Task terminal outcomes now connect to the official Tauri notification plugin,
respect permission and focus settings, and deduplicate retries by task ID.

### 5. Performance-oriented UI behavior

Large catalog grids, search-result lists, and activity history now use shared
windowed rendering above a conservative threshold while preserving the normal
responsive layouts for small collections. The primitives also fall back safely
when layout metrics are unavailable in non-browser test environments.

### 6. Desktop acceptance coverage

The macOS suite and release bundles pass, and the checked-in scenarios now cover
the shell, catalog filtering/details, settings scheduling, notification/reset
affordances, and search-view entry. The full acceptance matrix (real local
folders, repository mutations, recovery injections, exact search behavior,
reset execution, deep links, and cross-platform native actions) is not yet
represented end to end. Linux and Windows release bundles build, but their
smoke launches cannot currently connect to the embedded WebDriver server; that
launcher strategy is intentionally deferred.

### 7. Reader entry from the catalog

Installed Readable and Partially readable sources now open their locally
discovered `README` or `index` start page directly in the reader. The native
layer canonicalizes both the source root and discovered page, derives a safe
source-relative path, and rejects sources that are not renderable. Once native
source hydration succeeds, catalog fixture state cannot make an uninstalled
source appear readable.

The offline desktop harness intentionally does not seed a real downloaded
repository: doing so would require a test-only database/source fixture command
or network-dependent cloning. Coverage is therefore split at the meaningful
boundary: Rust command tests validate real filesystem discovery and containment,
while the app integration test verifies catalog action, native command, and
reader-target transition. The existing native desktop scenarios remain a shell
and interaction regression suite.

## Intentionally not gaps

- Semantic/AI search, cloud sync, export/import, revision history, multiple
  installed versions, arbitrary MDX execution, and closed-app background
  updates remain explicitly deferred v1 capabilities.
- Files-only repositories are intentionally manageable and open through the
  system explorer rather than rendered in Xenics.
- The direct embedded WebDriver connection is an intentional workaround for the
  published Tauri WebDriver service/plugin focus-hook incompatibility.

## Recommended implementation order

1. ✅ Replace the line-oriented parser with a shared safe document model and add
   Markdown/MDX compatibility fixtures, including assets and component
   fallbacks.
2. ✅ Populate all search fields and per-block locations from that model, then
   validate punctuation-bearing identifiers, ranking, and exact navigation.
3. ✅ Add safe local-asset rendering and syntax highlighting.
4. ✅ Connect native notifications to deduplicated task outcomes.
5. ✅ Add virtualization/lazy loading after measuring representative catalog,
   results, and activity sizes.
6. ✅ Expand desktop acceptance scenarios.
7. ⏸ Defer the separate cross-platform launcher strategy for Linux and Windows
   until the platform-specific WebDriver startup issue is investigated.
