import { join } from 'node:path'
import { spawn, type ChildProcess } from 'node:child_process'

let viteProcess: ChildProcess | undefined
let xenicsProcess: ChildProcess | undefined
let xenicsOutput = ''

async function waitForDevServer() {
  for (let attempt = 0; attempt < 30; attempt += 1) {
    try {
      await fetch('http://127.0.0.1:1420')
      return
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 250))
    }
  }

  throw new Error('Vite dev server did not become ready on port 1420')
}

async function waitForEmbeddedWebDriver() {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    try {
      const response = await fetch('http://127.0.0.1:4445/status')
      if (response.ok) return
    } catch {
      // The embedded server is expected to refuse connections while Tauri starts.
    }

    await new Promise((resolve) => setTimeout(resolve, 250))
  }

  throw new Error(`Embedded WebDriver did not become ready on port 4445. Tauri output: ${xenicsOutput || '(no output)'}`)
}

const binaryName = process.platform === 'win32' ? 'xenics.exe' : 'xenics'
const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm'

export const config = {
  runner: 'local',
  specs: ['./*.e2e.ts'],
  maxInstances: 1,
  framework: 'mocha',
  reporters: ['spec'],
  hostname: '127.0.0.1',
  port: 4445,
  path: '/',
  // @wdio/tauri-service@1.4.0 installs a focus hook that calls an IPC command
  // missing from tauri-plugin-wdio-webdriver@1.4.0. Connect directly to the
  // real embedded server until the packages expose matching window-state APIs.
  services: [],
  capabilities: [
    {
      browserName: 'tauri',
    },
  ],
  mochaOpts: {
    timeout: 120_000,
  },
  onPrepare: async () => {
    viteProcess = spawn(npmCommand, ['run', 'dev', '--', '--host', '127.0.0.1'], {
      cwd: process.cwd(),
      stdio: 'ignore',
    })
    await waitForDevServer()
    const applicationPath = process.env.XENICS_APP_PATH ?? join(process.cwd(), 'src-tauri/target/debug', binaryName)
    const launchCommand = process.platform === 'linux' ? 'xvfb-run' : applicationPath
    const launchArgs = process.platform === 'linux'
      ? ['--auto-servernum', '--server-args=-screen 0 1280x800x24', applicationPath]
      : []
    xenicsProcess = spawn(launchCommand, launchArgs, {
      cwd: process.cwd(),
      stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...process.env, TAURI_WEBDRIVER_PORT: '4445' },
    })
    xenicsProcess.stdout?.on('data', (chunk: Buffer) => {
      xenicsOutput = `${xenicsOutput}${chunk.toString()}`.slice(-4_000)
    })
    xenicsProcess.stderr?.on('data', (chunk: Buffer) => {
      xenicsOutput = `${xenicsOutput}${chunk.toString()}`.slice(-4_000)
    })
    xenicsProcess.on('error', (error) => {
      xenicsOutput = `${xenicsOutput}${error.message}`.slice(-4_000)
    })
    await waitForEmbeddedWebDriver()
  },
  onComplete: () => {
    xenicsProcess?.kill()
    viteProcess?.kill()
  },
}
