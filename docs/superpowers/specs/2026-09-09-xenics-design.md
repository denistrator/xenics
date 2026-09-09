# Xenics Design Specification

**Status:** Revised following user review
**Date:** 2026-09-09  
**Product:** Xenics

**Adopted companion requirements:** [Error handling and recovery strategy](2026-09-09-xenics-error-handling-strategy.md). Its detailed failure, retry, interruption, and partial-reset rules apply throughout this specification.

## 1. Product vision

Xenics is a cross-platform, local-first developer documentation library. It manages documentation repositories from Git, keeps selected sources available offline, indexes supported documentation locally, and provides a fast tabbed reader with global search.

The source of truth is the upstream repository. Xenics is the synchronization, indexing, navigation, and reading layer:

```text
Official documentation repository
        ↓
System Git
        ↓
Local Xenics library
        ↓
Progressive indexing
        ↓
SQLite/FTS5 search index
        ↓
Tabbed documentation workspace
```

## 2. Goals

- Support macOS, Windows, and Linux.
- Provide a curated catalog of developer technologies based on official documentation repositories.
- Allow users to add arbitrary HTTPS repositories, SSH repositories, and local folders.
- Download, update, remove, and manage unsupported repositories even when Xenics cannot render them.
- Render supported Markdown and MDX documentation with local assets.
- Provide global, exact-term and prefix search across all indexed documentation.
- Keep all user data, caches, indexes, and managed downloads in user-scoped storage.
- Provide rich repository management without requiring a hosted backend or account.
- Remain responsive during downloads, updates, and indexing.

## 3. Non-goals for v1

- Semantic or AI-powered search.
- Text highlights, notes, or annotations.
- Cloud synchronization.
- Bookmark and collection export/import.
- Commit-level historical browsing.
- Execution of repository JavaScript, arbitrary MDX components, interactive demos, or embedded external applications inside Xenics.
- Requiring Xenics to replace the user’s system Git credentials or SSH configuration.

## 4. Technology stack and architecture

### 4.1 Stack

- Desktop shell: Tauri 2
- Frontend: React, TypeScript, Vite
- Styling: Tailwind CSS and shadcn/ui-style primitives
- Native application core: Rust
- Async coordination and subprocess I/O: Tokio; bounded workers for CPU-heavy and blocking work
- Git: system Git invoked through one controlled Rust service
- File watching: `notify`, with reconciliation scans and polling fallback
- Database: `rusqlite` with separate SQLite user-data and disposable FTS5 search databases
- Documentation parsing: shared Rust document pipeline for Markdown and a safe MDX subset; evaluate `markdown-rs` first through a compatibility prototype
- Code rendering: syntax highlighting with copy, download, wrapping, and line-number controls
- Tests: React Testing Library/Vitest, Rust tests, and WebdriverIO with `@wdio/tauri-service` for actual desktop end-to-end tests; Playwright is optional for browser-only UI tests

### 4.2 Responsibility boundaries

The React layer owns presentation and interaction:

- repository catalog cards
- catalog filters and selection state
- download/update review screens
- tabs and reader layout
- global search overlay and full results view
- bookmarks, collections, tags, and history
- settings and notification panel

The Rust layer owns local application capabilities:

- system Git processes
- repository metadata and lifecycle
- configured library paths
- local folder validation
- filesystem operations
- background task queue
- incremental indexing
- SQLite persistence
- native system actions
- native notifications

The frontend communicates with Rust through narrow commands and typed events. Long-running operations never run on the UI thread.

### 4.3 Shared document pipeline

Rust owns a single pipeline: source files → parsed document model → safe reader content and search records. Headings, links, readable text, and indexed content derive from the same model so search results and match locations correspond to rendered content. React presents the resulting safe content and reader controls.

Evaluate `markdown-rs` against representative Markdown and MDX documentation before finalizing the parser dependency. Parse syntax trees and apply Xenics-owned allowed-element rules and curated component mappings. Never evaluate repository MDX as JavaScript. Unsupported constructs retain safe readable content where possible and report omissions according to the source capability model. The prototype must validate links, headings, local assets, component fallbacks, and reader/search agreement.

