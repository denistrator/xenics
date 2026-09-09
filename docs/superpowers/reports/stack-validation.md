# Xenics stack-validation gate

Status: local macOS prototype passes; reader-view integration and Windows/Linux runs remain pending.

## Corpus

- Manifest: `tests/fixtures/acceptance/manifest.json`
- Revision: `working-tree`
- Representative fixture types: Markdown, MDX, prose, code-heavy pages, links/assets, API reference, malformed content
- Target scale: 1,000 generated documents and at least 10 MiB indexed content
- Query set: 30 declared identifier, phrase, prefix, punctuation, and filter queries

## Environment

Recorded for the passing local run:

- OS: macOS Darwin 25.1.0, arm64
- Node.js: v22.20.0
- Rust: 1.98.1
- Corpus: 1,000 generated documents, 607,400 source/indexed bytes
- SQLite index file: 1,138,688 bytes

## Acceptance decisions

| Area | Required evidence | Status |
| --- | --- | --- |
| Markdown/MDX parsing | Safe headings, links/assets, malformed input, and non-execution payload checks | Passed in throwaway parser; real reader-view integration pending |
| FTS5 search | 30/30 declared expectations; 200 warm requests; p50 348 µs; p95 447 µs; build 585 ms | Passed locally; cross-platform confirmation pending |
| Cancellation | Real Git child stopped before completion; bounded worker joined; no post-cancel mutation | Passed locally; cross-platform confirmation and reader responsiveness pending |

## Reproduction

```bash
cargo run --manifest-path prototypes/stack-validation/Cargo.toml
```

Observed output from the passing local run:

```text
parser: passed headings, links/assets, malformed input, and non-execution payload checks
cancellation: Git child stopped before completion; worker joined after 40218 iterations; no post-cancel mutation performed
search: documents=1000 indexed_bytes=607400 index_file_bytes=1138688 build_ms=585 queries=30 failures=0
search: first_query_us=251
search: warm_p50_us=348 warm_p95_us=447 warm_p95_ms=0.447
```

## Decision rule

Tasks 2 onward may define contracts, but production database, parser, and indexer decisions must not be labeled accepted until the relevant prototype evidence is recorded here. A failed parser or FTS5 gate requires an alternative evaluation before production implementation. The local results support proceeding with contract work while the remaining reader-view and cross-platform validation stays explicitly tracked.
