# Xenics stack-validation gate

Status: corpus declared; measurements not yet run.

## Corpus

- Manifest: `tests/fixtures/acceptance/manifest.json`
- Revision: `working-tree`
- Representative fixture types: Markdown, MDX, prose, code-heavy pages, links/assets, API reference, malformed content
- Target scale: 1,000 generated documents and at least 10 MiB indexed content
- Query set: 30 declared identifier, phrase, prefix, punctuation, and filter queries

## Environment

The runtime, OS, CPU, memory, page counts, and indexed byte counts must be recorded by the executable prototype at measurement time. No values are marked as passed until the corresponding check has run.

## Acceptance decisions

| Area | Required evidence | Status |
| --- | --- | --- |
| Markdown/MDX parsing | Safe visible output, links/assets, component fallback, malformed-content handling, rendered/indexed agreement | Not run |
| FTS5 search | Exact identifier expectations, 90% top-three relevance threshold, warm p95 ≤ 100 ms after 200 measured requests | Not run |
| Cancellation | Actual worker/process termination before canceled state, no mutation after cancellation, responsive reader | Not run |

## Decision rule

Tasks 2 onward may define contracts, but production database, parser, and indexer decisions must not be labeled accepted until the relevant prototype evidence is recorded here. A failed parser or FTS5 gate requires an alternative evaluation before production implementation.