### 4.4 Persistence and search boundary

Use `rusqlite` through Rust-owned database access. Keep bookmarks, collections, settings, source metadata, session state, and task records in a durable user-data database. Keep FTS5 and derived search records in a separate disposable database that can be rebuilt without modifying user data. Use explicit schema migrations, controlled writes, and short transactions. Bundle a consistent SQLite build with FTS5 enabled and verify that capability in packaged builds.

Keep both databases in local app storage even when managed repositories move to a custom library location. Use WAL mode for concurrent reads during writes; serialize writes per database and keep indexing batches short. Do not place WAL databases on network filesystems. Background indexing must not hold the user-data database's write lock.

FTS5 remains the provisional search engine pending the acceptance prototype in Section 15. Implement identifier-aware tokenization and explicit ranking rules rather than relying on defaults. Keep search access behind a narrow Rust module so the derived index can be replaced independently of user-data persistence. If representative tests demonstrate that FTS5 cannot meet relevance or latency requirements after reasonable tuning, evaluate Tantivy as an embedded search replacement; this is a fallback, not an additional v1 dependency.

### 4.5 Background execution and cancellation

Tokio coordinates tasks and asynchronous Git process I/O. Parsing, hashing, and blocking database operations run on bounded workers, outside both the UI thread and asynchronous executor workers. Apply explicit concurrency limits to CPU-heavy work; async scheduling alone is not a responsiveness guarantee.

Cancellation is cooperative, with checks between files or bounded batches. Started `spawn_blocking` work cannot be stopped by merely aborting its handle. Git cancellation must stop and await the controlled subprocess, and reset/removal must wait for affected operations to stop before changing their files. Task outcomes reflect actual completion or cancellation, not just receipt of a request.

### 4.6 System Git service

Keep system Git and existing system authentication. Route all Git operations through one Rust service that owns executable/prerequisite checks, validated arguments, authentication-failure classification, progress, phase-aware timeouts, cancellation, and sanitized diagnostics. Download, update, and version switching use the same service and error contract. Do not introduce an embedded Git implementation or a separate Xenics credential store.

### 4.7 Filesystem change detection

Use `notify` for filesystem events, debounce them, and treat them as triggers to reconcile actual files rather than a complete change history. Reconcile documentation content after Git operations and on app restart to catch missed changes. Use polling fallback when native watching is unavailable or unreliable. Limit watching/scanning to relevant documentation roots and assets; avoid unnecessary scanning of Git internals and unrelated build/dependency folders.

### 4.8 Desktop compatibility

Keep Tauri 2, React, TypeScript, Vite, Tailwind, and shadcn/ui-style primitives. Tauri uses system webviews with platform differences. Before release, declare supported OS versions and Linux distributions/runtime prerequisites, and validate reader rendering, keyboard behavior, local assets, and native integration against that matrix. Browser-only tests do not establish desktop compatibility.

## 5. Repository model

### 5.1 Repository types

Source type and documentation capability are independent:

- **Managed Git repository:** downloaded into the Xenics library.
- **Referenced local folder:** read in place; may or may not be a Git repository.

Documentation capabilities are:

- **Readable:** navigation, essential content, internal links, and required assets work offline; content is indexed and rendered.
- **Partially readable:** usable, indexed documentation with clearly identified rendering or content omissions.
- **Files only:** available for repository management and opening in the system file explorer, but not indexed or rendered.

In this specification, “supported” means Readable or Partially readable; “unsupported” means Files only.

Each curated documentation profile defines content roots, a start page, navigation, published-URL-to-local-page mapping, required assets, and rendering rules. Representative pages and links must be validated before a source is labeled Readable. Updates that break compatibility change the displayed capability and identify the omissions rather than continuing to claim complete support.

Custom repositories and local folders receive generic Markdown detection. The add-source flow previews detected documentation and lets users select a documentation folder and start page. Generic sources use a folder tree for navigation. Safe MDX rendering is available where possible, with omissions reported. Curated profiles improve navigation and link resolution beyond this baseline.

