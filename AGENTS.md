# Xenics repository guide

## Scope

This repository contains Xenics, a Tauri 2 desktop application with a React/TypeScript frontend and Rust core. The approved product requirements live in `docs/superpowers/specs/`; the task sequence lives in `docs/superpowers/plans/`.

## Before changing code

1. Read the relevant product specification and implementation-plan task.
2. Keep changes within the task's stated boundaries.
3. Write a focused failing test before production behavior changes.
4. Treat repositories and documentation as untrusted input.

## Architecture boundaries

- `src/app`, `src/components`, and `src/features`: React UI and feature views.
- `src/lib`: typed frontend/native boundary; do not call raw Tauri commands from feature components.
- `src-tauri/src/commands`: thin Tauri command adapters.
- `src-tauri/src/core`: domain models and use cases.
- `src-tauri/src/git`: system Git integration only.
- `src-tauri/src/documents`: discovery, parsing, safe rendering, and indexing.
- `src-tauri/src/persistence`: durable user database and disposable search database.
- `src-tauri/src/tasks`: cancellation, retries, recovery, and ordered task events.
- `src-tauri/src/filesystem`: managed paths, watchers, and reconciliation.
- `src-tauri/src/desktop`: editor, browser, terminal, explorer, and notification integrations.

Keep platform-specific behavior behind Rust services or adapters. Do not add an embedded Git implementation or a Xenics credential store.

## Required checks

Run:

```bash
npm test -- --run
npm run build
cargo test --manifest-path src-tauri/Cargo.toml
git diff --check
```

Do not claim desktop compatibility from browser tests alone. Use the Tauri/WebdriverIO smoke suite for desktop behavior.

## Security rules

- Never interpolate untrusted values into shell commands.
- Pass Git arguments as structured arguments and redact credentials/private URLs from diagnostics.
- Do not execute repository JavaScript or arbitrary MDX.
- Preserve least-privilege Tauri capabilities and filesystem scopes.
- Do not delete referenced local folders during reset or cleanup.

## Documentation rule

When a task changes commands, prerequisites, architecture, storage, supported behavior, testing, or recovery UX, update `README.md`, `docs/DEVELOPMENT.md`, `docs/ARCHITECTURE.md`, or the relevant specification notes in the same change.
