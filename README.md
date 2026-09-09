# Xenics

Xenics is a cross-platform, local-first developer documentation library. It manages documentation repositories, safely renders supported content, indexes it for exact search, and provides a focused tabbed reading workspace.

## Project status

Xenics is in active foundation development. The native command boundary connects catalog source metadata to clone, indexing, durable source records, safe document reads, durable task snapshots, source lifecycle operations, reader sessions, settings, and desktop actions. Remaining work is tracked in the implementation status report.

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

### Required local tools

- Node.js LTS and npm
- Rust stable with Cargo, installed through `rustup`
- Git available on `PATH`
- macOS: Xcode Command Line Tools
- Windows: Microsoft C++ Build Tools and WebView2
- Linux: the Tauri WebKitGTK/build/OpenSSL/app-indicator/SVG development packages for the chosen distribution

Future mobile builds additionally require full Xcode for iOS or Android Studio, Android SDK/NDK, and Java for Android. Mobile is a future read-only/synced companion target, not the current desktop runtime.

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