Adding a custom repository never silently changes a built-in catalog entry. If the URL matches an existing entry, offer to use that entry; do not create a second managed installation at the same path.

### 5.2 Repository metadata

Users can edit metadata for both built-in and custom entries:

- display name
- category
- icon
- description
- tags

Built-in catalog metadata remains the default. User edits override defaults and can be reset with “Reset to default.” Catalog updates preserve user edits.

Each repository has one primary category and optional tags. Built-in categories are:

- Languages
- Frontend
- Backend
- Databases
- Infrastructure
- Developer tools
- Commerce/CMS
- AI and developer productivity
- Other

Users may create additional custom categories. Built-in categories remain fixed.

### 5.3 Technology groups

One technology card may contain multiple related repositories. The card shows aggregate status and size, then expands to show each repository and its individual actions.

Technology groups support group-level Download and Update actions. The catalog also supports Download selected docs and Update all actions. Bulk download review lists the exact sources and capabilities; website-only entries are excluded and Files only downloads require explicit selection.

### 5.4 Initial catalog candidates

The initial built-in catalog should cover the technologies surfaced in prior planning conversations. Entries without a suitable downloadable repository are website-only entries with an Open website action, not Files only repositories. They are excluded from bulk downloads. First launch emphasizes a small, verified selection of readable documentation from these candidates.

**Languages:** JavaScript, TypeScript, PHP, Python, Rust, Go, Java, C, C++, SQL, Bash, HTML, CSS.

**Frontend:** React, Vue, Next.js, Redux, Redux Toolkit, Pinia, Alpine.js, Tailwind CSS, TanStack Query, Vite, Svelte.

**Backend:** Node.js, Bun, Express, Fastify, NestJS, Elysia, FastAPI, Django, Laravel.

**Commerce/CMS:** Magento, Hyvä, WooCommerce, WordPress, Shopify.

**Databases and data libraries:** PostgreSQL, MySQL, MariaDB, SQLite, Redis, MongoDB, ClickHouse, DuckDB, CockroachDB, Drizzle, SQLAlchemy, Pydantic, Zod.

**Infrastructure and tools:** Git, Docker, Kubernetes, DDEV, Composer, npm, AWS/S3, Cloudflare/R2.

**AI and developer productivity:** OpenCode, Codex CLI, Cline, Cursor, MiMo, OpenSpec.

### 5.5 Managed storage paths

Managed remote repositories use a stable namespaced path:

```text
library/
└── vendor/
    └── package/
```

The vendor comes from the repository owner or hosting organization, and the package comes from the repository name. Display metadata does not affect this physical path.

Xenics does not support duplicate vendor/package paths across different Git hosts. A collision blocks the operation and shows a warning. Local folders referenced in place do not receive a managed storage path.

## 6. Repository lifecycle

### 6.1 Adding repositories

Users can add repositories through:

- the built-in catalog
- HTTPS Git URLs
- SSH Git URLs
- a local folder picker
- drag-and-drop of a local folder

System Git must be installed and configured. Xenics validates Git availability and the configuration/authentication needed for the selected source before starting Git operations, and provides an actionable error when prerequisites are missing. Xenics uses the user’s existing Git credentials, SSH configuration, and authentication helpers. Xenics does not maintain a separate credential store.

### 6.2 Downloading

For a remote repository, the download review shows:

- repository summary and source URL
- selected branch or tag
- estimated size when available
- clone mode
- destination path
- supported/unsupported capability

The user can choose either a shallow clone or a full clone. Shallow clone is the default. Parallel downloads use a fixed safe concurrency limit.

After a supported download completes, indexing starts automatically and a notification is shown. Documents become searchable progressively during indexing.

Only one branch or tag can be installed per source in v1. Simultaneous documentation versions are not supported. Switching the selected branch or tag replaces the installed version and may invalidate bookmarks, tabs, and reading positions. Bookmarks are allowed to become invalid; Xenics does not offer automatic version switching to resolve them. The reader shows the active branch or tag; search results do not show version labels.

### 6.3 Updating

