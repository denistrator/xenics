# Xenics error handling and recovery strategy

**Status:** Adopted by user approval
**Date:** 2026-09-09
**Scope:** Product behavior, recovery actions, UI feedback, and implementation requirements for v1.
**Related spec:** [Xenics design](2026-09-09-xenics-design.md)

## 1. Review findings and recommended approach

The design already requires task isolation, cancellation, retries, dirty-repository protection, and errors for content invalidated by updates. It does not yet define retry eligibility, partial success, interrupted operations, persistence failures, or which UI surface owns an error.

Use contextual errors with a persistent activity record. Toast-only feedback disappears before users can act; modal-first handling interrupts unrelated work. Contextual feedback keeps the failure and its recovery action together while the task panel provides history and diagnostics.

An error must answer: what failed, what remains usable, and what the user can do next. Do not invent a cause when the application cannot establish it.

Preserve the approved product boundaries: one installed version per source, no content snapshots or rollback guarantee, and no promise to preserve reading progress across updates. Invalid pages and bookmarks can show errors. This does not permit silently losing bookmark writes or overwriting users' Git changes.

## 2. State model

Track installation, reading capability, search readiness, and task outcome separately. A single red “Failed” repository status is insufficient.

Examples:

- Download failed: source is not installed; retry download is available.
- Download succeeded, indexing failed: source is installed and can be browsed where rendering works; search is incomplete; retry indexing only.
- Update failed: inspect the working tree before claiming current files are usable. Show last successful sync separately from the failed attempt.
- Update succeeded, some pages failed parsing: installed with content warnings and incomplete search coverage.

Tasks have explicit states: Queued, Running, Waiting to retry, Needs action, Canceling, Canceled, Succeeded, Succeeded with warnings, Failed, and Interrupted. “Needs action” releases the worker slot. Warnings never become full-success messages.

Persist operation identity, source, phase, attempt count, and outcome. After restart, reconcile unfinished tasks with actual files and Git state; never infer success from an absent process.

## 3. UI placement and interaction

| Surface | Use | Behavior |
| --- | --- | --- |
| Field or form | Invalid URL, path, branch, or configuration | Show beside the field; retain entered values and focus; submit remains available after correction. |
| Page or component | Missing document, failed image, renderer error | Replace only the affected area; keep tabs, navigation, and the rest of the app usable. |
| Source card/details | Source unavailable, update blocked, index incomplete | Show a short status and one primary recovery action; retain useful Read/Open folder actions. |
| Task panel | Download/update/index failures and detailed history | Persist phase, outcome, available actions, and expandable sanitized details. |
| Toast | Brief acknowledgement of a foreground action | Never the only place to find a persistent error or its remedy. |
| App banner | Shared problem such as unwritable app storage | One deduplicated banner with scoped impact; avoid one message per failed write. |
| Dialog | Destructive recovery or confirmation | Use for deletion/reset decisions, not ordinary failures. |
| Startup recovery screen | Essential app state cannot be opened | Offer retry and diagnostics; never silently reset user data. |

Only disable actions that depend on the failed capability. Missing Git prevents Git operations but leaves already available local reading usable. Search failure does not disable browsing. A task failure must not move focus, close tabs, clear a query, or reset catalog selection.

Use text and icons as well as color. Announce meaningful status changes accessibly without announcing every progress tick. Keep inline errors available until resolved or the affected view is left. Dismissing a toast or activity item does not mark the underlying issue resolved.

## 4. Error and recovery matrix

