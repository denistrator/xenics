# Xenics documentation overview

Xenics is a local-first documentation library for managing supported and unsupported repositories.

A managed repository uses a stable library path. A cancellable task must stop before reporting completion.

## Document index

Readable repositories are discovered, rendered safely, and added to an exact document index. The library path uses stable vendor and package names.

## Safe rendering

Documentation is untrusted input. Xenics renders a safe Markdown and MDX subset without executing repository JavaScript or arbitrary components.

## Exact search

Search supports exact terms, token prefixes, quoted phrases, punctuation-aware identifiers, and filters. It does not use fuzzy, semantic, or AI search.

## Task lifecycle

Downloads, updates, and indexing are cancellable tasks. A canceled task must stop its worker and child process before reporting completion.

![Local documentation](./assets/documentation.png)

See [the API reference](./api-reference.md) and [the code examples](./code-heavy.md).