Automatic update checks are user-configurable: on launch, daily, weekly, or disabled. Scheduled checks run only while Xenics is open.

Manual Update actions are available for individual repositories, technology groups, and the global catalog. Update all includes Xenics-managed installations with available changes, including Files only/custom repositories. Referenced local folders remain readable and watched, but Git updates are disabled by default and require per-source opt-in. Enabled updates follow an explicitly selected remote and branch and allow fast-forward updates only. Diverged repositories are refused; pinned tags remain unchanged. Bulk-update review lists included sources, clearly identifies external folders, and explains skipped sources.

If a repository has uncommitted local changes, Xenics refuses to update it and explains that the changes must be handled manually. Xenics never stashes, overwrites, or merges local changes automatically.

After a supported repository updates, Xenics automatically reindexes it and displays a notification. Updates do not preserve previous content snapshots or guarantee reading-progress continuity. Tabs, bookmarks, links, or reading positions may become invalid after an update or version switch. Invalid content shows a clear error; missing pages offer search and source-home actions. There is no previous-revision retention or reload-acceptance requirement.

### 6.4 Removing and resetting

Removing a repository asks whether to delete its managed files. The user can keep the files or delete them.

Full reset:

- stops active tasks
- closes tabs
- deletes settings, bookmarks, collections, tags, history, and session state
- clears caches and search indexes
- deletes Xenics-managed repositories, including those in a user-selected custom library location
- restores the first-launch welcome flow
- leaves externally referenced local folders untouched
- leaves the Xenics application installation intact

Full reset requires explicit confirmation and lists the exact data and managed paths that will be removed.

## 7. Catalog and visual design

The catalog uses a visual card grid with rich operational metadata. Cards show:

- editable icon, name, and description
- supported/unsupported status
- installation state
- branch/tag
- last sync time
- update availability
- disk usage
- source type
- repository URL or local path summary

The card body consistently opens source details. A separate primary action depends on capability and installation state:

- Readable or Partially readable: Download docs, then Read once installed.
- Files only: Download repository, then Open folder once installed.
- Website-only catalog entry: Open website; no Git download action.

Technology groups show each source’s individual capability so aggregate status does not hide mixed support.

Card actions use click-to-open behavior. Every downloadable card has a checkbox. Clicking the checkbox changes selection without opening details. Shift-click selects a range. Multi-select supports bulk download, Update, Hide, Remove, and metadata/category actions, with applicability made clear in the review.

Cards support Compact and Comfortable density modes. Repositories can be pinned, hidden, filtered, and manually organized through categories and tags. Hidden repositories remain available in a dedicated Hidden repositories setting.

The first launch shows a short welcome modal, then opens the catalog with one-click download actions. No repository downloads automatically.

## 8. Reader and navigation

The reader uses a tabbed workspace layout:

- persistent document tabs
- tab reordering
- pinning
- duplicating
- close, close others, close to the right
- reopen closed tabs
- automatic session restoration after restart
- collapsible left sidebar for navigation between documents, using curated navigation or a generic folder tree
- back/forward history within each tab
- active branch or tag displayed in the reader
- no separate outline panel for headings within the current page
- breadcrumbs and source metadata
- optional reader zoom and density controls

Opening a source for the first time opens its configured start page. Subsequent visits restore its last-read page. Missing pages show an error with search and source-home actions.

Clicking an internal documentation link opens the target locally in the current tab by default. Standard platform modifier-click and keyboard shortcuts allow opening a link in a new tab. External links open in the system browser. Unsupported external embeds show a clear offline placeholder with an “Open in browser” action.

Supported documentation rendering includes Markdown, a safe MDX subset, local images, downloadable assets, and syntax-highlighted code. Unsupported MDX components show their readable text/content with an “Unsupported component” indicator.

Code blocks provide:

- syntax highlighting
- language label
- line numbers
- copy
- download
- line wrapping toggle
- open in configured editor

Page actions include copy deep link, open source file, open repository folder, open terminal, open configured editor, and open the source URL in the system browser.

