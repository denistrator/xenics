import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

const root = process.cwd()
const requiredFiles = ['dist/index.html', 'src-tauri/tauri.conf.json', 'src-tauri/Cargo.toml']
const missing = requiredFiles.filter((file) => !existsSync(join(root, file)))

if (missing.length > 0) {
  console.error(`Packaged verification cannot run; missing: ${missing.join(', ')}`)
  process.exit(1)
}

const cargoManifest = readFileSync(join(root, 'src-tauri/Cargo.toml'), 'utf8')
const tauriConfig = JSON.parse(readFileSync(join(root, 'src-tauri/tauri.conf.json'), 'utf8'))
const releaseChecks = {
  productName: tauriConfig.productName,
  releaseProfile: cargoManifest.includes('[profile.release]'),
  bundledSqlite: cargoManifest.includes('rusqlite') && cargoManifest.includes('bundled'),
  e2eFeatureIsOptional: cargoManifest.includes('e2e = ["dep:tauri-plugin-wdio-webdriver"]'),
  safeApplicationIdentifier: tauriConfig.identifier === 'com.xenics.desktop',
  frontendBundlePresent: existsSync(join(root, 'dist/index.html')),
}

if (Object.values(releaseChecks).some((value) => !value)) {
  console.error('Packaged verification failed:', releaseChecks)
  process.exit(1)
}

console.log(JSON.stringify({
  status: 'ready-for-platform-install-checks',
  ...releaseChecks,
  manualChecks: [
    'Install the platform bundle in a clean user profile.',
    'Launch without the e2e feature and verify local assets and SQLite FTS5.',
    'Verify missing-Git diagnostics and xenics:// deep-link registration.',
    'Record signing and notarization results separately; credentials are not present in CI by default.',
  ],
}, null, 2))
