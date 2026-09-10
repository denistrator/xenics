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
- Historical local macOS validation covered the desktop shell; the current regression counts are recorded below. Native E2E shell assertions now start through the direct embedded WebDriver connection; macOS passes locally and in hosted CI, while Linux and Windows remain under platform-launch investigation.

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
- Reader pages now expose source-folder and source-URL actions for the active tab through the existing native opener boundary, plus close-other and close-to-right actions that preserve pinned tabs.
- Catalog cards now support user-scoped pin/hide organization, pinned-first ordering, and an explicit show-hidden filter.
- Reader page actions now include a safe source-file opener constrained to the installed source root.
- Reader tabs now support drag-and-drop reordering in addition to persisted tab order.
- Search results now support repository/document-type filters, exact whole-word matching, and previous/next keyboard navigation across the filtered set.
- Catalog details now support editing display name, icon, description, category, and tags, including custom categories and reset-to-default; overrides remain separate from built-in metadata.
- The built-in catalog now includes the full planned technology candidate list as curated entries or safe Website-only discovery cards; Website-only cards open validated public URLs directly and remain excluded from bulk downloads.
- The catalog now accepts unsupported HTTPS/SSH Git repositories with a selected branch/tag and manages them as Files-only custom sources.
- Local-source onboarding now supports desktop drag-and-drop into the explicit confirmation dialog.
- Local-source onboarding now also provides a desktop folder-picker affordance before confirmation.
- Reader presentation now supports compact and comfortable density modes alongside zoom controls.
- Reader page actions now include a configured-editor opener with source-root containment and no shell interpolation.
- Reader page actions now include platform-specific terminal opening for the installed source root without shell interpolation.
- The full search results page is now reachable from primary navigation and shares live native query state with the command palette.
- Full search filtering now includes repository, document type, and catalog category.
- Technology groups now show aggregate installation status and capability summaries, with group-level Download and Update actions that only target applicable sources.
- Repository cards now expose typed operational metadata fields for source type, ref, local location, sync time, update availability, and disk usage; unavailable values remain omitted rather than guessed.
- Multi-select catalog actions now support Update selected, Hide selected, and Remove selected with installed-source eligibility and selection cleanup after destructive organization actions.
- Bookmark organization now offers a session-scoped quick action for assigning the last-used collection, alongside the explicit collection selector.
- Reader documents now support safe unsupported-embed blocks with an offline explanation and an explicit validated browser-opening action.
- Search results now highlight query terms in titles and excerpts using escaped, plain-text rendering; native ranking and retrieval remain unchanged.
- Exact search navigation now preserves native block locations through reader tabs and visibly marks the matching reader block.
- Deep-link anchors now survive in reader tabs and focus stable sanitized heading IDs in the rendered document.
- Progressive search coverage now reports indexed and total source counts plus the remaining indexing count, while preserving the completed zero-result state.
- Native source listing now provides authoritative update timestamps and symlink-safe directory sizes; catalog cards hydrate last-sync and disk-usage metadata when available.
- Release-readiness regression passed locally for Rust formatting, frontend tests, E2E typecheck, and packaged verification. Native E2E now connects directly to the embedded Tauri WebDriver server, avoiding the mismatched service focus hook; the expanded macOS suite passes 6/6 spec files.
- Native release-path formatting is now clean under `cargo fmt --check`; the full local acceptance sequence remains green after source-payload changes.
- Local macOS release bundle verification passed: `npm run tauri -- build --ci` produced an arm64 `Xenics.app` and `Xenics_0.1.0_aarch64.dmg`; artifact inspection and `verify:packaged` passed. Clean-profile install, deep-link registration, signing/notarization, and Windows/Linux bundles remain platform-owner checks.
- The cross-platform release workflow now retains each macOS, Ubuntu, and Windows bundle as a 14-day CI artifact, enabling the documented clean-profile installer and deep-link checks after hosted runs.
- The packaged-release verifier now requires a real release bundle and checks the normal Cargo dependency graph for absence of the E2E WebDriver plugin, preventing test instrumentation from being mistaken for a distributable build.
- Desktop deep-link registration is now configured for `xenics://`; incoming startup and runtime URLs are validated and routed to the reader, while invalid links are ignored safely. Clean installed-bundle verification remains platform-owner work.
- Production dependency audit passed with zero high-severity vulnerabilities; the full audit’s remaining findings are development/test-toolchain transitive advisories and are documented separately from shipped runtime dependencies.
- Native update commands now enforce the external-local-folder opt-in setting for both synchronous and queued updates; the policy is covered by a regression test at the command boundary.
- Native search responses now report distinct indexed readable sources versus readable installed sources for coverage metadata instead of incorrectly equating coverage with matching-result count.
- Scheduled update availability is now wired end to end: the native service performs non-mutating Git remote comparisons according to the saved schedule, and the catalog refreshes visible update status while the app is open.
- Packaged verification now machine-checks that the desktop `xenics` deep-link scheme is configured, and release CI runs the production dependency audit before building bundles.
- Update-check snapshots now persist and restore last-attempt, last-success, availability, and next-due state across app restarts; scheduler round-trip coverage passes in Rust tests.
- Reader documents can now expose nested curated or generic navigation trees; the sidebar renders them with safe path/history navigation and falls back to open tabs when no tree is available.
- Catalog installation hydration now consumes native source metadata, preserving selected refs and distinguishing local folders from Git sources while leaving editable display metadata independent.
- Installed Files-only/custom sources now expose individual Update actions; Website-only entries remain excluded from update controls.
- Recovery presentation now has reusable `InlineError` and `RecoveryActions` primitives, and task failures use the same structured retry-action surface.
- The app shell now exposes a toggleable notification panel fed by the ordered task feed, with an active-task loader, recent phases, and cancel/retry actions while detailed recovery remains in the task panel.
- Native settings persistence supports allowlisted get/update commands with validation for unknown keys, control characters, and oversized values. The UI is connected, including the ownership-aware full reset flow.
- React settings now hydrate from the native settings store and persist individual changes, while retaining local behavior and an inline warning when the native bridge cannot save.
- Latest macOS release verification passed for the native build and expanded 6/6 desktop E2E suite; the direct embedded-server connection is documented as a workaround for the published service/plugin mismatch.
- Native recursive file watching reports supported document changes and filters Git/dependency/build folders; the indexer now consumes changed and deleted documents incrementally with cancellation and source-root containment checks.
- Installed Git sources now expose native update and removal operations. Updates fetch, fast-forward, and re-index the selected source; removals clear derived search records first. Managed library folders may be deleted only through an explicit flag and containment check, while external/local folders remain user-owned.
- Native custom-source registration now accepts a validated local folder, detects an optional Git remote, persists the source outside managed-library deletion scope, and defaults unknown local folders to Files-only capability.
- Native external URL and folder actions now validate their target before delegating to the Tauri opener plugin, keeping browser and system-explorer launches outside shell interpolation.
- Full reset is now preview-first and confirmation-bound. It clears durable user records and the derived search index, deletes only canonical managed folders inside the library, preserves external/local-folder sources, and is exposed from Settings with a destructive confirmation dialog.
- Global Update all now opens a review dialog before queueing installed sources, clearly labels website-only sources as skipped, and keeps native policy enforcement authoritative.
- Catalog filtering is now functional for category, capability, and installation state; organization bookmark cards now have an explicit open action instead of a no-op handler.
- Final local acceptance verification passed for E2E typecheck, packaged-build verification, and all six macOS WebDriver specs, including catalog filtering/details and scheduled-update settings selection.
- Cross-platform desktop acceptance is now configured in `.github/workflows/desktop-acceptance.yml` for macOS, Ubuntu, and Windows, including real smoke runs, Ubuntu Xvfb setup, and normal release-bundle builds. Hosted run [34444883153](https://github.com/denistrator/xenics/actions/runs/34444883153) passes macOS smoke and all three release bundles; Linux and Windows smoke still fail to expose the embedded WebDriver server and remain under investigation.
- The native desktop suite connects directly to the embedded WebDriver server because the published service/plugin pair has an incompatible automatic window-focus hook; the workaround keeps the real Tauri binary and WebDriver protocol in coverage while avoiding that optional hook.
- A retained [release acceptance checklist](release-acceptance-checklist.md) now records local macOS evidence separately from installed-bundle, hosted CI, and distribution-credential checks that remain pending.

## Specification gap review

The current implementation has confirmed follow-up gaps in full Markdown/MDX
rendering fidelity, local assets, syntax highlighting, native notification
delivery, large-list
virtualization, and complete cross-platform acceptance coverage. See the
[specification gap review](spec-gap-review.md) for evidence and the recommended
implementation order. These items are not being represented as complete merely
because the surrounding architecture and prototype tests exist.
- The document pipeline now parses through `markdown-rs` into a shared AST-backed
model, preserves readable structure and source locations, exposes safe image
metadata, and reports unsupported MDX/unsafe HTML without executing repository
code. React renders safe relative image blocks with lazy loading and an offline
fallback.
- Search indexing now separates headings, prose, code, metadata, and API-name
fields, preserves source-relative metadata, and stores disposable per-block
match locations. Search results use those locations for exact reader navigation;
Rust search coverage includes code matches and punctuation-bearing identifiers.
- Reader code blocks now use a registered, bounded `highlight.js` language set
with line-by-line highlighting so source lines and controls remain stable.
Unrecognized languages remain escaped plain text. Local images accept only safe
relative paths, load lazily, and show an offline fallback for external or
traversal targets.
- Native OS notifications are now connected through Tauri's notification plugin.
The task feed requests permission only when needed, respects the persisted
notification setting and app focus, excludes cancellations, deduplicates terminal
outcomes per task attempt, and leaves task state unaffected when delivery fails.

## Safety note

Failed indexing does not automatically delete a partial clone. Cleanup must go
through an explicit, ownership-aware maintenance/reset flow so a failed task
cannot remove a user-owned directory accidentally.