Xenics supports an `xenics://` deep-link scheme for opening documents from terminals, bookmarks, and other applications.

## 9. Search

Global search is available as both an instant command-palette overlay and an expandable full results page.

The index includes titles, headings, prose, code, metadata, and API names. Search supports exact terms and prefixes. Fuzzy matching, typo tolerance, semantic search, and AI search are out of scope for v1.

Results support filters for:

- repository
- document type
- category

Search covers installed Readable and Partially readable content only; catalog discovery is separate. Results are grouped into one result per page, with a relevant excerpt and match count. Ranking prioritizes exact title and API-name matches, then heading matches, then body and code matches. Repeated code matches must not overwhelm a more relevant exact title match. Search results do not display version labels.

Identifier matching preserves meaningful punctuation: queries such as `useState`, `std::vector`, and `--force` must find the corresponding identifiers. Quoted phrases match contiguous text; unquoted terms support exact-token and token-prefix matching. Matching and highlighting use consistent normalization rules.

During progressive indexing, search displays coverage, for example “Searching 3 of 5 sources; 2 still indexing.” Zero-result states distinguish incomplete coverage from a completed search with no matches.

Opening a result navigates to the exact match, highlights the query, and provides next/previous match navigation.

Unsupported repositories are excluded from indexing and global search.

## 10. Bookmarks, collections, and history

Bookmarks save immediately through confirmed persistence; a failed write shows an error and never reports a successful save. A quick collection picker can assign a bookmark to a collection, including the last-used collection shortcut.

Collections are flat. Users can create built-in and custom tags with autocomplete. Bookmarks preserve the document path and selected branch/tag name, but not a fixed commit snapshot.

Bookmarks whose paths no longer resolve after updates or version switches remain visible and show an error when opened. No historical snapshot or automatic version recovery is provided.

Bookmarks remain visible after their repository is uninstalled and are marked unavailable until the repository is installed again.

Xenics tracks recent documents and restores each document’s last reading position. Tabs and reading history are stored locally.

## 11. Tasks and notifications

The notification panel provides:

- active download, update, and indexing tasks
- progress indicators
- cancel controls
- retry controls
- persistent recent activity history

Native completion/error notifications are used when Xenics is not focused, subject to user settings. Foreground feedback and progress remain in-app. Bulk/repeated failures are deduplicated according to the adopted recovery strategy.

Each task is isolated. One failed repository operation does not block unrelated tasks.

## 12. User-scoped storage

Xenics stores runtime data outside the application bundle and source repository. The default user-scoped layout is conceptually:

```text
Xenics user scope/
├── data/
│   ├── settings
│   ├── bookmarks and collections
│   ├── repository catalog metadata
│   ├── tabs and reading history
│   └── task history
├── cache/
│   ├── SQLite search index
│   ├── rendered document cache
│   └── temporary task data
└── library/
    └── managed repository downloads
```

The user can move the managed library to a custom location. Xenics’ reset operation includes that managed location. Externally referenced local folders are never deleted by reset.

The entries under `data/` above are logical contents of the durable user-data SQLite database, not a requirement for individual files. The search database remains under the local cache location. Moving the library moves repository files, not either database.

## 13. Security requirements

- Use least-privilege Tauri capabilities and scoped filesystem permissions.
- Expose only narrow Rust commands to the frontend.
- Restrict filesystem access to the managed library and explicitly selected local folders.
- Execute system Git using validated argument arrays, never shell-concatenated command strings.
- Validate repository URLs, branches, tags, paths, and destination folders.
- Treat every repository as untrusted input.
- Parse Markdown/MDX without executing arbitrary repository JavaScript.
- Sanitize rendered HTML and block scripts and unsafe embeds.
- Apply a strict Content Security Policy.
- Redact credentials and private URLs from task logs.
- Do not store Git passwords, tokens, or SSH keys in Xenics.
- Prevent path traversal and managed-library escape through repository names or metadata.
- Require explicit confirmation for full reset and managed-file deletion.

## 14. Performance requirements