| Failure | Application action | User-facing recovery |
| --- | --- | --- |
| Git missing or unusable configuration | Block the affected Git operation after environment validation; do not block the whole reader. Validate only prerequisites needed by that operation. | “Git is unavailable.” Open setup guidance; Check again. |
| Authentication failure or SSH host verification required | End the attempt without repeated prompts; use existing system credential helpers, never bypass host verification. Do not leave a worker waiting indefinitely for invisible terminal input. | Explain that system Git access needs attention; Open terminal at an existing relevant folder; Check again. |
| Offline, connection interruption, temporary remote failure | Keep local reading available; apply bounded transient retries. A failed check leaves update availability unknown, not “Up to date.” | Task status and Retry now; last successful check remains visible. |
| Repository unavailable or access denied | Do not assume the repository was deleted when access cannot be distinguished from absence. Stop automatic retries. | Check URL/access; Edit source; Retry. |
| Branch/tag no longer available | Leave the selection visible and mark it unavailable; never silently choose another version. | Choose branch/tag; Cancel. |
| Managed path collision | Refuse the operation before writing to the destination; never adopt or overwrite unrelated files. | Show conflicting source/path; Use existing entry when it is the same source, otherwise cancel or edit the source. |
| Dirty/diverged repository or Git lock | Refuse update; do not stash, reset, merge, or delete locks automatically. | Explain the blocker; Open folder/terminal; Retry after manual resolution. |
| Pinned tag or external-folder updates disabled | Treat as a skipped operation, not an error. | Explain skip in bulk review; link to source settings when applicable. |
| Disk full or permission denied | Stop affected writes and related automatic retries; retain known valid data; report any incomplete work. | Free space or fix access; Open storage settings; Check again. No automatic file deletion. |
| Library drive/local folder missing | Mark source unavailable; preserve its registration, tabs, and bookmarks; do not recreate an empty library in its place. | Reconnect location; Locate folder; Retry. Validate identity before relinking. |
| No readable content detected | Mark Files only rather than treating a successful clone as failed. | Choose documentation folder; Open folder. |
| Unsupported component or broken image | Render the rest of the document; use a local placeholder and a capability warning where needed. Never execute repository code as recovery. | Open source or validated website link when available. |
| Document parse/render failure | Isolate failure to that document; continue other pages and indexing. | Reload; Open source file; Search; Source home. |
| Missing page, invalid bookmark, or invalid deep link | Show an error in the target tab. Retain the bookmark/tab until the user removes it. Never switch versions automatically. | Search with useful page terms; Source home; source install/details when uninstalled. |
| Missing anchor or obsolete reading position | Open the available page at the top and explain that the requested location is unavailable. | Find in page; continue reading. |
| Individual indexing failures | Continue indexing other files; mark coverage incomplete and report failed-page count. | Retry failed pages; view affected files. |
| Search index corruption | Stop querying the unusable index; rebuild this disposable cache once automatically; browsing remains available. | “Rebuilding search”; Retry rebuild if it fails. No repeated rebuild loop. |
| Search request failure | Preserve query and filters; never show “No results” for a failed request. | Retry search; browse sources; index-repair action only if diagnosis warrants it. |
| Bookmark/settings save failure | Do not show a successful save. Restore the last confirmed state, retain form input for retry, and show an inline error. | Retry save. Shared storage failures also receive one app banner. |
| Session/history save failure | Keep the current session usable, but disclose that recent state may not survive restart. | Retry after storage recovery; do not flood activity with every failed position write. |
| Essential user-data database cannot open | Preserve files; do not replace with an empty database or suggest full reset as the first remedy. | Startup recovery: Retry, Open data folder, Copy diagnostics. |
| Editor/browser/terminal/clipboard action fails | Keep the document and selection intact; identify the failed action. | Retry; Configure editor or Open folder when applicable. |
| Unexpected frontend component failure | Contain it to the reader/search/panel where possible. | Reload affected view; retain surrounding workspace. |
| Core connection lost or unexpected process failure | Fail pending requests visibly, disable dependent actions, and attempt one reconnect. Do not show unbounded loading. | Reconnect or Restart app if needed; warn if session persistence is unavailable. |

Source-home recovery falls back to the document navigation view if the configured start page is also missing. Browser actions appear only when a valid source URL exists; they do not claim to work offline.

## 5. Retry, cancellation, and concurrency

- Automatically retry only classified transient failures in safe phases, such as update checks or fetch/network transfer. Use at most two automatic retries after the initial attempt, with approximately 2-second and 10-second delays and small jitter. Respect a supplied remote retry delay and show the wait explicitly.
- No automatic retries for invalid input, authentication, permissions, disk exhaustion, Git conflicts, rendering defects, or user cancellation. Unknown failures require inspection or explicit retry.
- A retry of a mutation first checks actual state. Never blindly replay a checkout, deletion, library move, or partially applied update.
- Retry only the failed phase. An indexing failure must not redownload the repository. Manual Retry resets the attempt budget; disable duplicate retry clicks while queued/running.
- Cancellation immediately changes the label to Canceling, requests cooperative shutdown, and waits for the operation/process to stop before showing Canceled. Explain phases that must finish before cancellation can take effect. Show cleanup failures separately.
- Serialize mutations to the same source. Different sources may continue. Removal/reset waits for affected work to stop; external-folder updates revalidate Git state immediately before changing files.
- Use phase-aware timeouts. Lack of a percentage is not proof of a hang. Show indeterminate progress when total work is unknown, with current phase and elapsed time. A stalled operation remains cancelable.

## 6. Partial work and restart recovery

Downloads use a task-owned temporary destination and are registered as installed only after clone validation. Failed or canceled downloads clean up only their own temporary files. Retry may restart the transfer; v1 does not promise resumable downloads.

An interrupted update is inspected before another mutation. If Git state is safe, offer retry; otherwise explain the manual repair needed. Do not automatically roll back content or repair user changes. Tabs affected by changed/missing content follow the ordinary invalid-content error behavior.

