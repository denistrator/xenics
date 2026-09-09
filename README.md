# Xenics

Xenics is a cross-platform, local-first developer documentation library. It manages documentation repositories, safely renders supported content, indexes it for exact search, and provides a focused tabbed reading workspace.

## Project status

Xenics is in active foundation development. The native command boundary now connects catalog source metadata to clone, indexing, durable source records, safe document reads, and durable task snapshots. Reader sessions, live task events, updates, and the remaining catalog lifecycle are still being implemented incrementally from the approved specifications.

## Technology

- Tauri 2 desktop shell
- React, TypeScript, Vite, and Tailwind CSS
- Rust application core
- System Git for repository operations
- SQLite with FTS5 for durable user data and disposable search data
- Vitest and Testing Library for frontend tests
- WebdriverIO with the Tauri service for desktop smoke tests

## Development

See [the development guide](docs/DEVELOPMENT.md) for complete prerequisites, platform dependencies, setup, testing, and build commands. Release validation also requires a platform-native packaging environment; signing/notarization credentials are intentionally not part of the repository.

```bash
npm install
npm test -- --run
npm run build
cargo test --manifest-path src-tauri/Cargo.toml
npm run test:e2e
npm run verify:packaged
```

## Product documentation

- [Development guide](docs/DEVELOPMENT.md)
- [Architecture overview](docs/ARCHITECTURE.md)
- [Product design specification](docs/superpowers/specs/2026-09-09-xenics-design.md)
- [Error-handling strategy](docs/superpowers/specs/2026-09-09-xenics-error-handling-strategy.md)
- [Implementation plan](docs/superpowers/plans/2026-09-09-xenics-implementation-plan.md)
- [Implementation status](docs/superpowers/reports/implementation-status.md)

Documentation is a living part of the project. Each implementation task should update the relevant guides, architecture notes, and status statements when behavior or developer workflow changes.