- Downloads, Git operations, file watching, indexing, and database writes run outside the UI thread.
- Use a bounded task queue with fixed safe concurrency.
- Use batch SQLite transactions and FTS5 indexes.
- Use incremental reindexing based on file metadata and content hashes.
- Debounce filesystem watcher events.
- Make supported repositories progressively searchable during indexing.
- Lazy-load documents, images, code highlighting, and rendered content.
- Virtualize large card grids, result lists, and activity history.
- Keep repository content out of the React state except for the active document and required metadata.
- A ready search interaction should return results in roughly 100 ms on a typical development machine.
- A failed task must not block unrelated task execution.

## 15. Testing strategy

### Frontend

Use React Testing Library/Vitest for component and interaction tests. Playwright may supplement these with browser-only tests, but is not the desktop end-to-end runner.

- Component tests for cards, tabs, catalog selection, filters, search results, bookmarks, collections, notifications, and reset confirmation.
- Interaction tests for click-to-open, checkbox selection, Shift-range selection, tab operations, exact-match navigation, and density modes.

### Rust core

- Repository source validation tests.
- Managed path and collision tests.
- Git command construction and dirty-repository protection tests.
- Storage, reset, and external-folder protection tests.
- Incremental indexing and FTS5 query tests.
- Shared parsing/rendering/indexing fixtures, including safe MDX fallbacks and matching document locations.
- Database migrations, packaged FTS5 availability, and search-cache rebuild isolation from user data.
- Watcher reconciliation after missed events, restart, and Git operations, including polling fallback.
- Task cancellation, retry, failure isolation, and progress-event tests.

### End-to-end

Use WebdriverIO with `@wdio/tauri-service` against the actual Tauri application on macOS, Windows, and Linux. Keep embedded test-driver instrumentation confined to test builds.

- First-launch welcome flow.
- Add, download, index, open, update, and remove supported repositories.
- Add and update unsupported remote repositories.
- Add local Git and non-Git folders.
- Search while indexing.
- Update-all and selected-download review flows, including external-folder opt-in, pinned tags, and skipped-source explanations.
- Generic Markdown detection, documentation-root preview, and curated capability validation.
- Single-version switching and invalid bookmarks/tabs after updates.
- Start-page opening, last-page restoration, per-tab history, and missing-page recovery.
- Search ranking, punctuation-bearing identifiers, quoted phrases, page grouping, and incomplete-index coverage.
- Git prerequisite validation and website-only catalog actions.
- Session restoration and deep links.
- Full reset with managed and external paths.

Cross-platform CI must cover macOS, Windows, and Linux for filesystem, Git, notifications, path handling, and packaging behavior.

### Early stack acceptance prototypes

Before broad implementation, validate:

1. **Document compatibility:** representative Markdown/MDX sources, safe component fallbacks, links/assets, and alignment between displayed content and indexed matches. Confirm or replace the proposed parser based on these results.
2. **Search suitability:** index representative prose, long code blocks, and API references. Test exact identifiers including `C++`, `C#`, `std::vector`, `--force`, and `useState`, quoted phrases, common terms, short prefixes, and repository filters. Define expected top results to check relevance, including exact API/title matches outranking incidental body mentions. Measure query-to-results latency including ranking and snippets, warm and cold caches, and concurrent indexing. Record corpus size, indexed bytes, hardware, p50/p95 latency, index size, and rebuild time. Evaluate the roughly 100 ms ready-search target on a declared representative machine/corpus, rather than assuming FTS5 meets it; report cold-start behavior separately. Finalize FTS5 only after checking relevance and performance, or evaluate the embedded fallback described in Section 4.4.
3. **Responsiveness and cancellation:** run update/index work while navigating and searching, then cancel it. Verify bounded background work, accurate cancellation state, and continued reader responsiveness on the supported desktop platforms.

## 16. Deferred capabilities

The following remain intentionally deferred:

- annotations and notes
- semantic/AI search
- cloud synchronization
- export/import
- commit-level document history
- simultaneous installation of multiple documentation versions for one source
- arbitrary interactive MDX execution
- hosted documentation sources without a repository adapter
- background updates while Xenics is closed
