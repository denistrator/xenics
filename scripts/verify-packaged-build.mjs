import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { join, relative } from 'node:path'

const root = process.cwd()
const requiredFiles = ['dist/index.html', 'src-tauri/tauri.conf.json', 'src-tauri/Cargo.toml']
const missing = requiredFiles.filter((file) => !existsSync(join(root, file)))

if (missing.length > 0) {
  console.error(`Packaged verification cannot run; missing: ${missing.join(', ')}`)
  process.exit(1)
}

const cargoManifest = readFileSync(join(root, 'src-tauri/Cargo.toml'), 'utf8')
const tauriConfig = JSON.parse(readFileSync(join(root, 'src-tauri/tauri.conf.json'), 'utf8'))
const bundleDirectory = join(root, 'src-tauri/target/release/bundle')
const bundleFiles = existsSync(bundleDirectory)
  ? collectFiles(bundleDirectory)
  : []
const releaseDependencyTree = readReleaseDependencyTree()
const releaseChecks = {
  productName: tauriConfig.productName,
  releaseProfile: cargoManifest.includes('[profile.release]'),
  bundledSqlite: cargoManifest.includes('rusqlite') && cargoManifest.includes('bundled'),
  e2eFeatureIsOptional: cargoManifest.includes('e2e = ["dep:tauri-plugin-wdio-webdriver"]'),
  safeApplicationIdentifier: tauriConfig.identifier === 'com.xenics.desktop',
  desktopDeepLinkConfigured: tauriConfig.plugins?.['deep-link']?.desktop?.schemes?.includes('xenics') === true,
  frontendBundlePresent: existsSync(join(root, 'dist/index.html')),
  releaseBundlePresent: bundleFiles.length > 0,
  e2eDriverAbsentFromReleaseDependencies: !releaseDependencyTree.includes('tauri-plugin-wdio-webdriver'),
}

if (Object.values(releaseChecks).some((value) => !value)) {
  console.error('Packaged verification failed:', releaseChecks)
  process.exit(1)
}

console.log(JSON.stringify({
  status: 'ready-for-platform-install-checks',
  ...releaseChecks,
  bundleFiles,
  manualChecks: [
    'Install the platform bundle in a clean user profile.',
    'Launch without the e2e feature and verify local assets and SQLite FTS5.',
    'Verify missing-Git diagnostics and xenics:// deep-link registration.',
    'Record signing and notarization results separately; credentials are not present in CI by default.',
  ],
}, null, 2))

function collectFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name)
    return entry.isDirectory() ? collectFiles(path) : [relative(root, path)]
  })
}

function readReleaseDependencyTree() {
  try {
    return execFileSync('cargo', [
      'tree',
      '--manifest-path',
      'src-tauri/Cargo.toml',
      '--no-default-features',
      '--edges',
      'normal',
    ], { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error(`Packaged verification could not inspect release dependencies: ${message}`)
    process.exit(1)
  }
}