After a source update/version switch, invalidate its old search entries before exposing progressively indexed current content. A failed rebuild leaves partial or unavailable search for that source rather than knowingly serving the old index. A search result opened during a subsequent update may still become invalid and uses the missing-page behavior.

On restart, mark uncompleted operations Interrupted and reconcile them. Safe cache indexing can restart automatically; repository mutations and destructive operations require an explicit retry after inspection. This is operation bookkeeping, not content snapshots.

Removal and reset can partially fail. Report which managed paths/data were removed and which remain; do not claim successful reset while deletion is incomplete. Retain enough operation bookkeeping to explain/retry remaining authorized cleanup. Reset clears its bookkeeping only after completion. Do not expand cleanup to unrelated files or externally referenced folders.

Library moves validate the destination, avoid overwriting existing unrelated files, and switch the configured location only after transfer verification. On failure retain the original location when still valid and identify any partial destination files; cleanup requires explicit confirmation. Moving library storage does not introduce documentation revision history.

## 7. Notification and message policy

- Foreground background-task results go to the task panel and a concise in-app summary. Native completion/error notifications are reserved for when the app is not focused, subject to notification settings. Denied notification permission is not an app error.
- Bulk operations produce one summary: for example, “8 updated, 2 need attention, 1 skipped.” Provide View issues and Retry eligible failures; never replay successes or blocked failures.
- Group shared causes such as an offline connection or full disk. Keep per-source details without emitting a toast/native alert for each source or each retry.
- Automatic retries update the same activity item. Once exhausted, show one actionable failure. Repeated scheduled checks with the same unresolved failure update its timestamp without another native alert.
- Use one clear primary action, at most two secondary actions, and expandable technical details. Do not show generic Retry when the user must first fix a prerequisite.

Message examples:

- “React docs downloaded. Search indexing failed. You can still browse the documents.” Primary: Retry indexing.
- “This page is no longer available in the installed documentation.” Primary: Search documentation. Secondary: Source home.
- “Update stopped because this folder has local changes. Xenics did not overwrite them.” Primary: Open folder. Secondary: View details.
- “Bookmark could not be saved because app storage is not writable.” Primary: Retry. Secondary: Storage details.

## 8. Implementation contract and diagnostics

The Rust core reports structured errors with a stable code, affected source/document/task, operation phase, user-safe explanation, retry classification, available recovery actions, and diagnostic ID. The frontend maps these to consistent messages and action labels. Raw subprocess output is never the primary message, and recovery choices are not inferred by parsing display text.

The core owns task state and returns a current snapshot when the frontend reconnects. Events include operation identity and ordering information so late progress cannot overwrite a terminal state. Commands acknowledge acceptance separately from completion; a successful dispatch is not a successful operation.

Logs are local, bounded, and sanitized before persistence or display. Exclude credentials, credential-bearing URLs, private repository URLs, and document content. Copy diagnostics includes operation codes, phase, app/platform information, and sanitized failures, with a preview. Diagnostics are never uploaded automatically. If logging itself fails, show the original error without recursive error reporting.

## 9. Acceptance checks

Verify with failure injection and representative cross-platform fixtures:

1. Disconnect during one of several downloads: other tasks and local reading remain usable; retries stop at the budget; no notification storm.
2. Fail indexing after download: installed state remains correct; Retry indexing does not clone again; search identifies incomplete coverage.
3. Remove a page during update: its tab/bookmark shows recovery actions; no automatic version switch or snapshot recovery occurs.
4. Make one document malformed: other pages render and index; the source reports warnings rather than total failure.
5. Fail a bookmark write: no saved confirmation appears; retry remains possible; prior persisted bookmarks remain intact.
6. Remove the library drive: preserve source registration and user state; do not create replacement directories; relinking checks identity.
7. Cancel/restart during clone, update, indexing, deletion, and library move: state reflects actual outcomes and cleanup never touches unrelated files.
8. Test authentication, dirty/diverged Git state, lock contention, pinned tags, and disabled external updates: errors versus skips and next actions are correct.
9. Corrupt the search cache: one rebuild attempt occurs; failure never deletes user data or causes an endless retry loop.
10. Fail removal/reset partway: show remaining paths and do not claim completion.
11. Deliver late/duplicate task events: completed or canceled tasks do not return to Running; retry clicks cannot launch duplicate mutations.
12. Use keyboard and assistive technology: recovery controls are reachable, focus is stable, messages do not depend on color, and progress announcements are restrained.

## 10. Integration into the main design

This strategy is adopted and is normative alongside the main design. Its detailed recovery, persistence, and notification rules govern implementation and are referenced by the implementation plan.

This proposal does not add automatic content rollback, multiple installed versions, credential storage, or automatic destructive repair.
