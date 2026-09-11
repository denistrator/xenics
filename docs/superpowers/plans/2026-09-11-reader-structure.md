# Reader Structural Markdown Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Preserve common ordered/unordered lists and block quotes as semantic, accessible reader content rather than flattening them into ordinary paragraphs.

**Architecture:** The Rust parser continues to own the Markdown AST boundary and emits typed, serializable list and quote blocks that contain only safe inline spans and flattened readable text. React maps those types to `ol`, `ul`, `li`, and `blockquote`; no repository content becomes HTML or executable code.

**Tech Stack:** Tauri 2, Rust, `markdown-rs`, React 19, TypeScript, Vitest.

## Global Constraints

- Repository Markdown and MDX must never be executed or injected as HTML.
- Inline spans reuse the established allowlisted model.
- Nested/source-complex list content is flattened into its item’s readable text for this milestone; it must remain searchable and never disappear.
- Existing MDX and raw-HTML warning behavior remains unchanged.
- Lists and quotes retain source locations for exact reader highlighting.

---

### Task 1: Parse structural blocks in the native model

**Files:**

- Modify: `src-tauri/src/documents/model.rs`
- Modify: `src-tauri/src/documents/parser.rs`
- Modify: `src-tauri/src/documents/indexer.rs`
- Modify: `src-tauri/src/documents/tests.rs`

**Produces:** `ReaderBlock::List` and `ReaderBlock::BlockQuote`, each retaining typed inline content, readable text, and source location.

- [x] Add failing native tests for ordered and unordered list item spans, a block quote, preserved flattened reader/search text, and unchanged MDX/HTML warnings.
- [x] Run the focused tests and confirm they fail before implementation.
- [x] Add serializable list/quote variants and include their text in reader-text/indexer projections.
- [x] Convert direct paragraph list items to typed item spans; preserve non-paragraph child text in the same item rather than dropping it.
- [x] Convert block-quote contents to safe typed spans and text without duplicating nested child blocks in the root document.
- [x] Run focused and full Rust tests, formatter, and diff checks.
- [ ] Commit with `feat: parse reader structural markdown`.

### Task 2: Render semantic reader structure

**Files:**

- Modify: `src/features/reader/DocumentView.tsx`
- Modify: `src/features/reader/DocumentView.test.tsx`
- Modify: `src/features/reader/reader-hooks.ts`
- Modify: `src/features/reader/reader-hooks.test.ts`

**Produces:** Accessible ordered/unordered lists and block quotes with the existing focus/highlight behavior.

- [ ] Add failing reader tests for `ul`, `ol`, `li`, `blockquote`, safe inline spans in these blocks, and location highlighting.
- [ ] Run focused tests and confirm they fail before implementation.
- [ ] Extend native-to-reader mapping with list/quote fields while retaining browser fixture fallback behavior.
- [ ] Render semantic list and quote elements with standard React text escaping and the established inline-span renderer.
- [ ] Run focused/full frontend tests, build, E2E typecheck, and diff checks.
- [ ] Commit with `feat: render reader structural markdown`.

### Task 3: Record coverage and complete validation

**Files:**

- Modify: `docs/superpowers/plans/2026-09-11-reader-structure.md`
- Modify: `docs/superpowers/reports/spec-gap-review.md`
- Modify: `docs/superpowers/reports/implementation-status.md`

- [ ] Update reports with exact structural Markdown scope and remaining curated MDX limitations.
- [ ] Run frontend tests, Rust tests, build, E2E typecheck, native macOS E2E, packaged verification, production audit, formatting, and diff checks.
- [ ] Commit with `docs: record reader structural coverage`.

## Completion checklist

- [ ] Ordered/unordered lists and block quotes render semantically in the reader.
- [ ] Their content is searchable and retains exact block locations.
- [ ] No raw HTML or executable MDX route is introduced.
- [ ] Full release verification passes.
