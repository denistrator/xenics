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
```

Run the real desktop smoke suite after building the debug application:

```bash
npm run tauri build -- --debug
npm run test:e2e
```

The E2E harness uses an isolated test scope. Do not point it at a personal Xenics library.

Native lifecycle commands are registered during Tauri startup. The application
data scope contains `user.sqlite` for source/task/user records and
`search.sqlite` for disposable FTS5 records. A download request validates its
managed destination, invokes system Git with explicit ref/shallow options,
indexes supported documents, and persists the source only after those steps
complete. The queued variant stores task snapshots durably and responds to
native cancellation before a task reaches its terminal canceled state. Native
task events use the `task://<task-id>` channel and strictly increasing sequence
numbers; consumers must reject stale or terminal-state transitions.

## Platform targets

The primary target is desktop macOS, Windows, and Linux. Mobile support is a future read-only/synced companion target; do not assume desktop filesystem, explorer, editor, terminal, or long-running background behavior exists on iOS.

## Dependency and security review

Use the committed lockfiles. Review `npm audit` and Rust advisories deliberately; do not apply forceful automatic upgrades without checking compatibility. Dependencies that parse untrusted documentation must be evaluated for safe, non-executable behavior.

Update this guide whenever setup, supported platforms, scripts, test requirements, or release prerequisites change.
