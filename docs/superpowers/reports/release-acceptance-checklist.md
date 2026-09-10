# Xenics release acceptance checklist

Updated: 2026-09-10

This checklist separates repository-verifiable release properties from checks
that require an installed bundle and a platform distribution environment.
Pending items are not treated as automated passes.

## Local macOS evidence

| Check | Result | Evidence |
| --- | --- | --- |
| Normal release build | Passed | `npm run tauri -- build --ci`; arm64 `.app` and `.dmg` generated |
| Frontend production build | Passed | `npm run build` |
| Rust test suite without E2E feature | Passed | 63 tests passed |
| Frontend test suite | Passed | 71 tests passed |
| Native desktop E2E | Passed | 6 spec files passed through the real Tauri WebDriver server |
| E2E typecheck | Passed | `npm run typecheck:e2e` |
| Rust formatting | Passed | `cargo fmt --manifest-path src-tauri/Cargo.toml -- --check` |
| Production dependency audit | Passed | `npm run audit:prod`; 0 vulnerabilities |
| Release dependency isolation | Passed | `npm run verify:packaged`; E2E driver absent from normal Cargo dependencies |
| Bundled SQLite and FTS5 configuration | Passed | `npm run verify:packaged` |
| `xenics://` bundle declaration | Passed | `npm run verify:packaged` |

## Installed-bundle checks

These require a clean user profile and must be recorded from the installed
artifact, not inferred from a development run.

| Check | macOS | Ubuntu | Windows |
| --- | --- | --- | --- |
| Install the generated bundle in a clean profile | Pending | Pending | Pending |
| Launch without the E2E feature | Pending | Pending | Pending |
| Read bundled/local assets | Pending | Pending | Pending |
| Confirm SQLite FTS5 at runtime | Pending | Pending | Pending |
| Show a useful missing-Git diagnostic | Pending | Pending | Pending |
| Register and open a `xenics://` deep link | Pending | Pending | Pending |

## Distribution checks

| Check | Result |
| --- | --- |
| Hosted macOS acceptance workflow | Pending: no Git remote is configured in this checkout |
| Hosted Ubuntu acceptance workflow | Pending: no Git remote is configured in this checkout |
| Hosted Windows acceptance workflow | Pending: no Git remote is configured in this checkout |
| macOS signing | Pending: signing credentials are not available |
| macOS notarization | Pending: notarization credentials are not available |

The workflow is defined in `.github/workflows/desktop-acceptance.yml`. It
retains platform bundles for 14 days and installs Xvfb on Ubuntu for native
WebView sessions. Once a repository remote and distribution credentials are
available, update this checklist with runner logs, artifact paths, OS versions,
and the clean-profile results.
