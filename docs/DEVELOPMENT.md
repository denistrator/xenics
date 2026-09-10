# Xenics development guide

## Required local tools

For desktop development, install Node.js LTS/npm, Rust stable through `rustup` (including Cargo), Git, and the platform build dependencies below.

On macOS, install Xcode Command Line Tools:

```bash
xcode-select --install
```

Full Xcode is only required for the future iOS target. iOS also requires CocoaPods and iOS Rust targets. Android requires Android Studio, the Android SDK/NDK, Java, and Android Rust targets.

Windows requires Microsoft C++ Build Tools with “Desktop development with C++” and Microsoft Edge WebView2. Linux requires the Tauri WebKitGTK, build, OpenSSL, app-indicator, and SVG development packages for the selected distribution. See the [Tauri prerequisites guide](https://v2.tauri.app/start/prerequisites/) for exact package lists.

## First setup

```bash
npm install
node --version
npm --version
rustc --version
cargo --version
git --version
```

## Run and verify

```bash
npm run dev
npm run tauri dev
npm test -- --run
npm run build
cargo test --manifest-path src-tauri/Cargo.toml
npm run typecheck:e2e
npm run verify:packaged
```

Run the real desktop smoke suite after building the debug application:

```bash
npm run tauri build -- --debug
npm run test:e2e
```

The E2E harness uses an isolated test scope. Do not point it at a personal Xenics library.
It launches the test-feature Tauri binary and connects WebdriverIO directly to
the embedded `tauri-plugin-wdio-webdriver` server. The currently published
`@wdio/tauri-service` package is not used because its automatic focus hook calls
window-state IPC that the matching Rust plugin does not expose.

The repository also defines a desktop acceptance workflow for macOS, Ubuntu,
and Windows. It runs the real desktop smoke suite and builds a normal release
bundle on each runner. The Ubuntu job installs Xvfb for the native WebView test
session. CI can verify build and runtime behavior, but clean-user installation,
OS deep-link registration, signing, and notarization still need platform-owner
checks and credentials. Record those results in the [release acceptance
checklist](superpowers/reports/release-acceptance-checklist.md).

`verify:packaged` also requires an actual release bundle, confirms the bundled
SQLite configuration, and checks that the normal Cargo dependency graph does
not include the E2E WebDriver plugin. The workflow retains each platform
bundle as a 14-day artifact for the remaining clean-profile and OS-registration
checks. The desktop bundle declares and registers the `xenics://` scheme; verify
it from a clean installed bundle because macOS does not support runtime scheme
registration during development.

Native lifecycle commands are registered during Tauri startup. The application
data scope contains `user.sqlite` for source/task/user records and
`search.sqlite` for disposable FTS5 records. A download request validates its
managed destination, invokes system Git with explicit ref/shallow options,
indexes supported documents, and persists the source only after those steps
complete. The queued variant stores task snapshots durably and responds to
native cancellation before a task reaches its terminal canceled state. Native
task events use the `task://<task-id>` channel and strictly increasing sequence
numbers; consumers must reject stale or terminal-state transitions.
The current React task feed follows this rule and treats an unavailable native
bridge as an empty feed without scheduling redundant state updates.
Source lifecycle commands also include validated local-source registration,
Git-source update/reindex (including cancellable queued updates), derived-search cleanup, and explicit managed-folder
removal. External/local folders remain user-owned and are never deleted by
default.

The Settings screen exposes a preview-first full reset. The native layer returns
the exact managed folders eligible for deletion and a confirmation token tied to
that preview. Execution clears managed folders, durable user records, and the
derived search index; referenced folders outside the managed library are never
deleted. Browser-mode settings keep the action unavailable because reset is a
desktop filesystem operation.

## Platform targets

The primary target is desktop macOS, Windows, and Linux. Mobile support is a future read-only/synced companion target; do not assume desktop filesystem, explorer, editor, terminal, or long-running background behavior exists on iOS.

## Dependency and security review

Use the committed lockfiles. Run `npm run audit:prod` before release; the
current production dependency set has no high-severity advisories. The full
`npm audit` also covers the development-only WebDriver/Vitest toolchain and may
report transitive issues there; do not ship those packages or apply forceful
automatic upgrades without checking compatibility. Dependencies that parse
untrusted documentation must be evaluated for safe, non-executable behavior.

Update this guide whenever setup, supported platforms, scripts, test requirements, or release prerequisites change.
