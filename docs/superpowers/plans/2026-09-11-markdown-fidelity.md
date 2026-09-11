# Standard Markdown Fidelity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Render standard Markdown tables and inline emphasis, strong text, inline code, and links faithfully and safely in the Xenics reader.

**Architecture:** Rust remains the sole parser and converts the `markdown-rs` AST into a serializable, Xenics-owned reader model. Inline content is represented as typed spans rather than raw HTML; React maps that allowlisted model to ordinary escaped elements. Tables carry text-only cells, preserving reader/search agreement without executing embedded HTML or MDX.

**Tech Stack:** Tauri 2, Rust, `markdown-rs`, React 19, TypeScript, Vitest.

## Global Constraints

- Repository Markdown and MDX must never be evaluated as JavaScript or injected as HTML.
- Unsupported MDX and HTML continue to produce the existing safe warning behavior.
- All links continue through the existing native URL/path validation boundary.
- Table and inline text contribute to reader text and search records with stable source locations.
- Keep `ReaderBlock` serializable and backwards-compatible for existing document consumers.

---

### Task 1: Extend the safe native document model

**Files:**

- Modify: `src-tauri/src/documents/model.rs`
- Modify: `src-tauri/src/documents/parser.rs`
- Modify: `src-tauri/src/documents/tests.rs`
- Modify: `src-tauri/src/documents/indexer.rs`

**Consumes:** `markdown-rs` mdast nodes and the existing `ParsedDocument` model.

**Produces:** `InlineSpan` and `ReaderBlock::Table`, with plain-text fallback fields retained for indexing and reader text.

- [x] Add failing Rust tests for nested emphasis/strong/inline-code/link text, a table header/body, table search text, and unchanged unsafe HTML/MDX warnings.
- [x] Run the focused native document tests and confirm the new assertions fail before implementation.
- [x] Add the serializable inline span model with `Text`, `Emphasis`, `Strong`, `InlineCode`, and `Link` variants; each link span carries its validated-later target and readable child spans.
- [x] Replace string-only paragraph/heading construction with the new span conversion while retaining a flattened `text` field for search, anchors, and compatibility.
- [x] Add a table reader block containing header and body cells as span arrays; emit an aggregate text search record at the table location.
- [x] Extend reader text and FTS index-field collection to include table text.
- [x] Run focused and full Rust tests, formatter, and diff checks.
- [x] Commit with `feat: parse standard markdown tables and inline spans`.

### Task 2: Render the typed reader model without HTML injection

**Files:**

- Modify: `src/features/reader/DocumentView.tsx`
- Modify: `src/features/reader/DocumentView.test.tsx`
- Modify: `src/features/reader/reader-hooks.ts`
- Modify: `src/features/reader/reader-hooks.test.ts`

**Consumes:** Serialized `InlineSpan` arrays and table blocks returned by `read_document`.

**Produces:** Semantic inline reader content and responsive accessible tables; links retain the existing internal/external callbacks.

- [ ] Add failing Vitest cases for semantic strong/emphasis/inline-code rendering, safely rendered table headers/cells, and callbacks for span-based internal/external links.
- [ ] Run focused tests and confirm they fail before implementation.
- [ ] Extend frontend document types and native-document mapping with optional inline spans and table rows, preserving browser fixtures that only provide plain text.
- [ ] Render inline spans recursively with React elements, never `dangerouslySetInnerHTML`; use the existing callbacks for link span targets.
- [ ] Render tables with `table`, `thead`, `tbody`, `th`, and `td`, inside a horizontally scrollable labelled region for narrow reader panes.
- [ ] Preserve exact location highlighting on table blocks and keep plain-text paragraph fallback behavior unchanged.
- [ ] Run focused and full frontend tests, production build, and E2E typecheck.
- [ ] Commit with `feat: render standard markdown fidelity`.

### Task 3: Record verified coverage and complete regression validation

**Files:**

- Modify: `docs/superpowers/plans/2026-09-11-markdown-fidelity.md`
- Modify: `docs/superpowers/reports/spec-gap-review.md`
- Modify: `docs/superpowers/reports/implementation-status.md`

**Produces:** Updated tracker and gap report distinguishing completed standard Markdown support from deferred curated MDX mappings.

- [ ] Update the plan checkboxes and reports with exact standard Markdown scope and the remaining curated-MDX limitation.
- [ ] Run frontend tests, Rust tests, build, E2E typecheck, native macOS E2E, packaged verification, production audit, formatting, and diff checks.
- [ ] Commit with `docs: record markdown fidelity coverage`.

## Completion checklist

- [ ] Headings and paragraphs preserve visible emphasis, strong text, inline code, and links without raw HTML rendering.
- [ ] Tables are semantic, readable on narrow panes, and included in search/index text.
- [ ] Reader navigation and native link validation remain unchanged.
- [ ] Unsupported MDX/HTML remains non-executable and visibly warned.
- [ ] Full regression validation passes.
